require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const { initDatabase } = require('./db');
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

// OAuth routes for Zoho authorization
setupOAuthRoutes(app);

// Manual trigger endpoint
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
  const { pool } = require('./db');
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'processed') as processed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
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

// Recent orders endpoint
app.get('/orders', async (req, res) => {
  const { pool } = require('./db');
  try {
    const result = await pool.query(`
      SELECT id, filename, edi_order_number, status, zoho_so_id, zoho_so_number, error_message, created_at, processed_at,
             edi_customer_name, suggested_zoho_account_id, suggested_zoho_account_name, mapping_confirmed,
             parsed_data
      FROM edi_orders
      ORDER BY created_at DESC
      LIMIT 500
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset all orders to pending status (for re-testing) - POST version
app.post('/reset-to-pending', async (req, res) => {
  const { pool } = require('./db');
  try {
    const result = await pool.query(`UPDATE edi_orders SET status = 'pending', zoho_so_id = NULL, error_message = NULL WHERE status IN ('processed', 'failed')`);
    logger.info('Reset orders to pending', { count: result.rowCount });
    res.json({ success: true, count: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset all orders to pending status (for re-testing) - GET version for browser access
app.get('/reset-to-pending', async (req, res) => {
  const { pool } = require('./db');
  try {
    const result = await pool.query(`UPDATE edi_orders SET status = 'pending', zoho_so_id = NULL, error_message = NULL WHERE status IN ('processed', 'failed')`);
    logger.info('Reset orders to pending via GET', { count: result.rowCount });
    res.send(`
      <h1>✅ Reset Complete</h1>
      <p>Reset ${result.rowCount} orders to pending status.</p>
      <p><a href="/">Go to Dashboard</a> to process orders.</p>
    `);
  } catch (error) {
    res.status(500).send('Error: ' + error.message);
  }
});

// Manually trigger SFTP fetch
app.post('/fetch-sftp', async (req, res) => {
  try {
    logger.info('Manual SFTP fetch triggered');
    const processor = require('./processor');
    const result = await processor.processEDIOrders();
    res.json({
      success: true,
      message: 'SFTP fetch complete',
      filesProcessed: result.filesProcessed || 0,
      ordersCreated: result.ordersCreated || 0,
      errors: result.errors || []
    });
  } catch (error) {
    logger.error('Manual SFTP fetch failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Reset and re-import orders (clears orders and processed_files to re-download from SFTP)
app.post('/reset-orders', async (req, res) => {
  const { pool } = require('./db');
  try {
    await pool.query('DELETE FROM edi_orders');
    await pool.query('DELETE FROM processed_files');
    logger.info('Reset all orders and processed files');
    res.json({ success: true, message: 'All orders cleared. Click Process Orders to re-import from SFTP.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET version for easy browser access
app.get('/reset-orders', async (req, res) => {
  const { pool } = require('./db');
  try {
    const ordersResult = await pool.query('SELECT COUNT(*) FROM edi_orders');
    const count = ordersResult.rows[0].count;

    await pool.query('DELETE FROM edi_orders');
    await pool.query('DELETE FROM processed_files');
    logger.info('Reset all orders and processed files via GET');

    res.send(`
      <h1>✅ Reset Complete</h1>
      <p>Deleted ${count} orders and cleared processed files.</p>
      <p><a href="/">Go to Dashboard</a> and click "Process Orders" to re-import from SFTP.</p>
    `);
  } catch (error) {
    res.status(500).send('Error: ' + error.message);
  }
});

// Add manual customer mapping
app.post('/add-mapping', async (req, res) => {
  const { ediCustomerName, zohoAccountName } = req.body;
  const { saveCustomerMapping } = require('./db');

  if (!ediCustomerName || !zohoAccountName) {
    return res.status(400).json({ error: 'Both ediCustomerName and zohoAccountName are required' });
  }

  try {
    await saveCustomerMapping(ediCustomerName, null, zohoAccountName, true, 100);
    logger.info('Added manual customer mapping', { ediCustomerName, zohoAccountName });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single order details
app.get('/orders/:id', async (req, res) => {
  const { pool } = require('./db');
  try {
    const result = await pool.query(`
      SELECT id, filename, edi_order_number, status, zoho_so_id, error_message, created_at,
             edi_customer_name, suggested_zoho_account_id, suggested_zoho_account_name, mapping_confirmed,
             parsed_data, raw_edi
      FROM edi_orders
      WHERE id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all Zoho accounts for dropdown
app.get('/zoho-accounts', async (req, res) => {
  try {
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    const accounts = await zoho.getAllAccounts();
    res.json(accounts || []);
  } catch (error) {
    logger.error('Failed to get Zoho accounts', { error: error.message });
    res.json([]); // Return empty array instead of error
  }
});

// Debug endpoint to test Zoho API
app.get('/zoho-test', async (req, res) => {
  try {
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    const token = await zoho.ensureValidToken();

    const axios = require('axios');

    // Test Zoho Books API - get sales orders
    const response = await axios({
      method: 'GET',
      url: 'https://www.zohoapis.com/books/v3/salesorders',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`
      },
      params: {
        organization_id: process.env.ZOHO_ORG_ID || '',
        status: 'draft',
        per_page: 10
      }
    });

    res.json({
      success: true,
      count: response.data?.salesorders?.length || 0,
      salesorders: response.data?.salesorders || [],
      message: response.data?.message
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
  }
});

// Get Zoho Books organizations (to find org ID)
app.get('/zoho-orgs', async (req, res) => {
  try {
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    const token = await zoho.ensureValidToken();

    const axios = require('axios');

    const response = await axios({
      method: 'GET',
      url: 'https://www.zohoapis.com/books/v3/organizations',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`
      }
    });

    res.json({
      success: true,
      organizations: response.data?.organizations || []
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
  }
});

// Get processing logs
app.get('/processing-logs', async (req, res) => {
  const { getProcessingLogs } = require('./db');
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await getProcessingLogs(limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer stats for dashboard
app.get('/customer-stats', async (req, res) => {
  const { getCustomerStats } = require('./db');
  try {
    const stats = await getCustomerStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order stats
app.get('/order-stats', async (req, res) => {
  const { getOrderStats } = require('./db');
  try {
    const stats = await getOrderStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suggest customer mapping (fuzzy match)
app.post('/suggest-mapping', async (req, res) => {
  const { ediCustomerName } = req.body;
  const { getCustomerMapping } = require('./db');

  try {
    // First check if we have a confirmed mapping
    const existingMapping = await getCustomerMapping(ediCustomerName);
    if (existingMapping && existingMapping.confirmed) {
      return res.json({ source: 'saved', mapping: existingMapping });
    }

    // Otherwise do fuzzy search
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    const match = await zoho.findBestAccountMatch(ediCustomerName);

    res.json({
      source: 'suggested',
      mapping: match ? {
        zoho_account_id: match.account.id,
        zoho_account_name: match.account.Account_Name,
        match_score: match.score,
        match_type: match.matchType
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save customer mapping
app.post('/save-mapping', async (req, res) => {
  const { ediCustomerName, zohoAccountId, zohoAccountName } = req.body;
  const { saveCustomerMapping, pool } = require('./db');

  try {
    // Save to mappings table
    await saveCustomerMapping(ediCustomerName, zohoAccountId, zohoAccountName, true, 100);

    // Update all orders with this EDI customer name
    await pool.query(`
      UPDATE edi_orders
      SET suggested_zoho_account_id = $2,
          suggested_zoho_account_name = $3,
          mapping_confirmed = TRUE
      WHERE LOWER(edi_customer_name) = LOWER($1)
    `, [ediCustomerName, zohoAccountId, zohoAccountName]);

    logger.info('Saved customer mapping', { ediCustomerName, zohoAccountName });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order mapping (for individual order)
app.post('/update-order-mapping', async (req, res) => {
  const { orderId, zohoAccountId, zohoAccountName, saveForFuture } = req.body;
  const { updateOrderMapping, saveCustomerMapping, pool } = require('./db');

  try {
    // Update the specific order
    await updateOrderMapping(orderId, zohoAccountId, zohoAccountName, true);

    // If saveForFuture, also save to mappings table
    if (saveForFuture) {
      const orderResult = await pool.query('SELECT edi_customer_name FROM edi_orders WHERE id = $1', [orderId]);
      if (orderResult.rows[0]?.edi_customer_name) {
        await saveCustomerMapping(orderResult.rows[0].edi_customer_name, zohoAccountId, zohoAccountName, true, 100);
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all customer mappings
app.get('/customer-mappings', async (req, res) => {
  const { getAllCustomerMappings } = require('./db');
  try {
    const mappings = await getAllCustomerMappings();
    res.json(mappings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete customer mapping
app.delete('/customer-mappings/:id', async (req, res) => {
  const { deleteCustomerMapping } = require('./db');
  try {
    await deleteCustomerMapping(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get processing logs
app.get('/processing-logs', async (req, res) => {
  const { pool } = require('./db');
  const limit = parseInt(req.query.limit) || 50;
  try {
    const result = await pool.query(`
      SELECT * FROM processing_logs
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);
    res.json(result.rows);
  } catch (error) {
    res.json([]); // Return empty array if table doesn't exist
  }
});

// Get replaced drafts
app.get('/replaced-drafts', async (req, res) => {
  const { pool } = require('./db');
  try {
    const result = await pool.query(`
      SELECT * FROM replaced_drafts
      ORDER BY replaced_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    res.json([]); // Return empty array if table doesn't exist
  }
});

// Sync with Zoho - FIND matches but DON'T auto-update - return for review
app.post('/sync-with-zoho', async (req, res) => {
  const { pool } = require('./db');
  
  try {
    logger.info('Starting Zoho sync - finding potential matches');
    
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    const token = await zoho.ensureValidToken();
    const axios = require('axios');
    
    // Get unique customers from our EDI orders
    const customersResult = await pool.query(`
      SELECT DISTINCT edi_customer_name FROM edi_orders WHERE edi_customer_name IS NOT NULL
    `);
    const ediCustomers = customersResult.rows.map(r => r.edi_customer_name);
    logger.info(`Found ${ediCustomers.length} unique EDI customers: ${ediCustomers.join(', ')}`);
    
    // Also get mapped Zoho customer names
    const mappingsResult = await pool.query(`SELECT zoho_account_name FROM customer_mappings`);
    const mappedNames = mappingsResult.rows.map(r => r.zoho_account_name);
    
    // Combine customer names to search for
    const searchNames = [...new Set([...ediCustomers, ...mappedNames])].filter(Boolean);
    
    // Fetch Zoho orders only for these customers
    let allZohoOrders = [];
    
    for (const customerName of searchNames) {
      try {
        const response = await axios({
          method: 'GET',
          url: 'https://www.zohoapis.com/books/v3/salesorders',
          headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
          params: {
            organization_id: process.env.ZOHO_ORG_ID,
            customer_name: customerName,
            per_page: 200
          }
        });
        
        const orders = response.data?.salesorders || [];
        allZohoOrders = allZohoOrders.concat(orders);
        logger.info(`Fetched ${orders.length} orders for customer: ${customerName}`);
      } catch (err) {
        logger.warn(`Could not fetch orders for ${customerName}: ${err.message}`);
      }
    }
    
    logger.info(`Fetched ${allZohoOrders.length} total orders from Zoho Books for EDI customers`);
    
    // Build a map of reference_number (PO#) -> Zoho order
    const zohoByPO = {};
    for (const zo of allZohoOrders) {
      if (zo.reference_number) {
        zohoByPO[zo.reference_number] = zo;
      }
    }
    
    // Get all pending EDI orders with their details
    const ediResult = await pool.query(`
      SELECT id, edi_order_number, edi_customer_name, parsed_data, created_at
      FROM edi_orders 
      WHERE status = 'pending'
    `);
    
    const matches = [];
    const noMatch = [];
    
    for (const edi of ediResult.rows) {
      const poNumber = edi.edi_order_number;
      const zohoOrder = zohoByPO[poNumber];
      
      // Calculate EDI total
      const items = edi.parsed_data?.items || [];
      const ediTotal = items.reduce((s, i) => s + (i.quantityOrdered || 0) * (i.unitPrice || 0), 0);
      
      if (zohoOrder) {
        // Found a match - add to matches array for review
        matches.push({
          ediOrderId: edi.id,
          poNumber: poNumber,
          ediCustomer: edi.edi_customer_name,
          ediTotal: ediTotal,
          ediItems: items.length,
          ediDate: edi.created_at,
          zohoSoId: zohoOrder.salesorder_id,
          zohoSoNumber: zohoOrder.salesorder_number,
          zohoCustomer: zohoOrder.customer_name,
          zohoTotal: zohoOrder.total,
          zohoStatus: zohoOrder.status,
          zohoDate: zohoOrder.date,
          totalDiff: Math.abs(ediTotal - (zohoOrder.total || 0))
        });
      } else {
        noMatch.push({
          ediOrderId: edi.id,
          poNumber: poNumber,
          ediCustomer: edi.edi_customer_name,
          ediTotal: ediTotal,
          ediItems: items.length
        });
      }
    }
    
    logger.info(`Found ${matches.length} matches, ${noMatch.length} without matches`);
    
    // Return matches for review - DO NOT auto-update
    res.json({
      success: true,
      zohoOrdersFound: allZohoOrders.length,
      matches: matches,
      noMatch: noMatch,
      message: `Found ${matches.length} EDI orders that match Zoho orders. Review and confirm below.`
    });
    
  } catch (error) {
    logger.error('Zoho sync failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Confirm matches - actually update the database after user review
app.post('/confirm-matches', async (req, res) => {
  const { pool } = require('./db');
  const { matches } = req.body; // Array of { ediOrderId, zohoSoId, zohoSoNumber }
  
  if (!matches || !matches.length) {
    return res.status(400).json({ success: false, error: 'No matches to confirm' });
  }
  
  try {
    let confirmed = 0;
    
    for (const match of matches) {
      await pool.query(`
        UPDATE edi_orders 
        SET status = 'processed', 
            zoho_so_id = $2, 
            zoho_so_number = $3,
            processed_at = NOW()
        WHERE id = $1 AND status = 'pending'
      `, [match.ediOrderId, match.zohoSoId, match.zohoSoNumber]);
      confirmed++;
    }
    
    logger.info(`Confirmed ${confirmed} matches`);
    res.json({ success: true, confirmed });
  } catch (error) {
    logger.error('Confirm matches failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get draft orders from Zoho for matching
app.get('/zoho-drafts', async (req, res) => {
  try {
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    const token = await zoho.ensureValidToken();
    const axios = require('axios');
    
    const response = await axios({
      method: 'GET',
      url: 'https://www.zohoapis.com/books/v3/salesorders',
      headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
      params: {
        organization_id: process.env.ZOHO_ORG_ID,
        status: 'draft',
        per_page: 200
      }
    });
    
    const drafts = response.data?.salesorders || [];
    
    res.json({
      success: true,
      count: drafts.length,
      drafts: drafts.map(d => ({
        id: d.salesorder_id,
        number: d.salesorder_number,
        reference: d.reference_number,
        customer: d.customer_name,
        date: d.date,
        total: d.total,
        status: d.status
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Retry failed orders endpoint
app.post('/retry-failed', async (req, res) => {
  const { pool } = require('./db');
  try {
    const result = await pool.query(`
      UPDATE edi_orders
      SET status = 'pending', error_message = NULL
      WHERE status = 'failed'
      RETURNING id
    `);
    logger.info('Reset failed orders to pending', { count: result.rowCount });
    res.json({ success: true, count: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process with limit endpoint
app.post('/process-limit', async (req, res) => {
  const { pool } = require('./db');
  const limit = parseInt(req.body.limit) || 10;

  try {
    logger.info('Processing with limit', { limit });

    // Get pending orders with limit
    const pendingResult = await pool.query(`
      SELECT id, filename, edi_order_number, parsed_data
      FROM edi_orders
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT $1
    `, [limit]);

    const orders = pendingResult.rows;
    logger.info(`Found ${orders.length} pending orders to process`);

    if (orders.length === 0) {
      return res.json({
        success: true,
        message: 'No pending orders',
        processed: 0,
        failed: 0
      });
    }

    const ZohoClient = require('./zoho');
    const { processOrderToZoho } = require('./processor');
    const { updateOrderStatus } = require('./db');

    const zoho = new ZohoClient();
    let processed = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        const result = await processOrderToZoho(zoho, order);

        if (result.success) {
          await updateOrderStatus(order.id, 'processed', { soId: result.soId, soNumber: result.soNumber });
          processed++;
        } else {
          await updateOrderStatus(order.id, 'failed', { error: result.error });
          failed++;
        }
      } catch (error) {
        logger.error('Error processing order', { orderId: order.id, error: error.message });
        await updateOrderStatus(order.id, 'failed', { error: error.message });
        failed++;
      }
    }

    res.json({
      success: true,
      processed,
      failed,
      total: orders.length
    });
  } catch (error) {
    logger.error('Process with limit failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process selected orders endpoint
app.post('/process-selected', async (req, res) => {
  const { pool } = require('./db');
  const orderIds = req.body.orderIds || [];

  if (!orderIds.length) {
    return res.status(400).json({ success: false, error: 'No orders selected' });
  }

  try {
    logger.info('Processing selected orders', { count: orderIds.length, orderIds });

    // Get selected orders
    const pendingResult = await pool.query(`
      SELECT id, filename, edi_order_number, parsed_data
      FROM edi_orders
      WHERE id = ANY($1) AND status IN ('pending', 'failed')
      ORDER BY created_at ASC
    `, [orderIds]);

    const orders = pendingResult.rows;
    logger.info(`Found ${orders.length} orders to process`);

    if (orders.length === 0) {
      return res.json({
        success: true,
        message: 'No valid orders to process',
        processed: 0,
        failed: 0
      });
    }

    const ZohoClient = require('./zoho');
    const { processOrderToZoho } = require('./processor');
    const { updateOrderStatus } = require('./db');

    const zoho = new ZohoClient();
    let processed = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        const result = await processOrderToZoho(zoho, order);

        if (result.success) {
          await updateOrderStatus(order.id, 'processed', { soId: result.soId, soNumber: result.soNumber });
          processed++;
        } else {
          await updateOrderStatus(order.id, 'failed', { error: result.error });
          failed++;
        }
      } catch (error) {
        logger.error('Error processing order', { orderId: order.id, error: error.message });
        await updateOrderStatus(order.id, 'failed', { error: error.message });
        failed++;
      }
    }

    res.json({
      success: true,
      processed,
      failed,
      total: orders.length
    });
  } catch (error) {
    logger.error('Process selected failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

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
