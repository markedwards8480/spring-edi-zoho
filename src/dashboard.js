// Modern Dashboard HTML - Mark Edwards Apparel Design System
const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spring EDI Integration | Mark Edwards Apparel</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f7;
      color: #1e3a5f;
      min-height: 100vh;
    }
    
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a7f 100%);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .logo { display: flex; align-items: center; gap: 1rem; }
    .logo-icon { width: 40px; height: 40px; background: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; color: #1e3a5f; }
    .logo-text { font-size: 1.25rem; font-weight: 600; color: white; }
    .logo-subtitle { font-size: 0.75rem; color: rgba(255,255,255,0.7); }
    
    .status-indicator { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: rgba(255,255,255,0.15); border-radius: 980px; font-size: 0.875rem; color: white; }
    .status-dot { width: 8px; height: 8px; background: #34c759; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    
    .main-container { display: flex; min-height: calc(100vh - 70px); }
    
    .sidebar { width: 220px; background: white; border-right: 1px solid rgba(0,0,0,0.06); padding: 1.5rem 0; box-shadow: 1px 0 3px rgba(0,0,0,0.04); }
    .nav-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; padding: 0 1.5rem; margin-bottom: 0.75rem; margin-top: 1.5rem; }
    .nav-title:first-child { margin-top: 0; }
    .nav-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.5rem; color: #6e6e73; cursor: pointer; transition: all 0.15s; border-left: 3px solid transparent; font-size: 0.875rem; }
    .nav-item:hover { background: #f5f5f7; color: #1e3a5f; }
    .nav-item.active { background: rgba(0, 136, 194, 0.08); color: #0088c2; border-left-color: #0088c2; font-weight: 500; }
    .nav-badge { margin-left: auto; background: #ff9500; color: white; font-size: 0.65rem; padding: 0.15rem 0.5rem; border-radius: 10px; font-weight: 600; }
    
    .content { flex: 1; padding: 2rem; overflow-y: auto; }
    
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 1.5rem; }
    .stat-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); transition: all 0.2s; cursor: pointer; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
    .stat-card.active-filter { border: 2px solid #0088c2; }
    .stat-label { font-size: 0.7rem; color: #86868b; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 0.5rem; }
    .stat-value { font-size: 2.5rem; font-weight: 700; color: #1e3a5f; }
    .stat-value.success { color: #34c759; }
    .stat-value.warning { color: #ff9500; }
    .stat-value.danger { color: #ff3b30; }
    
    .filter-bar { display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center; background: white; padding: 1rem; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .filter-bar input, .filter-bar select { background: #f5f5f7; border: 1px solid #d2d2d7; color: #1e3a5f; padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.875rem; font-family: inherit; }
    .filter-bar input:focus, .filter-bar select:focus { outline: none; border-color: #0088c2; background: white; }
    .filter-bar input[type="text"] { width: 200px; }
    .filter-bar input[type="date"] { width: 140px; }
    .filter-label { font-size: 0.75rem; color: #86868b; margin-right: -0.5rem; }
    .clear-filters { color: #0088c2; font-size: 0.8rem; cursor: pointer; margin-left: auto; }
    .clear-filters:hover { text-decoration: underline; }
    
    .action-bar { display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.15s; border: none; font-family: inherit; }
    .btn-primary { background: #1e3a5f; color: white; }
    .btn-primary:hover { background: #2d5a7f; }
    .btn-secondary { background: white; color: #1e3a5f; border: 1px solid #d2d2d7; }
    .btn-secondary:hover { background: #f5f5f7; }
    .btn-success { background: #34c759; color: white; }
    .btn-success:hover { background: #2db14d; }
    .btn-danger { background: white; color: #ff3b30; border: 1px solid #ff3b30; }
    .btn-danger:hover { background: rgba(255, 59, 48, 0.08); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    select { background: white; border: 1px solid #d2d2d7; color: #1e3a5f; padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.875rem; font-family: inherit; }
    
    .table-container { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .table-info { padding: 0.75rem 1rem; background: #f5f5f7; font-size: 0.8rem; color: #6e6e73; border-bottom: 1px solid rgba(0,0,0,0.06); }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f7; padding: 1rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.02em; color: #86868b; font-weight: 600; }
    td { padding: 1rem; border-top: 1px solid rgba(0,0,0,0.06); font-size: 0.875rem; }
    tr:hover { background: #f5f5f7; }
    
    .status-badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem; border-radius: 980px; font-size: 0.75rem; font-weight: 500; }
    .status-pending { background: rgba(255, 149, 0, 0.12); color: #ff9500; }
    .status-in-zoho { background: rgba(52, 199, 89, 0.12); color: #34c759; }
    .status-failed { background: rgba(255, 59, 48, 0.12); color: #ff3b30; }
    .status-not-synced { background: rgba(134, 134, 139, 0.12); color: #86868b; }
    
    .zoho-link { color: #0088c2; text-decoration: none; font-size: 0.8rem; }
    .zoho-link:hover { text-decoration: underline; }
    .no-zoho { color: #86868b; font-size: 0.8rem; }
    
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; opacity: 0; visibility: hidden; transition: all 0.2s; }
    .modal-overlay.active { opacity: 1; visibility: visible; }
    .modal { background: white; border-radius: 18px; width: 95%; max-width: 1000px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .modal-title { font-size: 1.25rem; font-weight: 600; color: #1e3a5f; }
    .modal-close { background: #f5f5f7; border: none; color: #86868b; font-size: 1.25rem; cursor: pointer; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .modal-close:hover { background: #e5e5e5; color: #1e3a5f; }
    .modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; }
    .modal-footer { padding: 1.5rem; border-top: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: flex-end; gap: 0.75rem; }
    
    .order-header { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .order-field { background: #f5f5f7; padding: 1rem; border-radius: 12px; }
    .order-field-label { font-size: 0.65rem; color: #86868b; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 0.25rem; }
    .order-field-value { font-size: 0.95rem; font-weight: 500; color: #1e3a5f; }
    
    .zoho-link-box { background: rgba(52, 199, 89, 0.08); border: 1px solid rgba(52, 199, 89, 0.2); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem; }
    .zoho-link-box .icon { font-size: 1.5rem; }
    .zoho-link-box .label { font-size: 0.75rem; color: #86868b; }
    .zoho-link-box .value { font-size: 1.1rem; font-weight: 600; color: #34c759; }
    .zoho-link-box a { color: #0088c2; text-decoration: none; }
    .zoho-link-box a:hover { text-decoration: underline; }
    
    .warning-box { background: rgba(134,134,139,0.08); border: 1px solid rgba(134,134,139,0.2); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; color: #86868b; }
    
    .line-items-container { max-height: 280px; overflow-y: auto; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; }
    .line-items-table { width: 100%; font-size: 0.8125rem; }
    .line-items-table th { position: sticky; top: 0; background: #f5f5f7; }
    .line-items-table td { padding: 0.75rem 1rem; }
    
    .summary-row { display: flex; justify-content: space-around; padding: 1.25rem; background: #f5f5f7; border-radius: 12px; margin-top: 1.5rem; }
    .summary-item { text-align: center; }
    .summary-value { font-size: 1.5rem; font-weight: 700; color: #1e3a5f; }
    .summary-label { font-size: 0.7rem; color: #86868b; text-transform: uppercase; }
    
    .mapping-form { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; }
    .mapping-form input { flex: 1; background: #f5f5f7; border: 1px solid #d2d2d7; color: #1e3a5f; padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.875rem; font-family: inherit; }
    .mapping-form input:focus { outline: none; border-color: #1e3a5f; background: white; }
    .mapping-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f5f5f7; border-radius: 12px; margin-bottom: 0.5rem; }
    .mapping-arrow { color: #0088c2; font-size: 1.25rem; margin: 0 1rem; }
    
    .activity-item { display: flex; gap: 1rem; padding: 1rem; border-left: 3px solid #d2d2d7; margin-left: 1rem; margin-bottom: 0.5rem; background: white; border-radius: 0 12px 12px 0; }
    .activity-item.success { border-left-color: #34c759; }
    .activity-item.error { border-left-color: #ff3b30; }
    .activity-time { font-size: 0.75rem; color: #86868b; min-width: 140px; }
    .activity-content { flex: 1; }
    .activity-title { font-weight: 500; color: #1e3a5f; }
    .activity-details { font-size: 0.8125rem; color: #6e6e73; margin-top: 0.25rem; }
    
    .toast-container { position: fixed; bottom: 2rem; right: 2rem; z-index: 2000; }
    .toast { background: white; border-radius: 12px; padding: 1rem 1.5rem; margin-top: 0.5rem; min-width: 300px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border-left: 4px solid #1e3a5f; }
    .toast.success { border-left-color: #34c759; }
    .toast.error { border-left-color: #ff3b30; }
    
    .empty-state { text-align: center; padding: 3rem; color: #86868b; }
    .checkbox { width: 18px; height: 18px; accent-color: #0088c2; }
    .error-box { background: rgba(255, 59, 48, 0.08); border: 1px solid rgba(255, 59, 48, 0.2); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; color: #ff3b30; }
  </style>
</head>
<body>
  <header class="header">
    <div class="logo">
      <div class="logo-icon">ME</div>
      <div>
        <div class="logo-text">Spring EDI Integration</div>
        <div class="logo-subtitle">Mark Edwards Apparel</div>
      </div>
    </div>
    <div class="status-indicator">
      <div class="status-dot"></div>
      <span>System Online</span>
    </div>
  </header>
  
  <div class="main-container">
    <nav class="sidebar">
      <div class="nav-title">Orders</div>
      <div class="nav-item active" onclick="showTab('orders', this)">📦 EDI Orders <span class="nav-badge" id="pendingBadge">0</span></div>
      <div class="nav-item" onclick="showTab('mappings', this)">🔗 Customer Mappings</div>
      <div class="nav-title">History</div>
      <div class="nav-item" onclick="showTab('activity', this)">📋 Activity Log</div>
      <div class="nav-item" onclick="showTab('drafts', this)">📁 Replaced Drafts</div>
      <div class="nav-title">Help</div>
      <div class="nav-item" onclick="window.open('/documentation', '_blank')">📖 Documentation</div>
    </nav>
    
    <main class="content">
      <div class="stats-grid">
        <div class="stat-card" onclick="filterByStatus('')" id="cardTotal">
          <div class="stat-label">Total Orders (24h)</div>
          <div class="stat-value" id="statTotal">0</div>
        </div>
        <div class="stat-card" onclick="filterByStatus('in_zoho')" id="cardProcessed">
          <div class="stat-label">Sent to Zoho</div>
          <div class="stat-value success" id="statProcessed">0</div>
        </div>
        <div class="stat-card" onclick="filterByStatus('pending')" id="cardPending">
          <div class="stat-label">Ready to Send</div>
          <div class="stat-value warning" id="statPending">0</div>
        </div>
        <div class="stat-card" onclick="filterByStatus('failed')" id="cardFailed">
          <div class="stat-label">Send Failed</div>
          <div class="stat-value danger" id="statFailed">0</div>
        </div>
      </div>
      
      <div id="tabOrders">
        <div class="filter-bar">
          <span class="filter-label">🔍</span>
          <input type="text" id="searchPO" placeholder="Search PO#..." oninput="applyFilters()">
          <span class="filter-label">Customer:</span>
          <select id="filterCustomer" onchange="applyFilters()"><option value="">All Customers</option></select>
          <span class="filter-label">Status:</span>
          <select id="filterStatus" onchange="applyFilters()">
            <option value="">All Status</option>
            <option value="pending">Ready to Send</option>
            <option value="in_zoho">Sent to Zoho</option>
            <option value="not_synced">Sent (Unlinked)</option>
            <option value="failed">Send Failed</option>
          </select>
          <span class="filter-label">From:</span>
          <input type="date" id="filterDateFrom" onchange="applyFilters()">
          <span class="filter-label">To:</span>
          <input type="date" id="filterDateTo" onchange="applyFilters()">
          <span class="clear-filters" onclick="clearFilters()">Clear Filters</span>
        </div>
        
        <div class="action-bar">
          <button class="btn btn-primary" onclick="fetchSFTP()">📥 Fetch from SFTP</button>
          <button class="btn btn-secondary" onclick="processOrders()">⚡ Process Orders</button>
          <select id="limitSelect"><option value="10">10</option><option value="25">25</option><option value="50">50</option></select>
          <button class="btn btn-success" onclick="processSelected()">✓ Process Selected</button>
          <button class="btn btn-secondary" onclick="retryFailed()">🔄 Retry Failed</button>
          <button class="btn btn-secondary" onclick="loadOrders()">↻ Refresh</button>
          <button class="btn btn-danger" onclick="resetAll()">Reset All</button>
        </div>
        
        <div class="table-container">
          <div class="table-info" id="tableInfo">Showing 0 orders</div>
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" class="checkbox" id="selectAll" onchange="toggleAll()"></th>
                <th>PO #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Zoho</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="ordersTable"><tr><td colspan="9" class="empty-state">Loading...</td></tr></tbody>
          </table>
        </div>
      </div>
      
      <div id="tabMappings" style="display:none;">
        <h2 style="margin-bottom: 1.5rem; color: #1e3a5f;">Customer Mappings</h2>
        <div class="mapping-form">
          <input type="text" id="ediName" placeholder="EDI Customer Name (e.g. Fred Meyer)">
          <input type="text" id="zohoName" placeholder="Zoho Customer Name">
          <button class="btn btn-primary" onclick="addMapping()">Add</button>
        </div>
        <div id="mappingsList"></div>
      </div>
      
      <div id="tabActivity" style="display:none;">
        <h2 style="margin-bottom: 1.5rem; color: #1e3a5f;">Activity Log</h2>
        <div id="activityList"></div>
      </div>
      
      <div id="tabDrafts" style="display:none;">
        <h2 style="margin-bottom: 1.5rem; color: #1e3a5f;">Replaced Drafts Archive</h2>
        <div id="draftsList"><p class="empty-state">No replaced drafts yet.</p></div>
      </div>
    </main>
  </div>
  
  <div class="modal-overlay" id="orderModal">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">Order Details</h2>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body" id="modalBody"></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" id="processBtn" onclick="processCurrentOrder()">Send to Zoho</button>
      </div>
    </div>
  </div>
  
  <div class="toast-container" id="toasts"></div>
  
  <script>
    let orders = [];
    let filteredOrders = [];
    let selectedIds = new Set();
    let currentOrder = null;
    let customers = new Set();
    
    document.addEventListener('DOMContentLoaded', () => { loadOrders(); loadStats(); });
    
    function showTab(tab, el) {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      ['tabOrders','tabMappings','tabActivity','tabDrafts'].forEach(t => document.getElementById(t).style.display = 'none');
      document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.display = 'block';
      if (tab === 'mappings') loadMappings();
      if (tab === 'activity') loadActivity();
      if (tab === 'drafts') loadReplacedDrafts();
    }
    
    async function loadOrders() {
      try {
        const res = await fetch('/orders');
        orders = await res.json();
        customers.clear();
        orders.forEach(o => { if (o.edi_customer_name) customers.add(o.edi_customer_name); });
        populateCustomerFilter();
        applyFilters();
        loadStats();
      } catch (e) { toast('Failed to load orders', 'error'); }
    }
    
    function populateCustomerFilter() {
      const select = document.getElementById('filterCustomer');
      const currentValue = select.value;
      select.innerHTML = '<option value="">All Customers</option>';
      Array.from(customers).sort().forEach(c => { select.innerHTML += '<option value="' + c + '">' + c + '</option>'; });
      select.value = currentValue;
    }
    
    function getOrderSyncStatus(o) {
      if (o.status === 'failed') return 'failed';
      if (o.status === 'pending') return 'pending';
      if (o.status === 'processed' && o.zoho_so_id) return 'in_zoho';
      if (o.status === 'processed' && !o.zoho_so_id) return 'not_synced';
      return 'pending';
    }
    
    function applyFilters() {
      const searchPO = document.getElementById('searchPO').value.toLowerCase();
      const customer = document.getElementById('filterCustomer').value;
      const status = document.getElementById('filterStatus').value;
      const dateFrom = document.getElementById('filterDateFrom').value;
      const dateTo = document.getElementById('filterDateTo').value;
      
      filteredOrders = orders.filter(o => {
        if (searchPO && !(o.edi_order_number || '').toLowerCase().includes(searchPO)) return false;
        if (customer && o.edi_customer_name !== customer) return false;
        if (status) {
          const syncStatus = getOrderSyncStatus(o);
          if (status !== syncStatus) return false;
        }
        if (dateFrom) {
          const orderDate = new Date(o.created_at).toISOString().split('T')[0];
          if (orderDate < dateFrom) return false;
        }
        if (dateTo) {
          const orderDate = new Date(o.created_at).toISOString().split('T')[0];
          if (orderDate > dateTo) return false;
        }
        return true;
      });
      
      renderOrders();
      document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active-filter'));
    }
    
    function clearFilters() {
      document.getElementById('searchPO').value = '';
      document.getElementById('filterCustomer').value = '';
      document.getElementById('filterStatus').value = '';
      document.getElementById('filterDateFrom').value = '';
      document.getElementById('filterDateTo').value = '';
      applyFilters();
    }
    
    function filterByStatus(status) {
      document.getElementById('filterStatus').value = status;
      document.getElementById('searchPO').value = '';
      document.getElementById('filterCustomer').value = '';
      document.getElementById('filterDateFrom').value = '';
      document.getElementById('filterDateTo').value = '';
      applyFilters();
    }
    
    function renderOrders() {
      const tbody = document.getElementById('ordersTable');
      document.getElementById('tableInfo').textContent = 'Showing ' + filteredOrders.length + ' of ' + orders.length + ' orders';
      
      if (!filteredOrders.length) { 
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No orders match your filters.</td></tr>'; 
        return; 
      }
      
      tbody.innerHTML = filteredOrders.map(o => {
        const items = o.parsed_data?.items || [];
        const amt = items.reduce((s,i) => s + (i.quantityOrdered||0)*(i.unitPrice||0), 0);
        const syncStatus = getOrderSyncStatus(o);
        
        let statusBadge, zohoCell;
        if (syncStatus === 'in_zoho') {
          statusBadge = '<span class="status-badge status-in-zoho">✓ Sent to Zoho</span>';
          zohoCell = '<a href="https://books.zoho.com/app/677681121#/salesorders/' + o.zoho_so_id + '" target="_blank" class="zoho-link">View in Zoho ↗</a>';
        } else if (syncStatus === 'not_synced') {
          statusBadge = '<span class="status-badge status-not-synced">⚠️ Sent (Unlinked)</span>';
          zohoCell = '<span class="no-zoho">—</span>';
        } else if (syncStatus === 'failed') {
          statusBadge = '<span class="status-badge status-failed">❌ Send Failed</span>';
          zohoCell = '<span class="no-zoho">—</span>';
        } else {
          statusBadge = '<span class="status-badge status-pending">⏳ Ready to Send</span>';
          zohoCell = '<span class="no-zoho">—</span>';
        }
        
        return '<tr>' +
          '<td><input type="checkbox" class="checkbox" ' + (selectedIds.has(o.id)?'checked':'') + ' onchange="toggleSelect(' + o.id + ')"></td>' +
          '<td><strong>' + (o.edi_order_number||'N/A') + '</strong></td>' +
          '<td>' + (o.edi_customer_name||'Unknown') + '</td>' +
          '<td>' + items.length + ' items</td>' +
          '<td>$' + amt.toLocaleString('en-US',{minimumFractionDigits:2}) + '</td>' +
          '<td>' + zohoCell + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td>' + new Date(o.created_at).toLocaleDateString() + '</td>' +
          '<td><button class="btn btn-secondary" style="padding:0.35rem 0.75rem;font-size:0.8rem" onclick="viewOrder(' + o.id + ')">View</button></td>' +
        '</tr>';
      }).join('');
    }
    
    async function loadStats() {
      try {
        const res = await fetch('/status');
        const d = (await res.json()).last24Hours;
        document.getElementById('statTotal').textContent = d.total||0;
        document.getElementById('statProcessed').textContent = d.processed||0;
        document.getElementById('statPending').textContent = d.pending||0;
        document.getElementById('statFailed').textContent = d.failed||0;
        document.getElementById('pendingBadge').textContent = d.pending||0;
      } catch(e) {}
    }
    
    function toggleSelect(id) { selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id); }
    function toggleAll() { const c = document.getElementById('selectAll').checked; filteredOrders.forEach(o => c ? selectedIds.add(o.id) : selectedIds.delete(o.id)); renderOrders(); }
    
    async function viewOrder(id) {
      try {
        const res = await fetch('/orders/' + id);
        currentOrder = await res.json();
        renderOrderModal();
        document.getElementById('orderModal').classList.add('active');
      } catch(e) { toast('Failed to load order', 'error'); }
    }
    
    function renderOrderModal() {
      const o = currentOrder;
      const p = o.parsed_data || {};
      const items = p.items || [];
      const totalQty = items.reduce((s,i) => s + (i.quantityOrdered||0), 0);
      const totalAmt = items.reduce((s,i) => s + (i.quantityOrdered||0)*(i.unitPrice||0), 0);
      const ship = p.parties?.shipTo || {};
      const syncStatus = getOrderSyncStatus(o);
      
      let zohoSection = '';
      if (syncStatus === 'in_zoho') {
        zohoSection = '<div class="zoho-link-box">' +
          '<div class="icon">✓</div>' +
          '<div>' +
            '<div class="label">SENT TO ZOHO BOOKS</div>' +
            '<div class="value"><a href="https://books.zoho.com/app/677681121#/salesorders/' + o.zoho_so_id + '" target="_blank">View Sales Order in Zoho ↗</a></div>' +
          '</div>' +
        '</div>';
      } else if (syncStatus === 'not_synced') {
        zohoSection = '<div class="warning-box">' +
          '<strong>⚠️ Sent (Unlinked)</strong> - This order was processed but we lost the Zoho reference. Check Zoho Books manually using the PO#.' +
        '</div>';
      }
      
      let statusText, statusClass;
      if (syncStatus === 'in_zoho') { statusText = '✓ Sent to Zoho'; statusClass = 'status-in-zoho'; }
      else if (syncStatus === 'not_synced') { statusText = '⚠️ Sent (Unlinked)'; statusClass = 'status-not-synced'; }
      else if (syncStatus === 'failed') { statusText = '❌ Send Failed'; statusClass = 'status-failed'; }
      else { statusText = '⏳ Ready to Send'; statusClass = 'status-pending'; }
      
      document.getElementById('modalBody').innerHTML = zohoSection +
        '<div class="order-header">' +
          '<div class="order-field"><div class="order-field-label">PO Number</div><div class="order-field-value">' + (p.header?.poNumber||o.edi_order_number||'N/A') + '</div></div>' +
          '<div class="order-field"><div class="order-field-label">Customer</div><div class="order-field-value">' + (o.edi_customer_name||'Unknown') + '</div></div>' +
          '<div class="order-field"><div class="order-field-label">Order Date</div><div class="order-field-value">' + (p.dates?.orderDate||'N/A') + '</div></div>' +
          '<div class="order-field"><div class="order-field-label">Status</div><div class="order-field-value"><span class="status-badge ' + statusClass + '">' + statusText + '</span></div></div>' +
        '</div>' +
        '<div class="order-header">' +
          '<div class="order-field"><div class="order-field-label">Ship To</div><div class="order-field-value" style="font-size:0.85rem">' + ([ship.name,ship.city,ship.state].filter(Boolean).join(', ')||'N/A') + '</div></div>' +
          '<div class="order-field"><div class="order-field-label">Ship Window</div><div class="order-field-value">' + (p.dates?.shipNotBefore||'') + ' to ' + (p.dates?.shipNotAfter||'') + '</div></div>' +
          '<div class="order-field"><div class="order-field-label">Cancel Date</div><div class="order-field-value">' + (p.dates?.cancelDate||'-') + '</div></div>' +
          '<div class="order-field"><div class="order-field-label">Terms</div><div class="order-field-value">' + (p.header?.paymentTerms||'N/A') + '</div></div>' +
        '</div>' +
        (o.error_message ? '<div class="error-box"><strong>Error:</strong> ' + o.error_message + '</div>' : '') +
        '<h3 style="margin:1rem 0;color:#1e3a5f">Line Items (' + items.length + ')</h3>' +
        '<div class="line-items-container">' +
          '<table class="line-items-table">' +
            '<thead><tr><th>Style</th><th>Description</th><th>Color</th><th>Size</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>' +
            '<tbody>' + (items.length ? items.map(function(i) { return '<tr>' +
              '<td>' + (i.productIds?.vendorItemNumber||i.productIds?.buyerItemNumber||'') + '</td>' +
              '<td>' + (i.description||'') + '</td>' +
              '<td>' + (i.color||'') + '</td>' +
              '<td>' + (i.size||'') + '</td>' +
              '<td>' + (i.quantityOrdered||0) + '</td>' +
              '<td>$' + (i.unitPrice||0).toFixed(2) + '</td>' +
              '<td>$' + ((i.quantityOrdered||0)*(i.unitPrice||0)).toFixed(2) + '</td>' +
            '</tr>'; }).join('') : '<tr><td colspan="7" style="text-align:center;color:#86868b;padding:2rem;">No line items parsed</td></tr>') + '</tbody>' +
          '</table>' +
        '</div>' +
        '<div class="summary-row">' +
          '<div class="summary-item"><div class="summary-value">' + items.length + '</div><div class="summary-label">Line Items</div></div>' +
          '<div class="summary-item"><div class="summary-value">' + totalQty.toLocaleString() + '</div><div class="summary-label">Total Units</div></div>' +
          '<div class="summary-item"><div class="summary-value">$' + totalAmt.toLocaleString('en-US',{minimumFractionDigits:2}) + '</div><div class="summary-label">Total Value</div></div>' +
        '</div>';
      
      const btn = document.getElementById('processBtn');
      if (syncStatus === 'in_zoho') {
        btn.disabled = true;
        btn.textContent = 'Already Sent to Zoho';
      } else if (syncStatus === 'not_synced') {
        btn.disabled = true;
        btn.textContent = 'Already Processed';
      } else {
        btn.disabled = false;
        btn.textContent = 'Send to Zoho';
      }
    }
    
    function closeModal() { document.getElementById('orderModal').classList.remove('active'); currentOrder = null; }
    
    async function processCurrentOrder() {
      if (!currentOrder) return;
      try {
        document.getElementById('processBtn').disabled = true;
        document.getElementById('processBtn').textContent = 'Sending...';
        await processOrderDirect(currentOrder.id);
      } catch(e) { toast('Error: ' + e.message, 'error'); }
      finally { const btn = document.getElementById('processBtn'); if (btn) { btn.disabled = false; btn.textContent = 'Send to Zoho'; } }
    }
    
    async function processOrderDirect(orderId) {
      const res = await fetch('/process-selected', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ orderIds: [orderId] }) });
      const data = await res.json();
      if (data.processed > 0) { toast('Order sent to Zoho successfully!', 'success'); closeModal(); loadOrders(); }
      else { toast('Error: ' + (data.error || 'Processing failed'), 'error'); }
    }
    
    async function fetchSFTP() {
      toast('Fetching from SFTP...', 'info');
      try { const res = await fetch('/fetch-sftp', { method: 'POST' }); const data = await res.json(); toast('Fetched ' + (data.filesProcessed||0) + ' files', 'success'); loadOrders(); }
      catch(e) { toast('SFTP fetch failed', 'error'); }
    }
    
    async function processOrders() {
      const limit = document.getElementById('limitSelect').value;
      try { const res = await fetch('/process-limit', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ limit: parseInt(limit) }) }); const data = await res.json(); toast('Sent: ' + data.processed + ', Failed: ' + data.failed, data.failed ? 'error' : 'success'); loadOrders(); }
      catch(e) { toast('Processing failed', 'error'); }
    }
    
    async function processSelected() {
      if (!selectedIds.size) { toast('No orders selected', 'error'); return; }
      try { const res = await fetch('/process-selected', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ orderIds: Array.from(selectedIds) }) }); const data = await res.json(); toast('Sent: ' + data.processed, 'success'); selectedIds.clear(); loadOrders(); }
      catch(e) { toast('Failed', 'error'); }
    }
    
    async function retryFailed() {
      try { const res = await fetch('/retry-failed', { method: 'POST' }); const data = await res.json(); toast('Reset ' + data.count + ' failed orders', 'success'); loadOrders(); }
      catch(e) { toast('Failed', 'error'); }
    }
    
    async function resetAll() {
      if (!confirm('Reset ALL orders to pending?')) return;
      try { await fetch('/reset-to-pending'); toast('All orders reset', 'success'); loadOrders(); }
      catch(e) { toast('Failed', 'error'); }
    }
    
    async function loadMappings() {
      try { const res = await fetch('/customer-mappings'); const mappings = await res.json(); document.getElementById('mappingsList').innerHTML = mappings.length ? mappings.map(function(m) { return '<div class="mapping-item"><span style="flex:1">' + m.edi_customer_name + '</span><span class="mapping-arrow">→</span><span style="flex:1">' + m.zoho_account_name + '</span><button class="btn btn-danger" style="padding:0.25rem 0.75rem;font-size:0.75rem" onclick="deleteMapping(' + m.id + ')">Delete</button></div>'; }).join('') : '<p class="empty-state">No mappings yet.</p>'; }
      catch(e) {}
    }
    
    async function addMapping() {
      const edi = document.getElementById('ediName').value.trim();
      const zoho = document.getElementById('zohoName').value.trim();
      if (!edi || !zoho) { toast('Fill both fields', 'error'); return; }
      try { await fetch('/add-mapping', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ ediCustomerName: edi, zohoAccountName: zoho }) }); document.getElementById('ediName').value = ''; document.getElementById('zohoName').value = ''; toast('Mapping added', 'success'); loadMappings(); }
      catch(e) { toast('Failed', 'error'); }
    }
    
    async function deleteMapping(id) { try { await fetch('/customer-mappings/' + id, { method: 'DELETE' }); loadMappings(); } catch(e) {} }
    
    async function loadActivity() {
      try { const res = await fetch('/processing-logs?limit=50'); const logs = await res.json(); document.getElementById('activityList').innerHTML = logs.length ? logs.map(function(l) { return '<div class="activity-item ' + l.status + '"><div class="activity-time">' + new Date(l.created_at).toLocaleString() + '</div><div class="activity-content"><div class="activity-title">' + (l.action||'Action') + '</div><div class="activity-details">' + (l.details||'') + '</div></div></div>'; }).join('') : '<p class="empty-state">No activity yet.</p>'; }
      catch(e) { document.getElementById('activityList').innerHTML = '<p class="empty-state">No activity yet.</p>'; }
    }
    
    async function loadReplacedDrafts() {
      try { const res = await fetch('/replaced-drafts'); const drafts = await res.json(); document.getElementById('draftsList').innerHTML = drafts.length ? drafts.map(function(d) { return '<div class="mapping-item"><div style="flex:1"><strong>' + d.original_so_number + '</strong><div style="font-size:0.75rem;color:#86868b">Replaced by PO# ' + d.edi_po_number + ' on ' + new Date(d.replaced_at).toLocaleDateString() + '</div></div><button class="btn btn-secondary" style="padding:0.25rem 0.75rem;font-size:0.75rem">Details</button></div>'; }).join('') : '<p class="empty-state">No replaced drafts yet.</p>'; }
      catch(e) {}
    }
    
    function toast(msg, type) { type = type || 'info'; var t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; document.getElementById('toasts').appendChild(t); setTimeout(function() { t.remove(); }, 4000); }
  </script>
</body>
</html>
`;

module.exports = dashboardHTML;
