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
        current_stage VARCHAR(50) DEFAULT 'inbox',
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Insert default session if not exists
      INSERT INTO ui_session (session_key)
      VALUES ('default')
      ON CONFLICT (session_key) DO NOTHING;
    `);

    // Add current_stage column if not exists (migration for existing tables)
    await client.query(`
      ALTER TABLE ui_session ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50) DEFAULT 'inbox';
    `);

    // Add amendment tracking columns to edi_orders
    await client.query(`
      ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS is_amended BOOLEAN DEFAULT FALSE;
      ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS amendment_type VARCHAR(50);
      ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS amendment_count INTEGER DEFAULT 0;
      ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS previous_data JSONB;
      ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS changes_detected JSONB;
      ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS original_order_id INTEGER;
      ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(10) DEFAULT '850';
      ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

      CREATE INDEX IF NOT EXISTS idx_edi_orders_po_number ON edi_orders(edi_order_number);
      CREATE INDEX IF NOT EXISTS idx_edi_orders_amended ON edi_orders(is_amended) WHERE is_amended = TRUE;
    `);

    // Add selective field processing columns
    await client.query(`
      ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS is_partial BOOLEAN DEFAULT FALSE;
      ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS fields_sent JSONB DEFAULT '{}';
      ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS fields_pending JSONB DEFAULT '{}';
      ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS line_items_sent JSONB DEFAULT '[]';
      ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS line_items_pending JSONB DEFAULT '[]';
      ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS field_overrides JSONB DEFAULT '{}';
      ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS partial_processed_at TIMESTAMP;

      CREATE INDEX IF NOT EXISTS idx_edi_orders_partial ON edi_orders(is_partial) WHERE is_partial = TRUE;
    `);

    // Create discrepancies table for tracking EDI vs Zoho mismatches
    await client.query(`
      CREATE TABLE IF NOT EXISTS discrepancies (
        id SERIAL PRIMARY KEY,
        edi_order_id INTEGER REFERENCES edi_orders(id),
        zoho_so_id VARCHAR(100),
        zoho_so_number VARCHAR(100),
        customer_name VARCHAR(500),
        po_number VARCHAR(100),
        field_name VARCHAR(100) NOT NULL,
        field_label VARCHAR(200),
        edi_value TEXT,
        zoho_value TEXT,
        discrepancy_type VARCHAR(50),
        severity VARCHAR(20) DEFAULT 'warning',
        detected_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP,
        resolved_by VARCHAR(100),
        resolution_notes TEXT,
        line_item_index INTEGER,
        line_item_sku VARCHAR(200)
      );

      CREATE INDEX IF NOT EXISTS idx_discrepancies_edi_order ON discrepancies(edi_order_id);
      CREATE INDEX IF NOT EXISTS idx_discrepancies_detected ON discrepancies(detected_at);
      CREATE INDEX IF NOT EXISTS idx_discrepancies_resolved ON discrepancies(resolved_at);
      CREATE INDEX IF NOT EXISTS idx_discrepancies_customer ON discrepancies(customer_name);
      CREATE INDEX IF NOT EXISTS idx_discrepancies_type ON discrepancies(discrepancy_type);
    `);

    // Create customer_matching_rules table for customer-specific EDI matching configuration
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_matching_rules (
        id SERIAL PRIMARY KEY,

        -- Customer identification (NULL = default rule for all customers)
        customer_name VARCHAR(500),
        is_default BOOLEAN DEFAULT FALSE,

        -- How to identify bulk/contract orders in Zoho
        bulk_order_status VARCHAR(50) DEFAULT 'draft',           -- draft, confirmed
        bulk_order_category VARCHAR(50) DEFAULT 'unconfirmed',   -- unconfirmed, confirmed
        bulk_po_field_pattern VARCHAR(100) DEFAULT 'EDI',        -- Pattern to match in PO field

        -- How to match EDI to bulk order
        match_by_customer_po BOOLEAN DEFAULT FALSE,              -- Match by Customer PO number (Kohls)
        match_by_contract_ref BOOLEAN DEFAULT FALSE,             -- Match by contract reference field (JCP)
        contract_ref_field VARCHAR(100) DEFAULT 'po_rel_num',    -- Field name for contract reference
        match_by_style_customer BOOLEAN DEFAULT TRUE,            -- Match by style + customer (default)

        -- Matching criteria toggles
        match_style BOOLEAN DEFAULT TRUE,
        match_color BOOLEAN DEFAULT TRUE,
        match_units BOOLEAN DEFAULT FALSE,
        match_delivery_date BOOLEAN DEFAULT TRUE,

        -- What happens on match
        action_on_match VARCHAR(50) DEFAULT 'update_bulk',       -- update_bulk, create_new_drawdown
        -- update_bulk: EDI updates the bulk order directly
        -- create_new_drawdown: Create new order from EDI, reduce bulk quantities

        -- 860 handling
        edi_860_action VARCHAR(50) DEFAULT 'update_existing',    -- update_existing, create_amendment

        -- Metadata
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by VARCHAR(100),

        UNIQUE(customer_name)
      );

      CREATE INDEX IF NOT EXISTS idx_customer_rules_name ON customer_matching_rules(customer_name);
      CREATE INDEX IF NOT EXISTS idx_customer_rules_default ON customer_matching_rules(is_default);
    `);

    // Insert default rule if not exists (separate query to handle NULL properly)
    const defaultExists = await client.query(
      'SELECT id FROM customer_matching_rules WHERE is_default = TRUE LIMIT 1'
    );
    if (defaultExists.rows.length === 0) {
      await client.query(`
        INSERT INTO customer_matching_rules (
          customer_name, is_default, bulk_order_status, bulk_order_category,
          match_by_style_customer, action_on_match, notes
        ) VALUES (
          NULL, TRUE, 'draft', 'unconfirmed',
          TRUE, 'update_bulk', 'Default rule for all customers without specific rules'
        )
      `);
    }

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

// Helper function to detect changes between old and new parsed data
function detectChanges(oldData, newData) {
  const changes = [];

  if (!oldData || !newData) return changes;

  // Check dates
  const oldDates = oldData.dates || {};
  const newDates = newData.dates || {};
  if (oldDates.shipDate !== newDates.shipDate) {
    changes.push({ field: 'Ship Date', from: oldDates.shipDate, to: newDates.shipDate });
  }
  if (oldDates.cancelDate !== newDates.cancelDate) {
    changes.push({ field: 'Cancel Date', from: oldDates.cancelDate, to: newDates.cancelDate });
  }

  // Check totals
  const oldItems = oldData.items || [];
  const newItems = newData.items || [];

  const oldTotal = oldItems.reduce((sum, i) => sum + ((i.quantityOrdered || 0) * (i.unitPrice || 0)), 0);
  const newTotal = newItems.reduce((sum, i) => sum + ((i.quantityOrdered || 0) * (i.unitPrice || 0)), 0);
  if (Math.abs(oldTotal - newTotal) > 0.01) {
    changes.push({ field: 'Total Amount', from: oldTotal.toFixed(2), to: newTotal.toFixed(2) });
  }

  const oldUnits = oldItems.reduce((sum, i) => sum + (i.quantityOrdered || 0), 0);
  const newUnits = newItems.reduce((sum, i) => sum + (i.quantityOrdered || 0), 0);
  if (oldUnits !== newUnits) {
    changes.push({ field: 'Total Units', from: oldUnits, to: newUnits });
  }

  // Check line item count
  if (oldItems.length !== newItems.length) {
    changes.push({ field: 'Line Items', from: oldItems.length, to: newItems.length });
  }

  // Check for specific item changes (by SKU)
  const oldItemMap = new Map(oldItems.map(i => [i.productIds?.sku || i.productIds?.vendorItemNumber, i]));
  for (const newItem of newItems) {
    const sku = newItem.productIds?.sku || newItem.productIds?.vendorItemNumber;
    const oldItem = oldItemMap.get(sku);
    if (oldItem) {
      if (oldItem.quantityOrdered !== newItem.quantityOrdered) {
        changes.push({
          field: `Qty for ${sku}`,
          from: oldItem.quantityOrdered,
          to: newItem.quantityOrdered
        });
      }
      if (Math.abs((oldItem.unitPrice || 0) - (newItem.unitPrice || 0)) > 0.001) {
        changes.push({
          field: `Price for ${sku}`,
          from: (oldItem.unitPrice || 0).toFixed(2),
          to: (newItem.unitPrice || 0).toFixed(2)
        });
      }
    } else {
      changes.push({ field: 'New Item Added', from: null, to: sku });
    }
  }

  // Check for removed items
  const newItemMap = new Map(newItems.map(i => [i.productIds?.sku || i.productIds?.vendorItemNumber, i]));
  for (const oldItem of oldItems) {
    const sku = oldItem.productIds?.sku || oldItem.productIds?.vendorItemNumber;
    if (!newItemMap.has(sku)) {
      changes.push({ field: 'Item Removed', from: sku, to: null });
    }
  }

  return changes;
}

async function saveEDIOrder(order) {
  const transactionType = order.transactionType || '850';

  // First, check if an order with this PO# already exists (ANY filename)
  const existingResult = await pool.query(
    'SELECT id, parsed_data, amendment_count, status, filename FROM edi_orders WHERE edi_order_number = $1 ORDER BY created_at DESC LIMIT 1',
    [order.ediOrderNumber]
  );

  if (existingResult.rows.length > 0) {
    const existing = existingResult.rows[0];
    const oldData = existing.parsed_data;
    const newData = order.parsedData;

    // Detect what changed
    const changes = detectChanges(oldData, newData);
    const hasChanges = changes.length > 0;

    if (hasChanges || order.filename !== existing.filename) {
      // This is an amendment - update the existing order
      logger.info('Amendment detected for PO#', {
        poNumber: order.ediOrderNumber,
        existingId: existing.id,
        changesCount: changes.length,
        newFilename: order.filename,
        oldFilename: existing.filename
      });

      const amendmentType = transactionType === '860' ? '860_change' : '850_revision';
      const newAmendmentCount = (existing.amendment_count || 0) + 1;

      const result = await pool.query(
        `UPDATE edi_orders SET
           filename = $1,
           raw_edi = $2,
           parsed_data = $3,
           edi_customer_name = $4,
           is_amended = TRUE,
           amendment_type = $5,
           amendment_count = $6,
           previous_data = $7,
           changes_detected = $8,
           transaction_type = $9,
           updated_at = NOW(),
           status = CASE WHEN status = 'processed' THEN 'review' ELSE status END
         WHERE id = $10
         RETURNING id, status, is_amended, amendment_count`,
        [
          order.filename,
          order.rawEDI,
          newData,
          order.ediCustomerName || null,
          amendmentType,
          newAmendmentCount,
          oldData,
          JSON.stringify(changes),
          transactionType,
          existing.id
        ]
      );

      return { ...result.rows[0], wasAmended: true, changes };
    } else {
      // Same data, just return existing
      logger.debug('Duplicate order with no changes', { poNumber: order.ediOrderNumber });
      return { id: existing.id, status: existing.status, wasAmended: false, duplicate: true };
    }
  }

  // New order - insert it
  const result = await pool.query(
    `INSERT INTO edi_orders (filename, edi_order_number, customer_po, status, raw_edi, parsed_data, edi_customer_name, transaction_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (filename, edi_order_number) DO UPDATE SET
       parsed_data = $6,
       edi_customer_name = $7,
       updated_at = NOW()
     RETURNING id, status`,
    [order.filename, order.ediOrderNumber, order.customerPO, 'pending', order.rawEDI, order.parsedData, order.ediCustomerName || null, transactionType]
  );
  return { ...result.rows[0], wasAmended: false, isNew: true };
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

// Discrepancy tracking functions
async function logDiscrepancy(data) {
  const result = await pool.query(
    `INSERT INTO discrepancies
     (edi_order_id, zoho_so_id, zoho_so_number, customer_name, po_number,
      field_name, field_label, edi_value, zoho_value, discrepancy_type, severity,
      line_item_index, line_item_sku)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id`,
    [
      data.ediOrderId,
      data.zohoSoId,
      data.zohoSoNumber,
      data.customerName,
      data.poNumber,
      data.fieldName,
      data.fieldLabel || data.fieldName,
      data.ediValue?.toString() || '',
      data.zohoValue?.toString() || '',
      data.discrepancyType || 'mismatch',
      data.severity || 'warning',
      data.lineItemIndex || null,
      data.lineItemSku || null
    ]
  );
  return result.rows[0];
}

async function logMultipleDiscrepancies(discrepancies) {
  if (!discrepancies || discrepancies.length === 0) return [];

  const results = [];
  for (const d of discrepancies) {
    const result = await logDiscrepancy(d);
    results.push(result);
  }
  return results;
}

async function getDiscrepancies(filters = {}) {
  let query = `
    SELECT d.*, e.filename, e.parsed_data
    FROM discrepancies d
    LEFT JOIN edi_orders e ON d.edi_order_id = e.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (filters.startDate) {
    query += ` AND d.detected_at >= $${paramIndex++}`;
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    query += ` AND d.detected_at <= $${paramIndex++}`;
    params.push(filters.endDate);
  }
  if (filters.customerName) {
    query += ` AND d.customer_name ILIKE $${paramIndex++}`;
    params.push(`%${filters.customerName}%`);
  }
  if (filters.discrepancyType) {
    query += ` AND d.discrepancy_type = $${paramIndex++}`;
    params.push(filters.discrepancyType);
  }
  if (filters.resolved === true) {
    query += ` AND d.resolved_at IS NOT NULL`;
  } else if (filters.resolved === false) {
    query += ` AND d.resolved_at IS NULL`;
  }
  if (filters.poNumber) {
    query += ` AND d.po_number ILIKE $${paramIndex++}`;
    params.push(`%${filters.poNumber}%`);
  }

  query += ` ORDER BY d.detected_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex++}`;
    params.push(filters.limit);
  }

  const result = await pool.query(query, params);
  return result.rows;
}

async function getDiscrepancySummary(filters = {}) {
  let whereClause = '1=1';
  const params = [];
  let paramIndex = 1;

  if (filters.startDate) {
    whereClause += ` AND detected_at >= $${paramIndex++}`;
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    whereClause += ` AND detected_at <= $${paramIndex++}`;
    params.push(filters.endDate);
  }

  const result = await pool.query(`
    SELECT
      COUNT(*) as total_discrepancies,
      COUNT(DISTINCT edi_order_id) as orders_with_discrepancies,
      COUNT(DISTINCT customer_name) as customers_affected,
      COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved_count,
      COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved_count,
      discrepancy_type,
      COUNT(*) as type_count
    FROM discrepancies
    WHERE ${whereClause}
    GROUP BY discrepancy_type
  `, params);

  // Also get overall totals
  const totals = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT edi_order_id) as unique_orders,
      COUNT(DISTINCT customer_name) as unique_customers,
      COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved,
      COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved
    FROM discrepancies
    WHERE ${whereClause}
  `, params);

  return {
    byType: result.rows,
    totals: totals.rows[0]
  };
}

async function resolveDiscrepancy(discrepancyId, resolvedBy, notes) {
  const result = await pool.query(
    `UPDATE discrepancies
     SET resolved_at = NOW(), resolved_by = $2, resolution_notes = $3
     WHERE id = $1
     RETURNING *`,
    [discrepancyId, resolvedBy, notes]
  );
  return result.rows[0];
}

async function resolveDiscrepanciesForOrder(ediOrderId, resolvedBy, notes) {
  const result = await pool.query(
    `UPDATE discrepancies
     SET resolved_at = NOW(), resolved_by = $2, resolution_notes = $3
     WHERE edi_order_id = $1 AND resolved_at IS NULL
     RETURNING *`,
    [ediOrderId, resolvedBy, notes]
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
  getReplacedDrafts,
  // Discrepancy tracking
  logDiscrepancy,
  logMultipleDiscrepancies,
  getDiscrepancies,
  getDiscrepancySummary,
  resolveDiscrepancy,
  resolveDiscrepanciesForOrder
};
