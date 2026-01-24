require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const { initDatabase, pool } = require('./db');
const { processEDIOrders } = require('./processor');
const { setupOAuthRoutes } = require('./oauth');
const logger = require('./logger');
const dashboardHTML = require('./dashboard');

const app = express();
app.use(express.json());

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
      FROM edi_orders ORDER BY created_at DESC LIMIT 200
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
    const result = await processEDIOrders();
    res.json({ success: true, result });
  } catch (error) {
    logger.error('SFTP fetch failed', { error: error.message });
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
// MATCHING SYSTEM
// ============================================================

app.post('/find-matches', async (req, res) => {
  try {
    const { orderIds } = req.body;
    
    let orders;
    if (orderIds && orderIds.length > 0) {
      const result = await pool.query('SELECT * FROM edi_orders WHERE id = ANY($1)', [orderIds]);
      orders = result.rows;
    } else {
      const result = await pool.query("SELECT * FROM edi_orders WHERE status = 'pending' ORDER BY created_at DESC LIMIT 100");
      orders = result.rows;
    }
    
    if (orders.length === 0) {
      return res.json({ success: true, matches: [], noMatches: [] });
    }
    
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    const matchResults = await zoho.findMatchingDrafts(orders);
    
    res.json({ success: true, matches: matchResults.matches, noMatches: matchResults.noMatches });
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
        const updated = await zoho.updateDraftWithEdiData(match.zohoDraftId, ediOrder);
        
        await pool.query(`
          UPDATE edi_orders SET status = 'processed', zoho_so_id = $1, zoho_so_number = $2,
          matched_draft_id = $3, processed_at = NOW() WHERE id = $4
        `, [updated.salesorder_id, updated.salesorder_number, match.zohoDraftId, match.ediOrderId]);
        
        processed++;
        results.push({ ediOrderId: match.ediOrderId, success: true, zohoId: updated.salesorder_id });
        logger.info('Match confirmed', { ediOrderId: match.ediOrderId, zohoSoNumber: updated.salesorder_number });
      } catch (error) {
        failed++;
        results.push({ ediOrderId: match.ediOrderId, success: false, error: error.message });
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
        
        const mappingResult = await pool.query(
          'SELECT zoho_customer_id FROM customer_mappings WHERE edi_customer_name = $1',
          [ediOrder.edi_customer_name]
        );
        
        if (mappingResult.rows.length === 0) {
          failed++;
          results.push({ ediOrderId: newOrder.ediOrderId, success: false, error: 'No customer mapping' });
          continue;
        }
        
        const created = await zoho.createBooksSalesOrder({
          customerId: mappingResult.rows[0].zoho_customer_id,
          poNumber: ediOrder.edi_order_number,
          orderDate: parsed.dates?.orderDate,
          shipDate: parsed.dates?.shipNotBefore,
          items: parsed.items || []
        });
        
        await pool.query(`
          UPDATE edi_orders SET status = 'processed', zoho_so_id = $1, zoho_so_number = $2, processed_at = NOW()
          WHERE id = $3
        `, [created.salesorder_id, created.salesorder_number, newOrder.ediOrderId]);
        
        processed++;
        results.push({ ediOrderId: newOrder.ediOrderId, success: true, zohoId: created.salesorder_id });
      } catch (error) {
        failed++;
        results.push({ ediOrderId: newOrder.ediOrderId, success: false, error: error.message });
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
    
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    const updated = await zoho.updateDraftWithEdiData(zohoDraftId, orderResult.rows[0]);
    
    await pool.query(`
      UPDATE edi_orders SET status = 'processed', zoho_so_id = $1, zoho_so_number = $2,
      matched_draft_id = $3, processed_at = NOW() WHERE id = $4
    `, [updated.salesorder_id, updated.salesorder_number, zohoDraftId, ediOrderId]);
    
    res.json({ success: true, zohoOrder: updated });
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
      VALUES ($1, $2, $3) ON CONFLICT (edi_customer_name) DO UPDATE SET zoho_customer_id = $2, zoho_customer_name = $3
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

    // Add columns if needed
    try {
      await pool.query(`
        ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS matched_draft_id VARCHAR(255);
        ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS zoho_so_number VARCHAR(255);
        ALTER TABLE edi_orders ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;
      `);
    } catch (e) { /* ignore */ }

    const schedule = process.env.CRON_SCHEDULE || '*/15 * * * *';
    cron.schedule(schedule, async () => {
      logger.info('Scheduled job triggered');
      try { await processEDIOrders(); } catch (error) { logger.error('Scheduled processing failed', { error: error.message }); }
    });
    logger.info('Cron job scheduled: ' + schedule);

    const port = process.env.PORT || 3000;
    app.listen(port, () => { logger.info('Server running on port ' + port); });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();
