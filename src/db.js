const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    // Create tables for tracking EDI orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS edi_orders (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        edi_order_number VARCHAR(100),
        customer_po VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        zoho_so_id VARCHAR(100),
        zoho_so_number VARCHAR(100),
        raw_edi TEXT,
        parsed_data JSONB,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP,
        edi_customer_name VARCHAR(500),
        suggested_zoho_account_id VARCHAR(100),
        suggested_zoho_account_name VARCHAR(500),
        mapping_confirmed BOOLEAN DEFAULT FALSE,
        UNIQUE(filename, edi_order_number)
      );

      CREATE INDEX IF NOT EXISTS idx_edi_orders_status ON edi_orders(status);
      CREATE INDEX IF NOT EXISTS idx_edi_orders_filename ON edi_orders(filename);
      CREATE INDEX IF NOT EXISTS idx_edi_orders_created ON edi_orders(created_at);
    `);

    // Add new columns if they don't exist (for existing tables)
    await client.query(`
      DO $$ 
      BEGIN 
        ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS edi_customer_name VARCHAR(500);
        ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS suggested_zoho_account_id VARCHAR(100);
        ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS suggested_zoho_account_name VARCHAR(500);
        ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS mapping_confirmed BOOLEAN DEFAULT FALSE;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `);

    // Create table for Zoho tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS zoho_tokens (
        id SERIAL PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create table for processed files tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS processed_files (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        file_size INTEGER,
        processed_at TIMESTAMP DEFAULT NOW(),
        order_count INTEGER DEFAULT 0
      );
    `);

    // Create table for customer mappings (EDI name -> Zoho account)
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_mappings (
        id SERIAL PRIMARY KEY,
        edi_customer_name VARCHAR(500) UNIQUE NOT NULL,
        zoho_account_id VARCHAR(100),
        zoho_account_name VARCHAR(500),
        confirmed BOOLEAN DEFAULT FALSE,
        match_score INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_customer_mappings_edi_name ON customer_mappings(edi_customer_name);
    `);

    logger.info('Database tables initialized');
  } finally {
    client.release();
  }
}

async function isFileProcessed(filename) {
  const result = await pool.query(
    'SELECT id FROM processed_files WHERE filename = $1',
    [filename]
  );
  return result.rows.length > 0;
}

async function markFileProcessed(filename, fileSize, orderCount) {
  await pool.query(
    `INSERT INTO processed_files (filename, file_size, order_count) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (filename) DO UPDATE SET processed_at = NOW(), order_count = $3`,
    [filename, fileSize, orderCount]
  );
}

async function saveEDIOrder(order) {
  const result = await pool.query(
    `INSERT INTO edi_orders 
     (filename, edi_order_number, customer_po, status, raw_edi, parsed_data, edi_customer_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (filename, edi_order_number) DO UPDATE SET
       parsed_data = $6,
       edi_customer_name = $7,
       status = CASE WHEN edi_orders.status = 'processed' THEN 'processed' ELSE $4 END
     RETURNING id, status`,
    [order.filename, order.ediOrderNumber, order.customerPO, 'pending', order.rawEDI, order.parsedData, order.ediCustomerName || null]
  );
  return result.rows[0];
}

async function updateOrderStatus(id, status, zohoData = {}) {
  await pool.query(
    `UPDATE edi_orders SET 
      status = $2, 
      zoho_so_id = $3, 
      zoho_so_number = $4,
      error_message = $5,
      processed_at = NOW()
     WHERE id = $1`,
    [id, status, zohoData.soId || null, zohoData.soNumber || null, zohoData.error || null]
  );
}

async function updateOrderMapping(id, zohoAccountId, zohoAccountName, confirmed = false) {
  await pool.query(
    `UPDATE edi_orders SET 
      suggested_zoho_account_id = $2, 
      suggested_zoho_account_name = $3,
      mapping_confirmed = $4
     WHERE id = $1`,
    [id, zohoAccountId, zohoAccountName, confirmed]
  );
}

async function getPendingOrders() {
  const result = await pool.query(
    `SELECT id, filename, edi_order_number, parsed_data, edi_customer_name, 
            suggested_zoho_account_id, suggested_zoho_account_name, mapping_confirmed
     FROM edi_orders 
     WHERE status = 'pending'
     ORDER BY created_at ASC
     LIMIT 100`
  );
  return result.rows;
}

// Customer mapping functions
async function getCustomerMapping(ediCustomerName) {
  const result = await pool.query(
    'SELECT * FROM customer_mappings WHERE LOWER(edi_customer_name) = LOWER($1)',
    [ediCustomerName]
  );
  return result.rows[0] || null;
}

async function saveCustomerMapping(ediCustomerName, zohoAccountId, zohoAccountName, confirmed = true, matchScore = 100) {
  await pool.query(
    `INSERT INTO customer_mappings (edi_customer_name, zoho_account_id, zoho_account_name, confirmed, match_score, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (edi_customer_name) DO UPDATE SET
       zoho_account_id = $2,
       zoho_account_name = $3,
       confirmed = $4,
       match_score = $5,
       updated_at = NOW()`,
    [ediCustomerName, zohoAccountId, zohoAccountName, confirmed, matchScore]
  );
}

async function getAllCustomerMappings() {
  const result = await pool.query(
    'SELECT * FROM customer_mappings ORDER BY edi_customer_name'
  );
  return result.rows;
}

async function deleteCustomerMapping(id) {
  await pool.query('DELETE FROM customer_mappings WHERE id = $1', [id]);
}

module.exports = {
  pool,
  initDatabase,
  isFileProcessed,
  markFileProcessed,
  saveEDIOrder,
  updateOrderStatus,
  updateOrderMapping,
  getPendingOrders,
  getCustomerMapping,
  saveCustomerMapping,
  getAllCustomerMappings,
  deleteCustomerMapping
};
