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
          parsedData: parsedOrder
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

  logger.info('Creating Zoho order', { poNumber });

  // Check for duplicate
  try {
    const existing = await zoho.checkDuplicateOrder(poNumber);
    if (existing) {
      logger.warn('Duplicate order found', { poNumber, existingId: existing.id });
      return {
        success: true,
        soId: existing.id,
        soNumber: existing.Name,
        duplicate: true
      };
    }
  } catch (e) {
    // Ignore duplicate check errors
  }

  // Find/match customer account
  let account = null;
  const buyerInfo = parsedData.parties?.buyer;

  if (buyerInfo?.name) {
    account = await zoho.findAccountByName(buyerInfo.name);
  }
  if (!account && buyerInfo?.id) {
    account = await zoho.findAccountByClientId(buyerInfo.id);
  }

  if (!account) {
    logger.warn('Customer not found, creating order without account link', { 
      buyerName: buyerInfo?.name 
    });
  }

  // Find customer DC if we have ship-to info
  let customerDC = null;
  const shipToInfo = parsedData.parties?.shipTo;
  if (shipToInfo?.code) {
    customerDC = await zoho.findCustomerDC(account?.id, shipToInfo.code);
  }

  // Prepare line items
  const lineItems = [];
  for (const item of parsedData.items || []) {
    // Try to find item in Zoho
    let zohoItem = null;
    if (item.productIds?.sku) {
      zohoItem = await zoho.findItemBySKU(item.productIds.sku);
    }
    if (!zohoItem && item.productIds?.vendorItemNumber) {
      zohoItem = await zoho.findItemBySKU(item.productIds.vendorItemNumber);
    }

    lineItems.push({
      itemId: zohoItem?.id || null,
      customerSKU: item.productIds?.buyerItemNumber || item.productIds?.sku || '',
      customerStyle: item.productIds?.vendorItemNumber || '',
      style: item.productIds?.vendorItemNumber || '',
      color: item.color || '',
      size: item.size || '',
      quantity: item.quantityOrdered || 0,
      unitPrice: item.unitPrice || 0,
      amount: item.amount || (item.quantityOrdered * item.unitPrice) || 0,
      shipDate: parsedData.dates?.shipNotBefore,
      description: item.description || '',
      lineNumber: item.lineNumber
    });
  }

  // Create the Sales Order
  const orderData = {
    poNumber: poNumber,
    orderDate: parsedData.dates?.orderDate || new Date().toISOString().split('T')[0],
    accountId: account?.id,
    clientId: shipToInfo?.code || buyerInfo?.id || '',
    customerDCId: customerDC?.id,
    cancelDate: parsedData.dates?.cancelAfter,
    shipDate: parsedData.dates?.shipNotBefore,
    shipCloseDate: parsedData.dates?.shipNotAfter,
    referenceNumber: parsedData.header?.poId || '',
    notes: `EDI Import from ${order.filename} | ${parsedData.header?.retailerName || ''}`
  };

  const result = await zoho.createSalesOrderWithItems(orderData, lineItems);

  return {
    success: true,
    soId: result.header.id,
    soNumber: result.header.Name || result.header.id,
    itemsCreated: result.itemsCreated,
    itemsFailed: result.itemsFailed
  };
}

module.exports = { processEDIOrders, processOrderToZoho };
