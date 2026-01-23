/**
 * Test script to verify SFTP connection and explore folder structure
 * Run with: npm run test-sftp
 */

require('dotenv').config();
const Client = require('ssh2-sftp-client');

const config = {
  host: process.env.SFTP_HOST,
  port: parseInt(process.env.SFTP_PORT) || 22,
  username: process.env.SFTP_USERNAME,
  password: process.env.SFTP_PASSWORD
};

async function testSFTP() {
  const sftp = new Client();

  console.log('='.repeat(60));
  console.log('SFTP Connection Test');
  console.log('='.repeat(60));
  console.log(`Host: ${config.host}`);
  console.log(`Port: ${config.port}`);
  console.log(`Username: ${config.username}`);
  console.log('Password: ****');
  console.log('');

  try {
    console.log('Connecting...');
    await sftp.connect(config);
    console.log('✅ Connected successfully!\n');

    // List root directory
    console.log('📁 ROOT DIRECTORY:');
    const rootList = await sftp.list('/');
    
    if (rootList.length === 0) {
      console.log('  (empty)');
    } else {
      for (const item of rootList) {
        const type = item.type === 'd' ? '📁' : '📄';
        const size = item.type === 'd' ? '' : ` (${item.size} bytes)`;
        console.log(`  ${type} ${item.name}${size}`);
      }
    }

    // Explore subdirectories
    for (const item of rootList) {
      if (item.type === 'd') {
        console.log(`\n📁 /${item.name}/:`);
        try {
          const subList = await sftp.list(`/${item.name}`);
          if (subList.length === 0) {
            console.log('  (empty)');
          } else {
            for (const subItem of subList.slice(0, 20)) { // Limit to first 20
              const type = subItem.type === 'd' ? '📁' : '📄';
              const size = subItem.type === 'd' ? '' : ` (${subItem.size} bytes)`;
              console.log(`  ${type} ${subItem.name}${size}`);
            }
            if (subList.length > 20) {
              console.log(`  ... and ${subList.length - 20} more files`);
            }
          }
        } catch (err) {
          console.log(`  (cannot access: ${err.message})`);
        }
      }
    }

    // Try to find and display a sample EDI file
    console.log('\n' + '='.repeat(60));
    console.log('SAMPLE FILE CONTENT:');
    console.log('='.repeat(60));

    // Find first file that looks like EDI
    const allFiles = [];
    async function findFiles(dir, depth = 0) {
      if (depth > 2) return; // Don't go too deep
      try {
        const list = await sftp.list(dir);
        for (const item of list) {
          const fullPath = dir === '/' ? `/${item.name}` : `${dir}/${item.name}`;
          if (item.type === 'd' && depth < 2) {
            await findFiles(fullPath, depth + 1);
          } else if (item.type === '-' && item.size > 0 && item.size < 100000) {
            allFiles.push({ path: fullPath, size: item.size });
          }
        }
      } catch (e) {
        // Skip inaccessible directories
      }
    }

    await findFiles('/');

    if (allFiles.length > 0) {
      // Get first small file
      const sampleFile = allFiles[0];
      console.log(`\nFile: ${sampleFile.path} (${sampleFile.size} bytes)\n`);
      
      const buffer = await sftp.get(sampleFile.path);
      const content = buffer.toString('utf8');
      
      // Show first 2000 chars
      console.log(content.substring(0, 2000));
      if (content.length > 2000) {
        console.log(`\n... (${content.length - 2000} more characters)`);
      }
    } else {
      console.log('No files found to display.');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.code) console.error('Error code:', err.code);
  } finally {
    await sftp.end();
    console.log('\nConnection closed.');
  }
}

testSFTP();
