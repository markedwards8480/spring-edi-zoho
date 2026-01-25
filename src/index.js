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
        COUNT(*) FILTER (WHERE status = 'processed') as processed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'matched') as matched
      FROM edi_orders 
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    res.json({ last24Hours: result.rows[0], timestamp: new Date().toISOString() });
  } catch (error) {
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
             zoho_so_id, zoho_so_number, error_message, created_at, 
             processed_at, parsed_data, matched_draft_id, raw_edi
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
      logger.info('Using cached Zoho drafts', { 
        draftsCount: cacheStatus.draftsCount,
        minutesOld: cacheStatus.minutesSinceRefresh 
      });
      drafts = await zohoDraftsCache.getCachedDrafts();
    } else {
      // Fetch fresh and update cache
      logger.info('Fetching fresh Zoho drafts', { 
        reason: cacheStatus.isStale ? 'cache stale' : 'no cache',
        forceRefresh 
      });
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
    res.json({ 
      success: true, 
      alreadySent: !!result,
      details: result 
    });
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
          details: {
            filesProcessed: result.filesProcessed || 0,
            ordersCreated: result.ordersCreated || 0
          }
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
          details: {
            draftsCount: result.draftsCount,
            durationMs: result.durationMs,
            trigger: 'scheduled'
          }
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
