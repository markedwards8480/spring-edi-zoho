require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const { initDatabase, pool } = require('./db');
const { processEDIOrders } = require('./processor');
const { setupOAuthRoutes } = require('./oauth');
const logger = require('./logger');
const dashboardHTML = require('./dashboard');
const { AuditLogger, ACTIONS, SEVERITY } = require('./audit-logger');
const ZohoDraftsCache = require('./zoho-cache');

const app = express();
app.use(express.json());

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
              selected_match_drafts, focus_mode_index, updated_at
       FROM ui_session WHERE session_key = 'default'`
    );
    if (result.rows.length === 0) {
      return res.json({
        matchResults: null,
        selectedMatchIds: [],
        flaggedMatchIds: [],
        selectedMatchDrafts: {},
        focusModeIndex: 0
      });
    }
    const row = result.rows[0];
    res.json({
      matchResults: row.match_results,
      selectedMatchIds: row.selected_match_ids || [],
      flaggedMatchIds: row.flagged_match_ids || [],
      selectedMatchDrafts: row.selected_match_drafts || {},
      focusModeIndex: row.focus_mode_index || 0,
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
    const { matchResults, selectedMatchIds, flaggedMatchIds, selectedMatchDrafts, focusModeIndex } = req.body;
    await pool.query(
      `INSERT INTO ui_session (session_key, match_results, selected_match_ids, flagged_match_ids, selected_match_drafts, focus_mode_index, updated_at)
       VALUES ('default', $1, $2, $3, $4, $5, NOW())
       ON CONFLICT (session_key) DO UPDATE SET
         match_results = $1,
         selected_match_ids = $2,
         flagged_match_ids = $3,
         selected_match_drafts = $4,
         focus_mode_index = $5,
         updated_at = NOW()`,
      [
        matchResults ? JSON.stringify(matchResults) : null,
        JSON.stringify(selectedMatchIds || []),
        JSON.stringify(flaggedMatchIds || []),
        JSON.stringify(selectedMatchDrafts || {}),
        focusModeIndex || 0
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
    const result = await pool.query(`
      SELECT id, filename, edi_order_number, edi_customer_name, status, 
             zoho_so_id, zoho_so_number, error_message, created_at, processed_at,
             parsed_data, matched_draft_id, raw_edi
      FROM edi_orders 
      ORDER BY created_at DESC 
      LIMIT 200
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
      const customerName = parsed.parties?.buyingParty?.name || 
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
        customer: parsed.parties?.buyingParty?.name,
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
      const customerName = parsed.parties?.buyingParty?.name || 
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
        customer: parsed.parties?.buyingParty?.name,
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
          const customerName = parsed.parties?.buyingParty?.name || 'Unknown';
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
      const result = await pool.query("SELECT * FROM edi_orders WHERE status = 'pending' ORDER BY created_at DESC LIMIT 100");
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
    
    // Use cached drafts if available, otherwise fetch fresh
    let drafts;
    const cacheStatus = await zohoDraftsCache.getCacheStatus();
    
    if (!forceRefresh && !cacheStatus.isStale && cacheStatus.draftsCount > 0) {
      // Use cache
      logger.info('Using cached Zoho drafts', { draftsCount: cacheStatus.draftsCount, minutesOld: cacheStatus.minutesSinceRefresh });
      drafts = await zohoDraftsCache.getCachedDrafts();
    } else {
      // Fetch fresh and update cache
      logger.info('Fetching fresh Zoho drafts', { reason: cacheStatus.isStale ? 'cache stale' : 'no cache', forceRefresh });
      await zohoDraftsCache.refreshCache(zoho);
      drafts = await zohoDraftsCache.getCachedDrafts();
    }
    
    // Run matching against cached drafts
    const matchResults = await zoho.findMatchingDraftsFromCache(orders, drafts);
    
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
    
    res.json({
      success: true,
      matches: matchResults.matches,
      noMatches: matchResults.noMatches,
      sessionId: session.sessionId
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
        
        const updated = await zoho.updateDraftWithEdiData(match.zohoDraftId, ediOrder);
        
        await pool.query(`
          UPDATE edi_orders 
          SET status = 'processed', zoho_so_id = $1, zoho_so_number = $2, matched_draft_id = $3, processed_at = NOW()
          WHERE id = $4
        `, [updated.salesorder_id, updated.salesorder_number, match.zohoDraftId, match.ediOrderId]);
        
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
          matchedDraftId: match.zohoDraftId,
          matchedDraftNumber: updated.salesorder_number,
          matchConfidence: match.confidence,
          wasNewOrder: false,
          ediRawData: parsed,
          zohoResponse: updated
        });
        
        processed++;
        results.push({ ediOrderId: match.ediOrderId, success: true, zohoId: updated.salesorder_id });
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
        results.push({ ediOrderId: newOrder.ediOrderId, success: true, zohoId: created.salesorder_id });
        
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
    const { ediOrderId, zohoDraftId } = req.body;
    
    const orderResult = await pool.query('SELECT * FROM edi_orders WHERE id = $1', [ediOrderId]);
    if (orderResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    
    const ediOrder = orderResult.rows[0];
    const parsed = ediOrder.parsed_data || {};
    const items = parsed.items || [];
    const totalAmount = items.reduce((sum, item) => sum + ((item.quantityOrdered || 0) * (item.unitPrice || 0)), 0);
    const totalUnits = items.reduce((sum, item) => sum + (item.quantityOrdered || 0), 0);
    
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    
    const updated = await zoho.updateDraftWithEdiData(zohoDraftId, ediOrder);
    
    await pool.query(`
      UPDATE edi_orders 
      SET status = 'processed', zoho_so_id = $1, zoho_so_number = $2, matched_draft_id = $3, processed_at = NOW()
      WHERE id = $4
    `, [updated.salesorder_id, updated.salesorder_number, zohoDraftId, ediOrderId]);
    
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
    const result = await zohoDraftsCache.refreshCache(zoho);
    
    await auditLogger.log('cache_refreshed', {
      severity: SEVERITY.INFO,
      details: {
        draftsCount: result.draftsCount,
        durationMs: result.durationMs,
        trigger: 'manual'
      }
    });
    
    res.json({
      success: true,
      message: 'Cache refreshed',
      draftsCount: result.draftsCount,
      durationMs: result.durationMs
    });
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
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/customer-mappings', async (req, res) => {
  try {
    const { ediCustomerName, zohoCustomerId, zohoCustomerName } = req.body;
    await pool.query(`
      INSERT INTO customer_mappings (edi_customer_name, zoho_customer_id, zoho_customer_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (edi_customer_name) DO UPDATE SET zoho_customer_id = $2, zoho_customer_name = $3
    `, [ediCustomerName, zohoCustomerId, zohoCustomerName]);
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
    
    // Zoho cache refresh cron job (every 30 min)
    cron.schedule('*/30 * * * *', async () => {
      logger.info('Scheduled Zoho cache refresh triggered');
      try {
        const ZohoClient = require('./zoho');
        const zoho = new ZohoClient();
        const result = await zohoDraftsCache.refreshCache(zoho);
        await auditLogger.log('cache_refreshed', {
          severity: SEVERITY.INFO,
          details: { draftsCount: result.draftsCount, durationMs: result.durationMs, trigger: 'scheduled' }
        });
        logger.info('Zoho cache refreshed', { draftsCount: result.draftsCount });
      } catch (error) {
        logger.error('Scheduled cache refresh failed', { error: error.message });
      }
    });
    logger.info('Zoho cache refresh cron scheduled: every 30 minutes');
    
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
