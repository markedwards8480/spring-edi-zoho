// ============================================================
// AUDIT LOG API ENDPOINTS
// Add these to index.js
// ============================================================

// Initialize audit logger (add near top of file after pool creation)
/*
const { AuditLogger, ACTIONS, SEVERITY } = require('./audit-logger');
const auditLogger = new AuditLogger(pool);

// Initialize audit tables on startup
auditLogger.initialize().then(() => {
  console.log('Audit system initialized');
}).catch(err => {
  console.error('Audit system initialization failed:', err);
});
*/

// GET /audit/activity - Get recent activity log
app.get('/audit/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const filters = {
      action: req.query.action,
      severity: req.query.severity,
      customerName: req.query.customer,
      poNumber: req.query.po,
      fromDate: req.query.from,
      toDate: req.query.to,
    };
    
    const activity = await auditLogger.getRecentActivity(limit, filters);
    res.json({ success: true, activity });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /audit/zoho-orders - Get all orders sent to Zoho (permanent record)
app.get('/audit/zoho-orders', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 500;
    const filters = {
      customerName: req.query.customer,
      poNumber: req.query.po,
      zohoSoNumber: req.query.so,
      fromDate: req.query.from,
      toDate: req.query.to,
    };
    
    const orders = await auditLogger.getZohoOrdersSent(limit, filters);
    res.json({ success: true, orders, count: orders.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /audit/stats - Get summary statistics
app.get('/audit/stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const stats = await auditLogger.getSummaryStats(days);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /audit/check/:poNumber - Check if an order was already sent
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
// UPDATE EXISTING ENDPOINTS TO USE AUDIT LOGGING
// ============================================================

// Example: Update the send to Zoho function to log
/*
// In the /orders/:id/process endpoint, after successful Zoho creation:
await auditLogger.recordZohoSend({
  ediOrderId: order.id,
  ediOrderNumber: order.edi_order_number,
  poNumber: order.edi_order_number,
  customerName: order.edi_customer_name,
  orderAmount: totalAmount,
  itemCount: items.length,
  unitCount: totalUnits,
  shipDate: order.parsed_data?.dates?.shipDate,
  zohoSoId: zohoResponse.salesorder.salesorder_id,
  zohoSoNumber: zohoResponse.salesorder.salesorder_number,
  zohoCustomerId: customerId,
  zohoCustomerName: customerName,
  matchedDraftId: matchedDraftId || null,
  matchedDraftNumber: matchedDraftNumber || null,
  matchConfidence: matchConfidence || null,
  wasNewOrder: !matchedDraftId,
  ediRawData: order.parsed_data,
  zohoResponse: zohoResponse,
});
*/

// Example: Log SFTP fetch
/*
// At start of SFTP fetch:
await auditLogger.log(ACTIONS.SFTP_FETCH_STARTED, {
  details: { host: sftpConfig.host }
});

// After successful fetch:
await auditLogger.log(ACTIONS.SFTP_FETCH_COMPLETED, {
  severity: SEVERITY.SUCCESS,
  details: { 
    filesFound: files.length,
    filesProcessed: processed,
    ordersCreated: created 
  }
});
*/

// Example: Log match found
/*
await auditLogger.log(ACTIONS.MATCH_FOUND, {
  ediOrderId: order.id,
  ediOrderNumber: order.edi_order_number,
  customerName: order.edi_customer_name,
  orderAmount: totalAmount,
  zohoDraftId: draft.salesorder_id,
  zohoDraftNumber: draft.salesorder_number,
  matchConfidence: confidence,
  matchCriteria: scoreDetails,
});
*/
