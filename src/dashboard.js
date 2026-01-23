const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spring EDI Integration - Mark Edwards Apparel</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f7; color: #1e3a5f; min-height: 100vh; }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a7f 100%); color: white; padding: 1.25rem 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.75rem; }
    .header-logo { width: 32px; height: 32px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #1e3a5f; font-size: 0.75rem; }
    .header-status { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; opacity: 0.9; }
    .status-dot { width: 8px; height: 8px; background: #34c759; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .container { max-width: 1400px; margin: 0 auto; padding: 1.5rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { background: white; border-radius: 10px; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .stat-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; margin-bottom: 0.25rem; }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: #1e3a5f; }
    .stat-card.success .stat-value { color: #34c759; }
    .stat-card.error .stat-value { color: #ff3b30; }
    .stat-card.pending .stat-value { color: #ff9500; }
    .section { background: white; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 1.5rem; overflow: hidden; }
    .section-header { padding: 0.75rem 1rem; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; }
    .section-title { font-size: 0.9rem; font-weight: 600; }
    .section-body { padding: 1rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: all 0.15s; border: none; }
    .btn-primary { background: #1e3a5f; color: white; }
    .btn-primary:hover { background: #2d5a7f; }
    .btn-primary:disabled { background: #86868b; cursor: not-allowed; }
    .btn-secondary { background: white; color: #1e3a5f; border: 1px solid #d2d2d7; }
    .btn-secondary:hover { background: #f5f5f7; }
    .btn-sm { padding: 0.2rem 0.4rem; font-size: 0.65rem; }
    .actions-bar { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    
    /* Orders Table */
    .orders-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
    .orders-table th { text-align: left; padding: 0.5rem; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; font-weight: 600; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .orders-table td { padding: 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.06); vertical-align: middle; }
    .orders-table tr:hover { background: #f5f5f7; cursor: pointer; }
    .orders-table .po-link { color: #1e3a5f; text-decoration: none; font-weight: 500; }
    .orders-table .po-link:hover { text-decoration: underline; }
    
    .badge { display: inline-flex; padding: 0.15rem 0.4rem; border-radius: 980px; font-size: 0.6rem; font-weight: 500; }
    .badge-success { background: rgba(52, 199, 89, 0.1); color: #34c759; }
    .badge-error { background: rgba(255, 59, 48, 0.1); color: #ff3b30; }
    .badge-pending { background: rgba(255, 149, 0, 0.1); color: #ff9500; }
    
    .customer-cell { font-size: 0.7rem; }
    .edi-customer { font-weight: 500; }
    .zoho-match { font-size: 0.6rem; color: #86868b; }
    
    select.customer-select { font-size: 0.65rem; padding: 0.2rem; border: 1px solid #d2d2d7; border-radius: 4px; max-width: 120px; }
    
    /* Tabs */
    .tabs { display: flex; gap: 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .tab { padding: 0.6rem 1rem; cursor: pointer; font-size: 0.8rem; font-weight: 500; color: #86868b; border-bottom: 2px solid transparent; margin-bottom: -1px; }
    .tab.active { color: #1e3a5f; border-bottom-color: #1e3a5f; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
    /* Modal */
    .modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; }
    .modal-overlay.show { display: flex; }
    .modal { background: white; border-radius: 12px; max-width: 900px; width: 95%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
    .modal-header { padding: 1rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; }
    .modal-title { font-size: 1.1rem; font-weight: 600; }
    .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #86868b; }
    .modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; }
    .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid rgba(0,0,0,0.1); display: flex; justify-content: flex-end; gap: 0.5rem; }
    
    /* Order Details */
    .order-header-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .order-field { background: #f5f5f7; padding: 0.75rem; border-radius: 8px; }
    .order-field-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; margin-bottom: 0.25rem; }
    .order-field-value { font-size: 0.85rem; font-weight: 500; }
    
    .line-items-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; margin-top: 1rem; }
    .line-items-table th { background: #f5f5f7; padding: 0.5rem; text-align: left; font-size: 0.6rem; text-transform: uppercase; font-weight: 600; color: #86868b; }
    .line-items-table td { padding: 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .line-items-table tfoot td { font-weight: 600; background: #f5f5f7; }
    
    .order-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.1); }
    .summary-item { text-align: center; }
    .summary-value { font-size: 1.25rem; font-weight: 700; color: #1e3a5f; }
    .summary-label { font-size: 0.65rem; color: #86868b; text-transform: uppercase; }
    
    .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    .toast { position: fixed; bottom: 2rem; right: 2rem; background: #1e3a5f; color: white; padding: 0.75rem 1.25rem; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: none; font-size: 0.8rem; z-index: 1001; }
    .toast.show { display: flex; animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    
    .empty-state { text-align: center; padding: 2rem; color: #86868b; }
    
    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .order-header-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-content">
      <h1><div class="header-logo">ME</div>Spring EDI Integration</h1>
      <div class="header-status"><span class="status-dot"></span>System Online</div>
    </div>
  </header>

  <main class="container">
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Orders (24h)</div><div class="stat-value" id="stat-total">-</div></div>
      <div class="stat-card success"><div class="stat-label">Processed</div><div class="stat-value" id="stat-processed">-</div></div>
      <div class="stat-card pending"><div class="stat-label">Pending</div><div class="stat-value" id="stat-pending">-</div></div>
      <div class="stat-card error"><div class="stat-label">Failed</div><div class="stat-value" id="stat-failed">-</div></div>
    </div>

    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Actions</h2>
      </div>
      <div class="section-body">
        <div class="actions-bar">
          <button class="btn btn-primary" id="btn-fetch" onclick="fetchSFTP()">Fetch from SFTP</button>
          <button class="btn btn-primary" id="btn-process" onclick="triggerProcessLimit()">Process Orders</button>
          <select id="process-limit" style="padding: 0.35rem; border-radius: 6px; border: 1px solid #d2d2d7; font-size: 0.75rem;">
            <option value="1">1</option><option value="5">5</option><option value="10" selected>10</option><option value="25">25</option><option value="50">50</option><option value="9999">All</option>
          </select>
          <button class="btn btn-primary" id="btn-process-selected" onclick="processSelected()">Process Selected</button>
          <button class="btn btn-secondary" onclick="retryFailed()">Retry Failed</button>
          <button class="btn btn-secondary" onclick="refreshData()">Refresh</button>
          <button class="btn btn-secondary" onclick="resetOrders()" style="color:#ff3b30;">Reset All</button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="tabs">
        <div class="tab active" onclick="switchTab('orders')">Orders</div>
        <div class="tab" onclick="switchTab('mappings')">Customer Mappings</div>
      </div>
      
      <div id="tab-orders" class="tab-content active">
        <div id="orders-container"><div class="empty-state">Loading...</div></div>
      </div>
      
      <div id="tab-mappings" class="tab-content">
        <div class="section-body" id="mappings-container"><div class="empty-state">No mappings yet.</div></div>
      </div>
    </div>
  </main>

  <!-- Order Details Modal -->
  <div class="modal-overlay" id="order-modal">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Order Details</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body" id="order-details-content">
        <div class="empty-state">Loading...</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" id="btn-process-order" onclick="processCurrentOrder()">Process This Order</button>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"><span id="toast-message"></span></div>

  <script>
    let zohoAccounts = [];
    let currentOrderId = null;
    
    document.addEventListener('DOMContentLoaded', () => {
      refreshData();
      loadZohoAccounts();
    });

    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
      if (tab === 'mappings') loadMappings();
    }

    async function loadZohoAccounts() {
      try {
        const res = await fetch('/zoho-accounts');
        if (res.ok) zohoAccounts = await res.json();
      } catch (e) { console.warn('Could not load accounts'); }
    }

    async function refreshData() {
      try {
        const [statusRes, ordersRes] = await Promise.all([fetch('/status'), fetch('/orders')]);
        const status = await statusRes.json();
        const orders = await ordersRes.json();
        
        document.getElementById('stat-total').textContent = status.last24Hours?.total || '0';
        document.getElementById('stat-processed').textContent = status.last24Hours?.processed || '0';
        document.getElementById('stat-pending').textContent = status.last24Hours?.pending || '0';
        document.getElementById('stat-failed').textContent = status.last24Hours?.failed || '0';
        
        renderOrders(orders);
      } catch (e) {
        console.error('Error:', e);
        showToast('Error loading data');
      }
    }

    function renderOrders(orders) {
      const container = document.getElementById('orders-container');
      if (!orders || !orders.length) {
        container.innerHTML = '<div class="empty-state">No orders yet.</div>';
        return;
      }

      container.innerHTML = \`
        <table class="orders-table">
          <thead>
            <tr>
              <th><input type="checkbox" onclick="toggleSelectAll(this)"></th>
              <th>PO #</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            \${orders.map(o => {
              const customer = o.edi_customer_name || o.parsed_data?.parties?.buyer?.name || o.parsed_data?.header?.retailerName || extractCustomerFromFilename(o.filename);
              const itemCount = o.parsed_data?.items?.length || 0;
              const canSelect = o.status === 'pending' || o.status === 'failed';
              return \`
                <tr>
                  <td onclick="event.stopPropagation()"><input type="checkbox" class="order-checkbox" value="\${o.id}" \${!canSelect ? 'disabled' : ''}></td>
                  <td><a href="#" class="po-link" onclick="openOrderDetails(\${o.id}); return false;">\${o.edi_order_number || o.filename?.substring(0,25) || '-'}</a></td>
                  <td class="customer-cell">\${customer}</td>
                  <td>\${itemCount} items</td>
                  <td><span class="badge badge-\${o.status === 'processed' ? 'success' : o.status === 'failed' ? 'error' : 'pending'}">\${o.status}</span></td>
                  <td>\${o.created_at ? new Date(o.created_at).toLocaleDateString() : '-'}</td>
                  <td onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-secondary" onclick="openOrderDetails(\${o.id})">View</button>
                  </td>
                </tr>
              \`;
            }).join('')}
          </tbody>
        </table>
      \`;
    }

    function extractCustomerFromFilename(filename) {
      if (!filename) return '-';
      const match = filename.match(/to-([\\w_]+)\\.csv/i);
      if (match) return match[1].replace(/_/g, ' ');
      return '-';
    }

    async function openOrderDetails(orderId) {
      currentOrderId = orderId;
      document.getElementById('order-modal').classList.add('show');
      document.getElementById('order-details-content').innerHTML = '<div class="empty-state">Loading...</div>';
      
      try {
        const res = await fetch('/orders/' + orderId);
        const order = await res.json();
        renderOrderDetails(order);
      } catch (e) {
        document.getElementById('order-details-content').innerHTML = '<div class="empty-state">Error loading order</div>';
      }
    }

    function renderOrderDetails(order) {
      const data = order.parsed_data || {};
      const header = data.header || {};
      const parties = data.parties || {};
      const dates = data.dates || {};
      const items = data.items || [];
      
      const customer = parties.buyer?.name || header.retailerName || extractCustomerFromFilename(order.filename);
      const shipTo = parties.shipTo || {};
      
      let totalQty = 0, totalAmount = 0;
      items.forEach(i => {
        totalQty += i.quantityOrdered || 0;
        totalAmount += i.amount || (i.quantityOrdered * i.unitPrice) || 0;
      });

      document.getElementById('order-details-content').innerHTML = \`
        <div class="order-header-grid">
          <div class="order-field">
            <div class="order-field-label">PO Number</div>
            <div class="order-field-value">\${header.poNumber || order.edi_order_number || '-'}</div>
          </div>
          <div class="order-field">
            <div class="order-field-label">Customer</div>
            <div class="order-field-value">\${customer}</div>
          </div>
          <div class="order-field">
            <div class="order-field-label">Order Date</div>
            <div class="order-field-value">\${dates.orderDate || '-'}</div>
          </div>
          <div class="order-field">
            <div class="order-field-label">Status</div>
            <div class="order-field-value"><span class="badge badge-\${order.status === 'processed' ? 'success' : order.status === 'failed' ? 'error' : 'pending'}">\${order.status}</span></div>
          </div>
        </div>
        
        <div class="order-header-grid">
          <div class="order-field">
            <div class="order-field-label">Ship To</div>
            <div class="order-field-value" style="font-size:0.75rem;">
              \${shipTo.name || '-'}<br>
              \${shipTo.address1 || ''} \${shipTo.address2 || ''}<br>
              \${shipTo.city || ''}, \${shipTo.state || ''} \${shipTo.zip || ''}
            </div>
          </div>
          <div class="order-field">
            <div class="order-field-label">Ship Window</div>
            <div class="order-field-value">\${dates.shipNotBefore || '-'} to \${dates.shipNotAfter || '-'}</div>
          </div>
          <div class="order-field">
            <div class="order-field-label">Cancel Date</div>
            <div class="order-field-value">\${dates.cancelAfter || '-'}</div>
          </div>
          <div class="order-field">
            <div class="order-field-label">Payment Terms</div>
            <div class="order-field-value">\${header.paymentTerms || '-'}</div>
          </div>
        </div>

        <h4 style="margin: 1rem 0 0.5rem; font-size: 0.9rem;">Line Items (\${items.length})</h4>
        <table class="line-items-table">
          <thead>
            <tr>
              <th>Line</th>
              <th>Style/SKU</th>
              <th>Description</th>
              <th>Color</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            \${items.map(item => \`
              <tr>
                <td>\${item.lineNumber || '-'}</td>
                <td>\${item.productIds?.vendorItemNumber || item.productIds?.buyerItemNumber || item.productIds?.sku || '-'}</td>
                <td>\${item.description || '-'}</td>
                <td>\${item.color || '-'}</td>
                <td>\${item.size || '-'}</td>
                <td>\${item.quantityOrdered || 0}</td>
                <td>$\${(item.unitPrice || 0).toFixed(2)}</td>
                <td>$\${(item.amount || (item.quantityOrdered * item.unitPrice) || 0).toFixed(2)}</td>
              </tr>
            \`).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align:right;"><strong>Totals:</strong></td>
              <td><strong>\${totalQty}</strong></td>
              <td></td>
              <td><strong>$\${totalAmount.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>

        <div class="order-summary">
          <div class="summary-item">
            <div class="summary-value">\${items.length}</div>
            <div class="summary-label">Line Items</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">\${totalQty}</div>
            <div class="summary-label">Total Units</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">$\${totalAmount.toFixed(2)}</div>
            <div class="summary-label">Total Value</div>
          </div>
        </div>
        
        \${order.error_message ? \`<div style="margin-top:1rem; padding:0.75rem; background:#fff0f0; border-radius:8px; color:#ff3b30; font-size:0.75rem;"><strong>Error:</strong> \${order.error_message}</div>\` : ''}
      \`;
      
      // Show/hide process button based on status
      document.getElementById('btn-process-order').style.display = (order.status === 'pending' || order.status === 'failed') ? 'inline-flex' : 'none';
    }

    function closeModal() {
      document.getElementById('order-modal').classList.remove('show');
      currentOrderId = null;
    }

    async function processCurrentOrder() {
      if (!currentOrderId) return;
      showToast('Processing order...');
      try {
        const res = await fetch('/process-selected', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: [currentOrderId] })
        });
        const result = await res.json();
        showToast(result.processed > 0 ? 'Order processed!' : 'Processing failed');
        closeModal();
        refreshData();
      } catch (e) {
        showToast('Error: ' + e.message);
      }
    }

    async function loadMappings() {
      try {
        const res = await fetch('/customer-mappings');
        const mappings = await res.json();
        const container = document.getElementById('mappings-container');
        
        let html = \`
          <div style="margin-bottom:1rem; padding:1rem; background:#f5f5f7; border-radius:8px;">
            <strong style="font-size:0.8rem;">Add Manual Mapping:</strong>
            <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
              <input type="text" id="edi-name" placeholder="EDI Customer Name (e.g. amazoncom)" style="flex:1; padding:0.4rem; border:1px solid #d2d2d7; border-radius:4px; font-size:0.75rem;">
              <input type="text" id="zoho-name" placeholder="Zoho Account Name" style="flex:1; padding:0.4rem; border:1px solid #d2d2d7; border-radius:4px; font-size:0.75rem;">
              <button class="btn btn-primary btn-sm" onclick="addMapping()">Add</button>
            </div>
          </div>
        \`;
        
        if (!mappings.length) {
          html += '<div class="empty-state">No customer mappings saved yet.</div>';
        } else {
          html += mappings.map(m => \`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem;background:#f5f5f7;border-radius:6px;margin-bottom:0.5rem;">
              <span><strong>\${m.edi_customer_name}</strong> → \${m.zoho_account_name || '(no Zoho account)'}</span>
              <button class="btn btn-sm btn-secondary" onclick="deleteMapping(\${m.id})">Delete</button>
            </div>
          \`).join('');
        }
        
        container.innerHTML = html;
      } catch (e) { console.error(e); }
    }

    async function addMapping() {
      const ediName = document.getElementById('edi-name').value.trim();
      const zohoName = document.getElementById('zoho-name').value.trim();
      if (!ediName || !zohoName) { showToast('Enter both names'); return; }
      
      try {
        const res = await fetch('/add-mapping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ediCustomerName: ediName, zohoAccountName: zohoName })
        });
        if (res.ok) {
          showToast('Mapping added!');
          document.getElementById('edi-name').value = '';
          document.getElementById('zoho-name').value = '';
          loadMappings();
        }
      } catch (e) { showToast('Error adding mapping'); }
    }

    async function resetOrders() {
      if (!confirm('This will DELETE all orders and re-import from SFTP. Are you sure?')) return;
      try {
        const res = await fetch('/reset-orders', { method: 'POST' });
        const r = await res.json();
        showToast(r.message || 'Orders reset');
        refreshData();
      } catch (e) { showToast('Error resetting'); }
    }

    async function deleteMapping(id) {
      await fetch('/customer-mappings/' + id, { method: 'DELETE' });
      loadMappings();
    }

    function toggleSelectAll(cb) {
      document.querySelectorAll('.order-checkbox:not(:disabled)').forEach(c => c.checked = cb.checked);
    }

    function getSelectedIds() {
      return Array.from(document.querySelectorAll('.order-checkbox:checked')).map(c => parseInt(c.value));
    }

    async function fetchSFTP() {
      const btn = document.getElementById('btn-fetch');
      btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Fetching...';
      showToast('Connecting to SFTP...');
      try {
        const res = await fetch('/fetch-sftp', { method: 'POST' });
        const r = await res.json();
        if (r.success) {
          showToast('Fetched ' + r.filesProcessed + ' files, ' + r.ordersCreated + ' orders created');
        } else {
          showToast('Error: ' + (r.error || 'Unknown error'));
        }
        refreshData();
      } catch (e) { showToast('Error: ' + e.message); }
      btn.disabled = false; btn.innerHTML = 'Fetch from SFTP';
    }

    async function triggerProcessLimit() {
      const btn = document.getElementById('btn-process');
      const limit = document.getElementById('process-limit').value;
      btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>';
      try {
        const res = await fetch('/process-limit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: parseInt(limit) }) });
        const r = await res.json();
        showToast(\`Processed: \${r.processed}, Failed: \${r.failed}\`);
        refreshData();
      } catch (e) { showToast('Error'); }
      btn.disabled = false; btn.innerHTML = 'Process Orders';
    }

    async function processSelected() {
      const ids = getSelectedIds();
      if (!ids.length) { showToast('Select orders first'); return; }
      showToast('Processing ' + ids.length + ' orders...');
      try {
        const res = await fetch('/process-selected', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIds: ids }) });
        const r = await res.json();
        showToast(\`Processed: \${r.processed}, Failed: \${r.failed}\`);
        refreshData();
      } catch (e) { showToast('Error'); }
    }

    async function retryFailed() {
      const res = await fetch('/retry-failed', { method: 'POST' });
      const r = await res.json();
      showToast('Reset ' + r.count + ' orders');
      refreshData();
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      document.getElementById('toast-message').textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3000);
    }
  </script>
</body>
</html>
`;

module.exports = dashboardHTML;
