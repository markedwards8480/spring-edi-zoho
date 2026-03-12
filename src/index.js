require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const db = require('./db');
const { initDatabase, pool } = db;
const { processEDIOrders } = require('./processor');
const { setupOAuthRoutes } = require('./oauth');
const logger = require('./logger');
const dashboardHTML = require('./dashboard');
const { AuditLogger, ACTIONS, SEVERITY } = require('./audit-logger');
const ZohoDraftsCache = require('./zoho-cache');

// Helper function to detect discrepancies between EDI and Zoho data
function detectDiscrepancies(ediOrder, zohoDraft) {
  const discrepancies = [];
  const parsed = ediOrder.parsed_data || {};
  const ediDates = parsed.dates || {};

  // Format dates for comparison
  const formatDate = (d) => {
    if (!d) return null;
    try {
      const date = new Date(d);
      return date.toISOString().split('T')[0];
    } catch { return d; }
  };

  const ediShipDate = formatDate(ediDates.shipNotBefore || ediDates.shipDate);
  const zohoShipDate = formatDate(zohoDraft?.shipment_date);
  const ediCancelDate = formatDate(ediDates.cancelDate || ediDates.cancelAfter);
  const zohoCancelDate = formatDate(zohoDraft?.cf_cancel_date);

  const baseData = {
    ediOrderId: ediOrder.id,
    zohoSoId: zohoDraft?.salesorder_id,
    zohoSoNumber: zohoDraft?.salesorder_number,
    customerName: ediOrder.edi_customer_name || parsed.buyer?.name,
    poNumber: ediOrder.edi_order_number || ediOrder.customer_po
  };

  // Ship Date
  if (ediShipDate && zohoShipDate && ediShipDate !== zohoShipDate) {
    discrepancies.push({
      ...baseData,
      fieldName: 'ship_date',
      fieldLabel: 'Ship Date',
      ediValue: ediShipDate,
      zohoValue: zohoShipDate,
      discrepancyType: 'date_mismatch',
      severity: 'warning'
    });
  }

  // Cancel Date
  if (ediCancelDate && zohoCancelDate && ediCancelDate !== zohoCancelDate) {
    discrepancies.push({
      ...baseData,
      fieldName: 'cancel_date',
      fieldLabel: 'Cancel Date',
      ediValue: ediCancelDate,
      zohoValue: zohoCancelDate,
      discrepancyType: 'date_mismatch',
      severity: 'warning'
    });
  }

  // PO Number / Reference
  const ediPo = ediOrder.edi_order_number || ediOrder.customer_po || '';
  const zohoPo = zohoDraft?.reference_number || zohoDraft?.reference || '';
  if (ediPo && zohoPo && ediPo.toLowerCase() !== zohoPo.toLowerCase()) {
    discrepancies.push({
      ...baseData,
      fieldName: 'po_number',
      fieldLabel: 'PO / Reference',
      ediValue: ediPo,
      zohoValue: zohoPo,
      discrepancyType: 'reference_mismatch',
      severity: 'warning'
    });
  }

  // Calculate totals
  const ediItems = parsed.items || [];
  const zohoItems = zohoDraft?.line_items || [];

  const ediTotal = ediItems.reduce((sum, i) => sum + ((i.quantityOrdered || 0) * (i.unitPrice || 0)), 0);
  const zohoTotal = parseFloat(zohoDraft?.total || 0);
  if (Math.abs(ediTotal - zohoTotal) > 0.01) {
    discrepancies.push({
      ...baseData,
      fieldName: 'total_amount',
      fieldLabel: 'Total Amount',
      ediValue: `$${ediTotal.toFixed(2)}`,
      zohoValue: `$${zohoTotal.toFixed(2)}`,
      discrepancyType: 'amount_mismatch',
      severity: Math.abs(ediTotal - zohoTotal) > 100 ? 'error' : 'warning'
    });
  }

  const ediUnits = ediItems.reduce((sum, i) => sum + (i.quantityOrdered || 0), 0);
  const zohoUnits = zohoItems.reduce((sum, i) => sum + (parseInt(i.quantity) || 0), 0);
  if (ediUnits !== zohoUnits) {
    discrepancies.push({
      ...baseData,
      fieldName: 'total_units',
      fieldLabel: 'Total Units',
      ediValue: ediUnits.toString(),
      zohoValue: zohoUnits.toString(),
      discrepancyType: 'quantity_mismatch',
      severity: 'warning'
    });
  }

  // Line item count
  if (ediItems.length !== zohoItems.length) {
    discrepancies.push({
      ...baseData,
      fieldName: 'line_item_count',
      fieldLabel: 'Line Items Count',
      ediValue: ediItems.length.toString(),
      zohoValue: zohoItems.length.toString(),
      discrepancyType: 'line_count_mismatch',
      severity: 'info'
    });
  }

  // Check for line-item level discrepancies (by SKU/UPC)
  const zohoItemsByUpc = new Map();
  for (const zi of zohoItems) {
    const upc = zi.cf_upc || zi.upc || '';
    if (upc) zohoItemsByUpc.set(upc, zi);
  }

  for (let idx = 0; idx < ediItems.length; idx++) {
    const ei = ediItems[idx];
    const ediUpc = ei.productIds?.upc || '';
    const sku = ei.productIds?.sku || ei.productIds?.vendorItemNumber || ei.style || '';

    if (ediUpc && zohoItemsByUpc.has(ediUpc)) {
      const zi = zohoItemsByUpc.get(ediUpc);
      // Check quantity
      if (ei.quantityOrdered !== parseInt(zi.quantity || 0)) {
        discrepancies.push({
          ...baseData,
          fieldName: 'line_item_qty',
          fieldLabel: `Qty for ${sku || ediUpc}`,
          ediValue: (ei.quantityOrdered || 0).toString(),
          zohoValue: (zi.quantity || 0).toString(),
          discrepancyType: 'line_qty_mismatch',
          severity: 'warning',
          lineItemIndex: idx,
          lineItemSku: sku || ediUpc
        });
      }
      // Check price
      const ediPrice = ei.unitPrice || 0;
      const zohoPrice = parseFloat(zi.rate || 0);
      if (Math.abs(ediPrice - zohoPrice) > 0.01) {
        discrepancies.push({
          ...baseData,
          fieldName: 'line_item_price',
          fieldLabel: `Price for ${sku || ediUpc}`,
          ediValue: `$${ediPrice.toFixed(2)}`,
          zohoValue: `$${zohoPrice.toFixed(2)}`,
          discrepancyType: 'line_price_mismatch',
          severity: 'warning',
          lineItemIndex: idx,
          lineItemSku: sku || ediUpc
        });
      }
    }
  }

  return discrepancies;
}

const app = express();

// --- Origin Protection ---
const ORIGIN_SECRET = process.env.ORIGIN_SECRET;
if (ORIGIN_SECRET) {
  app.use((req, res, next) => {
    // Allow healthcheck and diagnostic endpoints for Railway and debugging
    if (req.path === '/health' || req.path.startsWith('/diag/')) {
      return next();
    }
    if (req.headers['x-origin-secret'] === ORIGIN_SECRET) {
      return next();
    }
    res.status(403).json({ error: 'Direct access not allowed' });
  });
}
app.use(express.json({ limit: '50mb' }));  // Increased limit for large session/match data
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.text({ limit: '50mb' }));
app.use(express.raw({ limit: '50mb' }));

// Initialize audit logger and cache
const auditLogger = new AuditLogger(pool);
const zohoDraftsCache = new ZohoDraftsCache(pool);

// Serve dashboard
app.get('/', (req, res) => {
  res.send(dashboardHTML);
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// OAuth routes
setupOAuthRoutes(app);

// ============================================================
// STATUS & STATS
// ============================================================

app.get('/status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'processed' OR zoho_so_number IS NOT NULL) as processed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending' AND zoho_so_number IS NULL) as pending,
        COUNT(*) FILTER (WHERE status = 'matched') as matched,
        COUNT(*) FILTER (WHERE status = 'review') as review
      FROM edi_orders
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    res.json({ last24Hours: result.rows[0], timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// SESSION PERSISTENCE
// ============================================================

// Get current session state
app.get('/session', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT match_results, selected_match_ids, flagged_match_ids,
              selected_match_drafts, focus_mode_index, current_stage, updated_at
       FROM ui_session WHERE session_key = 'default'`
    );
    if (result.rows.length === 0) {
      return res.json({
        matchResults: null,
        selectedMatchIds: [],
        flaggedMatchIds: [],
        selectedMatchDrafts: {},
        focusModeIndex: 0,
        currentStage: 'inbox'
      });
    }
    const row = result.rows[0];
    res.json({
      matchResults: row.match_results,
      selectedMatchIds: row.selected_match_ids || [],
      flaggedMatchIds: row.flagged_match_ids || [],
      selectedMatchDrafts: row.selected_match_drafts || {},
      focusModeIndex: row.focus_mode_index || 0,
      currentStage: row.current_stage || 'inbox',
      updatedAt: row.updated_at
    });
  } catch (error) {
    logger.error('Failed to get session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save session state
app.post('/session', async (req, res) => {
  try {
    const { matchResults, selectedMatchIds, flaggedMatchIds, selectedMatchDrafts, focusModeIndex, currentStage } = req.body;
    await pool.query(
      `INSERT INTO ui_session (session_key, match_results, selected_match_ids, flagged_match_ids, selected_match_drafts, focus_mode_index, current_stage, updated_at)
       VALUES ('default', $1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (session_key) DO UPDATE SET
         match_results = $1,
         selected_match_ids = $2,
         flagged_match_ids = $3,
         selected_match_drafts = $4,
         focus_mode_index = $5,
         current_stage = $6,
         updated_at = NOW()`,
      [
        matchResults ? JSON.stringify(matchResults) : null,
        JSON.stringify(selectedMatchIds || []),
        JSON.stringify(flaggedMatchIds || []),
        JSON.stringify(selectedMatchDrafts || {}),
        focusModeIndex || 0,
        currentStage || 'inbox'
      ]
    );
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to save session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear session state
app.delete('/session', async (req, res) => {
  try {
    await pool.query(
      `UPDATE ui_session SET
         match_results = NULL,
         selected_match_ids = '[]',
         flagged_match_ids = '[]',
         selected_match_drafts = '{}',
         focus_mode_index = 0,
         updated_at = NOW()
       WHERE session_key = 'default'`
    );
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to clear session:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ORDERS CRUD
// ============================================================

app.get('/orders', async (req, res) => {
  try {
    // Return ALL pending/review/matched/failed orders (the working set)
    // plus the most recent 50 processed orders for reference
    const result = await pool.query(`
      (SELECT id, filename, edi_order_number, edi_customer_name, status, 
             zoho_so_id, zoho_so_number, error_message, created_at, processed_at,
             parsed_data, matched_draft_id, raw_edi, vendor_isa_id
      FROM edi_orders 
      WHERE status IN ('pending', 'review', 'matched', 'failed')
      ORDER BY created_at DESC)
      UNION ALL
      (SELECT id, filename, edi_order_number, edi_customer_name, status, 
             zoho_so_id, zoho_so_number, error_message, created_at, processed_at,
             parsed_data, matched_draft_id, raw_edi, vendor_isa_id
      FROM edi_orders 
      WHERE status = 'processed'
      ORDER BY processed_at DESC
      LIMIT 50)
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/orders/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM edi_orders WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// SFTP FETCH
// ============================================================

app.post('/fetch-sftp', async (req, res) => {
  try {
    logger.info('Manual SFTP fetch triggered');
    await auditLogger.log(ACTIONS.SFTP_FETCH_STARTED, {
      severity: SEVERITY.INFO,
      details: { trigger: 'manual' }
    });
    
    const result = await processEDIOrders();
    
    await auditLogger.log(ACTIONS.SFTP_FETCH_COMPLETED, {
      severity: SEVERITY.SUCCESS,
      details: { 
        filesProcessed: result.filesProcessed || 0,
        ordersCreated: result.ordersCreated || 0,
        errors: result.errors?.length || 0
      }
    });
    
    res.json({ success: true, result });
  } catch (error) {
    logger.error('SFTP fetch failed', { error: error.message });
    await auditLogger.log(ACTIONS.SFTP_ERROR, {
      severity: SEVERITY.ERROR,
      errorMessage: error.message
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/process', async (req, res) => {
  try {
    const result = await processEDIOrders();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// SFTP BROWSER ENDPOINTS (NEW)
// ============================================================

// Get SFTP status - shows files in both incoming and archive folders
app.get('/sftp/status', async (req, res) => {
  try {
    const SFTPClient = require('./sftp');
    const sftp = new SFTPClient();
    
    await sftp.connect();
    const status = await sftp.getStatus();
    await sftp.disconnect();
    
    res.json({ success: true, ...status });
  } catch (error) {
    logger.error('SFTP status check failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// List files in incoming (orders) folder
app.get('/sftp/incoming', async (req, res) => {
  try {
    const SFTPClient = require('./sftp');
    const sftp = new SFTPClient();
    
    await sftp.connect();
    const files = await sftp.listIncomingFiles();
    await sftp.disconnect();
    
    res.json({ 
      success: true, 
      files,
      count: files.length,
      path: process.env.SFTP_ORDERS_PATH || '/orders'
    });
  } catch (error) {
    logger.error('SFTP incoming list failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// List files in archive folder
app.get('/sftp/archive', async (req, res) => {
  try {
    const SFTPClient = require('./sftp');
    const sftp = new SFTPClient();
    
    await sftp.connect();
    const files = await sftp.listArchivedFiles();
    await sftp.disconnect();
    
    // Optional: limit results
    const limit = parseInt(req.query.limit) || 100;
    const limitedFiles = files.slice(0, limit);
    
    res.json({ 
      success: true, 
      files: limitedFiles,
      count: files.length,
      showing: limitedFiles.length,
      path: process.env.SFTP_ARCHIVE_PATH || '/archive'
    });
  } catch (error) {
    logger.error('SFTP archive list failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Re-fetch a specific file from archive (download and process it again)
app.post('/sftp/refetch-from-archive', async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename required' });
    }
    
    logger.info('Re-fetching file from archive', { filename });
    
    await auditLogger.log('sftp_refetch_started', {
      severity: SEVERITY.INFO,
      details: { filename, source: 'archive' }
    });
    
    const SFTPClient = require('./sftp');
    const sftp = new SFTPClient();
    
    await sftp.connect();
    
    // Download the file content from archive
    const content = await sftp.downloadFromArchive(filename);
    
    await sftp.disconnect();
    
    // Now process it like a new file
    const { parseEDI } = require('./edi-parser');
    const parsed = parseEDI(content);
    
    if (!parsed || !parsed.header) {
      return res.status(400).json({ 
        success: false, 
        error: 'Could not parse EDI file',
        filename 
      });
    }
    
    // Check if this order already exists
    const existingResult = await pool.query(
      'SELECT id, status, zoho_so_number FROM edi_orders WHERE edi_order_number = $1',
      [parsed.header.purchaseOrderNumber]
    );
    
    let orderInfo;
    let isNew = false;
    
    if (existingResult.rows.length > 0) {
      // Order exists - update it with fresh data
      const existing = existingResult.rows[0];
      
      await pool.query(`
        UPDATE edi_orders 
        SET parsed_data = $1,
            raw_edi = $2,
            status = CASE WHEN status = 'processed' THEN 'review' ELSE status END,
            updated_at = NOW()
        WHERE id = $3
      `, [JSON.stringify(parsed), content, existing.id]);
      
      orderInfo = {
        id: existing.id,
        poNumber: parsed.header.purchaseOrderNumber,
        previousStatus: existing.status,
        zohoSoNumber: existing.zoho_so_number,
        action: 'updated'
      };
      
      logger.info('Re-fetched order updated', orderInfo);
    } else {
      // New order - insert it
      const customerName = parsed.parties?.buyer?.name || parsed.parties?.buyingParty?.name || 
                          parsed.parties?.shipTo?.name || 
                          'Unknown';
      
      const insertResult = await pool.query(`
        INSERT INTO edi_orders (filename, raw_edi, edi_order_number, edi_customer_name, parsed_data, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING id
      `, [
        filename,
        content,
        parsed.header.purchaseOrderNumber,
        customerName,
        JSON.stringify(parsed)
      ]);
      
      orderInfo = {
        id: insertResult.rows[0].id,
        poNumber: parsed.header.purchaseOrderNumber,
        customer: customerName,
        action: 'created'
      };
      isNew = true;
      
      logger.info('Re-fetched order created', orderInfo);
    }
    
    await auditLogger.log('sftp_refetch_completed', {
      severity: SEVERITY.SUCCESS,
      ediOrderId: orderInfo.id,
      ediOrderNumber: orderInfo.poNumber,
      details: { 
        filename, 
        source: 'archive',
        action: orderInfo.action,
        isNew
      }
    });
    
    res.json({
      success: true,
      message: isNew ? 'File fetched and new order created' : 'File fetched and existing order updated',
      order: orderInfo,
      parsed: {
        poNumber: parsed.header.purchaseOrderNumber,
        customer: parsed.parties?.buyer?.name || parsed.parties?.buyingParty?.name,
        itemCount: parsed.items?.length || 0,
        documentType: parsed.header.transactionSetCode || '850'
      }
    });
    
  } catch (error) {
    logger.error('SFTP refetch from archive failed', { error: error.message, filename: req.body.filename });
    
    await auditLogger.log('sftp_refetch_error', {
      severity: SEVERITY.ERROR,
      errorMessage: error.message,
      details: { filename: req.body.filename, source: 'archive' }
    });
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Re-fetch a specific file from incoming folder
app.post('/sftp/refetch-from-incoming', async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename required' });
    }
    
    logger.info('Re-fetching file from incoming', { filename });
    
    await auditLogger.log('sftp_refetch_started', {
      severity: SEVERITY.INFO,
      details: { filename, source: 'incoming' }
    });
    
    const SFTPClient = require('./sftp');
    const sftp = new SFTPClient();
    
    await sftp.connect();
    
    // Download the file content from incoming
    const content = await sftp.downloadFile(filename);
    
    await sftp.disconnect();
    
    // Now process it like a new file
    const { parseEDI } = require('./edi-parser');
    const parsed = parseEDI(content);
    
    if (!parsed || !parsed.header) {
      return res.status(400).json({ 
        success: false, 
        error: 'Could not parse EDI file',
        filename 
      });
    }
    
    // Check if this order already exists
    const existingResult = await pool.query(
      'SELECT id, status, zoho_so_number FROM edi_orders WHERE edi_order_number = $1',
      [parsed.header.purchaseOrderNumber]
    );
    
    let orderInfo;
    let isNew = false;
    
    if (existingResult.rows.length > 0) {
      // Order exists - update it with fresh data
      const existing = existingResult.rows[0];
      
      await pool.query(`
        UPDATE edi_orders 
        SET parsed_data = $1,
            raw_edi = $2,
            status = CASE WHEN status = 'processed' THEN 'review' ELSE status END,
            updated_at = NOW()
        WHERE id = $3
      `, [JSON.stringify(parsed), content, existing.id]);
      
      orderInfo = {
        id: existing.id,
        poNumber: parsed.header.purchaseOrderNumber,
        previousStatus: existing.status,
        zohoSoNumber: existing.zoho_so_number,
        action: 'updated'
      };
      
      logger.info('Re-fetched order updated', orderInfo);
    } else {
      // New order - insert it
      const customerName = parsed.parties?.buyer?.name || parsed.parties?.buyingParty?.name || 
                          parsed.parties?.shipTo?.name || 
                          'Unknown';
      
      const insertResult = await pool.query(`
        INSERT INTO edi_orders (filename, raw_edi, edi_order_number, edi_customer_name, parsed_data, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING id
      `, [
        filename,
        content,
        parsed.header.purchaseOrderNumber,
        customerName,
        JSON.stringify(parsed)
      ]);
      
      orderInfo = {
        id: insertResult.rows[0].id,
        poNumber: parsed.header.purchaseOrderNumber,
        customer: customerName,
        action: 'created'
      };
      isNew = true;
      
      logger.info('Re-fetched order created', orderInfo);
    }
    
    await auditLogger.log('sftp_refetch_completed', {
      severity: SEVERITY.SUCCESS,
      ediOrderId: orderInfo.id,
      ediOrderNumber: orderInfo.poNumber,
      details: { 
        filename, 
        source: 'incoming',
        action: orderInfo.action,
        isNew
      }
    });
    
    res.json({
      success: true,
      message: isNew ? 'File fetched and new order created' : 'File fetched and existing order updated',
      order: orderInfo,
      parsed: {
        poNumber: parsed.header.purchaseOrderNumber,
        customer: parsed.parties?.buyer?.name || parsed.parties?.buyingParty?.name,
        itemCount: parsed.items?.length || 0,
        documentType: parsed.header.transactionSetCode || '850'
      }
    });
    
  } catch (error) {
    logger.error('SFTP refetch from incoming failed', { error: error.message, filename: req.body.filename });
    
    await auditLogger.log('sftp_refetch_error', {
      severity: SEVERITY.ERROR,
      errorMessage: error.message,
      details: { filename: req.body.filename, source: 'incoming' }
    });
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk re-fetch multiple files from archive
app.post('/sftp/bulk-refetch', async (req, res) => {
  try {
    const { filenames, source = 'archive' } = req.body;
    
    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ success: false, error: 'Filenames array required' });
    }
    
    logger.info('Bulk re-fetching files', { count: filenames.length, source });
    
    const SFTPClient = require('./sftp');
    const sftp = new SFTPClient();
    const { parseEDI } = require('./edi-parser');
    
    await sftp.connect();
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const filename of filenames) {
      try {
        // Download file
        const content = source === 'archive' 
          ? await sftp.downloadFromArchive(filename)
          : await sftp.downloadFile(filename);
        
        // Parse it
        const parsed = parseEDI(content);
        
        if (!parsed || !parsed.header) {
          results.push({ filename, success: false, error: 'Parse failed' });
          errorCount++;
          continue;
        }
        
        // Check if exists
        const existingResult = await pool.query(
          'SELECT id, status FROM edi_orders WHERE edi_order_number = $1',
          [parsed.header.purchaseOrderNumber]
        );
        
        if (existingResult.rows.length > 0) {
          // Update existing
          await pool.query(`
            UPDATE edi_orders 
            SET parsed_data = $1, raw_edi = $2, updated_at = NOW()
            WHERE id = $3
          `, [JSON.stringify(parsed), content, existingResult.rows[0].id]);
          
          results.push({ 
            filename, 
            success: true, 
            action: 'updated',
            orderId: existingResult.rows[0].id,
            poNumber: parsed.header.purchaseOrderNumber
          });
        } else {
          // Create new
          const customerName = parsed.parties?.buyer?.name || parsed.parties?.buyingParty?.name || 'Unknown';
          const insertResult = await pool.query(`
            INSERT INTO edi_orders (filename, raw_edi, edi_order_number, edi_customer_name, parsed_data, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING id
          `, [filename, content, parsed.header.purchaseOrderNumber, customerName, JSON.stringify(parsed)]);
          
          results.push({ 
            filename, 
            success: true, 
            action: 'created',
            orderId: insertResult.rows[0].id,
            poNumber: parsed.header.purchaseOrderNumber
          });
        }
        
        successCount++;
        
      } catch (fileError) {
        results.push({ filename, success: false, error: fileError.message });
        errorCount++;
      }
    }
    
    await sftp.disconnect();
    
    await auditLogger.log('sftp_bulk_refetch_completed', {
      severity: errorCount === 0 ? SEVERITY.SUCCESS : SEVERITY.WARNING,
      details: { 
        source,
        totalFiles: filenames.length,
        successCount,
        errorCount
      }
    });
    
    res.json({
      success: true,
      summary: {
        total: filenames.length,
        successful: successCount,
        failed: errorCount
      },
      results
    });
    
  } catch (error) {
    logger.error('Bulk SFTP refetch failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// MATCHING SYSTEM (with caching)
// ============================================================

app.post('/find-matches', async (req, res) => {
  try {
    const { orderIds, forceRefresh } = req.body;
    
    let orders;
    if (orderIds && orderIds.length > 0) {
      const result = await pool.query('SELECT * FROM edi_orders WHERE id = ANY($1)', [orderIds]);
      orders = result.rows;
    } else {
      const result = await pool.query("SELECT * FROM edi_orders WHERE status = 'pending' ORDER BY created_at DESC LIMIT 500");
      orders = result.rows;
    }
    
    if (orders.length === 0) {
      return res.json({ success: true, matches: [], noMatches: [], sessionId: null });
    }
    
    await auditLogger.log(ACTIONS.MATCH_SEARCH_STARTED, {
      severity: SEVERITY.INFO,
      details: { orderCount: orders.length }
    });
    
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    
    // Use cached drafts - ALWAYS use existing cache for matching
    // Cache refresh is a separate operation (Refresh Zoho Data button) because
    // with 5000+ orders it takes too long to do inline
    let drafts;
    const cacheStatus = await zohoDraftsCache.getCacheStatus();
    
    if (cacheStatus.draftsCount > 0) {
      // Use whatever cache we have (even if stale)
      logger.info('Using cached Zoho drafts', { 
        draftsCount: cacheStatus.draftsCount, 
        minutesOld: cacheStatus.minutesSinceRefresh,
        isStale: cacheStatus.isStale 
      });
      drafts = await zohoDraftsCache.getCachedDrafts();
    } else {
      // No cache at all - need to build it first
      // But DON'T do a full detail fetch - just get list data quickly
      logger.info('No cache exists, fetching Zoho order list (without details)');
      try {
        const ZohoClientForList = require('./zoho');
        const zohoForList = new ZohoClientForList();
        const draftList = await zohoForList.getDraftSalesOrders();
        const confirmedList = await zohoForList.getConfirmedSalesOrders();
        const allList = [...draftList, ...confirmedList];
        
        // Quick-cache list data without line items
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('DELETE FROM zoho_drafts_cache');
          for (const order of allList) {
            await client.query(`
              INSERT INTO zoho_drafts_cache (
                zoho_salesorder_id, salesorder_number,
                customer_id, customer_name,
                reference_number, status, total, shipment_date, order_date,
                line_items, item_count, total_units,
                raw_data, fetched_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
              ON CONFLICT (zoho_salesorder_id) DO UPDATE SET
                customer_name = $4, reference_number = $5, status = $6, 
                total = $7, updated_at = NOW()
            `, [
              order.salesorder_id, order.salesorder_number,
              order.customer_id, order.customer_name,
              order.reference_number || null, order.status,
              parseFloat(order.total) || 0, order.shipment_date || null,
              order.date || null, JSON.stringify([]), 0, 0,
              JSON.stringify(order)
            ]);
          }
          await client.query(`
            UPDATE zoho_cache_metadata SET last_refresh = NOW(), 
              drafts_count = $1, updated_at = NOW() WHERE cache_type = 'drafts'
          `, [allList.length]);
          await client.query('COMMIT');
        } finally {
          client.release();
        }
        
        drafts = await zohoDraftsCache.getCachedDrafts();
        logger.info('Quick-cached Zoho order list', { count: drafts.length });
      } catch (listError) {
        logger.error('Failed to quick-cache Zoho orders', { error: listError.message });
        return res.json({ success: true, matches: [], noMatches: [], draftsChecked: 0, 
          error: 'No Zoho cache available. Click Refresh Zoho Data first.' });
      }
    }
    
    // Load customer mappings for enhanced matching
    const mappingsResult = await pool.query('SELECT * FROM customer_mappings');
    const customerMappings = mappingsResult.rows || [];

    // Load customer-specific matching rules
    const rulesResult = await pool.query('SELECT * FROM customer_matching_rules ORDER BY is_default ASC, customer_name ASC');
    const customerRules = rulesResult.rows || [];

    // Run matching against cached drafts (with customer mappings and rules)
    const matchResults = await zoho.findMatchingDraftsFromCache(orders, drafts, customerMappings, customerRules);
    
    // Save match results server-side
    const session = await auditLogger.saveMatchSession(
      matchResults.matches,
      matchResults.noMatches,
      'user'
    );
    
    await auditLogger.log(ACTIONS.MATCH_SEARCH_COMPLETED, {
      severity: SEVERITY.SUCCESS,
      details: {
        sessionId: session.sessionId,
        ordersSearched: orders.length,
        matchesFound: matchResults.matches?.length || 0,
        noMatchCount: matchResults.noMatches?.length || 0,
        usedCache: !forceRefresh && !cacheStatus.isStale
      }
    });
    
    // Log each match found
    for (const match of (matchResults.matches || [])) {
      await auditLogger.log(ACTIONS.MATCH_FOUND, {
        ediOrderId: match.ediOrder.id,
        ediOrderNumber: match.ediOrder.poNumber,
        customerName: match.ediOrder.customer,
        orderAmount: match.ediOrder.totalAmount,
        zohoDraftId: match.zohoDraft.id,
        zohoDraftNumber: match.zohoDraft.number,
        matchConfidence: match.confidence,
        matchCriteria: match.score?.details
      });
    }
    
    const cacheIsStale = cacheStatus.isStale;

    res.json({
      success: true,
      matches: matchResults.matches,
      noMatches: matchResults.noMatches,
      draftsChecked: drafts.length,
      sessionId: session.sessionId,
      cacheIsStale: cacheIsStale,
      cacheAge: cacheStatus.minutesSinceRefresh
    });
    
  } catch (error) {
    logger.error('Find matches failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/confirm-matches', async (req, res) => {
  try {
    const { matches, newOrders } = req.body;
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    
    let processed = 0, failed = 0;
    const results = [];
    
    // Process matches (update existing drafts)
    for (const match of (matches || [])) {
      try {
        const orderResult = await pool.query('SELECT * FROM edi_orders WHERE id = $1', [match.ediOrderId]);
        if (orderResult.rows.length === 0) continue;

        const ediOrder = orderResult.rows[0];
        const parsed = ediOrder.parsed_data || {};
        const items = parsed.items || [];
        const totalAmount = items.reduce((sum, item) => sum + ((item.quantityOrdered || 0) * (item.unitPrice || 0)), 0);
        const totalUnits = items.reduce((sum, item) => sum + (item.quantityOrdered || 0), 0);
        const ediShipDate = parsed.dates?.shipDate || parsed.dates?.shipNotBefore || null;
        const ediCancelDate = parsed.dates?.cancelDate || parsed.dates?.shipNotAfter || null;

        // Get the current Zoho draft data before updating (for audit trail and discrepancy detection)
        let zohoBeforeData = null;
        try {
          zohoBeforeData = await zoho.getSalesOrderDetails(match.zohoDraftId);
        } catch (e) {
          logger.warn('Could not fetch Zoho draft before update', { draftId: match.zohoDraftId });
        }

        // Detect and log discrepancies before update
        if (zohoBeforeData) {
          const discrepancies = detectDiscrepancies(ediOrder, zohoBeforeData);
          if (discrepancies.length > 0) {
            logger.info('Discrepancies detected in bulk confirm', {
              orderId: match.ediOrderId,
              count: discrepancies.length
            });
            await db.logMultipleDiscrepancies(discrepancies);
          }
        }

        const updated = await zoho.updateDraftWithEdiData(match.zohoDraftId, ediOrder);

        // Calculate what changed
        const changesApplied = [];
        if (zohoBeforeData) {
          if (ediShipDate && ediShipDate !== zohoBeforeData.shipment_date) {
            changesApplied.push({ field: 'Ship Date', from: zohoBeforeData.shipment_date, to: ediShipDate });
          }
          if (totalAmount && Math.abs(totalAmount - parseFloat(zohoBeforeData.total || 0)) > 1) {
            changesApplied.push({ field: 'Amount', from: zohoBeforeData.total, to: totalAmount });
          }
          if (totalUnits && totalUnits !== (zohoBeforeData.line_items || []).reduce((s, i) => s + (i.quantity || 0), 0)) {
            changesApplied.push({ field: 'Units', from: (zohoBeforeData.line_items || []).reduce((s, i) => s + (i.quantity || 0), 0), to: totalUnits });
          }
          if (items.length !== (zohoBeforeData.line_items || []).length) {
            changesApplied.push({ field: 'Line Items', from: (zohoBeforeData.line_items || []).length, to: items.length });
          }
        }

        await pool.query(`
          UPDATE edi_orders
          SET status = 'processed', zoho_so_id = $1, zoho_so_number = $2, matched_draft_id = $3, processed_at = NOW()
          WHERE id = $4
        `, [updated.salesorder_id, updated.salesorder_number, match.zohoDraftId, match.ediOrderId]);

        // Record in permanent audit log with changes
        await auditLogger.recordZohoSend({
          ediOrderId: ediOrder.id,
          ediOrderNumber: ediOrder.edi_order_number,
          poNumber: ediOrder.edi_order_number,
          customerName: ediOrder.edi_customer_name,
          orderAmount: totalAmount,
          itemCount: items.length,
          unitCount: totalUnits,
          shipDate: ediShipDate,
          zohoSoId: updated.salesorder_id,
          zohoSoNumber: updated.salesorder_number,
          zohoCustomerId: updated.customer_id,
          zohoCustomerName: updated.customer_name,
          matchedDraftId: match.zohoDraftId,
          matchedDraftNumber: updated.salesorder_number,
          matchConfidence: match.confidence,
          wasNewOrder: false,
          ediRawData: parsed,
          zohoResponse: updated,
          changesApplied: changesApplied,
          zohoBeforeData: zohoBeforeData
        });
        
        processed++;
        results.push({ 
          ediOrderId: match.ediOrderId, 
          success: true, 
          zohoId: updated.salesorder_id,
          zohoSoNumber: updated.salesorder_number,
          zohoCustomerName: updated.customer_name,
          poNumber: ediOrder.edi_order_number,
          changesApplied: changesApplied
        });
        logger.info('Match confirmed', { ediOrderId: match.ediOrderId, zohoSoNumber: updated.salesorder_number });
        
      } catch (error) {
        failed++;
        results.push({ ediOrderId: match.ediOrderId, success: false, error: error.message });
        await auditLogger.log(ACTIONS.ZOHO_ERROR, {
          severity: SEVERITY.ERROR,
          ediOrderId: match.ediOrderId,
          errorMessage: error.message,
          details: { operation: 'update_draft', draftId: match.zohoDraftId }
        });
        logger.error('Failed to process match', { ediOrderId: match.ediOrderId, error: error.message });
      }
    }
    
    // Process new orders
    for (const newOrder of (newOrders || [])) {
      try {
        const orderResult = await pool.query('SELECT * FROM edi_orders WHERE id = $1', [newOrder.ediOrderId]);
        if (orderResult.rows.length === 0) continue;
        
        const ediOrder = orderResult.rows[0];
        const parsed = ediOrder.parsed_data || {};
        const items = parsed.items || [];
        const totalAmount = items.reduce((sum, item) => sum + ((item.quantityOrdered || 0) * (item.unitPrice || 0)), 0);
        const totalUnits = items.reduce((sum, item) => sum + (item.quantityOrdered || 0), 0);
        
        const mappingResult = await pool.query(
          'SELECT zoho_customer_id, zoho_customer_name FROM customer_mappings WHERE edi_customer_name = $1',
          [ediOrder.edi_customer_name]
        );
        
        if (mappingResult.rows.length === 0) {
          failed++;
          results.push({ ediOrderId: newOrder.ediOrderId, success: false, error: 'No customer mapping' });
          await auditLogger.log(ACTIONS.ZOHO_ERROR, {
            severity: SEVERITY.ERROR,
            ediOrderId: newOrder.ediOrderId,
            ediOrderNumber: ediOrder.edi_order_number,
            customerName: ediOrder.edi_customer_name,
            errorMessage: 'No customer mapping found',
            details: { operation: 'create_new' }
          });
          continue;
        }
        
        const customerMapping = mappingResult.rows[0];
        
        const created = await zoho.createBooksSalesOrder({
          customerId: customerMapping.zoho_customer_id,
          poNumber: ediOrder.edi_order_number,
          orderDate: parsed.dates?.orderDate,
          shipDate: parsed.dates?.shipNotBefore,
          items: items
        });
        
        await pool.query(`
          UPDATE edi_orders 
          SET status = 'processed', zoho_so_id = $1, zoho_so_number = $2, processed_at = NOW()
          WHERE id = $3
        `, [created.salesorder_id, created.salesorder_number, newOrder.ediOrderId]);
        
        // Record in permanent audit log
        await auditLogger.recordZohoSend({
          ediOrderId: ediOrder.id,
          ediOrderNumber: ediOrder.edi_order_number,
          poNumber: ediOrder.edi_order_number,
          customerName: ediOrder.edi_customer_name,
          orderAmount: totalAmount,
          itemCount: items.length,
          unitCount: totalUnits,
          shipDate: parsed.dates?.shipNotBefore || parsed.dates?.shipDate,
          zohoSoId: created.salesorder_id,
          zohoSoNumber: created.salesorder_number,
          zohoCustomerId: customerMapping.zoho_customer_id,
          zohoCustomerName: customerMapping.zoho_customer_name,
          matchedDraftId: null,
          matchedDraftNumber: null,
          matchConfidence: null,
          wasNewOrder: true,
          ediRawData: parsed,
          zohoResponse: created
        });
        
        processed++;
        results.push({ 
          ediOrderId: newOrder.ediOrderId, 
          success: true, 
          zohoId: created.salesorder_id,
          zohoSoNumber: created.salesorder_number,
          zohoCustomerName: customerMapping.zoho_customer_name,
          poNumber: ediOrder.edi_order_number,
          wasNewOrder: true
        });
        
      } catch (error) {
        failed++;
        results.push({ ediOrderId: newOrder.ediOrderId, success: false, error: error.message });
        await auditLogger.log(ACTIONS.ZOHO_ERROR, {
          severity: SEVERITY.ERROR,
          ediOrderId: newOrder.ediOrderId,
          errorMessage: error.message,
          details: { operation: 'create_new' }
        });
      }
    }
    
    res.json({ success: true, processed, failed, results });
    
  } catch (error) {
    logger.error('Confirm matches failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/update-draft', async (req, res) => {
  try {
    const { ediOrderId, zohoDraftId, fieldSelections } = req.body;

    const orderResult = await pool.query('SELECT * FROM edi_orders WHERE id = $1', [ediOrderId]);
    if (orderResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });

    const ediOrder = orderResult.rows[0];
    const parsed = ediOrder.parsed_data || {};
    let items = parsed.items || [];

    // Apply field selections if provided
    const isPartial = fieldSelections?.isPartial === true;
    const selectedFields = fieldSelections?.fields || {};
    const overrides = fieldSelections?.overrides || {};
    const selectedLineItems = fieldSelections?.lineItems;

    // Filter line items if selective
    if (selectedLineItems && Array.isArray(selectedLineItems) && selectedLineItems.length < items.length) {
      items = items.filter((_, idx) => selectedLineItems.includes(idx));
      logger.info('Selective line items', {
        orderId: ediOrderId,
        originalCount: parsed.items.length,
        selectedCount: items.length
      });
    }

    const totalAmount = items.reduce((sum, item) => sum + ((item.quantityOrdered || 0) * (item.unitPrice || 0)), 0);
    const totalUnits = items.reduce((sum, item) => sum + (item.quantityOrdered || 0), 0);

    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();

    // Fetch Zoho draft data for discrepancy detection
    let zohoDraft = null;
    try {
      zohoDraft = await zoho.getSalesOrderDetails(zohoDraftId);
    } catch (e) {
      logger.warn('Could not fetch Zoho draft for discrepancy check', { draftId: zohoDraftId });
    }

    // Detect and log discrepancies before update
    if (zohoDraft) {
      const discrepancies = detectDiscrepancies(ediOrder, zohoDraft);
      if (discrepancies.length > 0) {
        logger.info('Discrepancies detected', {
          orderId: ediOrderId,
          count: discrepancies.length,
          types: [...new Set(discrepancies.map(d => d.discrepancyType))]
        });
        await db.logMultipleDiscrepancies(discrepancies);
      }
    }

    // Pass field selections and overrides to the Zoho update
    const updated = await zoho.updateDraftWithEdiData(zohoDraftId, ediOrder, {
      selectedFields,
      overrides,
      selectedItems: items
    });

    // Determine status based on partial or full
    const newStatus = isPartial ? 'partial' : 'processed';

    // Track what was sent vs pending
    const fieldsSent = { ...selectedFields };
    const fieldsPending = {};
    if (isPartial) {
      ['shipDate', 'cancelDate', 'customer', 'poNumber'].forEach(f => {
        if (selectedFields[f] === false) {
          fieldsPending[f] = true;
        }
      });
    }

    await pool.query(`
      UPDATE edi_orders
      SET status = $1,
          zoho_so_id = $2,
          zoho_so_number = $3,
          matched_draft_id = $4,
          processed_at = NOW(),
          is_partial = $5,
          fields_sent = $6,
          fields_pending = $7,
          line_items_sent = $8,
          line_items_pending = $9,
          field_overrides = $10,
          partial_processed_at = CASE WHEN $5 THEN NOW() ELSE NULL END
      WHERE id = $11
    `, [
      newStatus,
      updated.salesorder_id,
      updated.salesorder_number,
      zohoDraftId,
      isPartial,
      JSON.stringify(fieldsSent),
      JSON.stringify(fieldsPending),
      JSON.stringify(selectedLineItems || []),
      JSON.stringify(isPartial && selectedLineItems ?
        (parsed.items || []).map((_, i) => i).filter(i => !selectedLineItems.includes(i)) :
        []),
      JSON.stringify(overrides),
      ediOrderId
    ]);
    
    // Record in permanent audit log
    await auditLogger.recordZohoSend({
      ediOrderId: ediOrder.id,
      ediOrderNumber: ediOrder.edi_order_number,
      poNumber: ediOrder.edi_order_number,
      customerName: ediOrder.edi_customer_name,
      orderAmount: totalAmount,
      itemCount: items.length,
      unitCount: totalUnits,
      shipDate: parsed.dates?.shipNotBefore || parsed.dates?.shipDate,
      zohoSoId: updated.salesorder_id,
      zohoSoNumber: updated.salesorder_number,
      zohoCustomerId: updated.customer_id,
      zohoCustomerName: updated.customer_name,
      matchedDraftId: zohoDraftId,
      matchedDraftNumber: updated.salesorder_number,
      matchConfidence: null,
      wasNewOrder: false,
      ediRawData: parsed,
      zohoResponse: updated
    });
    
    res.json({ success: true, zohoOrder: updated });
    
  } catch (error) {
    await auditLogger.log(ACTIONS.ZOHO_ERROR, {
      severity: SEVERITY.ERROR,
      ediOrderId: req.body.ediOrderId,
      errorMessage: error.message,
      details: { operation: 'update_draft', draftId: req.body.zohoDraftId }
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// CREATE NEW ORDER (for unmatched EDI orders)
// ============================================================

// Preview what would be created in Zoho (before actually creating)
app.post('/preview-new-order', async (req, res) => {
  try {
    const { ediOrderId } = req.body;
    
    // Get the EDI order
    const orderResult = await pool.query('SELECT * FROM edi_orders WHERE id = $1', [ediOrderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'EDI order not found' });
    }
    
    const ediOrder = orderResult.rows[0];
    const parsed = ediOrder.parsed_data || {};
    const items = parsed.items || [];
    
    // Check customer mapping
    const mappingResult = await pool.query(
      'SELECT * FROM customer_mappings WHERE LOWER(edi_customer_name) = LOWER($1)',
      [ediOrder.edi_customer_name]
    );
    
    let customerInfo = null;
    let customerError = null;
    
    if (mappingResult.rows.length === 0) {
      customerError = 'Customer not found in mappings. Please add a customer mapping for "' + ediOrder.edi_customer_name + '" first.';
    } else {
      customerInfo = {
        ediName: ediOrder.edi_customer_name,
        zohoId: mappingResult.rows[0].zoho_customer_id,
        zohoName: mappingResult.rows[0].zoho_customer_name
      };
    }
    
    // Build preview of what would be sent
    const lineItems = items.map(item => ({
      style: item.productIds?.sku || item.productIds?.vendorItemNumber || 'Unknown',
      description: item.description || '',
      color: item.color || '',
      size: item.size || '',
      quantity: item.quantityOrdered || 0,
      unitPrice: item.unitPrice || 0,
      lineTotal: (item.quantityOrdered || 0) * (item.unitPrice || 0)
    }));
    
    const totalAmount = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalUnits = lineItems.reduce((sum, item) => sum + item.quantity, 0);
    
    const preview = {
      ediOrderId: ediOrder.id,
      poNumber: ediOrder.edi_order_number,
      customer: customerInfo,
      customerError: customerError,
      canCreate: !customerError,
      dates: {
        orderDate: parsed.dates?.orderDate || new Date().toISOString().split('T')[0],
        shipDate: parsed.dates?.shipNotBefore || parsed.dates?.shipDate || null,
        cancelDate: parsed.dates?.cancelAfter || null
      },
      summary: {
        itemCount: lineItems.length,
        totalUnits: totalUnits,
        totalAmount: totalAmount
      },
      lineItems: lineItems,
      rawEdiData: parsed
    };
    
    res.json({ success: true, preview });
    
  } catch (error) {
    logger.error('Preview new order failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Actually create the new order in Zoho
app.post('/create-new-order', async (req, res) => {
  try {
    const { ediOrderId, confirmed } = req.body;
    
    if (!confirmed) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order creation must be confirmed. Use preview-new-order first, then set confirmed: true' 
      });
    }
    
    // Get the EDI order
    const orderResult = await pool.query('SELECT * FROM edi_orders WHERE id = $1', [ediOrderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'EDI order not found' });
    }
    
    const ediOrder = orderResult.rows[0];
    const parsed = ediOrder.parsed_data || {};
    const items = parsed.items || [];
    
    // Check if already processed
    if (ediOrder.status === 'processed' && ediOrder.zoho_so_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Order already processed. Zoho SO#: ' + ediOrder.zoho_so_number 
      });
    }
    
    // Check customer mapping - REQUIRED
    const mappingResult = await pool.query(
      'SELECT * FROM customer_mappings WHERE LOWER(edi_customer_name) = LOWER($1)',
      [ediOrder.edi_customer_name]
    );
    
    if (mappingResult.rows.length === 0) {
      // Log the failure
      await auditLogger.log(ACTIONS.ZOHO_ERROR, {
        severity: SEVERITY.ERROR,
        ediOrderId: ediOrder.id,
        ediOrderNumber: ediOrder.edi_order_number,
        customerName: ediOrder.edi_customer_name,
        errorMessage: 'Customer not found in mappings - order not created',
        details: {
          operation: 'create_new_order',
          reason: 'no_customer_mapping',
          ediCustomerName: ediOrder.edi_customer_name
        }
      });
      
      return res.status(400).json({ 
        success: false, 
        error: 'Order NOT created - Customer "' + ediOrder.edi_customer_name + '" not found in Zoho mappings. Please add a customer mapping first.',
        reason: 'customer_not_found'
      });
    }
    
    const customerMapping = mappingResult.rows[0];
    
    // Calculate totals for audit
    const totalAmount = items.reduce((sum, item) => sum + ((item.quantityOrdered || 0) * (item.unitPrice || 0)), 0);
    const totalUnits = items.reduce((sum, item) => sum + (item.quantityOrdered || 0), 0);
    
    // Create the order in Zoho
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    
    const created = await zoho.createBooksSalesOrder({
      customerId: customerMapping.zoho_customer_id,
      poNumber: ediOrder.edi_order_number,
      orderDate: parsed.dates?.orderDate || new Date().toISOString().split('T')[0],
      shipDate: parsed.dates?.shipNotBefore || parsed.dates?.shipDate,
      notes: 'Created from EDI order ' + ediOrder.edi_order_number + ' on ' + new Date().toISOString(),
      items: items.map(item => ({
        style: item.productIds?.sku || item.productIds?.vendorItemNumber || 'Item',
        description: (item.description || '') + ' ' + (item.color || '') + ' ' + (item.size || ''),
        quantityOrdered: item.quantityOrdered || 0,
        unitPrice: item.unitPrice || 0
      }))
    });
    
    // Update EDI order status
    await pool.query(`
      UPDATE edi_orders 
      SET status = 'processed', zoho_so_id = $1, zoho_so_number = $2, processed_at = NOW()
      WHERE id = $3
    `, [created.salesorder_id, created.salesorder_number, ediOrderId]);
    
    // Record in PERMANENT audit log
    await auditLogger.recordZohoSend({
      ediOrderId: ediOrder.id,
      ediOrderNumber: ediOrder.edi_order_number,
      poNumber: ediOrder.edi_order_number,
      customerName: ediOrder.edi_customer_name,
      orderAmount: totalAmount,
      itemCount: items.length,
      unitCount: totalUnits,
      shipDate: parsed.dates?.shipNotBefore || parsed.dates?.shipDate,
      zohoSoId: created.salesorder_id,
      zohoSoNumber: created.salesorder_number,
      zohoCustomerId: customerMapping.zoho_customer_id,
      zohoCustomerName: customerMapping.zoho_customer_name,
      matchedDraftId: null,
      matchedDraftNumber: null,
      matchConfidence: null,
      wasNewOrder: true,
      ediRawData: parsed,
      zohoResponse: created
    });
    
    // Also log to activity log with full details
    await auditLogger.log(ACTIONS.NEW_ORDER_CREATED, {
      severity: SEVERITY.SUCCESS,
      ediOrderId: ediOrder.id,
      ediOrderNumber: ediOrder.edi_order_number,
      customerName: ediOrder.edi_customer_name,
      zohoSoId: created.salesorder_id,
      zohoSoNumber: created.salesorder_number,
      orderAmount: totalAmount,
      details: {
        operation: 'create_new_order',
        matchType: 'no_match_created_new',
        itemCount: items.length,
        unitCount: totalUnits,
        zohoCustomerId: customerMapping.zoho_customer_id,
        zohoCustomerName: customerMapping.zoho_customer_name,
        shipDate: parsed.dates?.shipNotBefore,
        lineItemsSent: items.length
      }
    });
    
    logger.info('New order created in Zoho', {
      ediOrderId: ediOrder.id,
      poNumber: ediOrder.edi_order_number,
      zohoSoId: created.salesorder_id,
      zohoSoNumber: created.salesorder_number
    });
    
    res.json({
      success: true,
      message: 'Order created successfully in Zoho',
      zohoSalesOrder: {
        id: created.salesorder_id,
        number: created.salesorder_number,
        customer: customerMapping.zoho_customer_name,
        total: created.total
      },
      ediOrder: {
        id: ediOrder.id,
        poNumber: ediOrder.edi_order_number
      }
    });
    
  } catch (error) {
    logger.error('Create new order failed', { error: error.message, ediOrderId: req.body.ediOrderId });
    
    // Log the error
    await auditLogger.log(ACTIONS.ZOHO_ERROR, {
      severity: SEVERITY.ERROR,
      ediOrderId: req.body.ediOrderId,
      errorMessage: error.message,
      details: {
        operation: 'create_new_order',
        zohoError: error.response?.data || error.message
      }
    });
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// AUDIT LOG ENDPOINTS
// ============================================================

app.get('/audit/stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const stats = await auditLogger.getSummaryStats(days);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/audit/zoho-orders', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 500;
    const filters = {
      customerName: req.query.customer,
      poNumber: req.query.po,
      zohoSoNumber: req.query.so,
      fromDate: req.query.from,
      toDate: req.query.to
    };
    const orders = await auditLogger.getZohoOrdersSent(limit, filters);
    res.json({ success: true, orders, count: orders.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/audit/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const filters = {
      action: req.query.action,
      severity: req.query.severity,
      customerName: req.query.customer,
      poNumber: req.query.po,
      fromDate: req.query.from,
      toDate: req.query.to
    };
    const activity = await auditLogger.getRecentActivity(limit, filters);
    res.json({ success: true, activity });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/audit/check/:poNumber', async (req, res) => {
  try {
    const result = await auditLogger.wasOrderSentToZoho(req.params.poNumber);
    res.json({ success: true, alreadySent: !!result, details: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// DISCREPANCY TRACKING ENDPOINTS
// ============================================================

// Get discrepancies with filters
app.get('/discrepancies', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      customerName: req.query.customer,
      discrepancyType: req.query.type,
      poNumber: req.query.po,
      resolved: req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : 500
    };
    const discrepancies = await db.getDiscrepancies(filters);
    res.json({ success: true, discrepancies, count: discrepancies.length });
  } catch (error) {
    logger.error('Error fetching discrepancies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get discrepancy summary/stats
app.get('/discrepancies/summary', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    const summary = await db.getDiscrepancySummary(filters);
    res.json({ success: true, summary });
  } catch (error) {
    logger.error('Error fetching discrepancy summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export discrepancies to Excel format
app.get('/discrepancies/export', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      customerName: req.query.customer,
      discrepancyType: req.query.type,
      resolved: req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined
    };
    const discrepancies = await db.getDiscrepancies(filters);

    // Return data formatted for Excel export (client will generate the file)
    const exportData = discrepancies.map(d => ({
      'Date Detected': new Date(d.detected_at).toLocaleDateString(),
      'Time': new Date(d.detected_at).toLocaleTimeString(),
      'Customer': d.customer_name || '',
      'PO Number': d.po_number || '',
      'Zoho SO#': d.zoho_so_number || '',
      'Field': d.field_label || d.field_name,
      'EDI Value': d.edi_value || '',
      'Zoho Value': d.zoho_value || '',
      'Type': d.discrepancy_type || 'mismatch',
      'Severity': d.severity || 'warning',
      'Line Item SKU': d.line_item_sku || '',
      'Status': d.resolved_at ? 'Resolved' : 'Open',
      'Resolved By': d.resolved_by || '',
      'Resolution Notes': d.resolution_notes || ''
    }));

    res.json({ success: true, data: exportData, count: exportData.length });
  } catch (error) {
    logger.error('Error exporting discrepancies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resolve a discrepancy
app.post('/discrepancies/:id/resolve', async (req, res) => {
  try {
    const { resolvedBy, notes } = req.body;
    const result = await db.resolveDiscrepancy(
      parseInt(req.params.id),
      resolvedBy || 'user',
      notes || ''
    );
    res.json({ success: true, discrepancy: result });
  } catch (error) {
    logger.error('Error resolving discrepancy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resolve all discrepancies for an order
app.post('/discrepancies/resolve-order/:ediOrderId', async (req, res) => {
  try {
    const { resolvedBy, notes } = req.body;
    const results = await db.resolveDiscrepanciesForOrder(
      parseInt(req.params.ediOrderId),
      resolvedBy || 'user',
      notes || 'Resolved with order'
    );
    res.json({ success: true, resolved: results.length, discrepancies: results });
  } catch (error) {
    logger.error('Error resolving discrepancies for order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ZOHO CACHE ENDPOINTS
// ============================================================

// Get cache status
app.get('/cache/status', async (req, res) => {
  try {
    const status = await zohoDraftsCache.getCacheStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manually refresh the cache
app.post('/cache/refresh', async (req, res) => {
  try {
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    
    logger.info('Manual cache refresh triggered');
    
    // Return immediately - refresh runs in background
    // This prevents timeouts with 5000+ orders
    res.json({
      success: true,
      message: 'Cache refresh started. This may take several minutes for large order counts. Refresh this page to check progress.',
      status: 'refreshing'
    });

    // Run refresh in background
    try {
      const result = await zohoDraftsCache.refreshCache(zoho);
      
      await auditLogger.log('cache_refreshed', {
        severity: SEVERITY.INFO,
        details: {
          draftsCount: result.draftsCount,
          durationMs: result.durationMs,
          trigger: 'manual'
        }
      });
      
      logger.info('Background cache refresh completed', { 
        draftsCount: result.draftsCount, 
        durationMs: result.durationMs 
      });
    } catch (bgError) {
      logger.error('Background cache refresh failed', { error: bgError.message });
      // Update metadata with error
      try {
        await pool.query(`
          UPDATE zoho_cache_metadata SET last_error = $1, updated_at = NOW()
          WHERE cache_type = 'drafts'
        `, [bgError.message]);
      } catch (e) { /* ignore */ }
    }
  } catch (error) {
    logger.error('Manual cache refresh failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get cached drafts (for debugging)
app.get('/cache/drafts', async (req, res) => {
  try {
    const drafts = await zohoDraftsCache.getCachedDrafts();
    res.json({ success: true, drafts, count: drafts.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// CUSTOMER MATCHING RULES ENDPOINTS
// ============================================================

// Get all customer matching rules
app.get('/customer-rules', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM customer_matching_rules
      ORDER BY is_default DESC, customer_name ASC
    `);
    res.json({ success: true, rules: result.rows });
  } catch (error) {
    logger.error('Failed to get customer rules', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get rule for a specific customer (or default)
app.get('/customer-rules/:customerName', async (req, res) => {
  try {
    const { customerName } = req.params;

    // First try to find customer-specific rule
    let result = await pool.query(
      'SELECT * FROM customer_matching_rules WHERE customer_name = $1',
      [customerName]
    );

    // If not found, get default rule
    if (result.rows.length === 0) {
      result = await pool.query(
        'SELECT * FROM customer_matching_rules WHERE is_default = TRUE'
      );
    }

    if (result.rows.length > 0) {
      res.json({ success: true, rule: result.rows[0] });
    } else {
      res.json({ success: true, rule: null });
    }
  } catch (error) {
    logger.error('Failed to get customer rule', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create or update customer rule
app.post('/customer-rules', async (req, res) => {
  try {
    const {
      customer_name,
      is_default,
      bulk_order_status,
      bulk_order_category,
      bulk_po_field_pattern,
      match_by_customer_po,
      match_by_contract_ref,
      contract_ref_field,
      match_by_style_customer,
      match_860_by_customer_po,
      match_860_by_contract_ref,
      contract_ref_field_860,
      match_style,
      match_color,
      match_units,
      match_upc,
      match_delivery_date,
      action_on_match,
      edi_860_action,
      notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO customer_matching_rules (
        customer_name, is_default, bulk_order_status, bulk_order_category,
        bulk_po_field_pattern, match_by_customer_po, match_by_contract_ref,
        contract_ref_field, match_by_style_customer,
        match_860_by_customer_po, match_860_by_contract_ref, contract_ref_field_860,
        match_style, match_color,
        match_units, match_upc, match_delivery_date, action_on_match, edi_860_action, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (customer_name) DO UPDATE SET
        is_default = EXCLUDED.is_default,
        bulk_order_status = EXCLUDED.bulk_order_status,
        bulk_order_category = EXCLUDED.bulk_order_category,
        bulk_po_field_pattern = EXCLUDED.bulk_po_field_pattern,
        match_by_customer_po = EXCLUDED.match_by_customer_po,
        match_by_contract_ref = EXCLUDED.match_by_contract_ref,
        contract_ref_field = EXCLUDED.contract_ref_field,
        match_by_style_customer = EXCLUDED.match_by_style_customer,
        match_860_by_customer_po = EXCLUDED.match_860_by_customer_po,
        match_860_by_contract_ref = EXCLUDED.match_860_by_contract_ref,
        contract_ref_field_860 = EXCLUDED.contract_ref_field_860,
        match_style = EXCLUDED.match_style,
        match_color = EXCLUDED.match_color,
        match_units = EXCLUDED.match_units,
        match_upc = EXCLUDED.match_upc,
        match_delivery_date = EXCLUDED.match_delivery_date,
        action_on_match = EXCLUDED.action_on_match,
        edi_860_action = EXCLUDED.edi_860_action,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *
    `, [
      customer_name, is_default || false, bulk_order_status || 'draft',
      bulk_order_category || 'unconfirmed', bulk_po_field_pattern || 'EDI',
      match_by_customer_po || false, match_by_contract_ref || false,
      contract_ref_field || 'po_rel_num', match_by_style_customer !== false,
      match_860_by_customer_po || false, match_860_by_contract_ref || false,
      contract_ref_field_860 || 'po_rel_num',
      match_style !== false, match_color !== false, match_units || false,
      match_upc || false,
      match_delivery_date !== false, action_on_match || 'update_bulk',
      edi_860_action || 'update_existing', notes || null
    ]);

    await auditLogger.log('customer_rule_saved', {
      severity: SEVERITY.INFO,
      details: { customer_name, action: result.rowCount > 0 ? 'created/updated' : 'failed' }
    });

    res.json({ success: true, rule: result.rows[0] });
  } catch (error) {
    logger.error('Failed to save customer rule', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a customer rule
app.delete('/customer-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow deleting the default rule
    const checkResult = await pool.query(
      'SELECT is_default, customer_name FROM customer_matching_rules WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length > 0 && checkResult.rows[0].is_default) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the default rule'
      });
    }

    const customerName = checkResult.rows[0]?.customer_name;

    await pool.query('DELETE FROM customer_matching_rules WHERE id = $1', [id]);

    await auditLogger.log('customer_rule_deleted', {
      severity: SEVERITY.INFO,
      details: { id, customer_name: customerName }
    });

    res.json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    logger.error('Failed to delete customer rule', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get distinct customer names from EDI orders (for dropdown)
app.get('/customer-rules/customers/list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT edi_customer_name as name
      FROM edi_orders
      WHERE edi_customer_name IS NOT NULL
      ORDER BY edi_customer_name
    `);
    res.json({ success: true, customers: result.rows.map(r => r.name) });
  } catch (error) {
    logger.error('Failed to get customer list', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// MATCH SESSION ENDPOINTS
// ============================================================

// Get active match session (for page load/refresh)
app.get('/match-session', async (req, res) => {
  try {
    const session = await auditLogger.getActiveMatchSession();
    if (!session) {
      return res.json({ success: true, hasSession: false, matches: [], noMatches: [] });
    }
    
    res.json({
      success: true,
      hasSession: true,
      sessionId: session.id,
      matches: session.matches,
      noMatches: session.noMatches,
      totalMatches: session.totalMatches,
      totalNoMatches: session.totalNoMatches,
      createdAt: session.createdAt
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear the active match session
app.post('/match-session/clear', async (req, res) => {
  try {
    await auditLogger.clearMatchSession();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle include/exclude for a match
app.post('/match-session/toggle', async (req, res) => {
  try {
    const { ediOrderId, included } = req.body;
    await auditLogger.toggleMatchIncluded(ediOrderId, included);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get match session history
app.get('/match-session/history', async (req, res) => {
  try {
    const history = await auditLogger.getMatchSessionHistory(20);
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// CUSTOMER MAPPINGS
// ============================================================

app.get('/customer-mappings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customer_mappings ORDER BY edi_customer_name');
    res.json({ mappings: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message, mappings: [] });
  }
});

app.post('/customer-mappings', async (req, res) => {
  try {
    const { ediCustomerName, zohoCustomerId, zohoCustomerName, vendorIsaId } = req.body;
    await pool.query(`
      INSERT INTO customer_mappings (edi_customer_name, zoho_customer_id, zoho_customer_name, vendor_isa_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (edi_customer_name) DO UPDATE SET 
        zoho_customer_id = $2, zoho_customer_name = $3, vendor_isa_id = $4, updated_at = NOW()
    `, [ediCustomerName, zohoCustomerId, zohoCustomerName, vendorIsaId || null]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/customer-mappings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM customer_mappings WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ZOHO CUSTOMERS
// ============================================================

app.get('/fix-db', async (req, res) => {
  try {
    await pool.query(`ALTER TABLE customer_mappings ADD COLUMN IF NOT EXISTS zoho_customer_id VARCHAR(255)`);
    await pool.query(`ALTER TABLE customer_mappings ADD COLUMN IF NOT EXISTS zoho_customer_name VARCHAR(255)`);
    res.json({ success: true, message: 'Columns added' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark orders as "review" (for test orders that need cleanup)
app.post('/mark-for-review', async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (orderIds && orderIds.length > 0) {
      await pool.query(`UPDATE edi_orders SET status = 'review' WHERE id = ANY($1)`, [orderIds]);
      res.json({ success: true, count: orderIds.length });
    } else {
      // Mark all orders with zoho_so_number as review (test orders sent to Zoho)
      const result = await pool.query(`UPDATE edi_orders SET status = 'review' WHERE zoho_so_number IS NOT NULL AND status = 'pending'`);
      res.json({ success: true, count: result.rowCount });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark orders back to pending (after cleanup)
app.post('/mark-as-pending', async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (orderIds && orderIds.length > 0) {
      await pool.query(`UPDATE edi_orders SET status = 'pending', zoho_so_id = NULL, zoho_so_number = NULL WHERE id = ANY($1)`, [orderIds]);
      res.json({ success: true, count: orderIds.length });
    } else {
      res.json({ success: false, error: 'No order IDs provided' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/zoho/customers', async (req, res) => {
  try {
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    const accessToken = await zoho.ensureValidToken();
    const orgId = process.env.ZOHO_ORG_ID;
    
    const axios = require('axios');
    const response = await axios.get('https://www.zohoapis.com/books/v3/contacts', {
      headers: { 'Authorization': 'Zoho-oauthtoken ' + accessToken },
      params: {
        organization_id: orgId,
        contact_type: 'customer',
        status: 'active',
        per_page: 200
      }
    });
    
    res.json({ success: true, customers: response.data.contacts || [] });
  } catch (error) {
    logger.error('Failed to get Zoho customers', { error: error.message });
    res.status(500).json({ success: false, error: error.message, customers: [] });
  }
});

// ============================================================
// TEST SCENARIO GENERATOR
// ============================================================

// Test configuration - hardcoded for safety
const TEST_CONFIG = {
  customer: {
    id: '1603308000361176107',
    name: 'Hero Test Account'
  },
  items: [
    { item_id: '1603308000428835693', sku: '87553J-AA-BLACK-XS', name: '87553J-AA-BLACK-XS', rate: 4.00, description: 'Soft pants' },
    { item_id: '1603308000428807472', sku: '87553J-AA-BLACK-S', name: '87553J-AA-BLACK-S', rate: 4.00, description: 'Soft pants' },
    { item_id: '1603308000428824893', sku: '87553J-AA-BLACK-M', name: '87553J-AA-BLACK-M', rate: 4.00, description: 'Soft pants' }
  ]
};

// Generate test PO number
function generateTestPoNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TEST-${dateStr}-${random}`;
}

// POST /generate-test-scenario - Creates both Zoho draft and EDI record
app.post('/generate-test-scenario', async (req, res) => {
  try {
    const { scenario = 'perfect', itemCount = 3, qtyPerItem = 100 } = req.body;
    
    const poNumber = generateTestPoNumber();
    const shipDate = new Date();
    shipDate.setDate(shipDate.getDate() + 14); // 2 weeks from now
    const shipDateStr = shipDate.toISOString().slice(0, 10);
    
    // Build line items for Zoho
    const lineItems = TEST_CONFIG.items.slice(0, Math.min(itemCount, 3)).map((item, idx) => {
      let qty = qtyPerItem;
      let rate = item.rate;
      
      // Modify based on scenario
      if (scenario === 'qty_mismatch' && idx === 0) {
        qty = qtyPerItem + 50; // First item has different qty in Zoho
      }
      if (scenario === 'price_mismatch' && idx === 0) {
        rate = item.rate + 2; // First item has different price in Zoho
      }
      
      return {
        item_id: item.item_id,
        name: item.name,
        description: item.description,
        rate: rate,
        quantity: qty,
        unit: 'EA'
      };
    });
    
    const zohoTotalAmount = lineItems.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
    
    // 1. Create Draft Sales Order in Zoho
    logger.info('[TEST] Creating draft in Zoho for PO: ' + poNumber);
    
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    const accessToken = await zoho.ensureValidToken();
    const orgId = process.env.ZOHO_ORG_ID;
    
    const axios = require('axios');
    const zohoPayload = {
      customer_id: TEST_CONFIG.customer.id,
      reference_number: poNumber,
      date: new Date().toISOString().slice(0, 10),
      shipment_date: shipDateStr,
      notes: '🧪 TEST ORDER - Generated for testing. Safe to delete. Scenario: ' + scenario,
      line_items: lineItems
    };
    
    const zohoResponse = await axios.post(
      'https://www.zohoapis.com/books/v3/salesorders',
      zohoPayload,
      {
        headers: { 
          'Authorization': 'Zoho-oauthtoken ' + accessToken,
          'Content-Type': 'application/json'
        },
        params: { organization_id: orgId }
      }
    );
    
    if (!zohoResponse.data || !zohoResponse.data.salesorder) {
      throw new Error('Failed to create Zoho draft: ' + JSON.stringify(zohoResponse.data));
    }
    
    const zohoDraft = zohoResponse.data.salesorder;
    logger.info('[TEST] Created Zoho draft: ' + zohoDraft.salesorder_number);
    
    // 2. Create matching EDI record in database
    const ediItems = TEST_CONFIG.items.slice(0, Math.min(itemCount, 3)).map((item, idx) => {
      return {
        lineNumber: idx + 1,
        productIds: {
          sku: item.sku,
          vendorItemNumber: item.sku
        },
        description: item.description,
        quantityOrdered: qtyPerItem, // EDI always has the "base" qty
        unitPrice: item.rate, // EDI always has the "base" price
        unitOfMeasure: 'EA'
      };
    });
    
    const ediTotalAmount = ediItems.reduce((sum, item) => sum + (item.quantityOrdered * item.unitPrice), 0);
    const ediTotalUnits = ediItems.reduce((sum, item) => sum + item.quantityOrdered, 0);
    
    const parsedData = {
      poNumber: poNumber,
      customer: TEST_CONFIG.customer.name,
      dates: {
        orderDate: new Date().toISOString().slice(0, 10),
        shipDate: shipDateStr
      },
      items: ediItems,
      totals: {
        totalAmount: ediTotalAmount,
        totalUnits: ediTotalUnits
      },
      isTest: true,
      testScenario: scenario
    };
    
    // Insert into edi_orders table
    const insertResult = await pool.query(`
      INSERT INTO edi_orders (
        edi_order_number,
        edi_customer_name,
        parsed_data,
        raw_edi,
        status,
        filename,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `, [
      poNumber,
      TEST_CONFIG.customer.name,
      JSON.stringify(parsedData),
      '🧪 TEST ORDER - Synthetic EDI data for testing',
      'pending',
      'TEST-' + scenario + '-' + Date.now() + '.edi'
    ]);
    
    const ediOrderId = insertResult.rows[0].id;
    logger.info('[TEST] Created EDI order: ' + ediOrderId);
    
    // 3. Add customer mapping if not exists
    await pool.query(`
      INSERT INTO customer_mappings (edi_customer_name, zoho_customer_id, zoho_customer_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (edi_customer_name) DO NOTHING
    `, [TEST_CONFIG.customer.name, TEST_CONFIG.customer.id, TEST_CONFIG.customer.name]);
    
    res.json({
      success: true,
      message: '🧪 Test scenario "' + scenario + '" created successfully!',
      testOrder: {
        poNumber,
        scenario,
        ediOrderId,
        zohoDraft: {
          id: zohoDraft.salesorder_id,
          number: zohoDraft.salesorder_number,
          status: zohoDraft.status
        },
        summary: {
          customer: TEST_CONFIG.customer.name,
          itemCount: lineItems.length,
          totalUnits: ediTotalUnits,
          ediTotal: ediTotalAmount,
          zohoTotal: zohoTotalAmount,
          shipDate: shipDateStr
        }
      }
    });
    
  } catch (error) {
    logger.error('[TEST] Error generating test scenario: ' + error.message);
    res.json({ success: false, error: error.message });
  }
});

// GET /test-orders - List all test orders
app.get('/test-orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, edi_order_number, edi_customer_name, status, created_at, parsed_data
      FROM edi_orders 
      WHERE edi_order_number LIKE 'TEST-%'
      ORDER BY created_at DESC
      LIMIT 50
    `);
    
    res.json({
      success: true,
      testOrders: result.rows.map(row => ({
        id: row.id,
        poNumber: row.edi_order_number,
        customer: row.edi_customer_name,
        status: row.status,
        createdAt: row.created_at,
        scenario: row.parsed_data?.testScenario || 'unknown',
        isTest: true
      }))
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// DELETE /test-orders/:id - Delete a test order from database
app.delete('/test-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify it's a test order
    const check = await pool.query(
      'SELECT edi_order_number FROM edi_orders WHERE id = $1',
      [id]
    );
    
    if (!check.rows.length) {
      return res.json({ success: false, error: 'Order not found' });
    }
    
    if (!check.rows[0].edi_order_number.startsWith('TEST-')) {
      return res.json({ success: false, error: 'Can only delete TEST orders' });
    }
    
    await pool.query('DELETE FROM edi_orders WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'Test order deleted' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// DELETE /test-orders/cleanup/all - Delete all test orders
app.delete('/test-orders/cleanup/all', async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM edi_orders 
      WHERE edi_order_number LIKE 'TEST-%'
      RETURNING id
    `);
    
    res.json({
      success: true,
      message: 'Deleted ' + result.rowCount + ' test orders',
      deletedCount: result.rowCount
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ============================================================
// RE-PARSE ORDERS
// ============================================================

// Re-parse existing orders with updated CSV parser logic
app.post('/reparse-orders', async (req, res) => {
  try {
    const { orderIds } = req.body;

    logger.info('Re-parsing orders with updated logic', {
      specificOrders: orderIds ? orderIds.length : 'all'
    });

    // Get orders to re-parse
    let ordersResult;
    if (orderIds && orderIds.length > 0) {
      ordersResult = await pool.query(
        'SELECT id, edi_order_number, raw_edi, filename FROM edi_orders WHERE id = ANY($1)',
        [orderIds]
      );
    } else {
      // Re-parse all orders that have raw_edi content (CSV data)
      ordersResult = await pool.query(
        'SELECT id, edi_order_number, raw_edi, filename FROM edi_orders WHERE raw_edi IS NOT NULL AND raw_edi != \'\''
      );
    }

    const orders = ordersResult.rows;
    logger.info('Found orders to re-parse', { count: orders.length });

    if (orders.length === 0) {
      return res.json({
        success: true,
        message: 'No orders found to re-parse',
        summary: { total: 0, success: 0, failed: 0 }
      });
    }

    const { parseSpringCSV } = require('./csv-parser');

    let successCount = 0;
    let failedCount = 0;
    const results = [];

    for (const order of orders) {
      try {
        // Skip test orders or orders without CSV content
        if (!order.raw_edi || order.raw_edi.startsWith('🧪')) {
          results.push({
            id: order.id,
            poNumber: order.edi_order_number,
            success: false,
            reason: 'No CSV data or test order'
          });
          failedCount++;
          continue;
        }

        // Re-parse the CSV with updated logic
        const newParsed = parseSpringCSV(order.raw_edi, order.filename || 'reparse');

        // Update the database with new parsed_data
        await pool.query(
          'UPDATE edi_orders SET parsed_data = $1, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(newParsed), order.id]
        );

        // Log what changed (for audit trail)
        const sampleItem = newParsed.items[0];
        results.push({
          id: order.id,
          poNumber: order.edi_order_number,
          success: true,
          itemCount: newParsed.items.length,
          sampleItem: sampleItem ? {
            sku: sampleItem.productIds?.sku,
            packQty: sampleItem.packQty,
            packPrice: sampleItem.packPrice,
            eachPrice: sampleItem.eachPrice,
            unitPrice: sampleItem.unitPrice,
            isPrepack: sampleItem.isPrepack
          } : null
        });

        successCount++;

      } catch (parseError) {
        logger.error('Failed to re-parse order', {
          orderId: order.id,
          poNumber: order.edi_order_number,
          error: parseError.message
        });
        results.push({
          id: order.id,
          poNumber: order.edi_order_number,
          success: false,
          error: parseError.message
        });
        failedCount++;
      }
    }

    // Log to audit trail
    await auditLogger.log('orders_reparsed', {
      severity: failedCount === 0 ? SEVERITY.SUCCESS : SEVERITY.WARNING,
      details: {
        totalOrders: orders.length,
        successCount,
        failedCount,
        trigger: 'manual'
      }
    });

    logger.info('Re-parse completed', { successCount, failedCount });

    res.json({
      success: true,
      message: `Re-parsed ${successCount} orders successfully` + (failedCount > 0 ? `, ${failedCount} failed` : ''),
      summary: {
        total: orders.length,
        success: successCount,
        failed: failedCount
      },
      results
    });

  } catch (error) {
    logger.error('Re-parse orders failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// RESET UTILITIES
// ============================================================

app.get('/reset-to-pending', async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE edi_orders SET status = 'pending', zoho_so_id = NULL, zoho_so_number = NULL, matched_draft_id = NULL, processed_at = NULL WHERE status IN ('processed', 'failed', 'matched')"
    );
    res.send('<h1>Reset Complete</h1><p>Reset ' + result.rowCount + ' orders.</p><a href="/">Back</a>');
  } catch (error) {
    res.status(500).send('Error: ' + error.message);
  }
});

app.post('/reset-to-pending', async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE edi_orders SET status = 'pending', zoho_so_id = NULL, zoho_so_number = NULL, matched_draft_id = NULL, processed_at = NULL WHERE status IN ('processed', 'failed', 'matched')"
    );
    res.json({ success: true, count: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PUBLIC DIAGNOSTIC ENDPOINT (bypasses origin secret)
// Usage: /diag/match/280655101 or /diag/match/280655101?zoho=0618058
// ============================================================
app.get('/diag/match/:poNumber', async (req, res) => {
  try {
    const poNumber = req.params.poNumber;
    const zohoFilter = req.query.zoho || '';
    
    // 1. Find the EDI order by PO number
    const ediResult = await pool.query(
      'SELECT id, edi_order_number, edi_customer_name, vendor_isa_id, status, parsed_data FROM edi_orders WHERE edi_order_number = $1 ORDER BY created_at DESC LIMIT 1',
      [poNumber]
    );
    if (ediResult.rows.length === 0) {
      return res.json({ error: 'EDI order not found for PO#' + poNumber });
    }
    const ediOrder = ediResult.rows[0];
    const parsed = ediOrder.parsed_data || {};
    const ediItems = parsed.items || [];
    const ediCustomer = (ediOrder.edi_customer_name || '').toLowerCase().trim();
    
    // Extract base styles from EDI items
    const ediBaseStyles = [...new Set(ediItems.map(i => {
      const sku = (i.productIds?.sku || i.productIds?.vendorItemNumber || '').trim();
      const match = sku.match(/^(\d{4,6}[a-z]?)/i);
      return match ? match[1].toLowerCase() : sku.split('-')[0].toLowerCase();
    }).filter(s => s.length >= 5))];
    
    // 2. Load customer mappings
    const mappingsResult = await pool.query('SELECT * FROM customer_mappings');
    const mappings = mappingsResult.rows;
    const mappingForCustomer = mappings.find(m => 
      m.edi_customer_name?.toLowerCase().trim() === ediCustomer
    );
    
    // 3. Load matching rules
    const rulesResult = await pool.query('SELECT * FROM customer_matching_rules ORDER BY is_default ASC');
    const rules = rulesResult.rows;
    const ruleForCustomer = rules.find(r => 
      !r.is_default && r.customer_name?.toLowerCase().trim() === ediCustomer
    ) || rules.find(r => r.is_default);
    
    // 4. Search the Zoho cache for potential matches
    let cacheQuery = `SELECT zoho_salesorder_id, salesorder_number, customer_id, customer_name, 
      reference_number, status, total, shipment_date, 
      COALESCE(jsonb_array_length(line_items::jsonb), 0) as line_item_count
      FROM zoho_drafts_cache`;
    const params = [];
    
    if (zohoFilter) {
      cacheQuery += ` WHERE salesorder_number LIKE $1`;
      params.push('%' + zohoFilter + '%');
    } else if (mappingForCustomer?.zoho_customer_id) {
      cacheQuery += ` WHERE customer_id = $1`;
      params.push(mappingForCustomer.zoho_customer_id);
    }
    cacheQuery += ` ORDER BY salesorder_number DESC LIMIT 20`;
    
    const cacheResult = await pool.query(cacheQuery, params);
    
    // 5. Also search by customer name containing "burlington" or "forever" if relevant
    let altCacheResults = [];
    if (ediCustomer.includes('burlington')) {
      const altResult = await pool.query(
        `SELECT zoho_salesorder_id, salesorder_number, customer_id, customer_name, 
          reference_number, status, total, shipment_date,
          COALESCE(jsonb_array_length(line_items::jsonb), 0) as line_item_count
        FROM zoho_drafts_cache 
        WHERE LOWER(customer_name) LIKE '%burlington%' OR LOWER(customer_name) LIKE '%forever%'
        ORDER BY salesorder_number DESC LIMIT 20`
      );
      altCacheResults = altResult.rows;
    }
    
    // 6. Get cache stats
    const cacheStats = await pool.query(
      `SELECT COUNT(*) as total, 
        COUNT(*) FILTER (WHERE COALESCE(jsonb_array_length(line_items::jsonb), 0) > 0) as with_line_items,
        COUNT(*) FILTER (WHERE COALESCE(jsonb_array_length(line_items::jsonb), 0) = 0) as without_line_items
      FROM zoho_drafts_cache`
    );
    
    res.json({
      ediOrder: {
        id: ediOrder.id,
        poNumber: ediOrder.edi_order_number,
        customer: ediOrder.edi_customer_name,
        vendorIsaId: ediOrder.vendor_isa_id,
        status: ediOrder.status,
        itemCount: ediItems.length,
        baseStyles: ediBaseStyles,
        shipDate: parsed.dates?.shipNotBefore || parsed.dates?.shipDate
      },
      customerMapping: mappingForCustomer ? {
        ediName: mappingForCustomer.edi_customer_name,
        zohoCustomerName: mappingForCustomer.zoho_customer_name,
        zohoCustomerId: mappingForCustomer.zoho_customer_id,
        vendorIsaId: mappingForCustomer.vendor_isa_id
      } : 'NO MAPPING FOUND for "' + ediOrder.edi_customer_name + '"',
      matchingRule: ruleForCustomer ? {
        id: ruleForCustomer.id,
        customerName: ruleForCustomer.customer_name,
        isDefault: ruleForCustomer.is_default,
        matchByPO: ruleForCustomer.match_by_customer_po,
        bulkOrderStatus: ruleForCustomer.bulk_order_status
      } : 'NO RULE FOUND',
      cacheStats: cacheStats.rows[0],
      zohoOrdersForMappedCustomer: cacheResult.rows,
      allBurlingtonOrders: altCacheResults,
      _hint: 'Compare zohoCustomerId in customerMapping with customer_id in zohoOrders. They must match for customer matching to work.'
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Live test: Actually run Find Matches for a single PO and show detailed results
// Usage: /diag/test-match/280655101
app.get('/diag/test-match/:poNumber', async (req, res) => {
  try {
    const poNumber = req.params.poNumber;
    
    // Find the EDI order
    const ediResult = await pool.query(
      'SELECT * FROM edi_orders WHERE edi_order_number = $1 ORDER BY created_at DESC LIMIT 1',
      [poNumber]
    );
    if (ediResult.rows.length === 0) {
      return res.json({ error: 'EDI order not found for PO#' + poNumber });
    }
    const ediOrder = ediResult.rows[0];
    
    // Load everything needed for matching
    const mappingsResult = await pool.query('SELECT * FROM customer_mappings');
    const rulesResult = await pool.query('SELECT * FROM customer_matching_rules ORDER BY is_default ASC');
    
    // Get cached drafts
    const drafts = await zohoDraftsCache.getCachedDrafts();
    
    // Run the actual matching
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    const matchResults = await zoho.findMatchingDraftsFromCache(
      [ediOrder], drafts, mappingsResult.rows, rulesResult.rows
    );
    
    res.json({
      poNumber,
      ediOrderId: ediOrder.id,
      draftsSearched: drafts.length,
      matchesFound: matchResults.matches?.length || 0,
      noMatchesFound: matchResults.noMatches?.length || 0,
      matches: (matchResults.matches || []).map(m => ({
        zohoOrderNumber: m.zohoDraft?.number,
        zohoCustomer: m.zohoDraft?.customer,
        confidence: m.confidence,
        score: m.score?.total,
        scoreDetails: m.score?.details,
        lineItemCount: m.zohoDraft?.itemCount
      })),
      noMatchReason: (matchResults.noMatches || []).map(nm => ({
        poNumber: nm.ediOrder?.poNumber,
        customer: nm.ediOrder?.customer,
        reason: nm.reason,
        debug: nm._debug
      })),
      zohoJsVersion: 'v1.0.12-debug'
    });
  } catch (error) {
    res.json({ error: error.message, stack: error.stack?.split('\n').slice(0, 5) });
  }
});

// Direct score: Score a specific EDI order against a specific Zoho cached order
// Usage: /diag/score/280655101/0618058
app.get('/diag/score/:poNumber/:zohoNumber', async (req, res) => {
  try {
    const { poNumber, zohoNumber } = req.params;
    
    const ediResult = await pool.query(
      'SELECT * FROM edi_orders WHERE edi_order_number = $1 ORDER BY created_at DESC LIMIT 1', [poNumber]
    );
    if (ediResult.rows.length === 0) return res.json({ error: 'EDI order not found' });
    const ediOrder = ediResult.rows[0];
    
    const zohoResult = await pool.query(
      `SELECT zoho_salesorder_id as salesorder_id, salesorder_number, customer_id, customer_name,
        reference_number, status, total, shipment_date, line_items
      FROM zoho_drafts_cache WHERE salesorder_number LIKE $1 LIMIT 1`, ['%' + zohoNumber + '%']
    );
    if (zohoResult.rows.length === 0) return res.json({ error: 'Zoho order not found in cache' });
    const zc = zohoResult.rows[0];
    
    const mappingsResult = await pool.query('SELECT * FROM customer_mappings');
    const customerMappingLookup = new Map();
    const isaIdMappingLookup = new Map();
    mappingsResult.rows.forEach(m => {
      if (m.edi_customer_name && m.zoho_customer_id)
        customerMappingLookup.set(m.edi_customer_name.toLowerCase().trim(), m.zoho_customer_id);
      if (m.vendor_isa_id && m.zoho_customer_id)
        isaIdMappingLookup.set(m.vendor_isa_id.trim(), m.zoho_customer_id);
    });
    
    const rulesResult = await pool.query('SELECT * FROM customer_matching_rules ORDER BY is_default ASC');
    const ediCustomer = (ediOrder.edi_customer_name || '').toLowerCase().trim();
    const rule = rulesResult.rows.find(r => !r.is_default && r.customer_name?.toLowerCase().trim() === ediCustomer)
      || rulesResult.rows.find(r => r.is_default);
    
    const draftForScoring = {
      salesorder_id: zc.salesorder_id, salesorder_number: zc.salesorder_number,
      customer_id: zc.customer_id, customer_name: zc.customer_name,
      reference_number: zc.reference_number, status: zc.status,
      total: zc.total, shipment_date: zc.shipment_date,
      line_items: zc.line_items || [], po_rel_num: ''
    };
    
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    const score = zoho.scoreMatch(ediOrder, draftForScoring, customerMappingLookup, rule, isaIdMappingLookup);
    
    const mappedZohoId = customerMappingLookup.get(ediCustomer);
    const statusOk = !rule?.bulk_order_status || (zc.status || '').toLowerCase() === rule.bulk_order_status.toLowerCase();
    const wouldFetchOnDemand = !score.details.baseStyle && score.details.customer && (zc.line_items || []).length === 0;
    
    res.json({
      edi: { po: ediOrder.edi_order_number, customer: ediCustomer, vendorIsaId: ediOrder.vendor_isa_id },
      zoho: { number: zc.salesorder_number, customerId: zc.customer_id, status: zc.status, lineItems: (zc.line_items||[]).length, ref: zc.reference_number },
      mapping: { mappedZohoId: mappedZohoId || 'NOT FOUND', zohoCustomerId: zc.customer_id, match: mappedZohoId === zc.customer_id },
      statusFilter: { ruleStatus: rule?.bulk_order_status, draftStatus: zc.status, passes: statusOk },
      score,
      wouldFetchOnDemand
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Test on-demand fetch: Actually fetch details for a Zoho order and re-score
// Usage: /diag/fetch-and-score/280655101/0618058
app.get('/diag/fetch-and-score/:poNumber/:zohoNumber', async (req, res) => {
  try {
    const { poNumber, zohoNumber } = req.params;
    
    const ediResult = await pool.query(
      'SELECT * FROM edi_orders WHERE edi_order_number = $1 ORDER BY created_at DESC LIMIT 1', [poNumber]
    );
    if (ediResult.rows.length === 0) return res.json({ error: 'EDI order not found' });
    const ediOrder = ediResult.rows[0];
    
    const zohoResult = await pool.query(
      `SELECT zoho_salesorder_id as salesorder_id, salesorder_number, customer_id, customer_name,
        reference_number, status, total, shipment_date, line_items
      FROM zoho_drafts_cache WHERE salesorder_number LIKE $1 LIMIT 1`, ['%' + zohoNumber + '%']
    );
    if (zohoResult.rows.length === 0) return res.json({ error: 'Zoho order not found in cache' });
    const zc = zohoResult.rows[0];
    
    // Actually fetch details from Zoho API
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    
    let fetchResult = null;
    let fetchError = null;
    try {
      fetchResult = await zoho.getSalesOrderDetails(zc.salesorder_id);
    } catch (e) {
      fetchError = e.message;
    }
    
    if (fetchError) {
      return res.json({ error: 'Zoho API fetch failed', fetchError, zohoOrderId: zc.salesorder_id });
    }
    
    const lineItems = fetchResult?.line_items || [];
    const lineItemNames = lineItems.map(i => i.name || i.item_name || i.description || 'unknown');
    
    // Build mapping lookups
    const mappingsResult = await pool.query('SELECT * FROM customer_mappings');
    const customerMappingLookup = new Map();
    const isaIdMappingLookup = new Map();
    mappingsResult.rows.forEach(m => {
      if (m.edi_customer_name && m.zoho_customer_id)
        customerMappingLookup.set(m.edi_customer_name.toLowerCase().trim(), m.zoho_customer_id);
      if (m.vendor_isa_id && m.zoho_customer_id)
        isaIdMappingLookup.set(m.vendor_isa_id.trim(), m.zoho_customer_id);
    });
    const rulesResult = await pool.query('SELECT * FROM customer_matching_rules ORDER BY is_default ASC');
    const ediCustomer = (ediOrder.edi_customer_name || '').toLowerCase().trim();
    const rule = rulesResult.rows.find(r => !r.is_default && r.customer_name?.toLowerCase().trim() === ediCustomer)
      || rulesResult.rows.find(r => r.is_default);
    
    // Score WITH the fetched line items
    const draftWithDetails = {
      salesorder_id: zc.salesorder_id, salesorder_number: zc.salesorder_number,
      customer_id: zc.customer_id, customer_name: zc.customer_name,
      reference_number: zc.reference_number, status: zc.status,
      total: zc.total, shipment_date: zc.shipment_date,
      line_items: lineItems, po_rel_num: ''
    };
    
    const newScore = zoho.scoreMatch(ediOrder, draftWithDetails, customerMappingLookup, rule, isaIdMappingLookup);
    const wouldMatch = newScore.total >= 25 && (newScore.details.po || (newScore.details.customer && newScore.details.baseStyle));
    
    res.json({
      fetchedLineItems: lineItems.length,
      lineItemNames,
      scoreWithDetails: newScore,
      wouldMatch,
      message: wouldMatch ? 'YES - This would match after on-demand fetch!' : 'NO - Still no match even with line items'
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// ============================================================
// SERVER STARTUP
// ============================================================

async function startServer() {
  try {
    await initDatabase();
    logger.info('Database initialized');
    
    // Initialize audit tables
    try {
      await auditLogger.initialize();
      logger.info('Audit system initialized');
    } catch (auditError) {
      logger.error('Audit system initialization failed', { error: auditError.message });
    }
    
    // Initialize Zoho drafts cache
    try {
      await zohoDraftsCache.initialize();
      logger.info('Zoho cache system initialized');
    } catch (cacheError) {
      logger.error('Zoho cache initialization failed', { error: cacheError.message });
    }
    
    // Add columns if needed
    try {
      await pool.query(`
        ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS matched_draft_id VARCHAR(255);
        ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS zoho_so_number VARCHAR(255);
        ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;
      `);
      await pool.query(`
        ALTER TABLE customer_mappings ADD COLUMN IF NOT EXISTS zoho_customer_id VARCHAR(255);
      `);
      // Add audit tracking columns
      await pool.query(`
        ALTER TABLE zoho_orders_sent ADD COLUMN IF NOT EXISTS changes_applied JSONB;
        ALTER TABLE zoho_orders_sent ADD COLUMN IF NOT EXISTS zoho_before_data JSONB;
      `);
    } catch (e) { /* ignore */ }
    
    // SFTP fetch cron job (every 15 min)
    const schedule = process.env.CRON_SCHEDULE || '*/15 * * * *';
    cron.schedule(schedule, async () => {
      logger.info('Scheduled SFTP job triggered');
      await auditLogger.log(ACTIONS.SFTP_FETCH_STARTED, {
        severity: SEVERITY.INFO,
        details: { trigger: 'scheduled' }
      });
      
      try {
        const result = await processEDIOrders();
        await auditLogger.log(ACTIONS.SFTP_FETCH_COMPLETED, {
          severity: SEVERITY.SUCCESS,
          details: { filesProcessed: result.filesProcessed || 0, ordersCreated: result.ordersCreated || 0 }
        });
      } catch (error) {
        logger.error('Scheduled processing failed', { error: error.message });
        await auditLogger.log(ACTIONS.SFTP_ERROR, {
          severity: SEVERITY.ERROR,
          errorMessage: error.message,
          details: { trigger: 'scheduled' }
        });
      }
    });
    logger.info('SFTP cron job scheduled: ' + schedule);
    
    // Zoho cache refresh cron job - once daily at 1am to reduce API calls
    // Manual refresh available via "Refresh Zoho Data" button anytime
    cron.schedule('0 1 * * *', async () => {
      logger.info('Scheduled Zoho cache refresh triggered (daily 1am)');
      try {
        const ZohoClient = require('./zoho');
        const zoho = new ZohoClient();
        const result = await zohoDraftsCache.refreshCache(zoho);
        await auditLogger.log('cache_refreshed', {
          severity: SEVERITY.INFO,
          details: { draftsCount: result.draftsCount, durationMs: result.durationMs, trigger: 'scheduled_daily' }
        });
        logger.info('Zoho cache refreshed', { draftsCount: result.draftsCount });
      } catch (error) {
        logger.error('Scheduled cache refresh failed', { error: error.message });
      }
    });
    logger.info('Zoho cache refresh cron scheduled: daily at 1am (use Refresh Zoho Data button for manual sync)');
    
    // ============================================================
    // DEBUG MATCH ENDPOINT - Traces exactly why an EDI order matches or doesn't match
    // Usage: GET /debug-match/:orderId or GET /debug-match/:orderId?zoho=0618058
    // ============================================================
    app.get('/debug-match/:orderId', async (req, res) => {
      try {
        const orderId = req.params.orderId;
        const zohoFilter = req.query.zoho || ''; // Optional: filter to specific Zoho order number

        // 1. Load the EDI order
        const ediResult = await pool.query('SELECT * FROM edi_orders WHERE id = $1', [orderId]);
        if (ediResult.rows.length === 0) {
          return res.json({ error: 'EDI order not found', orderId });
        }
        const ediOrder = ediResult.rows[0];
        const parsed = ediOrder.parsed_data || {};
        const ediItems = parsed.items || [];

        // 2. Extract EDI details
        const ediCustomer = (ediOrder.edi_customer_name || '').toLowerCase().trim();
        const ediVendorIsaId = (ediOrder.vendor_isa_id || parsed.header?.vendorIsaId || '').trim();
        const ediStyles = [];
        ediItems.forEach(i => {
          const sku = (i.productIds?.sku || i.productIds?.vendorItemNumber || '').trim();
          if (sku) ediStyles.push(sku);
        });
        const ediBaseStyles = [...new Set(ediStyles.map(s => {
          const m = s.toLowerCase().match(/^(\d{4,6}[a-z]?)/i);
          return m ? m[1] : s.split('-')[0];
        }))];

        // 3. Load customer mappings
        const mappingsResult = await pool.query('SELECT * FROM customer_mappings');
        const customerMappings = mappingsResult.rows || [];
        const mappingForCustomer = customerMappings.find(m =>
          m.edi_customer_name?.toLowerCase().trim() === ediCustomer
        );

        // 4. Load matching rules
        const rulesResult = await pool.query('SELECT * FROM customer_matching_rules ORDER BY is_default ASC, customer_name ASC');
        const customerRules = rulesResult.rows || [];
        const ruleForCustomer = customerRules.find(r =>
          !r.is_default && r.customer_name?.toLowerCase().trim() === ediCustomer
        ) || customerRules.find(r => r.is_default);

        // 5. Load cached Zoho drafts
        const drafts = await zohoDraftsCache.getCachedDrafts();
        
        // 6. Filter/find relevant Zoho orders
        let relevantDrafts = drafts;
        if (zohoFilter) {
          relevantDrafts = drafts.filter(d =>
            d.salesorder_number?.includes(zohoFilter) || 
            d.reference_number?.includes(zohoFilter)
          );
        } else {
          // Auto-filter: show orders from the same customer (by mapping) + any with matching styles
          const mappedId = mappingForCustomer?.zoho_customer_id;
          const customerKeyword = ediCustomer.split(/[\s,]+/).find(p => p.length > 3) || '';
          
          relevantDrafts = drafts.filter(d => {
            // Customer ID match via mapping
            if (mappedId && d.customer_id === mappedId) return true;
            // Customer name fuzzy match
            if (customerKeyword && d.customer_name?.toLowerCase().includes(customerKeyword)) return true;
            // Style match - check if any EDI base styles appear in this draft's line items
            if (ediBaseStyles.length > 0 && d.line_items?.length > 0) {
              const draftStyles = d.line_items.map(i => {
                const m = (i.name || '').toLowerCase().match(/^(\d{4,6}[a-z]?)/i);
                return m ? m[1] : '';
              }).filter(Boolean);
              if (ediBaseStyles.some(e => draftStyles.includes(e))) return true;
            }
            return false;
          });
        }

        // 7. Trace matching for each relevant draft
        const traceResults = [];
        for (const draft of relevantDrafts.slice(0, 50)) {
          const trace = {
            zohoOrder: draft.salesorder_number,
            zohoCustomer: draft.customer_name,
            zohoCustomerId: draft.customer_id,
            zohoStatus: draft.status,
            zohoRef: draft.reference_number,
            zohoLineItemCount: (draft.line_items || []).length,
            checks: {}
          };

          // Check 1: Status filter
          if (ruleForCustomer && ruleForCustomer.bulk_order_status) {
            const draftStatus = (draft.status || '').toLowerCase();
            const ruleStatus = ruleForCustomer.bulk_order_status.toLowerCase();
            trace.checks.statusFilter = {
              draftStatus,
              ruleStatus,
              passes: draftStatus === ruleStatus
            };
            if (draftStatus !== ruleStatus) {
              trace.checks.result = 'SKIPPED - status mismatch';
              traceResults.push(trace);
              continue;
            }
          }

          // Check 2: Customer match
          const mappedZohoId = mappingForCustomer?.zoho_customer_id;
          trace.checks.customerMatch = {
            ediCustomer,
            mappedZohoId: mappedZohoId || 'NO MAPPING',
            draftCustomerId: draft.customer_id,
            mappingMatches: mappedZohoId ? mappedZohoId === draft.customer_id : false,
            fuzzyCheck: draft.customer_name?.toLowerCase().includes('burlington') || false
          };

          // Check 3: Style match
          const zohoLineItems = draft.line_items || [];
          const zohoStyles = [];
          zohoLineItems.forEach(i => {
            const name = (i.name || '').trim();
            if (name) {
              const m = name.toLowerCase().match(/^(\d{4,6}[a-z]?)/i);
              if (m) zohoStyles.push({ full: name, base: m[1] });
            }
          });
          const zohoBaseStyles = [...new Set(zohoStyles.map(s => s.base))];
          const matchingStyles = ediBaseStyles.filter(e => zohoBaseStyles.includes(e));

          trace.checks.styleMatch = {
            ediBaseStyles,
            zohoBaseStyles: zohoBaseStyles.slice(0, 10),
            zohoStylesFull: zohoStyles.slice(0, 5).map(s => s.full),
            matchingStyles,
            hasMatch: matchingStyles.length > 0
          };

          // Overall result
          const customerPasses = trace.checks.customerMatch.mappingMatches || trace.checks.customerMatch.fuzzyCheck;
          const stylePasses = matchingStyles.length > 0;
          trace.checks.wouldMatch = customerPasses && stylePasses;
          trace.checks.result = trace.checks.wouldMatch ? 'WOULD MATCH' : 
            !customerPasses && !stylePasses ? 'FAIL - customer AND style' :
            !customerPasses ? 'FAIL - customer mismatch' : 'FAIL - style mismatch';

          traceResults.push(trace);
        }

        res.json({
          ediOrder: {
            id: ediOrder.id,
            poNumber: ediOrder.edi_order_number,
            customer: ediOrder.edi_customer_name,
            vendorIsaId: ediVendorIsaId,
            itemCount: ediItems.length,
            baseStyles: ediBaseStyles,
            rawStyles: ediStyles.slice(0, 10)
          },
          customerMapping: mappingForCustomer ? {
            ediName: mappingForCustomer.edi_customer_name,
            zohoCustomerId: mappingForCustomer.zoho_customer_id,
            zohoCustomerName: mappingForCustomer.zoho_customer_name,
            vendorIsaId: mappingForCustomer.vendor_isa_id
          } : 'NO MAPPING FOUND',
          matchingRule: ruleForCustomer ? {
            customerName: ruleForCustomer.customer_name,
            isDefault: ruleForCustomer.is_default,
            matchMethod: ruleForCustomer.match_by_customer_po ? 'customer_po' :
                         ruleForCustomer.match_by_contract_ref ? 'contract_ref' : 'style_customer',
            bulkOrderStatus: ruleForCustomer.bulk_order_status,
            bulkOrderCategory: ruleForCustomer.bulk_order_category
          } : 'NO RULE FOUND',
          totalCachedDrafts: drafts.length,
          relevantDraftsChecked: relevantDrafts.length,
          traceResults
        });
      } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
      }
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      logger.info('Server running on port ' + port);
    });
    
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();
// Deploy trigger Wed Jan 28 21:33:46 UTC 2026
