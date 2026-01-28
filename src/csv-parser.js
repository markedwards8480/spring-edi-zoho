const logger = require('./logger');

/**
 * Properly parse a CSV line handling quoted fields with commas inside
 * This is critical because addresses often contain commas like "FRED MEYER, INC."
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote ("") - add single quote and skip next
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Don't forget the last field
  result.push(current);
  
  return result;
}

/**
 * Get a field value from a row object by trying multiple field name formats
 */
function getField(row, ...fieldNames) {
  for (const name of fieldNames) {
    if (row[name] !== undefined && row[name] !== '') {
      return row[name];
    }
    // Try with dots replaced by underscores
    const underscoreName = name.replace(/\./g, '_');
    if (row[underscoreName] !== undefined && row[underscoreName] !== '') {
      return row[underscoreName];
    }
  }
  return '';
}

/**
 * Parse Spring Systems CSV format for Purchase Orders
 */
function parseSpringCSV(content, filename) {
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file has no data rows');
  }

  // Parse header row with proper CSV parsing
  const headers = parseCSVLine(lines[0]);
  
  // Log headers for debugging
  logger.debug('CSV Headers count:', headers.length);
  
  // Find important column indices
  const colIndex = {};
  headers.forEach((h, i) => {
    const cleanHeader = h.trim().toLowerCase();
    if (cleanHeader.includes('po_item_po_item_unit_price') || cleanHeader === 'po_item_po_item_unit_price') {
      colIndex.unitPrice = i;
    }
    if (cleanHeader.includes('po_item_po_item_qty_ordered') || cleanHeader === 'po_item_po_item_qty_ordered') {
      colIndex.qty = i;
    }
    if (cleanHeader.includes('po_po_num') || cleanHeader === 'po_po_num') {
      colIndex.poNum = i;
    }
  });
  
  logger.debug('Found column indices:', colIndex);

  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] !== undefined ? values[index].trim() : '';
    });
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error('No data rows found in CSV');
  }

  const firstRow = rows[0];
  
  // Build the order object
  const order = {
    header: {
      poNumber: getField(firstRow, 'po_po_num', 'po.po_num') || '',
      poId: getField(firstRow, 'po_po_id', 'po.po_id') || '',
      poDate: formatDate(getField(firstRow, 'po_po_created', 'po.po_created')),
      shipOpenDate: formatDate(getField(firstRow, 'po_po_ship_open_date', 'po.po_ship_open_date')),
      shipCloseDate: formatDate(getField(firstRow, 'po_po_ship_close_date', 'po.po_ship_close_date')),
      vendorName: getField(firstRow, 'vendor_tp_name', 'vendor.tp_name') || '',
      retailerName: getField(firstRow, 'retailer_tp_name', 'retailer.tp_name') || ''
    },
    parties: {
      buyer: {
        name: getField(firstRow, 'retailer_tp_name', 'retailer.tp_name') || '',
        id: getField(firstRow, 'ship_to_location_tp_location_code', 'ship_to_location.tp_location_code') || ''
      },
      shipTo: {
        name: getField(firstRow, 'ship_to_location_tp_location_name', 'ship_to_location.tp_location_name') || '',
        code: getField(firstRow, 'ship_to_location_tp_location_code', 'ship_to_location.tp_location_code') || '',
        address1: getField(firstRow, 'ship_to_location_tp_location_address', 'ship_to_location.tp_location_address') || '',
        address2: getField(firstRow, 'ship_to_location_tp_location_address2', 'ship_to_location.tp_location_address2') || '',
        city: getField(firstRow, 'ship_to_location_tp_location_city', 'ship_to_location.tp_location_city') || '',
        state: getField(firstRow, 'ship_to_location_tp_location_state_province', 'ship_to_location.tp_location_state_province') || '',
        zip: getField(firstRow, 'ship_to_location_tp_location_postal', 'ship_to_location.tp_location_postal') || '',
        country: getField(firstRow, 'ship_to_location_tp_location_country_code', 'ship_to_location.tp_location_country_code') || ''
      }
    },
    dates: {
      orderDate: formatDate(getField(firstRow, 'po_po_created', 'po.po_created')),
      // Ship Open Date = Expected Shipment Date in Zoho
      shipDate: formatDate(getField(firstRow, 'po_po_ship_open_date', 'po.po_ship_open_date')),
      shipNotBefore: formatDate(getField(firstRow, 'po_po_ship_open_date', 'po.po_ship_open_date')),
      // Ship Close Date = Cancel Date in Zoho
      cancelDate: formatDate(getField(firstRow, 'po_po_ship_close_date', 'po.po_ship_close_date')),
      shipNotAfter: formatDate(getField(firstRow, 'po_po_ship_close_date', 'po.po_ship_close_date')),
      // Must Arrive By (if different from ship close)
      mustArriveBy: formatDate(getField(firstRow, 'po_attributes_must_arrive_by_date', 'po.attributes.must_arrive_by_date'))
    },
    items: [],
    raw: content
  };

  // Parse each row as a line item
  rows.forEach((row, index) => {
    // Get Unit of Measure (AS = Assortment/Prepack, EA = Each, ST = Set)
    const uom = getField(row, 'po_item_po_item_uom', 'po_item.po_item_uom') || 'EA';
    const isPrepack = uom === 'AS' || uom === 'ST';

    // Get BOTH prices first (needed to calculate pack qty if not provided):
    // 1. Pack price (po_item_po_item_unit_price) - price for the whole pack/assortment
    // 2. Each price (product_pack_product_pack_unit_price) - price per individual item
    const packPriceRaw = getField(row,
      'po_item_po_item_unit_price',
      'po_item.po_item_unit_price'
    );
    const packPrice = parseFloat(packPriceRaw) || 0;

    const eachPriceRaw = getField(row,
      'product_pack_product_pack_unit_price',
      'product_pack.product_pack_unit_price'
    );
    const eachPrice = parseFloat(eachPriceRaw) || 0;

    // Get pack quantity (items per pack)
    // First try to get from CSV field
    const packQtyRaw = getField(row,
      'product_pack_product_pack_product_qty',
      'product_pack.product_pack_product_qty'
    );
    let packQty = parseInt(packQtyRaw) || 0;

    // If pack qty not provided but we have both prices, CALCULATE it
    // Pack Qty = Pack Price ÷ Each Price (e.g., $37.50 ÷ $7.50 = 5)
    if (packQty <= 1 && packPrice > 0 && eachPrice > 0 && packPrice !== eachPrice) {
      const calculatedPackQty = Math.round(packPrice / eachPrice);
      // Sanity check: calculated qty should be reasonable (2-100) and prices should divide evenly
      if (calculatedPackQty >= 2 && calculatedPackQty <= 100) {
        const checkPrice = eachPrice * calculatedPackQty;
        // Allow small rounding difference
        if (Math.abs(checkPrice - packPrice) < 0.02) {
          packQty = calculatedPackQty;
          logger.debug('Calculated pack qty from prices', { packPrice, eachPrice, packQty });
        }
      }
    }

    // Default to 1 if still not set
    if (packQty <= 0) packQty = 1;

    // Determine the unit price to use:
    // - If eachPrice is available, use it (most accurate)
    // - Otherwise calculate from packPrice / packQty
    // - If packQty is 1 or unknown, packPrice = eachPrice
    let unitPrice = eachPrice;
    let unitPriceCalculated = false;
    if (!unitPrice && packPrice > 0) {
      if (packQty > 1) {
        unitPrice = packPrice / packQty;
        unitPriceCalculated = true;
      } else {
        unitPrice = packPrice;
      }
    }

    // Get quantity ordered (number of packs/units ordered)
    const quantityRaw = getField(row,
      'po_item_po_item_qty_ordered',
      'po_item.po_item_qty_ordered'
    );
    const quantityOrdered = parseInt(quantityRaw) || 0;

    // Calculate total units (for prepacks: qty × packQty)
    const totalUnits = isPrepack && packQty > 1 ? quantityOrdered * packQty : quantityOrdered;

    // Calculate amount (qty × packPrice for prepacks, qty × unitPrice for eaches)
    const amount = isPrepack ? quantityOrdered * packPrice : quantityOrdered * unitPrice;

    const item = {
      lineNumber: getField(row, 'po_item_po_item_line_num', 'po_item.po_item_line_num') || (index + 1).toString(),
      quantityOrdered: quantityOrdered,
      totalUnits: totalUnits,
      unitOfMeasure: uom,
      isPrepack: isPrepack,
      packQty: packQty,
      packPrice: packPrice,
      eachPrice: eachPrice,
      unitPrice: unitPrice,
      unitPriceCalculated: unitPriceCalculated,
      amount: amount,
      retailPrice: parseFloat(getField(row, 'po_item_attributes_retail_price', 'po_item.attributes.retail_price')) || 0,
      productIds: {
        gtin: getField(row, 'product_product_gtin', 'product.product_gtin') || '',
        upc: getField(row, 'product_product_gtin', 'product.product_gtin') || '',
        buyerItemNumber: getField(row, 'po_item_po_item_buyer_item_num', 'po_item.po_item_buyer_item_num') || '',
        vendorItemNumber: getField(row, 'product_product_vendor_item_num', 'product.product_vendor_item_num') || '',
        sku: getField(row, 'product_product_vendor_item_num', 'product.product_vendor_item_num') ||
             getField(row, 'po_item_po_item_buyer_item_num', 'po_item.po_item_buyer_item_num') || ''
      },
      color: getField(row, 'product_attributes_color', 'product.attributes.color') || '',
      size: getField(row, 'product_attributes_size', 'product.attributes.size') || '',
      description: getField(row, 'product_attributes_description', 'product.attributes.description') ||
                   getField(row, 'product_group_product_group_description', 'product_group.product_group_description') || '',
      packInfo: {
        pack: getField(row, 'po_item_attributes_packing_pack', 'po_item.attributes.packing.pack') || '',
        innerPack: getField(row, 'product_attributes_inner_pack', 'product.attributes.inner_pack') || '',
        assortmentPack: getField(row, 'product_attributes_assortment_pack', 'product.attributes.assortment_pack') || ''
      },
      // Store the original raw CSV row data for display
      rawCsvFields: row
    };

    order.items.push(item);
  });

  // Store raw CSV data from first row for header-level fields
  if (rows.length > 0) {
    order.rawCsvData = rows[0];
  }

  // Log parsing results for debugging
  const sampleItem = order.items[0];
  logger.info('Parsed Spring CSV', {
    poNumber: order.header.poNumber,
    retailer: order.header.retailerName,
    itemCount: order.items.length,
    sampleItem: sampleItem ? {
      sku: sampleItem.productIds?.sku,
      qty: sampleItem.quantityOrdered,
      unitPrice: sampleItem.unitPrice,
      amount: sampleItem.amount
    } : null,
    filename
  });

  return order;
}

/**
 * Format date string to YYYY-MM-DD
 */
function formatDate(dateStr) {
  if (!dateStr) return null;
  
  dateStr = String(dateStr).trim();
  
  // Handle "2025-12-30 02:33:33" format
  if (dateStr.includes(' ')) {
    dateStr = dateStr.split(' ')[0];
  }
  
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try to parse other formats
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    // Ignore parse errors
  }
  
  return null;
}

module.exports = {
  parseSpringCSV,
  parseCSVLine,
  formatDate,
  getField
};
