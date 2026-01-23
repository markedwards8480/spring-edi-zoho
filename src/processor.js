const SFTPClient = require('./sftp');
const ZohoClient = require('./zoho');
const { parseSpringCSV } = require('./csv-parser');
const { 
  isFileProcessed, 
  markFileProcessed, 
  saveEDIOrder, 
  updateOrderStatus,
  getPendingOrders 
} = require('./db');
const logger = require('./logger');

async function processEDIOrders() {
  const sftp = new SFTPClient();
  const zoho = new ZohoClient();
  const results = {
    filesProcessed: 0,
    ordersCreated: 0,
    ordersFailed: 0,
    errors: []
  };

  try {
    // Step 1: Connect to SFTP
    await sftp.connect();

    // Step 2: List available files
    const files = await sftp.listOrderFiles();
    logger.info(`Found ${files.length} files to check`);

    // Step 3: Process each new file
    for (const file of files) {
      try {
        // Skip if already processed
        if (await isFileProcessed(file.name)) {
          logger.debug('Skipping already processed file', { filename: file.name });
          continue;
        }

        logger.info('Processing file', { filename: file.name, size: file.size });

        // Download file content
        const content = await sftp.downloadFile(file.name);

        // Parse CSV content
        let parsedOrder;
        try {
          parsedOrder = parseSpringCSV(content, file.name);
        } catch (parseError) {
          logger.error('Failed to parse file', { filename: file.name, error: parseError.message });
          results.errors.push({ file: file.name, error: parseError.message });
          continue;
        }

        // Save to database as pending
        const savedOrder = await saveEDIOrder({
          filename: file.name,
          ediOrderNumber: parsedOrder.header?.poNumber || file.name,
          customerPO: parsedOrder.header?.poNumber,
          rawEDI: content,
          parsedData: parsedOrder,
          ediCustomerName: parsedOrder.parties?.buyer?.name || parsedOrder.header?.retailerName || null
        });

        // Mark file as processed (so we don't download again)
        await markFileProcessed(file.name, file.size, 1);
        results.filesProcessed++;

        // Archive the file on SFTP (ignore errors)
        try {
          await sftp.archiveFile(file.name);
        } catch (e) {
          // Ignore archive errors
        }

      } catch (error) {
        logger.error('Error processing file', { 
          filename: file.name, 
          error: error.message 
        });
        results.errors.push({ file: file.name, error: error.message });
      }
    }

    // Step 4: Process pending orders in database
    const pendingOrders = await getPendingOrders();
    logger.info(`Processing ${pendingOrders.length} pending orders`);

    for (const order of pendingOrders) {
      try {
        const result = await processOrderToZoho(zoho, order);
        
        if (result.success) {
          await updateOrderStatus(order.id, 'processed', {
            soId: result.soId,
            soNumber: result.soNumber
          });
          results.ordersCreated++;
        } else {
          await updateOrderStatus(order.id, 'failed', {
            error: result.error
          });
          results.ordersFailed++;
        }
      } catch (error) {
        logger.error('Error creating Zoho order', {
          orderId: order.id,
          error: error.message
        });
        await updateOrderStatus(order.id, 'failed', {
          error: error.message
        });
        results.ordersFailed++;
      }
    }

  } catch (error) {
    logger.error('Processing failed', { error: error.message });
    results.errors.push({ error: error.message });
  } finally {
    await sftp.disconnect();
  }

  logger.info('Processing complete', results);
  return results;
}

async function processOrderToZoho(zoho, order) {
  const parsedData = order.parsed_data;
  const poNumber = parsedData.header?.poNumber || order.edi_order_number;

  logger.info('Creating Zoho Books order', { poNumber });

  // Find customer in Zoho Books
  let customer = null;
  const buyerName = parsedData.parties?.buyer?.name || order.edi_customer_name;

  if (buyerName) {
    customer = await zoho.findBooksCustomerByName(buyerName);
  }

  if (!customer) {
    logger.warn('Customer not found in Zoho Books', { buyerName });
    return {
      success: false,
      error: `Customer not found: ${buyerName}. Please create the customer in Zoho Books first.`
    };
  }

  // Prepare line items for Zoho Books
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

  // Build order data for Zoho Books
  const orderData = {
    customerId: customer.contact_id,
    poNumber: poNumber,
    orderDate: parsedData.dates?.orderDate || new Date().toISOString().split('T')[0],
    shipDate: parsedData.dates?.shipNotBefore || '',
    notes: `EDI Import from ${order.filename || 'unknown'} | Ship To: ${parsedData.parties?.shipTo?.name || ''} ${parsedData.parties?.shipTo?.city || ''}, ${parsedData.parties?.shipTo?.state || ''}`,
    items: lineItems
  };

  try {
    const salesOrder = await zoho.createBooksSalesOrder(orderData);
    
    return {
      success: true,
      soId: salesOrder.salesorder_id,
      soNumber: salesOrder.salesorder_number,
      itemsCreated: lineItems.length,
      itemsFailed: 0
    };
  } catch (error) {
    logger.error('Failed to create Zoho Books order', { 
      poNumber, 
      error: error.response?.data || error.message 
    });
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

module.exports = { processEDIOrders, processOrderToZoho };
