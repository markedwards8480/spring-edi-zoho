const SFTPClient = require('./sftp');
const ZohoClient = require('./zoho');
const { parseSpringCSV } = require('./csv-parser');
const { isFileProcessed, markFileProcessed, saveEDIOrder, updateOrderStatus, getPendingOrders, logProcessingActivity } = require('./db');
const logger = require('./logger');

async function processEDIOrders() {
  const sftp = new SFTPClient();
  const zoho = new ZohoClient();
  const results = { filesProcessed: 0, ordersCreated: 0, ordersFailed: 0, errors: [] };

  try {
    // Step 1: Connect to SFTP
    await sftp.connect();

    // Step 2: List available files
    const files = await sftp.listOrderFiles();
    logger.info(`Found ${files.length} files to check`);

    // Step 3: Process each new file
    for (const file of files) {
      try {
        if (await isFileProcessed(file.name)) {
          logger.debug('Skipping already processed file', { filename: file.name });
          continue;
        }

        logger.info('Processing file', { filename: file.name, size: file.size });

        const content = await sftp.downloadFile(file.name);

        let parsedOrder;
        try {
          parsedOrder = parseSpringCSV(content, file.name);
        } catch (parseError) {
          logger.error('Failed to parse file', { filename: file.name, error: parseError.message });
          results.errors.push({ file: file.name, error: parseError.message });
          continue;
        }

        const savedOrder = await saveEDIOrder({
          filename: file.name,
          ediOrderNumber: parsedOrder.header?.poNumber || file.name,
          customerPO: parsedOrder.header?.poNumber,
          rawEDI: content,
          parsedData: parsedOrder,
          ediCustomerName: parsedOrder.parties?.buyer?.name || parsedOrder.header?.retailerName || null,
          transactionType: parsedOrder.header?.transactionType || '850'
        });

        await markFileProcessed(file.name, file.size, 1);
        results.filesProcessed++;

        // Track amendments
        if (savedOrder.wasAmended) {
          results.ordersAmended = (results.ordersAmended || 0) + 1;
          logger.info('Order amended', {
            orderId: savedOrder.id,
            poNumber: parsedOrder.header?.poNumber,
            changesCount: savedOrder.changes?.length || 0
          });
        } else if (savedOrder.isNew) {
          results.ordersCreated++;
        } else if (savedOrder.duplicate) {
          results.ordersDuplicate = (results.ordersDuplicate || 0) + 1;
        }

        try {
          await sftp.archiveFile(file.name);
        } catch (e) {
          // Ignore archive errors
        }
      } catch (error) {
        logger.error('Error processing file', { filename: file.name, error: error.message });
        results.errors.push({ file: file.name, error: error.message });
      }
    }

    // Step 4: Process pending orders (but NOT automatically - let user trigger this)
    // Removed auto-processing of pending orders from SFTP fetch
    
  } catch (error) {
    logger.error('Processing failed', { error: error.message });
    results.errors.push({ error: error.message });
  } finally {
    await sftp.disconnect();
  }

  logger.info('SFTP fetch complete', results);
  return results;
}

async function processOrderToZoho(zoho, order) {
  const parsedData = order.parsed_data;
  const poNumber = parsedData.header?.poNumber || order.edi_order_number;
  
  logger.info('Creating Zoho Books order', { orderId: order.id, poNumber });

  // Find customer in Zoho Books
  let customer = null;
  const buyerName = parsedData.parties?.buyer?.name || order.edi_customer_name;
  
  if (buyerName) {
    customer = await zoho.findBooksCustomerByName(buyerName);
  }

  if (!customer) {
    const errorMsg = `Customer not found: ${buyerName}. Please add a customer mapping.`;
    logger.warn('Customer not found in Zoho Books', { buyerName });
    
    // Log the failure
    try {
      await logProcessingActivity({
        action: 'Create Sales Order',
        status: 'error',
        ediOrderId: order.id,
        ediPoNumber: poNumber,
        customerName: buyerName,
        details: { error: errorMsg }
      });
    } catch (e) { /* ignore logging errors */ }
    
    return { success: false, error: errorMsg };
  }

  // Prepare line items
  const lineItems = (parsedData.items || []).map((item, idx) => {
    const sku = item.productIds?.vendorItemNumber || item.productIds?.buyerItemNumber || item.productIds?.sku || '';
    const description = item.description || '';
    const color = item.color || '';
    const size = item.size || '';

    return {
      style: sku,
      description: `${sku} ${description} ${color} ${size}`.trim(),
      color: color,
      size: size,
      quantity: item.quantityOrdered || 0,
      unitPrice: item.unitPrice || 0
    };
  });

  // Build order data
  const orderData = {
    customerId: customer.contact_id,
    poNumber: poNumber,
    orderDate: parsedData.dates?.orderDate || new Date().toISOString().split('T')[0],
    shipDate: parsedData.dates?.shipNotBefore || '',
    shipNotAfter: parsedData.dates?.shipNotAfter || '',
    cancelDate: parsedData.dates?.cancelDate || '',
    paymentTerms: parsedData.header?.paymentTerms || '',
    notes: `EDI Import from ${order.filename || 'unknown'} | Ship To: ${parsedData.parties?.shipTo?.name || ''} ${parsedData.parties?.shipTo?.city || ''}, ${parsedData.parties?.shipTo?.state || ''}`,
    items: lineItems
  };

  try {
    const salesOrder = await zoho.createBooksSalesOrder(orderData);
    
    // Log the full response for debugging
    logger.info('Zoho Books API Response', { 
      orderId: order.id,
      poNumber: poNumber,
      response: salesOrder 
    });

    // Extract SO ID and Number from the response
    // Zoho Books returns: { salesorder_id: "...", salesorder_number: "...", ... }
    const soId = salesOrder.salesorder_id || salesOrder.salesorder?.salesorder_id || null;
    const soNumber = salesOrder.salesorder_number || salesOrder.salesorder?.salesorder_number || null;

    logger.info('Zoho Sales Order created', { 
      orderId: order.id,
      poNumber: poNumber,
      soId: soId, 
      soNumber: soNumber 
    });

    // Log success
    try {
      await logProcessingActivity({
        action: 'Create Sales Order',
        status: 'success',
        ediOrderId: order.id,
        ediPoNumber: poNumber,
        zohoSoId: soId,
        zohoSoNumber: soNumber,
        customerName: buyerName,
        details: { 
          lineItems: lineItems.length,
          totalQty: lineItems.reduce((s, i) => s + (i.quantity || 0), 0),
          totalAmount: lineItems.reduce((s, i) => s + ((i.quantity || 0) * (i.unitPrice || 0)), 0)
        }
      });
    } catch (e) { /* ignore logging errors */ }

    return {
      success: true,
      soId: soId,
      soNumber: soNumber,
      itemsCreated: lineItems.length,
      itemsFailed: 0
    };
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    logger.error('Failed to create Zoho Books order', { 
      orderId: order.id,
      poNumber, 
      error: error.response?.data || error.message 
    });

    // Log failure
    try {
      await logProcessingActivity({
        action: 'Create Sales Order',
        status: 'error',
        ediOrderId: order.id,
        ediPoNumber: poNumber,
        customerName: buyerName,
        details: { error: errorMsg }
      });
    } catch (e) { /* ignore logging errors */ }

    return { success: false, error: errorMsg };
  }
}

module.exports = { processEDIOrders, processOrderToZoho };
