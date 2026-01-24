require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const { pool, initDatabase, updateOrderStatus, logProcessingActivity } = require('./db');
const { processEDIOrders, processOrderToZoho } = require('./processor');
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

// OAuth routes for Zoho authorization
setupOAuthRoutes(app);

// Manual SFTP fetch trigger
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

// Legacy process endpoint (same as fetch-sftp)
app.post('/process', async (req, res) => {
  try {
    logger.info('Manual processing triggered');
    const result = await processEDIOrders();
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Manual processing failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Status endpoint
app.get('/status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'processed') as processed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending' OR status = 'ready') as pending
      FROM edi_orders
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    res.json({ 
      last24Hours: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders with full details
app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, filename, edi_order_number, customer_po, status, 
             zoho_so_id, zoho_so_number, error_message, created_at, updated_at,
             processed_at, edi_customer_name, parsed_data
      FROM edi_orders
      ORDER BY created_at DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single order details
app.get('/orders/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM edi_orders WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process single order to Zoho
app.post('/orders/:id/process', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const result = await pool.query('SELECT * FROM edi_orders WHERE id = $1', [orderId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    const order = result.rows[0];
    const processResult = await processOrderToZoho(order);
    
    res.json(processResult);
  } catch (error) {
    logger.error('Process order failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process multiple selected orders
app.post('/process-selected', async (req, res) => {
  const { orderIds } = req.body;
  
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ success: false, error: 'No orders selected' });
  }

  try {
    const results = { processed: 0, failed: 0, errors: [] };
    
    for (const orderId of orderIds) {
      try {
        const orderResult = await pool.query('SELECT * FROM edi_orders WHERE id = $1', [orderId]);
        if (orderResult.rows.length === 0) continue;
        
        const order = orderResult.rows[0];
        const processResult = await processOrderToZoho(order);
        
        if (processResult.success) {
          results.processed++;
        } else {
          results.failed++;
          results.errors.push({ orderId, error: processResult.error });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ orderId, error: error.message });
      }
    }
    
    res.json({ success: true, ...results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Customer mappings endpoints
app.get('/customer-mappings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customer_mappings ORDER BY edi_customer_name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/add-mapping', async (req, res) => {
  const { ediCustomerName, zohoAccountName, zohoAccountId } = req.body;
  try {
    await pool.query(
      `INSERT INTO customer_mappings (edi_customer_name, zoho_account_name, zoho_account_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (edi_customer_name) DO UPDATE SET zoho_account_name = $2, zoho_account_id = $3`,
      [ediCustomerName, zohoAccountName, zohoAccountId || null]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/customer-mappings/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM customer_mappings WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Zoho customers search
app.get('/zoho-customers', async (req, res) => {
  try {
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    const customers = await zoho.getBooksCustomers();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Processing logs
app.get('/processing-logs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM processing_logs 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    res.json([]);
  }
});

// Reset orders to pending (POST)
app.post('/reset-to-pending', async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE edi_orders 
      SET status = 'pending', zoho_so_id = NULL, zoho_so_number = NULL, error_message = NULL 
      WHERE status IN ('processed', 'failed')
    `);
    logger.info('Reset orders to pending', { count: result.rowCount });
    res.json({ success: true, count: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset orders to pending (GET for browser access)
app.get('/reset-to-pending', async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE edi_orders 
      SET status = 'pending', zoho_so_id = NULL, zoho_so_number = NULL, error_message = NULL 
      WHERE status IN ('processed', 'failed')
    `);
    logger.info('Reset orders to pending (GET)', { count: result.rowCount });
    res.send(`<html><body><h1>Reset Complete</h1><p>Reset ${result.rowCount} orders to pending status.</p><a href="/">Back to Dashboard</a></body></html>`);
  } catch (error) {
    res.status(500).send(`<html><body><h1>Error</h1><p>${error.message}</p></body></html>`);
  }
});

// ============================================
// EXPORT ROUTES - For backup before changes
// ============================================

// Export all order history as CSV
app.get('/export-orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, edi_order_number, customer_po, edi_customer_name, status,
             zoho_so_id, zoho_so_number, created_at, processed_at, parsed_data
      FROM edi_orders ORDER BY created_at DESC
    `);
    const orders = result.rows;
    const headers = ['ID','PO Number','Customer','Status','Zoho SO ID','Zoho SO#','Line Items','Total Units','Total Value','Created','Processed'];
    const rows = orders.map(o => {
      const items = o.parsed_data?.items || [];
      const units = items.reduce((s,i) => s + (i.quantityOrdered||0), 0);
      const value = items.reduce((s,i) => s + (i.quantityOrdered||0)*(i.unitPrice||0), 0);
      return [o.id, o.edi_order_number||'', o.edi_customer_name||'', o.status||'', o.zoho_so_id||'', o.zoho_so_number||'', items.length, units, value.toFixed(2), o.created_at||'', o.processed_at||''].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="edi-orders-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send([headers.join(','), ...rows].join('\n'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Export detailed line items as CSV
app.get('/export-line-items', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, edi_order_number, edi_customer_name, status, zoho_so_number, parsed_data FROM edi_orders ORDER BY created_at DESC`);
    const headers = ['Order ID','PO Number','Customer','Status','Zoho SO#','Line#','Style','Description','Color','Size','Qty','Unit Price','Amount'];
    const rows = [];
    result.rows.forEach(o => {
      (o.parsed_data?.items || []).forEach((item, idx) => {
        rows.push([o.id, o.edi_order_number||'', o.edi_customer_name||'', o.status||'', o.zoho_so_number||'', item.lineNumber||(idx+1), item.productIds?.sku||item.productIds?.vendorItemNumber||'', item.description||'', item.color||'', item.size||'', item.quantityOrdered||0, item.unitPrice||0, ((item.quantityOrdered||0)*(item.unitPrice||0)).toFixed(2)].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
      });
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="edi-line-items-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send([headers.join(','), ...rows].join('\n'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// RE-PARSE ROUTES - Fix prices in existing orders
// ============================================

// Re-parse all existing orders with updated parser
app.post('/reparse-orders', async (req, res) => {
  const { parseSpringCSV } = require('./csv-parser');
  try {
    const result = await pool.query(`SELECT id, filename, raw_edi, edi_order_number FROM edi_orders WHERE raw_edi IS NOT NULL AND raw_edi != ''`);
    let updated = 0, failed = 0;
    for (const order of result.rows) {
      try {
        const newParsed = parseSpringCSV(order.raw_edi, order.filename || 'unknown.csv');
        await pool.query(`UPDATE edi_orders SET parsed_data = $1 WHERE id = $2`, [JSON.stringify(newParsed), order.id]);
        updated++;
      } catch (e) { 
        failed++; 
        logger.error('Re-parse failed', { id: order.id, error: e.message }); 
      }
    }
    logger.info('Re-parse complete', { updated, failed });
    res.json({ success: true, message: `Re-parsed ${updated} orders, ${failed} failed`, updated, failed });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Preview what re-parse will change (GET for browser)
app.get('/reparse-preview', async (req, res) => {
  const { parseSpringCSV } = require('./csv-parser');
  try {
    const result = await pool.query(`SELECT id, filename, raw_edi, edi_order_number, parsed_data FROM edi_orders WHERE raw_edi IS NOT NULL LIMIT 5`);
    const previews = result.rows.map(o => {
      try {
        const oldItem = o.parsed_data?.items?.[0] || {};
        const newParsed = parseSpringCSV(o.raw_edi, o.filename || 'unknown.csv');
        const newItem = newParsed.items?.[0] || {};
        return { 
          poNumber: o.edi_order_number, 
          before: { price: oldItem.unitPrice, qty: oldItem.quantityOrdered }, 
          after: { price: newItem.unitPrice, qty: newItem.quantityOrdered }, 
          changed: oldItem.unitPrice !== newItem.unitPrice 
        };
      } catch (e) { return { poNumber: o.edi_order_number, error: e.message }; }
    });
    res.json({ previews });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    logger.info('Database initialized');

    // Start the scheduled job
    const schedule = process.env.CRON_SCHEDULE || '*/15 * * * *';
    cron.schedule(schedule, async () => {
      logger.info('Scheduled job triggered');
      try {
        await processEDIOrders();
      } catch (error) {
        logger.error('Scheduled processing failed', { error: error.message });
      }
    });
    logger.info(`Cron job scheduled: ${schedule}`);

    // Start Express server
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info('OAuth setup: Visit /oauth/start to authorize with Zoho');
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();
