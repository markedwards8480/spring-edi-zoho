const Client = require('ssh2-sftp-client');
const logger = require('./logger');

class SFTPClient {
  constructor() {
    this.client = new Client();
    this.config = {
      host: process.env.SFTP_HOST,
      port: parseInt(process.env.SFTP_PORT) || 22,
      username: process.env.SFTP_USERNAME,
      password: process.env.SFTP_PASSWORD
    };
  }

  async connect() {
    try {
      await this.client.connect(this.config);
      logger.info('SFTP connected', { host: this.config.host });
    } catch (error) {
      logger.error('SFTP connection failed', { error: error.message });
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.client.end();
      logger.info('SFTP disconnected');
    } catch (error) {
      logger.error('SFTP disconnect error', { error: error.message });
    }
  }

  async listOrderFiles() {
    const ordersPath = process.env.SFTP_ORDERS_PATH || '/orders';
    try {
      const files = await this.client.list(ordersPath);
      // Filter for EDI files (typically .edi, .txt, .850, or no extension)
      const ediFiles = files.filter(f =>
        f.type === '-' && // regular file
        (f.name.endsWith('.edi') ||
          f.name.endsWith('.txt') ||
          f.name.endsWith('.850') ||
          f.name.includes('850') ||
          !f.name.includes('.')) // no extension often means EDI
      );
      logger.info(`Found ${ediFiles.length} potential EDI files`, { path: ordersPath });
      return ediFiles;
    } catch (error) {
      // If orders folder doesn't exist, try root
      if (error.code === 2) {
        logger.warn('Orders path not found, trying root directory');
        const files = await this.client.list('/');
        return files.filter(f => f.type === '-');
      }
      throw error;
    }
  }

  async downloadFile(filename) {
    const ordersPath = process.env.SFTP_ORDERS_PATH || '/orders';
    const remotePath = `${ordersPath}/${filename}`;
    try {
      const buffer = await this.client.get(remotePath);
      const content = buffer.toString('utf8');
      logger.info('Downloaded file', { filename, size: content.length });
      return content;
    } catch (error) {
      // Try without the orders path
      try {
        const buffer = await this.client.get(`/${filename}`);
        return buffer.toString('utf8');
      } catch (e) {
        logger.error('File download failed', { filename, error: error.message });
        throw error;
      }
    }
  }

  async archiveFile(filename) {
    const ordersPath = process.env.SFTP_ORDERS_PATH || '/orders';
    const archivePath = process.env.SFTP_ARCHIVE_PATH || '/archive';
    const sourcePath = `${ordersPath}/${filename}`;
    const destPath = `${archivePath}/${filename}`;

    try {
      // Ensure archive directory exists
      try {
        await this.client.mkdir(archivePath, true);
      } catch (e) {
        // Directory might already exist
      }

      // Move file to archive
      await this.client.rename(sourcePath, destPath);
      logger.info('Archived file', { from: sourcePath, to: destPath });
    } catch (error) {
      logger.warn('Could not archive file', { filename, error: error.message });
      // Don't throw - archiving is not critical
    }
  }

  // ========== NEW METHODS FOR SFTP BROWSER ==========

  /**
   * List all files in a given SFTP directory with full details
   * @param {string} path - The SFTP path to list
   * @returns {Array} - Array of file objects with name, size, modifyTime, type
   */
  async listDirectory(path) {
    try {
      const files = await this.client.list(path);
      return files.map(f => ({
        name: f.name,
        size: f.size,
        modifyTime: f.modifyTime,
        type: f.type === 'd' ? 'directory' : 'file',
        path: `${path}/${f.name}`
      })).sort((a, b) => b.modifyTime - a.modifyTime); // Newest first
    } catch (error) {
      logger.error('Failed to list directory', { path, error: error.message });
      throw error;
    }
  }

  /**
   * List files in the orders (incoming) folder
   * @returns {Array} - Array of file objects
   */
  async listIncomingFiles() {
    const ordersPath = process.env.SFTP_ORDERS_PATH || '/orders';
    try {
      const files = await this.listDirectory(ordersPath);
      // Filter for files only (not directories)
      return files.filter(f => f.type === 'file');
    } catch (error) {
      if (error.code === 2) {
        logger.warn('Orders path not found', { path: ordersPath });
        return [];
      }
      throw error;
    }
  }

  /**
   * List files in the archive folder
   * @returns {Array} - Array of file objects
   */
  async listArchivedFiles() {
    const archivePath = process.env.SFTP_ARCHIVE_PATH || '/archive';
    try {
      const files = await this.listDirectory(archivePath);
      // Filter for files only (not directories)
      return files.filter(f => f.type === 'file');
    } catch (error) {
      if (error.code === 2) {
        logger.warn('Archive path not found', { path: archivePath });
        return [];
      }
      throw error;
    }
  }

  /**
   * Download a file from the archive folder
   * @param {string} filename - The filename to download
   * @returns {string} - The file content
   */
  async downloadFromArchive(filename) {
    const archivePath = process.env.SFTP_ARCHIVE_PATH || '/archive';
    const remotePath = `${archivePath}/${filename}`;
    try {
      const buffer = await this.client.get(remotePath);
      const content = buffer.toString('utf8');
      logger.info('Downloaded file from archive', { filename, size: content.length });
      return content;
    } catch (error) {
      logger.error('Archive file download failed', { filename, error: error.message });
      throw error;
    }
  }

  /**
   * Get comprehensive SFTP status including both folders
   * @returns {Object} - Status object with incoming and archived file counts
   */
  async getStatus() {
    const ordersPath = process.env.SFTP_ORDERS_PATH || '/orders';
    const archivePath = process.env.SFTP_ARCHIVE_PATH || '/archive';
    
    let incoming = [];
    let archived = [];
    
    try {
      incoming = await this.listIncomingFiles();
    } catch (e) {
      logger.warn('Could not list incoming files', { error: e.message });
    }
    
    try {
      archived = await this.listArchivedFiles();
    } catch (e) {
      logger.warn('Could not list archived files', { error: e.message });
    }
    
    return {
      ordersPath,
      archivePath,
      incoming: {
        count: incoming.length,
        files: incoming.slice(0, 50), // Limit to 50 most recent
        totalSize: incoming.reduce((sum, f) => sum + f.size, 0)
      },
      archived: {
        count: archived.length,
        files: archived.slice(0, 100), // Limit to 100 most recent
        totalSize: archived.reduce((sum, f) => sum + f.size, 0)
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if a file exists in the archive
   * @param {string} filename - The filename to check
   * @returns {boolean} - True if file exists
   */
  async existsInArchive(filename) {
    const archivePath = process.env.SFTP_ARCHIVE_PATH || '/archive';
    try {
      const exists = await this.client.exists(`${archivePath}/${filename}`);
      return exists !== false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Move a file from archive back to orders (for re-processing)
   * @param {string} filename - The filename to restore
   * @returns {boolean} - True if successful
   */
  async restoreFromArchive(filename) {
    const ordersPath = process.env.SFTP_ORDERS_PATH || '/orders';
    const archivePath = process.env.SFTP_ARCHIVE_PATH || '/archive';
    const sourcePath = `${archivePath}/${filename}`;
    const destPath = `${ordersPath}/${filename}`;

    try {
      await this.client.rename(sourcePath, destPath);
      logger.info('Restored file from archive', { from: sourcePath, to: destPath });
      return true;
    } catch (error) {
      logger.error('Could not restore file from archive', { filename, error: error.message });
      throw error;
    }
  }
}

module.exports = SFTPClient;
