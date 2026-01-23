const logger = require('./logger');

/**
 * Parse Spring Systems CSV format for Purchase Orders
 * These are CSV files with a header row and data rows
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

  // Group rows by PO number (multiple lines can be in one file)
  const firstRow = rows[0];
  
  // Extract header-level data from first row
  const order = {
    header: {
      poNumber: firstRow.po_po_num || firstRow.po_po_id || '',
      poId: firstRow.po_po_id || '',
      poDate: formatDate(firstRow.po_po_created),
      shipOpenDate: formatDate(firstRow.po_po_ship_open_date),
      shipCloseDate: formatDate(firstRow.po_po_ship_close_date),
      mustArriveByDate: formatDate(firstRow.po_attributes_must_arrive_by_date),
      paymentTerms: firstRow.po_attributes_payment_terms_details_payment_term_payment_description || '',
      vendorName: firstRow.vendor_tp_name || '',
      retailerName: firstRow.retailer_tp_name || ''
    },
    parties: {
      buyer: {
        name: firstRow.retailer_tp_name || '',
        id: firstRow.ship_to_location_tp_location_code || ''
      },
      shipTo: {
        name: firstRow.ship_to_location_tp_location_name || '',
        code: firstRow.ship_to_location_tp_location_code || '',
        markForCode: firstRow.mark_for_location_tp_location_code || '',
        address1: firstRow.ship_to_location_tp_location_address || '',
        address2: firstRow.ship_to_location_tp_location_address2 || '',
        city: firstRow.ship_to_location_tp_location_city || '',
        state: firstRow.ship_to_location_tp_location_state_province || '',
        zip: firstRow.ship_to_location_tp_location_postal || '',
        country: firstRow.ship_to_location_tp_location_country_code || ''
      }
    },
    dates: {
      orderDate: formatDate(firstRow.po_po_created),
      shipNotBefore: formatDate(firstRow.po_po_ship_open_date),
      shipNotAfter: formatDate(firstRow.po_po_ship_close_date),
      cancelAfter: formatDate(firstRow.po_attributes_must_arrive_by_date)
    },
    items: [],
    raw: content
  };

  // Parse each row as a line item
  rows.forEach((row, index) => {
    const item = {
      lineNumber: row.po_item_po_item_line_num || (index + 1).toString(),
      quantityOrdered: parseFloat(row.po_item_po_item_qty_ordered) || 0,
      unitOfMeasure: row.po_item_po_item_uom || 'EA',
      unitPrice: parseFloat(row.po_item_po_item_unit_price) || 0,
      amount: parseFloat(row.po_item_attributes_amount) || 0,
      retailPrice: parseFloat(row.po_item_attributes_retail_price) || 0,
      productIds: {
        gtin: row.product_product_gtin || '',
        upc: row.product_product_gtin || '',
        buyerItemNumber: row.po_item_po_item_buyer_item_num || '',
        vendorItemNumber: row.product_product_vendor_item_num || '',
        sku: row.product_product_vendor_item_num || row.po_item_po_item_buyer_item_num || ''
      },
      color: row.product_attributes_color || '',
      size: row.product_attributes_size || '',
      description: row.product_attributes_description || '',
      packInfo: {
        pack: row.po_item_attributes_packing_pack || '',
        innerPack: row.product_attributes_inner_pack || '',
        assortmentPack: row.product_attributes_assortment_pack || ''
      }
    };

    // Calculate amount if not provided
    if (!item.amount && item.quantityOrdered && item.unitPrice) {
      item.amount = item.quantityOrdered * item.unitPrice;
    }

    order.items.push(item);
  });

  logger.info('Parsed Spring CSV', {
    poNumber: order.header.poNumber,
    retailer: order.header.retailerName,
    itemCount: order.items.length,
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
  formatDate
};
