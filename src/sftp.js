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
}

module.exports = SFTPClient;
