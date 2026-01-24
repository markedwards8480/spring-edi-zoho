// Complete Dashboard with Enhanced Order Details Modal
// Shows all CSV fields organized by category including UOM (AS/EA)

const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spring EDI Integration | Mark Edwards Apparel</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    
    .header { background: #1e293b; border-bottom: 1px solid #334155; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
    .logo { display: flex; align-items: center; gap: 1rem; }
    .logo-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; }
    .logo-text { font-size: 1.25rem; font-weight: 600; }
    .logo-sub { font-size: 0.75rem; color: #64748b; }
    .status-indicator { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 20px; font-size: 0.875rem; }
    .status-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    
    .main-container { display: flex; min-height: calc(100vh - 70px); }
    .sidebar { width: 220px; background: #1e293b; border-right: 1px solid #334155; padding: 1.5rem 0; }
    .nav-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; padding: 0 1.5rem; margin-bottom: 0.75rem; margin-top: 1.5rem; }
    .nav-title:first-child { margin-top: 0; }
    .nav-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.5rem; color: #94a3b8; cursor: pointer; transition: all 0.2s; border-left: 3px solid transparent; font-size: 0.9rem; }
    .nav-item:hover { background: rgba(59, 130, 246, 0.1); color: #e2e8f0; }
    .nav-item.active { background: rgba(59, 130, 246, 0.15); color: #3b82f6; border-left-color: #3b82f6; }
    .nav-badge { margin-left: auto; background: #f59e0b; color: #0f172a; padding: 0.15rem 0.5rem; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
    
    .content { flex: 1; padding: 2rem; overflow-y: auto; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; }
    .stat-card.primary { border-color: #3b82f6; background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.05)); }
    .stat-card.success { border-color: #22c55e; }
    .stat-card.warning { border-color: #f59e0b; }
    .stat-card.danger { border-color: #ef4444; }
    .stat-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem; }
    .stat-value { font-size: 2rem; font-weight: 700; }
    .stat-card.primary .stat-value { color: #3b82f6; }
    .stat-card.success .stat-value { color: #22c55e; }
    .stat-card.warning .stat-value { color: #f59e0b; }
    .stat-card.danger .stat-value { color: #ef4444; }
    
    .toolbar { display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: center; flex-wrap: wrap; }
    .search-box { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 0.6rem 1rem; color: #e2e8f0; width: 250px; }
    .search-box:focus { outline: none; border-color: #3b82f6; }
    .btn { padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 0.5rem; }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-primary:hover { background: #2563eb; }
    .btn-secondary { background: #334155; color: #e2e8f0; }
    .btn-secondary:hover { background: #475569; }
    .btn-success { background: #22c55e; color: white; }
    .btn-success:hover { background: #16a34a; }
    
    .filter-select { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 0.6rem 1rem; color: #e2e8f0; }
    
    .orders-table { width: 100%; border-collapse: collapse; }
    .orders-table th { text-align: left; padding: 1rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #334155; }
    .orders-table td { padding: 1rem; border-bottom: 1px solid #1e293b; }
    .orders-table tr:hover { background: rgba(59, 130, 246, 0.05); }
    
    .status-badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
    .status-pending { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
    .status-processed { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
    .status-failed { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
    
    .checkbox { width: 18px; height: 18px; accent-color: #3b82f6; cursor: pointer; }
    
    /* Modal Styles */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: #1e293b; border-radius: 16px; max-width: 1200px; width: 95%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; border: 1px solid #334155; }
    .modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }
    .modal-header h2 { font-size: 1.25rem; font-weight: 600; }
    .modal-close { background: none; border: none; color: #64748b; font-size: 1.5rem; cursor: pointer; }
    .modal-close:hover { color: #e2e8f0; }
    
    .modal-tabs { display: flex; border-bottom: 1px solid #334155; background: #0f172a; }
    .modal-tab { padding: 1rem 1.5rem; cursor: pointer; color: #64748b; border-bottom: 2px solid transparent; transition: all 0.2s; font-size: 0.875rem; }
    .modal-tab:hover { color: #e2e8f0; background: rgba(59, 130, 246, 0.05); }
    .modal-tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }
    
    .modal-body { flex: 1; overflow-y: auto; padding: 1.5rem; }
    .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #334155; display: flex; justify-content: flex-end; gap: 1rem; }
    
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .info-box { background: #0f172a; border-radius: 8px; padding: 1rem; }
    .info-label { font-size: 0.7rem; text-transform: uppercase; color: #64748b; margin-bottom: 0.25rem; }
    .info-value { font-size: 1rem; font-weight: 500; }
    
    .summary-boxes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .summary-box { background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.05)); border: 1px solid #334155; border-radius: 8px; padding: 1.25rem; text-align: center; }
    .summary-box.green { background: linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05)); border-color: rgba(34,197,94,0.3); }
    .summary-number { font-size: 2rem; font-weight: 700; color: #3b82f6; }
    .summary-box.green .summary-number { color: #22c55e; }
    .summary-label { font-size: 0.75rem; color: #64748b; }
    
    .line-items-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .line-items-table th { text-align: left; padding: 0.75rem; background: #0f172a; font-size: 0.7rem; text-transform: uppercase; color: #64748b; }
    .line-items-table td { padding: 0.75rem; border-bottom: 1px solid #334155; }
    
    .data-section { margin-bottom: 2rem; }
    .data-section h3 { font-size: 1rem; margin-bottom: 1rem; color: #3b82f6; display: flex; align-items: center; gap: 0.5rem; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    .data-table th { text-align: left; padding: 0.5rem; background: #0f172a; font-size: 0.7rem; text-transform: uppercase; color: #64748b; }
    .data-table td { padding: 0.5rem; border-bottom: 1px solid #1e293b; }
    .data-table td:first-child { font-family: monospace; font-size: 0.75rem; color: #94a3b8; max-width: 350px; word-break: break-all; }
    .data-table tr.has-value { background: rgba(59, 130, 246, 0.05); }
    .data-table .empty-value { color: #475569; font-style: italic; }
    
    .raw-search { width: 100%; padding: 0.75rem; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; margin-bottom: 1rem; }
    .raw-search:focus { outline: none; border-color: #3b82f6; }
    
    .uom-badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-left: 0.5rem; }
    .uom-as { background: #f59e0b; color: #0f172a; }
    .uom-ea { background: #22c55e; color: #0f172a; }
    
    .toast { position: fixed; bottom: 2rem; right: 2rem; background: #1e293b; border: 1px solid #334155; padding: 1rem 1.5rem; border-radius: 8px; display: none; z-index: 2000; }
    .toast.show { display: block; }
    
    .empty-state { text-align: center; padding: 3rem; color: #64748b; }
    
    @media (max-width: 1200px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .info-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .sidebar { display: none; }
      .stats-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">ME</div>
      <div>
        <div class="logo-text">Spring EDI Integration</div>
        <div class="logo-sub">Mark Edwards Apparel</div>
      </div>
    </div>
    <div class="status-indicator">
      <div class="status-dot"></div>
      System Online
    </div>
  </div>
  
  <div class="main-container">
    <div class="sidebar">
      <div class="nav-title">Orders</div>
      <div class="nav-item active" onclick="showTab('orders', this)">
        📦 EDI Orders <span class="nav-badge" id="pendingBadge">0</span>
      </div>
      <div class="nav-item" onclick="showTab('drafts', this)">📋 Match Drafts</div>
      <div class="nav-title">Settings</div>
      <div class="nav-item" onclick="showTab('mappings', this)">🔗 Customer Mappings</div>
      <div class="nav-title">History</div>
      <div class="nav-item" onclick="showTab('activity', this)">📊 Activity Log</div>
      <div class="nav-item" onclick="showTab('replaced', this)">🗂 Replaced Drafts</div>
      <div class="nav-title">Help</div>
      <div class="nav-item" onclick="window.open('/documentation', '_blank')">📖 Documentation</div>
    </div>
    
    <div class="content">
      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-label">Total Orders</div>
          <div class="stat-value" id="statTotal">0</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">Sent to Zoho</div>
          <div class="stat-value" id="statProcessed">0</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">Ready to Send</div>
          <div class="stat-value" id="statPending">0</div>
        </div>
        <div class="stat-card danger">
          <div class="stat-label">Failed</div>
          <div class="stat-value" id="statFailed">0</div>
        </div>
      </div>
      
      <!-- Orders Tab -->
      <div id="tabOrders">
        <div class="toolbar">
          <input type="text" class="search-box" placeholder="Search PO#..." id="searchBox" onkeyup="filterOrders()">
          <select class="filter-select" id="customerFilter" onchange="filterOrders()">
            <option value="">All Customers</option>
          </select>
          <select class="filter-select" id="statusFilter" onchange="filterOrders()">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
            <option value="failed">Failed</option>
          </select>
          <div style="flex:1"></div>
          <button class="btn btn-primary" onclick="fetchFromSftp()">🔄 Fetch from SFTP</button>
          <button class="btn btn-success" onclick="syncSelected()">✓ Sync with Zoho</button>
        </div>
        
        <div style="background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden;">
          <table class="orders-table">
            <thead>
              <tr>
                <th style="width:40px"><input type="checkbox" class="checkbox" id="selectAll" onchange="toggleAll()"></th>
                <th>PO #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Value</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="ordersTable">
              <tr><td colspan="8" class="empty-state">Loading orders...</td></tr>
            </tbody>
          </table>
        </div>
        <div style="margin-top:1rem;color:#64748b;font-size:0.8rem;" id="orderCount">Showing 0 of 0 orders</div>
      </div>
      
      <!-- Other tabs (placeholder) -->
      <div id="tabMappings" style="display:none">
        <h2 style="margin-bottom:1rem">Customer Mappings</h2>
        <p style="color:#64748b">Map EDI customer names to Zoho Books customers.</p>
        <div id="mappingsContent" style="margin-top:1.5rem"></div>
      </div>
      
      <div id="tabActivity" style="display:none">
        <h2 style="margin-bottom:1rem">Activity Log</h2>
        <div id="activityContent"></div>
      </div>
      
      <div id="tabDrafts" style="display:none">
        <h2 style="margin-bottom:1rem">Match Drafts</h2>
        <p style="color:#64748b">Match incoming EDI orders to existing draft sales orders in Zoho.</p>
      </div>
      
      <div id="tabReplaced" style="display:none">
        <h2 style="margin-bottom:1rem">Replaced Drafts</h2>
        <p style="color:#64748b">History of draft orders that were replaced by EDI orders.</p>
      </div>
    </div>
  </div>
  
  <!-- Modal Container -->
  <div id="modalContainer"></div>
  
  <!-- Toast -->
  <div class="toast" id="toast"><span id="toastMsg"></span></div>
  
  <script>
    let orders = [];
    let selectedIds = new Set();
    let currentOrder = null;
    let currentRawFields = {};
    
    document.addEventListener('DOMContentLoaded', () => { loadOrders(); loadStats(); });
    
    function showTab(tab, el) {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      if (el) el.classList.add('active');
      ['tabOrders','tabMappings','tabActivity','tabDrafts','tabReplaced'].forEach(t => {
        const elem = document.getElementById(t);
        if (elem) elem.style.display = 'none';
      });
      const tabElem = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
      if (tabElem) tabElem.style.display = 'block';
      if (tab === 'mappings') loadMappings();
      if (tab === 'activity') loadActivity();
    }
    
    async function loadOrders() {
      try {
        const res = await fetch('/orders');
        orders = await res.json();
        renderOrders();
        updateCustomerFilter();
        loadStats();
      } catch (e) { toast('Failed to load orders'); }
    }
    
    function renderOrders() {
      const search = document.getElementById('searchBox').value.toLowerCase();
      const customer = document.getElementById('customerFilter').value;
      const status = document.getElementById('statusFilter').value;
      
      let filtered = orders.filter(o => {
        if (search && !(o.edi_order_number || '').toLowerCase().includes(search)) return false;
        if (customer && o.edi_customer_name !== customer) return false;
        if (status && o.status !== status) return false;
        return true;
      });
      
      const tbody = document.getElementById('ordersTable');
      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No orders found. Click "Fetch from SFTP" to load orders.</td></tr>';
        document.getElementById('orderCount').textContent = 'Showing 0 of ' + orders.length + ' orders';
        return;
      }
      
      tbody.innerHTML = filtered.map(o => {
        const items = o.parsed_data?.items || [];
        const amt = items.reduce((s,i) => s + (i.quantityOrdered||0)*(i.unitPrice||0), 0);
        const st = o.status === 'processed' ? 'processed' : o.status === 'failed' ? 'failed' : 'pending';
        return \`<tr>
          <td><input type="checkbox" class="checkbox" \${selectedIds.has(o.id)?'checked':''} onchange="toggleSelect(\${o.id})"></td>
          <td><strong>\${o.edi_order_number||'N/A'}</strong></td>
          <td>\${o.edi_customer_name||'Unknown'}</td>
          <td>\${items.length} items</td>
          <td>$\${amt.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
          <td><span class="status-badge status-\${st}">\${st === 'processed' ? '✓ Sent' : st === 'failed' ? '✗ Failed' : '⏳ Ready'}</span></td>
          <td>\${new Date(o.created_at).toLocaleDateString()}</td>
          <td><button class="btn btn-secondary" style="padding:0.35rem 0.75rem;font-size:0.8rem" onclick="viewOrder(\${o.id})">View</button></td>
        </tr>\`;
      }).join('');
      
      document.getElementById('orderCount').textContent = 'Showing ' + filtered.length + ' of ' + orders.length + ' orders';
    }
    
    function filterOrders() { renderOrders(); }
    
    function updateCustomerFilter() {
      const customers = [...new Set(orders.map(o => o.edi_customer_name).filter(Boolean))].sort();
      document.getElementById('customerFilter').innerHTML = '<option value="">All Customers</option>' + 
        customers.map(c => '<option value="' + c + '">' + c + '</option>').join('');
    }
    
    async function loadStats() {
      try {
        const res = await fetch('/status');
        const d = (await res.json()).last24Hours;
        document.getElementById('statTotal').textContent = d.total || 0;
        document.getElementById('statProcessed').textContent = d.processed || 0;
        document.getElementById('statPending').textContent = d.pending || 0;
        document.getElementById('statFailed').textContent = d.failed || 0;
        document.getElementById('pendingBadge').textContent = d.pending || 0;
      } catch(e) {}
    }
    
    function toggleSelect(id) { selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id); }
    function toggleAll() { 
      const c = document.getElementById('selectAll').checked; 
      orders.forEach(o => c ? selectedIds.add(o.id) : selectedIds.delete(o.id)); 
      renderOrders(); 
    }
    
    async function fetchFromSftp() {
      toast('Fetching from SFTP...');
      try {
        const res = await fetch('/fetch-sftp', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          toast('Fetched ' + (data.result?.filesProcessed || 0) + ' files');
          loadOrders();
        } else {
          toast('Error: ' + (data.error || 'Unknown'));
        }
      } catch (e) { toast('Error: ' + e.message); }
    }
    
    async function syncSelected() {
      if (selectedIds.size === 0) { toast('Select orders first'); return; }
      toast('Syncing ' + selectedIds.size + ' orders...');
      try {
        const res = await fetch('/process-selected', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: [...selectedIds] })
        });
        const data = await res.json();
        toast('Processed: ' + data.processed + ', Failed: ' + data.failed);
        selectedIds.clear();
        loadOrders();
      } catch (e) { toast('Error: ' + e.message); }
    }
    
    // Parse CSV line handling quoted fields
    function parseCSVLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
        else { current += char; }
      }
      result.push(current);
      return result;
    }
    
    async function viewOrder(orderId) {
      try {
        const res = await fetch('/orders/' + orderId);
        currentOrder = await res.json();
        
        // Parse raw CSV to get all fields
        currentRawFields = {};
        if (currentOrder.raw_edi) {
          const lines = currentOrder.raw_edi.split('\\n');
          if (lines.length >= 2) {
            const headers = parseCSVLine(lines[0]);
            const values = parseCSVLine(lines[1]);
            headers.forEach((h, i) => {
              currentRawFields[h.trim()] = values[i] || '';
            });
          }
        }
        
        renderOrderModal();
      } catch (e) {
        toast('Failed to load order');
      }
    }
    
    function renderOrderModal() {
      const o = currentOrder;
      const parsed = o.parsed_data || {};
      const items = parsed.items || [];
      const totalUnits = items.reduce((s, i) => s + (i.quantityOrdered || 0), 0);
      const totalValue = items.reduce((s, i) => s + ((i.quantityOrdered || 0) * (i.unitPrice || 0)), 0);
      
      // Get UOM from first item
      const uom = currentRawFields['po_item_po_item_uom'] || items[0]?.unitOfMeasure || 'EA';
      const uomBadge = uom === 'AS' ? '<span class="uom-badge uom-as">AS - Prepack</span>' : '<span class="uom-badge uom-ea">EA - Each</span>';
      
      const html = \`
        <div class="modal-overlay" onclick="closeModal()">
          <div class="modal" onclick="event.stopPropagation()">
            <div class="modal-header">
              <h2>Order Details - \${o.edi_order_number || 'N/A'} \${uomBadge}</h2>
              <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            
            <div class="modal-tabs">
              <div class="modal-tab active" onclick="showModalTab('summary', this)">Summary</div>
              <div class="modal-tab" onclick="showModalTab('items', this)">Line Items</div>
              <div class="modal-tab" onclick="showModalTab('pricing', this)">💰 Pricing Fields</div>
              <div class="modal-tab" onclick="showModalTab('shipping', this)">Shipping</div>
              <div class="modal-tab" onclick="showModalTab('raw', this)">All Raw Data</div>
            </div>
            
            <div class="modal-body">
              <!-- Summary Tab -->
              <div class="tab-content active" id="tab-summary">
                <div class="info-grid">
                  <div class="info-box">
                    <div class="info-label">PO Number</div>
                    <div class="info-value">\${o.edi_order_number || 'N/A'}</div>
                  </div>
                  <div class="info-box">
                    <div class="info-label">Customer</div>
                    <div class="info-value">\${o.edi_customer_name || 'Unknown'}</div>
                  </div>
                  <div class="info-box">
                    <div class="info-label">Order Date</div>
                    <div class="info-value">\${parsed.dates?.orderDate || currentRawFields['po_po_created'] || 'N/A'}</div>
                  </div>
                  <div class="info-box">
                    <div class="info-label">Unit of Measure</div>
                    <div class="info-value">\${uom} \${uom === 'AS' ? '(Prepack)' : '(Each)'}</div>
                  </div>
                </div>
                
                <div class="summary-boxes">
                  <div class="summary-box">
                    <div class="summary-number">\${items.length}</div>
                    <div class="summary-label">Line Items</div>
                  </div>
                  <div class="summary-box">
                    <div class="summary-number">\${totalUnits.toLocaleString()}</div>
                    <div class="summary-label">Total Units</div>
                  </div>
                  <div class="summary-box green">
                    <div class="summary-number">$\${totalValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                    <div class="summary-label">Total Value</div>
                  </div>
                </div>
                
                \${uom === 'AS' ? '<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:1rem;margin-top:1rem;"><strong>⚠️ Prepack Order:</strong> Unit prices shown are for the entire prepack, not individual items.</div>' : ''}
                
                \${o.zoho_so_number ? '<div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:8px;padding:1rem;margin-top:1rem;"><strong>✓ Zoho Sales Order:</strong> ' + o.zoho_so_number + '</div>' : ''}
              </div>
              
              <!-- Items Tab -->
              <div class="tab-content" id="tab-items">
                <table class="line-items-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Style/SKU</th>
                      <th>Description</th>
                      <th>Color</th>
                      <th>Size</th>
                      <th>UOM</th>
                      <th style="text-align:right">Qty</th>
                      <th style="text-align:right">Unit Price</th>
                      <th style="text-align:right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${items.map((item, idx) => \`
                      <tr>
                        <td>\${item.lineNumber || idx + 1}</td>
                        <td><strong>\${item.productIds?.sku || item.productIds?.vendorItemNumber || item.productIds?.buyerItemNumber || 'N/A'}</strong></td>
                        <td>\${item.description || ''}</td>
                        <td>\${item.color || ''}</td>
                        <td>\${item.size || ''}</td>
                        <td>\${item.unitOfMeasure || uom}</td>
                        <td style="text-align:right">\${item.quantityOrdered || 0}</td>
                        <td style="text-align:right">$\${(item.unitPrice || 0).toFixed(2)}</td>
                        <td style="text-align:right"><strong>$\${((item.quantityOrdered || 0) * (item.unitPrice || 0)).toFixed(2)}</strong></td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              </div>
              
              <!-- Pricing Tab -->
              <div class="tab-content" id="tab-pricing">
                <div class="data-section">
                  <h3>💰 Price Fields</h3>
                  <p style="color:#64748b;margin-bottom:1rem;font-size:0.875rem">All fields containing "price", "amount", "cost", or "rate" from the raw CSV.</p>
                  <table class="data-table">
                    <thead><tr><th>Field Name</th><th>Value</th></tr></thead>
                    <tbody>
                      \${Object.entries(currentRawFields)
                        .filter(([k]) => k.toLowerCase().includes('price') || k.toLowerCase().includes('amount') || k.toLowerCase().includes('cost') || k.toLowerCase().includes('rate'))
                        .map(([k, v]) => \`<tr class="\${v ? 'has-value' : ''}"><td>\${k}</td><td>\${v || '<span class="empty-value">(empty)</span>'}</td></tr>\`).join('') || '<tr><td colspan="2">No price fields found</td></tr>'}
                    </tbody>
                  </table>
                </div>
                
                <div class="data-section">
                  <h3>📦 Quantity & Pack Fields</h3>
                  <table class="data-table">
                    <thead><tr><th>Field Name</th><th>Value</th></tr></thead>
                    <tbody>
                      \${Object.entries(currentRawFields)
                        .filter(([k]) => k.toLowerCase().includes('qty') || k.toLowerCase().includes('quantity') || k.toLowerCase().includes('pack') || k.toLowerCase().includes('inner') || k.toLowerCase().includes('uom'))
                        .map(([k, v]) => \`<tr class="\${v ? 'has-value' : ''}"><td>\${k}</td><td>\${v || '<span class="empty-value">(empty)</span>'}</td></tr>\`).join('') || '<tr><td colspan="2">No quantity fields found</td></tr>'}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <!-- Shipping Tab -->
              <div class="tab-content" id="tab-shipping">
                <div class="info-grid" style="grid-template-columns: 1fr 1fr;">
                  <div class="info-box">
                    <div class="info-label">Ship To</div>
                    <div class="info-value">
                      <strong>\${currentRawFields['ship_to_location_tp_location_name'] || 'N/A'}</strong><br>
                      \${currentRawFields['ship_to_location_tp_location_address'] || ''}<br>
                      \${currentRawFields['ship_to_location_tp_location_city'] || ''}, \${currentRawFields['ship_to_location_tp_location_state_province'] || ''} \${currentRawFields['ship_to_location_tp_location_postal'] || ''}<br>
                      <span style="color:#64748b;font-size:0.8rem">Code: \${currentRawFields['ship_to_location_tp_location_code'] || 'N/A'}</span>
                    </div>
                  </div>
                  <div class="info-box">
                    <div class="info-label">Shipping Dates</div>
                    <div class="info-value">
                      <strong>Ship Open:</strong> \${currentRawFields['po_po_ship_open_date'] || 'N/A'}<br>
                      <strong>Ship Close:</strong> \${currentRawFields['po_po_ship_close_date'] || 'N/A'}<br>
                      <strong>Must Arrive:</strong> \${currentRawFields['po_attributes_must_arrive_by_date'] || 'N/A'}
                    </div>
                  </div>
                </div>
                
                <div class="data-section" style="margin-top:1.5rem">
                  <h3>🚚 All Shipping Fields</h3>
                  <table class="data-table">
                    <thead><tr><th>Field Name</th><th>Value</th></tr></thead>
                    <tbody>
                      \${Object.entries(currentRawFields)
                        .filter(([k]) => k.toLowerCase().includes('ship') || k.toLowerCase().includes('location') || k.toLowerCase().includes('address') || k.toLowerCase().includes('carrier'))
                        .map(([k, v]) => \`<tr class="\${v ? 'has-value' : ''}"><td>\${k}</td><td>\${v || '<span class="empty-value">(empty)</span>'}</td></tr>\`).join('') || '<tr><td colspan="2">No shipping fields found</td></tr>'}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <!-- Raw Data Tab -->
              <div class="tab-content" id="tab-raw">
                <input type="text" class="raw-search" placeholder="Search fields..." id="rawSearch" onkeyup="filterRawData()">
                <div style="max-height:400px;overflow-y:auto">
                  <table class="data-table" id="rawDataTable">
                    <thead><tr><th style="width:50px">#</th><th>Field Name</th><th>Value</th></tr></thead>
                    <tbody>
                      \${Object.entries(currentRawFields).map(([k, v], idx) => \`
                        <tr class="raw-row \${v ? 'has-value' : ''}" data-field="\${k.toLowerCase()}" data-value="\${(v || '').toLowerCase()}">
                          <td style="color:#64748b">\${idx}</td>
                          <td>\${k}</td>
                          <td>\${v || '<span class="empty-value">(empty)</span>'}</td>
                        </tr>
                      \`).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="closeModal()">Close</button>
              \${o.status !== 'processed' ? '<button class="btn btn-success" onclick="sendToZoho(' + o.id + ')">Send to Zoho</button>' : ''}
            </div>
          </div>
        </div>
      \`;
      
      document.getElementById('modalContainer').innerHTML = html;
    }
    
    function showModalTab(tabName, el) {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      document.getElementById('tab-' + tabName).classList.add('active');
    }
    
    function filterRawData() {
      const search = document.getElementById('rawSearch').value.toLowerCase();
      document.querySelectorAll('.raw-row').forEach(row => {
        const field = row.dataset.field;
        const value = row.dataset.value;
        row.style.display = (field.includes(search) || value.includes(search)) ? '' : 'none';
      });
    }
    
    function closeModal() {
      document.getElementById('modalContainer').innerHTML = '';
      currentOrder = null;
      currentRawFields = {};
    }
    
    async function sendToZoho(orderId) {
      if (!confirm('Send this order to Zoho?')) return;
      toast('Sending to Zoho...');
      try {
        const res = await fetch('/orders/' + orderId + '/process', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          toast('Order sent to Zoho! SO#: ' + (data.zohoSoNumber || data.soNumber || 'Created'));
          closeModal();
          loadOrders();
        } else {
          toast('Error: ' + (data.error || 'Unknown'));
        }
      } catch (e) { toast('Error: ' + e.message); }
    }
    
    async function loadMappings() {
      try {
        const res = await fetch('/customer-mappings');
        const mappings = await res.json();
        document.getElementById('mappingsContent').innerHTML = mappings.length ? 
          '<table class="orders-table"><thead><tr><th>EDI Customer</th><th>Zoho Customer</th><th>Actions</th></tr></thead><tbody>' +
          mappings.map(m => '<tr><td>' + m.edi_customer_name + '</td><td>' + m.zoho_customer_name + '</td><td><button class="btn btn-secondary" style="padding:0.25rem 0.5rem;font-size:0.75rem" onclick="deleteMapping(' + m.id + ')">Delete</button></td></tr>').join('') +
          '</tbody></table>' : '<p style="color:#64748b">No mappings configured.</p>';
      } catch (e) { document.getElementById('mappingsContent').innerHTML = '<p style="color:#ef4444">Failed to load mappings</p>'; }
    }
    
    async function loadActivity() {
      document.getElementById('activityContent').innerHTML = '<p style="color:#64748b">Activity log coming soon...</p>';
    }
    
    function toast(msg) {
      document.getElementById('toastMsg').textContent = msg;
      document.getElementById('toast').classList.add('show');
      setTimeout(() => document.getElementById('toast').classList.remove('show'), 3000);
    }
  </script>
</body>
</html>
`;

module.exports = dashboardHTML;
