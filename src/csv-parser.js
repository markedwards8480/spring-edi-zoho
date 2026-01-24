const logger = require('./logger');

/**
 * Get a field value from a row, checking both dot and underscore formats
 * Spring CSVs may use either format depending on export settings
 */
function getField(row, ...fieldNames) {
  for (const name of fieldNames) {
    // Try the exact name first
    if (row[name] !== undefined && row[name] !== '') {
      return row[name];
    }
    // Try with dots replaced by underscores
    const underscoreName = name.replace(/\./g, '_');
    if (row[underscoreName] !== undefined && row[underscoreName] !== '') {
      return row[underscoreName];
    }
    // Try with underscores replaced by dots
    const dotName = name.replace(/_/g, '.');
    if (row[dotName] !== undefined && row[dotName] !== '') {
      return row[dotName];
    }
  }
  return '';
}

/**
 * Parse Spring Systems CSV format for Purchase Orders
 * Handles both dot-notation (po_item.po_item_unit_price) and 
 * underscore notation (po_item_po_item_unit_price)
 */
function parseSpringCSV(content, filename) {
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file has no data rows');
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error('No data rows found in CSV');
  }

  const firstRow = rows[0];
  
  // Extract header-level data from first row
  // Using getField() to handle both dot and underscore formats
  const order = {
    header: {
      poNumber: getField(firstRow, 'po.po_num', 'po_po_num', 'po.po_id', 'po_po_id'),
      poId: getField(firstRow, 'po.po_id', 'po_po_id'),
      poDate: formatDate(getField(firstRow, 'po.po_created', 'po_po_created')),
      shipOpenDate: formatDate(getField(firstRow, 'po.po_ship_open_date', 'po_po_ship_open_date')),
      shipCloseDate: formatDate(getField(firstRow, 'po.po_ship_close_date', 'po_po_ship_close_date')),
      mustArriveByDate: formatDate(getField(firstRow, 'po.attributes.must_arrive_by_date', 'po_attributes_must_arrive_by_date')),
      paymentTerms: getField(firstRow, 
        'po.attributes.payment_terms_details.payment_term.payment_description',
        'po_attributes_payment_terms_details_payment_term_payment_description'
      ),
      vendorName: getField(firstRow, 'vendor.tp_name', 'vendor_tp_name'),
      retailerName: getField(firstRow, 'retailer.tp_name', 'retailer_tp_name')
    },
    parties: {
      buyer: {
        name: getField(firstRow, 'retailer.tp_name', 'retailer_tp_name'),
        id: getField(firstRow, 'ship_to_location.tp_location_code', 'ship_to_location_tp_location_code')
      },
      shipTo: {
        name: getField(firstRow, 'ship_to_location.tp_location_name', 'ship_to_location_tp_location_name'),
        code: getField(firstRow, 'ship_to_location.tp_location_code', 'ship_to_location_tp_location_code'),
        markForCode: getField(firstRow, 'mark_for_location.tp_location_code', 'mark_for_location_tp_location_code'),
        address1: getField(firstRow, 'ship_to_location.tp_location_address', 'ship_to_location_tp_location_address'),
        address2: getField(firstRow, 'ship_to_location.tp_location_address2', 'ship_to_location_tp_location_address2'),
        city: getField(firstRow, 'ship_to_location.tp_location_city', 'ship_to_location_tp_location_city'),
        state: getField(firstRow, 'ship_to_location.tp_location_state_province', 'ship_to_location_tp_location_state_province'),
        zip: getField(firstRow, 'ship_to_location.tp_location_postal', 'ship_to_location_tp_location_postal'),
        country: getField(firstRow, 'ship_to_location.tp_location_country_code', 'ship_to_location_tp_location_country_code')
      }
    },
    dates: {
      orderDate: formatDate(getField(firstRow, 'po.po_created', 'po_po_created')),
      shipNotBefore: formatDate(getField(firstRow, 'po.po_ship_open_date', 'po_po_ship_open_date')),
      shipNotAfter: formatDate(getField(firstRow, 'po.po_ship_close_date', 'po_po_ship_close_date')),
      cancelAfter: formatDate(getField(firstRow, 'po.attributes.must_arrive_by_date', 'po_attributes_must_arrive_by_date'))
    },
    items: [],
    raw: content
  };

  // Parse each row as a line item
  rows.forEach((row, index) => {
    // Get unit price - THIS IS THE KEY FIX
    // Check both dot notation (po_item.po_item_unit_price) and underscore notation
    const unitPriceRaw = getField(row, 
      'po_item.po_item_unit_price',      // Dot notation (from Excel/newer CSVs)
      'po_item_po_item_unit_price'       // Underscore notation (from older CSVs)
    );
    const unitPrice = parseFloat(unitPriceRaw) || 0;

    // Get quantity
    const quantityRaw = getField(row,
      'po_item.po_item_qty_ordered',
      'po_item_po_item_qty_ordered'
    );
    const quantityOrdered = parseFloat(quantityRaw) || 0;

    // Get amount (or calculate it)
    const amountRaw = getField(row,
      'po_item.attributes.amount',
      'po_item_attributes_amount'
    );
    const amount = parseFloat(amountRaw) || (quantityOrdered * unitPrice);

    const item = {
      lineNumber: getField(row, 'po_item.po_item_line_num', 'po_item_po_item_line_num') || (index + 1).toString(),
      quantityOrdered: quantityOrdered,
      unitOfMeasure: getField(row, 'po_item.po_item_uom', 'po_item_po_item_uom') || 'EA',
      unitPrice: unitPrice,
      amount: amount,
      retailPrice: parseFloat(getField(row, 'po_item.attributes.retail_price', 'po_item_attributes_retail_price')) || 0,
      productIds: {
        gtin: getField(row, 'product.product_gtin', 'product_product_gtin'),
        upc: getField(row, 'product.product_gtin', 'product_product_gtin'),
        buyerItemNumber: getField(row, 'po_item.po_item_buyer_item_num', 'po_item_po_item_buyer_item_num'),
        vendorItemNumber: getField(row, 'product.product_vendor_item_num', 'product_product_vendor_item_num'),
        sku: getField(row, 'product.product_vendor_item_num', 'product_product_vendor_item_num') || 
             getField(row, 'po_item.po_item_buyer_item_num', 'po_item_po_item_buyer_item_num')
      },
      color: getField(row, 'product.attributes.color', 'product_attributes_color'),
      size: getField(row, 'product.attributes.size', 'product_attributes_size'),
      description: getField(row, 'product.attributes.description', 'product_attributes_description') ||
                   getField(row, 'product_group.product_group_description', 'product_group_product_group_description'),
      packInfo: {
        pack: getField(row, 'po_item.attributes.packing.pack', 'po_item_attributes_packing_pack'),
        innerPack: getField(row, 'product.attributes.inner_pack', 'product_attributes_inner_pack'),
        assortmentPack: getField(row, 'product.attributes.assortment_pack', 'product_attributes_assortment_pack')
      }
    };

    order.items.push(item);
  });

  logger.info('Parsed Spring CSV', {
    poNumber: order.header.poNumber,
    retailer: order.header.retailerName,
    itemCount: order.items.length,
    // Log a sample item to verify price parsing
    sampleItem: order.items[0] ? {
      sku: order.items[0].productIds?.sku,
      qty: order.items[0].quantityOrdered,
      unitPrice: order.items[0].unitPrice,
      amount: order.items[0].amount
    } : null,
    filename
  });

  return order;
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Push last field
  result.push(current.trim());
  
  return result;
}

/**
 * Format date string to YYYY-MM-DD
 */
function formatDate(dateStr) {
  if (!dateStr) return null;
  
  // Convert to string if needed
  dateStr = String(dateStr);
  
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
  
  return dateStr;
}

module.exports = {
  parseSpringCSV,
  parseCSVLine,
  formatDate,
  getField
};
