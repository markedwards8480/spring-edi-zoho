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

// Sync with Zoho - FIND matches with detailed scoring for review
app.post('/sync-with-zoho', async (req, res) => {
  const { pool } = require('./db');
  
  try {
    logger.info('Starting Zoho sync - finding potential matches with scoring');
    
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
    
    // Fetch Zoho orders only for these customers (include line items)
    let allZohoOrders = [];
    
    for (const customerName of searchNames) {
      try {
        // First get the list of orders
        const listResponse = await axios({
          method: 'GET',
          url: 'https://www.zohoapis.com/books/v3/salesorders',
          headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
          params: {
            organization_id: process.env.ZOHO_ORG_ID,
            customer_name: customerName,
            per_page: 200
          }
        });
        
        const orders = listResponse.data?.salesorders || [];
        
        // For each order, get full details including line items
        for (const order of orders.slice(0, 50)) { // Limit to 50 per customer for performance
          try {
            const detailResponse = await axios({
              method: 'GET',
              url: `https://www.zohoapis.com/books/v3/salesorders/${order.salesorder_id}`,
              headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
              params: { organization_id: process.env.ZOHO_ORG_ID }
            });
            if (detailResponse.data?.salesorder) {
              allZohoOrders.push(detailResponse.data.salesorder);
            }
          } catch (e) {
            // If detail fetch fails, use basic info
            allZohoOrders.push(order);
          }
        }
        
        logger.info(`Fetched ${orders.length} orders for customer: ${customerName}`);
      } catch (err) {
        logger.warn(`Could not fetch orders for ${customerName}: ${err.message}`);
      }
    }
    
    logger.info(`Fetched ${allZohoOrders.length} total orders from Zoho Books`);
    
    // Get all pending EDI orders with full details
    const ediResult = await pool.query(`
      SELECT id, edi_order_number, edi_customer_name, parsed_data, created_at
      FROM edi_orders 
      WHERE status = 'pending'
    `);
    
    const matches = [];
    const noMatch = [];
    
    // Smart matching function
    function calculateMatchScore(ediOrder, zohoOrder) {
      const result = {
        matches: [],
        warnings: [],
        mismatches: [],
        score: 0,
        maxScore: 100
      };
      
      const ediPO = ediOrder.edi_order_number || '';
      const zohoPO = zohoOrder.reference_number || '';
      const ediCustomer = (ediOrder.edi_customer_name || '').toLowerCase();
      const zohoCustomer = (zohoOrder.customer_name || '').toLowerCase();
      const ediItems = ediOrder.parsed_data?.items || [];
      const zohoItems = zohoOrder.line_items || [];
      
      // 1. PO Number Match (30 points)
      if (ediPO && zohoPO && ediPO === zohoPO) {
        result.score += 30;
        result.matches.push({ field: 'PO Number', edi: ediPO, zoho: zohoPO });
      } else if (ediPO && zohoPO) {
        result.mismatches.push({ field: 'PO Number', edi: ediPO, zoho: zohoPO });
      }
      
      // 2. Customer Match (20 points)
      if (ediCustomer && zohoCustomer) {
        if (ediCustomer === zohoCustomer || 
            ediCustomer.includes(zohoCustomer.split(' ')[0].toLowerCase()) || 
            zohoCustomer.includes(ediCustomer.split(' ')[0].toLowerCase())) {
          result.score += 20;
          result.matches.push({ field: 'Customer', edi: ediOrder.edi_customer_name, zoho: zohoOrder.customer_name });
        } else {
          result.mismatches.push({ field: 'Customer', edi: ediOrder.edi_customer_name, zoho: zohoOrder.customer_name });
        }
      }
      
      // 3. Ship Date Match (10 points)
      const ediShipDate = ediOrder.parsed_data?.dates?.shipNotBefore || '';
      const zohoShipDate = zohoOrder.shipment_date || zohoOrder.date || '';
      if (ediShipDate && zohoShipDate) {
        const ediD = ediShipDate.substring(0, 10);
        const zohoD = zohoShipDate.substring(0, 10);
        if (ediD === zohoD) {
          result.score += 10;
          result.matches.push({ field: 'Ship Date', edi: ediShipDate, zoho: zohoShipDate });
        } else {
          const diffDays = Math.abs((new Date(ediD) - new Date(zohoD)) / (1000*60*60*24));
          if (diffDays <= 7) {
            result.score += 5;
            result.warnings.push({ field: 'Ship Date', edi: ediShipDate, zoho: zohoShipDate, diff: `${Math.round(diffDays)} days` });
          } else {
            result.mismatches.push({ field: 'Ship Date', edi: ediShipDate, zoho: zohoShipDate });
          }
        }
      }
      
      // 4. Cancel Date Match (10 points)
      const ediCancelDate = ediOrder.parsed_data?.dates?.shipNotAfter || '';
      const zohoCancelDate = zohoOrder.cf_cancel_date || '';
      if (ediCancelDate && zohoCancelDate) {
        if (ediCancelDate.substring(0,10) === zohoCancelDate.substring(0,10)) {
          result.score += 10;
          result.matches.push({ field: 'Cancel Date', edi: ediCancelDate, zoho: zohoCancelDate });
        } else {
          result.warnings.push({ field: 'Cancel Date', edi: ediCancelDate, zoho: zohoCancelDate });
        }
      }
      
      // 5. Total Amount Match (15 points)
      const ediTotal = ediItems.reduce((s, i) => s + (i.quantityOrdered||0) * (i.unitPrice||0), 0);
      const zohoTotal = parseFloat(zohoOrder.total) || 0;
      if (ediTotal > 0 && zohoTotal > 0) {
        const diff = Math.abs(ediTotal - zohoTotal);
        const pctDiff = (diff / Math.max(ediTotal, zohoTotal)) * 100;
        if (pctDiff < 1) {
          result.score += 15;
          result.matches.push({ field: 'Total Amount', edi: '$' + ediTotal.toFixed(2), zoho: '$' + zohoTotal.toFixed(2) });
        } else if (pctDiff < 10) {
          result.score += 8;
          result.warnings.push({ field: 'Total Amount', edi: '$' + ediTotal.toFixed(2), zoho: '$' + zohoTotal.toFixed(2), diff: '$' + diff.toFixed(2) });
        } else {
          result.mismatches.push({ field: 'Total Amount', edi: '$' + ediTotal.toFixed(2), zoho: '$' + zohoTotal.toFixed(2), diff: '$' + diff.toFixed(2) });
        }
      }
      
      // 6. Line Items / Styles Match (15 points)
      if (ediItems.length > 0 && zohoItems.length > 0) {
        const ediStyles = new Set(ediItems.map(i => (i.productIds?.vendorItemNumber || i.productIds?.buyerItemNumber || i.sku || '').toUpperCase()).filter(Boolean));
        const zohoStyles = new Set(zohoItems.map(i => (i.sku || i.name || '').toUpperCase()).filter(Boolean));
        const matched = [...ediStyles].filter(s => zohoStyles.has(s)).length;
        const total = Math.max(ediStyles.size, zohoStyles.size);
        
        if (total > 0) {
          const matchPct = matched / total;
          if (matchPct >= 0.9) {
            result.score += 15;
            result.matches.push({ field: 'Styles', edi: ediStyles.size + ' styles', zoho: zohoStyles.size + ' styles', detail: matched + ' matched' });
          } else if (matchPct >= 0.5) {
            result.score += 8;
            result.warnings.push({ field: 'Styles', edi: ediStyles.size + ' styles', zoho: zohoStyles.size + ' styles', detail: matched + ' of ' + total + ' matched' });
          } else {
            result.mismatches.push({ field: 'Styles', edi: ediStyles.size + ' styles', zoho: zohoStyles.size + ' styles', detail: 'Only ' + matched + ' matched' });
          }
        }
      }
      
      result.percentage = Math.round((result.score / result.maxScore) * 100);
      result.confidence = result.percentage >= 70 ? 'high' : result.percentage >= 40 ? 'medium' : 'low';
      
      return result;
    }
    
    // Find best matches for each EDI order
    for (const edi of ediResult.rows) {
      let bestMatch = null;
      let bestScore = null;
      
      for (const zoho of allZohoOrders) {
        const score = calculateMatchScore(edi, zoho);
        
        // Only consider if PO matches OR score is reasonably high
        const poMatches = edi.edi_order_number && zoho.reference_number && 
                          edi.edi_order_number === zoho.reference_number;
        
        if (poMatches || score.percentage >= 40) {
          if (!bestScore || score.percentage > bestScore.percentage) {
            bestMatch = zoho;
            bestScore = score;
          }
        }
      }
      
      const ediItems = edi.parsed_data?.items || [];
      const ediTotal = ediItems.reduce((s, i) => s + (i.quantityOrdered||0) * (i.unitPrice||0), 0);
      
      if (bestMatch && bestScore && bestScore.percentage >= 30) {
        matches.push({
          ediOrderId: edi.id,
          poNumber: edi.edi_order_number,
          ediCustomer: edi.edi_customer_name,
          ediTotal: ediTotal,
          ediItemCount: ediItems.length,
          ediItems: ediItems.slice(0, 10), // First 10 items for preview
          ediDates: edi.parsed_data?.dates || {},
          zohoSoId: bestMatch.salesorder_id,
          zohoSoNumber: bestMatch.salesorder_number,
          zohoCustomer: bestMatch.customer_name,
          zohoTotal: parseFloat(bestMatch.total) || 0,
          zohoStatus: bestMatch.status,
          zohoDate: bestMatch.date,
          zohoItemCount: (bestMatch.line_items || []).length,
          zohoItems: (bestMatch.line_items || []).slice(0, 10),
          matchScore: bestScore
        });
      } else {
        noMatch.push({
          ediOrderId: edi.id,
          poNumber: edi.edi_order_number,
          ediCustomer: edi.edi_customer_name,
          ediTotal: ediTotal,
          ediItemCount: ediItems.length
        });
      }
    }
    
    // Sort matches by score descending
    matches.sort((a, b) => b.matchScore.percentage - a.matchScore.percentage);
    
    logger.info(`Found ${matches.length} matches, ${noMatch.length} without matches`);
    
    res.json({
      success: true,
      zohoOrdersFound: allZohoOrders.length,
      matches: matches,
      noMatch: noMatch,
      message: `Found ${matches.length} potential matches. Review the match scores below.`
    });
    
  } catch (error) {
    logger.error('Zoho sync failed', { error: error.message, stack: error.stack });
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

// ============================================================
// ORDER CHANGES AUDIT LOG
// ============================================================

// Create order_changes table if not exists
async function ensureOrderChangesTable() {
  const { pool } = require('./db');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_changes (
      id SERIAL PRIMARY KEY,
      edi_order_id INTEGER,
      zoho_so_id TEXT,
      zoho_so_number TEXT,
      change_type TEXT,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      style TEXT,
      color TEXT,
      size TEXT,
      quantity_diff INTEGER,
      notes TEXT,
      flagged_for_review BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

// Log a change
async function logOrderChange(changeData) {
  const { pool } = require('./db');
  await ensureOrderChangesTable();
  await pool.query(`
    INSERT INTO order_changes 
    (edi_order_id, zoho_so_id, zoho_so_number, change_type, field_name, old_value, new_value, style, color, size, quantity_diff, notes, flagged_for_review)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [
    changeData.ediOrderId,
    changeData.zohoSoId,
    changeData.zohoSoNumber,
    changeData.changeType,
    changeData.fieldName,
    changeData.oldValue,
    changeData.newValue,
    changeData.style || null,
    changeData.color || null,
    changeData.size || null,
    changeData.quantityDiff || null,
    changeData.notes || null,
    changeData.flaggedForReview || false
  ]);
}

// Get order change history
app.get('/order-changes', async (req, res) => {
  const { pool } = require('./db');
  try {
    await ensureOrderChangesTable();
    const result = await pool.query(`
      SELECT * FROM order_changes 
      ORDER BY created_at DESC 
      LIMIT 500
    `);
    res.json({ success: true, changes: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get changes for specific order
app.get('/order-changes/:zohoSoId', async (req, res) => {
  const { pool } = require('./db');
  try {
    await ensureOrderChangesTable();
    const result = await pool.query(`
      SELECT * FROM order_changes 
      WHERE zoho_so_id = $1
      ORDER BY created_at DESC
    `, [req.params.zohoSoId]);
    res.json({ success: true, changes: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// DETAILED COMPARISON ENDPOINT
// ============================================================

// Get detailed comparison between EDI order and Zoho order
app.post('/compare-orders', async (req, res) => {
  const { pool } = require('./db');
  const { ediOrderId, zohoSoId } = req.body;
  
  try {
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    const token = await zoho.ensureValidToken();
    const axios = require('axios');
    
    // Get EDI order from our DB
    const ediResult = await pool.query(`
      SELECT * FROM edi_orders WHERE id = $1
    `, [ediOrderId]);
    
    if (!ediResult.rows.length) {
      return res.status(404).json({ success: false, error: 'EDI order not found' });
    }
    
    const ediOrder = ediResult.rows[0];
    const ediData = ediOrder.parsed_data || {};
    const ediItems = ediData.items || [];
    
    // Get Zoho order with full details
    const zohoResponse = await axios({
      method: 'GET',
      url: `https://www.zohoapis.com/books/v3/salesorders/${zohoSoId}`,
      headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
      params: { organization_id: process.env.ZOHO_ORG_ID }
    });
    
    const zohoOrder = zohoResponse.data?.salesorder;
    if (!zohoOrder) {
      return res.status(404).json({ success: false, error: 'Zoho order not found' });
    }
    
    const zohoItems = zohoOrder.line_items || [];
    
    // Build detailed comparison
    const comparison = {
      edi: {
        id: ediOrder.id,
        poNumber: ediOrder.edi_order_number,
        customer: ediOrder.edi_customer_name,
        orderDate: ediData.dates?.orderDate,
        shipDate: ediData.dates?.shipNotBefore,
        cancelDate: ediData.dates?.shipNotAfter,
        items: ediItems.map(i => ({
          style: i.productIds?.vendorItemNumber || i.productIds?.buyerItemNumber || i.sku || '',
          description: i.description || '',
          color: i.color || '',
          size: i.size || '',
          quantity: i.quantityOrdered || 0,
          price: i.unitPrice || 0,
          amount: (i.quantityOrdered || 0) * (i.unitPrice || 0)
        })),
        totalQty: ediItems.reduce((s, i) => s + (i.quantityOrdered || 0), 0),
        totalAmount: ediItems.reduce((s, i) => s + (i.quantityOrdered || 0) * (i.unitPrice || 0), 0)
      },
      zoho: {
        id: zohoOrder.salesorder_id,
        number: zohoOrder.salesorder_number,
        reference: zohoOrder.reference_number,
        customer: zohoOrder.customer_name,
        customerId: zohoOrder.customer_id,
        date: zohoOrder.date,
        shipDate: zohoOrder.shipment_date,
        status: zohoOrder.status,
        items: zohoItems.map(i => ({
          lineItemId: i.line_item_id,
          itemId: i.item_id,
          style: i.sku || i.name || '',
          description: i.description || i.name || '',
          color: '', // Zoho may not have color separately
          size: '', // Zoho may not have size separately
          quantity: i.quantity || 0,
          price: i.rate || 0,
          amount: i.item_total || 0
        })),
        totalQty: zohoItems.reduce((s, i) => s + (i.quantity || 0), 0),
        totalAmount: parseFloat(zohoOrder.total) || 0
      },
      changes: []
    };
    
    // Calculate changes needed
    
    // 1. Header changes
    if (ediOrder.edi_order_number && ediOrder.edi_order_number !== zohoOrder.reference_number) {
      comparison.changes.push({
        type: 'header',
        field: 'Reference/PO Number',
        oldValue: zohoOrder.reference_number || '(blank)',
        newValue: ediOrder.edi_order_number,
        action: 'update'
      });
    }
    
    if (ediData.dates?.shipNotBefore && ediData.dates.shipNotBefore !== zohoOrder.shipment_date) {
      comparison.changes.push({
        type: 'header',
        field: 'Ship Date',
        oldValue: zohoOrder.shipment_date || '(blank)',
        newValue: ediData.dates.shipNotBefore,
        action: 'update'
      });
    }
    
    // 2. Line item changes
    // Build maps by style for comparison
    const ediByStyle = {};
    ediItems.forEach(i => {
      const key = (i.productIds?.vendorItemNumber || i.productIds?.buyerItemNumber || i.sku || '').toUpperCase();
      if (key) {
        if (!ediByStyle[key]) ediByStyle[key] = [];
        ediByStyle[key].push(i);
      }
    });
    
    const zohoByStyle = {};
    zohoItems.forEach(i => {
      const key = (i.sku || i.name || '').toUpperCase();
      if (key) {
        if (!zohoByStyle[key]) zohoByStyle[key] = [];
        zohoByStyle[key].push(i);
      }
    });
    
    // Find qty differences and missing items
    const allStyles = new Set([...Object.keys(ediByStyle), ...Object.keys(zohoByStyle)]);
    
    allStyles.forEach(style => {
      const ediForStyle = ediByStyle[style] || [];
      const zohoForStyle = zohoByStyle[style] || [];
      
      const ediQty = ediForStyle.reduce((s, i) => s + (i.quantityOrdered || 0), 0);
      const zohoQty = zohoForStyle.reduce((s, i) => s + (i.quantity || 0), 0);
      
      if (ediQty > 0 && zohoQty === 0) {
        // Style in EDI but not in Zoho - need to add
        comparison.changes.push({
          type: 'line_item',
          field: 'Add Line',
          style: style,
          oldValue: '0',
          newValue: String(ediQty),
          quantityDiff: ediQty,
          action: 'add',
          flagForReview: false
        });
      } else if (ediQty === 0 && zohoQty > 0) {
        // Style in Zoho but not in EDI - flag for review
        comparison.changes.push({
          type: 'line_item',
          field: 'Remove Line',
          style: style,
          oldValue: String(zohoQty),
          newValue: '0',
          quantityDiff: -zohoQty,
          action: 'remove',
          flagForReview: true,
          note: 'Style in Zoho but not in EDI - verify with customer'
        });
      } else if (ediQty !== zohoQty) {
        // Quantity difference
        const diff = ediQty - zohoQty;
        comparison.changes.push({
          type: 'line_item',
          field: 'Quantity',
          style: style,
          oldValue: String(zohoQty),
          newValue: String(ediQty),
          quantityDiff: diff,
          action: diff > 0 ? 'increase' : 'decrease',
          flagForReview: diff < 0, // Flag if EDI is LESS than Zoho
          note: diff < 0 ? 'EDI quantity is LESS than Zoho - verify with customer' : null
        });
      }
    });
    
    // Summary
    comparison.summary = {
      hasChanges: comparison.changes.length > 0,
      totalChanges: comparison.changes.length,
      headerChanges: comparison.changes.filter(c => c.type === 'header').length,
      lineChanges: comparison.changes.filter(c => c.type === 'line_item').length,
      flaggedForReview: comparison.changes.filter(c => c.flagForReview).length,
      ediTotal: comparison.edi.totalAmount,
      zohoTotal: comparison.zoho.totalAmount,
      amountDiff: comparison.edi.totalAmount - comparison.zoho.totalAmount
    };
    
    res.json({ success: true, comparison });
    
  } catch (error) {
    logger.error('Compare orders failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// UPDATE ZOHO ORDER ENDPOINT
// ============================================================

app.post('/update-zoho-order', async (req, res) => {
  const { pool } = require('./db');
  const { ediOrderId, zohoSoId, changes, applyAll } = req.body;
  
  try {
    const ZohoClient = require('./zoho');
    const zoho = new ZohoClient();
    const token = await zoho.ensureValidToken();
    const axios = require('axios');
    
    // Get current Zoho order
    const zohoResponse = await axios({
      method: 'GET',
      url: `https://www.zohoapis.com/books/v3/salesorders/${zohoSoId}`,
      headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
      params: { organization_id: process.env.ZOHO_ORG_ID }
    });
    
    const zohoOrder = zohoResponse.data?.salesorder;
    if (!zohoOrder) {
      return res.status(404).json({ success: false, error: 'Zoho order not found' });
    }
    
    // Get EDI order
    const ediResult = await pool.query(`SELECT * FROM edi_orders WHERE id = $1`, [ediOrderId]);
    const ediOrder = ediResult.rows[0];
    const ediData = ediOrder?.parsed_data || {};
    
    // Build update payload
    const updatePayload = {};
    const appliedChanges = [];
    
    // Apply header changes
    if (changes.some(c => c.field === 'Reference/PO Number')) {
      updatePayload.reference_number = ediOrder.edi_order_number;
      appliedChanges.push({
        changeType: 'header_update',
        fieldName: 'reference_number',
        oldValue: zohoOrder.reference_number,
        newValue: ediOrder.edi_order_number
      });
    }
    
    if (changes.some(c => c.field === 'Ship Date')) {
      updatePayload.shipment_date = ediData.dates?.shipNotBefore;
      appliedChanges.push({
        changeType: 'header_update',
        fieldName: 'shipment_date',
        oldValue: zohoOrder.shipment_date,
        newValue: ediData.dates?.shipNotBefore
      });
    }
    
    // For line items, we need to rebuild the line_items array
    // This is more complex - for now, update header fields only
    // TODO: Implement line item updates
    
    // Make the update API call
    if (Object.keys(updatePayload).length > 0) {
      const updateResponse = await axios({
        method: 'PUT',
        url: `https://www.zohoapis.com/books/v3/salesorders/${zohoSoId}`,
        headers: { 
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        params: { organization_id: process.env.ZOHO_ORG_ID },
        data: updatePayload
      });
      
      if (updateResponse.data?.code !== 0) {
        throw new Error(updateResponse.data?.message || 'Zoho update failed');
      }
    }
    
    // Log all changes to audit table
    await ensureOrderChangesTable();
    for (const change of appliedChanges) {
      await logOrderChange({
        ediOrderId: ediOrderId,
        zohoSoId: zohoSoId,
        zohoSoNumber: zohoOrder.salesorder_number,
        changeType: change.changeType,
        fieldName: change.fieldName,
        oldValue: change.oldValue,
        newValue: change.newValue,
        style: change.style,
        color: change.color,
        size: change.size,
        quantityDiff: change.quantityDiff,
        notes: change.notes,
        flaggedForReview: change.flagForReview
      });
    }
    
    // Log line item changes (even if not applied yet)
    for (const change of changes.filter(c => c.type === 'line_item')) {
      await logOrderChange({
        ediOrderId: ediOrderId,
        zohoSoId: zohoSoId,
        zohoSoNumber: zohoOrder.salesorder_number,
        changeType: change.action,
        fieldName: 'line_item',
        oldValue: change.oldValue,
        newValue: change.newValue,
        style: change.style,
        quantityDiff: change.quantityDiff,
        notes: change.note,
        flaggedForReview: change.flagForReview || false
      });
    }
    
    // Mark EDI order as processed
    await pool.query(`
      UPDATE edi_orders 
      SET status = 'processed', 
          zoho_so_id = $2, 
          zoho_so_number = $3,
          processed_at = NOW()
      WHERE id = $1
    `, [ediOrderId, zohoSoId, zohoOrder.salesorder_number]);
    
    logger.info('Updated Zoho order', { 
      zohoSoId, 
      zohoSoNumber: zohoOrder.salesorder_number,
      changesApplied: appliedChanges.length 
    });
    
    res.json({ 
      success: true, 
      message: 'Zoho order updated successfully',
      appliedChanges: appliedChanges.length,
      zohoSoNumber: zohoOrder.salesorder_number
    });
    
  } catch (error) {
    logger.error('Update Zoho order failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});
