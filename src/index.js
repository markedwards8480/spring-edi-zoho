// =====================================================================
// ADD THESE ROUTES TO YOUR index.js FILE
// Copy everything below and paste it before the "app.listen" line
// =====================================================================

// EXPORT: Download all order history as CSV
app.get('/export-orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, edi_order_number, customer_po, edi_customer_name, status,
             zoho_so_id, zoho_so_number, created_at, updated_at, processed_at, parsed_data
      FROM edi_orders ORDER BY created_at DESC
    `);
    const orders = result.rows;
    const headers = ['ID','PO Number','Customer','Status','Zoho SO ID','Zoho SO#','Line Items','Total Units','Total Value','Created','Processed'];
    const rows = orders.map(o => {
      const items = o.parsed_data?.items || [];
      const units = items.reduce((s,i) => s + (i.quantityOrdered||0), 0);
      const value = items.reduce((s,i) => s + (i.quantityOrdered||0)*(i.unitPrice||0), 0);
      return [o.id, o.edi_order_number||'', o.edi_customer_name||'', o.status||'', o.zoho_so_id||'', o.zoho_so_number||'', items.length, units, value.toFixed(2), o.created_at||'', o.processed_at||''].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="edi-orders-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send([headers.join(','), ...rows].join('\n'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// EXPORT: Download detailed line items as CSV
app.get('/export-line-items', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, edi_order_number, edi_customer_name, status, zoho_so_number, parsed_data FROM edi_orders ORDER BY created_at DESC`);
    const headers = ['Order ID','PO Number','Customer','Status','Zoho SO#','Line#','Style','Description','Color','Size','Qty','Unit Price','Amount'];
    const rows = [];
    result.rows.forEach(o => {
      (o.parsed_data?.items || []).forEach((item, idx) => {
        rows.push([o.id, o.edi_order_number||'', o.edi_customer_name||'', o.status||'', o.zoho_so_number||'', item.lineNumber||(idx+1), item.productIds?.sku||item.productIds?.vendorItemNumber||'', item.description||'', item.color||'', item.size||'', item.quantityOrdered||0, item.unitPrice||0, ((item.quantityOrdered||0)*(item.unitPrice||0)).toFixed(2)].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
      });
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="edi-line-items-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send([headers.join(','), ...rows].join('\n'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// RE-PARSE: Update existing orders with corrected price parsing
app.post('/reparse-orders', async (req, res) => {
  const { parseSpringCSV } = require('./csv-parser');
  try {
    const result = await pool.query(`SELECT id, filename, raw_edi, edi_order_number FROM edi_orders WHERE raw_edi IS NOT NULL AND raw_edi != ''`);
    let updated = 0, failed = 0;
    for (const order of result.rows) {
      try {
        const newParsed = parseSpringCSV(order.raw_edi, order.filename || 'unknown.csv');
        await pool.query(`UPDATE edi_orders SET parsed_data = $1, updated_at = NOW() WHERE id = $2`, [JSON.stringify(newParsed), order.id]);
        updated++;
      } catch (e) { failed++; logger.error('Re-parse failed', { id: order.id, error: e.message }); }
    }
    logger.info('Re-parse complete', { updated, failed });
    res.json({ success: true, message: `Re-parsed ${updated} orders, ${failed} failed`, updated, failed });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PREVIEW: See what the re-parse will change (before committing)
app.get('/reparse-preview', async (req, res) => {
  const { parseSpringCSV } = require('./csv-parser');
  try {
    const result = await pool.query(`SELECT id, filename, raw_edi, edi_order_number, parsed_data FROM edi_orders WHERE raw_edi IS NOT NULL LIMIT 5`);
    const previews = result.rows.map(o => {
      try {
        const oldItem = o.parsed_data?.items?.[0] || {};
        const newParsed = parseSpringCSV(o.raw_edi, o.filename || 'unknown.csv');
        const newItem = newParsed.items?.[0] || {};
        return { poNumber: o.edi_order_number, before: { price: oldItem.unitPrice, qty: oldItem.quantityOrdered }, after: { price: newItem.unitPrice, qty: newItem.quantityOrdered }, changed: oldItem.unitPrice !== newItem.unitPrice };
      } catch (e) { return { poNumber: o.edi_order_number, error: e.message }; }
    });
    res.json({ previews });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
