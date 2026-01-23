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
      SELECT id, filename, edi_order_number, status, zoho_so_id, error_message, created_at,
             edi_customer_name, suggested_zoho_account_id, suggested_zoho_account_name, mapping_confirmed
      FROM edi_orders
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
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
    
    // Try to get accounts with full error details
    const token = await zoho.ensureValidToken();
    const axios = require('axios');
    
    // Try COQL query instead
    const response = await axios({
      method: 'POST',
      url: 'https://www.zohoapis.com/crm/v2/coql',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        select_query: "select id, Account_Name from Accounts limit 10"
      }
    });
    
    res.json({
      success: true,
      data: response.data,
      status: response.status
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

// Suggest customer mapping (fuzzy match)
app.post('/suggest-mapping', async (req, res) => {
  const { ediCustomerName } = req.body;
  const { getCustomerMapping } = require('./db');
  
  try {
    // First check if we have a confirmed mapping
    const existingMapping = await getCustomerMapping(ediCustomerName);
    if (existingMapping && existingMapping.confirmed) {
      return res.json({
        source: 'saved',
        mapping: existingMapping
      });
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
      UPDATE edi_orders SET
        suggested_zoho_account_id = $2,
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
      return res.json({ success: true, message: 'No pending orders', processed: 0, failed: 0 });
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
          await updateOrderStatus(order.id, 'processed', {
            soId: result.soId,
            soNumber: result.soNumber
          });
          processed++;
        } else {
          await updateOrderStatus(order.id, 'failed', {
            error: result.error
          });
          failed++;
        }
      } catch (error) {
        logger.error('Error processing order', { orderId: order.id, error: error.message });
        await updateOrderStatus(order.id, 'failed', { error: error.message });
        failed++;
      }
    }
    
    res.json({ success: true, processed, failed, total: orders.length });
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
      return res.json({ success: true, message: 'No valid orders to process', processed: 0, failed: 0 });
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
          await updateOrderStatus(order.id, 'processed', {
            soId: result.soId,
            soNumber: result.soNumber
          });
          processed++;
        } else {
          await updateOrderStatus(order.id, 'failed', {
            error: result.error
          });
          failed++;
        }
      } catch (error) {
        logger.error('Error processing order', { orderId: order.id, error: error.message });
        await updateOrderStatus(order.id, 'failed', { error: error.message });
        failed++;
      }
    }
    
    res.json({ success: true, processed, failed, total: orders.length });
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
