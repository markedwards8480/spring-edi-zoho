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

    // Create processing_logs table for audit trail
    await client.query(`
      CREATE TABLE IF NOT EXISTS processing_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'success',
        edi_order_id INTEGER,
        edi_po_number VARCHAR(100),
        zoho_so_id VARCHAR(100),
        zoho_so_number VARCHAR(100),
        customer_name VARCHAR(500),
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_processing_logs_created ON processing_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_processing_logs_zoho_so ON processing_logs(zoho_so_number);
    `);

    // Create replaced_drafts table for tracking draft replacements
    await client.query(`
      CREATE TABLE IF NOT EXISTS replaced_drafts (
        id SERIAL PRIMARY KEY,
        original_so_id VARCHAR(100),
        original_so_number VARCHAR(100),
        original_so_data JSONB,
        edi_order_id INTEGER,
        edi_po_number VARCHAR(100),
        new_so_id VARCHAR(100),
        new_so_number VARCHAR(100),
        match_option VARCHAR(50),
        replaced_at TIMESTAMP DEFAULT NOW(),
        replaced_by VARCHAR(100) DEFAULT 'system'
      );
    `);

    // Create ui_session table for persisting UI state across sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS ui_session (
        id SERIAL PRIMARY KEY,
        session_key VARCHAR(50) UNIQUE NOT NULL DEFAULT 'default',
        match_results JSONB,
        selected_match_ids JSONB DEFAULT '[]',
        flagged_match_ids JSONB DEFAULT '[]',
        selected_match_drafts JSONB DEFAULT '{}',
        focus_mode_index INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Insert default session if not exists
      INSERT INTO ui_session (session_key)
      VALUES ('default')
      ON CONFLICT (session_key) DO NOTHING;
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
    `INSERT INTO edi_orders (filename, edi_order_number, customer_po, status, raw_edi, parsed_data, edi_customer_name)
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

// Processing logs functions
async function logProcessingActivity(data) {
  try {
    await pool.query(
      `INSERT INTO processing_logs (action, status, edi_order_id, edi_po_number, zoho_so_id, zoho_so_number, customer_name, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.action,
        data.status || 'success',
        data.ediOrderId || null,
        data.ediPoNumber || null,
        data.zohoSoId || null,
        data.zohoSoNumber || null,
        data.customerName || null,
        JSON.stringify(data.details || {})
      ]
    );
  } catch (error) {
    logger.error('Failed to log processing activity', { error: error.message });
  }
}

async function getProcessingLogs(limit = 100) {
  const result = await pool.query(
    `SELECT * FROM processing_logs ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// Get all orders sent to Zoho (for audit/cleanup)
async function getZohoSentOrders() {
  const result = await pool.query(
    `SELECT 
       id, edi_order_number, edi_customer_name, zoho_so_id, zoho_so_number, 
       processed_at, status
     FROM edi_orders 
     WHERE zoho_so_number IS NOT NULL
     ORDER BY processed_at DESC`
  );
  return result.rows;
}

// Replaced drafts functions
async function saveReplacedDraft(data) {
  const result = await pool.query(
    `INSERT INTO replaced_drafts 
     (original_so_id, original_so_number, original_so_data, edi_order_id, edi_po_number, new_so_id, new_so_number, match_option)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      data.originalSoId,
      data.originalSoNumber,
      JSON.stringify(data.originalSoData || {}),
      data.ediOrderId,
      data.ediPoNumber,
      data.newSoId || null,
      data.newSoNumber || null,
      data.matchOption || 'replace'
    ]
  );
  return result.rows[0];
}

async function getReplacedDrafts(limit = 100) {
  const result = await pool.query(
    `SELECT * FROM replaced_drafts ORDER BY replaced_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
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
  deleteCustomerMapping,
  logProcessingActivity,
  getProcessingLogs,
  getZohoSentOrders,
  saveReplacedDraft,
  getReplacedDrafts
};
