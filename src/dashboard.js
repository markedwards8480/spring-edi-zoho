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
    .btn-warning { background: #ff9500; color: white; }
    .btn-warning:hover { background: #e68600; }
    .btn-danger { background: white; color: #ff3b30; border: 1px solid #ff3b30; }
    .btn-danger:hover { background: rgba(255, 59, 48, 0.08); }
    .btn-info { background: #0088c2; color: white; }
    .btn-info:hover { background: #006a99; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    select { background: white; border: 1px solid #d2d2d7; color: #1e3a5f; padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.875rem; font-family: inherit; }
    
    .table-container { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .table-info { padding: 0.75rem 1rem; background: #f5f5f7; font-size: 0.8rem; color: #6e6e73; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f7; padding: 1rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.02em; color: #86868b; font-weight: 600; }
    td { padding: 1rem; border-top: 1px solid rgba(0,0,0,0.06); font-size: 0.875rem; }
    tr:hover { background: #f5f5f7; }
    
    .status-badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem; border-radius: 980px; font-size: 0.75rem; font-weight: 500; }
    .status-pending { background: rgba(255, 149, 0, 0.12); color: #ff9500; }
    .status-in-zoho { background: rgba(52, 199, 89, 0.12); color: #34c759; }
    .status-failed { background: rgba(255, 59, 48, 0.12); color: #ff3b30; }
    .status-draft { background: rgba(0, 136, 194, 0.12); color: #0088c2; }
    
    .zoho-link { color: #0088c2; text-decoration: none; font-size: 0.8rem; }
    .zoho-link:hover { text-decoration: underline; }
    .no-zoho { color: #86868b; font-size: 0.8rem; }
    
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; opacity: 0; visibility: hidden; transition: all 0.2s; }
    .modal-overlay.active { opacity: 1; visibility: visible; }
    .modal { background: white; border-radius: 18px; width: 95%; max-width: 1200px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
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
    
    .info-box { background: rgba(0, 136, 194, 0.08); border: 1px solid rgba(0, 136, 194, 0.2); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; }
    .warning-box { background: rgba(255, 149, 0, 0.08); border: 1px solid rgba(255, 149, 0, 0.2); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; color: #ff9500; }
    .error-box { background: rgba(255, 59, 48, 0.08); border: 1px solid rgba(255, 59, 48, 0.2); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; color: #ff3b30; }
    
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
    
    .draft-card { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; }
    .draft-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .draft-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
    .draft-card-title { font-size: 1.1rem; font-weight: 600; color: #1e3a5f; }
    .draft-card-meta { font-size: 0.8rem; color: #86868b; }
    .draft-card-body { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .draft-card-actions { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.06); display: flex; gap: 0.5rem; }
    
    .comparison-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    .comparison-column { background: #f5f5f7; border-radius: 12px; padding: 1.5rem; }
    .comparison-column h3 { margin-bottom: 1rem; color: #1e3a5f; }
    .comparison-column.edi { border: 2px solid #34c759; }
    .comparison-column.draft { border: 2px solid #0088c2; }
    .diff-highlight { background: rgba(255, 149, 0, 0.2); padding: 0.25rem 0.5rem; border-radius: 4px; }
    
    .toast-container { position: fixed; bottom: 2rem; right: 2rem; z-index: 2000; }
    .toast { background: white; border-radius: 12px; padding: 1rem 1.5rem; margin-top: 0.5rem; min-width: 300px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border-left: 4px solid #1e3a5f; }
    .toast.success { border-left-color: #34c759; }
    .toast.error { border-left-color: #ff3b30; }
    
    .empty-state { text-align: center; padding: 3rem; color: #86868b; }
    .checkbox { width: 18px; height: 18px; accent-color: #0088c2; }
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
      <div class="nav-item" onclick="showTab('draftMatch', this)">🔀 Match Drafts</div>
      <div class="nav-item" onclick="showTab('mappings', this)">🔗 Customer Mappings</div>
      <div class="nav-title">History</div>
      <div class="nav-item" onclick="showTab('activity', this)">📋 Activity Log</div>
      <div class="nav-item" onclick="showTab('drafts', this)">📁 Replaced Drafts</div>
      <div class="nav-title">Help</div>
      <div class="nav-item" onclick="window.open('/documentation', '_blank')">📖 Documentation</div>
    </nav>
    
    <main class="content">
      <div class="stats-grid">
        <div class="stat-card" onclick="filterByStatus('')">
          <div class="stat-label">Total Orders</div>
          <div class="stat-value" id="statTotal">0</div>
        </div>
        <div class="stat-card" onclick="filterByStatus('in_zoho')">
          <div class="stat-label">Sent to Zoho</div>
          <div class="stat-value success" id="statProcessed">0</div>
        </div>
        <div class="stat-card" onclick="filterByStatus('pending')">
          <div class="stat-label">Ready to Send</div>
          <div class="stat-value warning" id="statPending">0</div>
        </div>
        <div class="stat-card" onclick="filterByStatus('failed')">
          <div class="stat-label">Failed</div>
          <div class="stat-value danger" id="statFailed">0</div>
        </div>
      </div>
      
      <!-- EDI Orders Tab -->
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
            <option value="failed">Failed</option>
          </select>
          <span class="clear-filters" onclick="clearFilters()">Clear Filters</span>
        </div>
        
        <div class="action-bar">
          <button class="btn btn-primary" onclick="fetchSFTP()">📥 Fetch from SFTP</button>
          <button class="btn btn-info" onclick="syncWithZoho()">🔄 Sync with Zoho</button>
          <button class="btn btn-secondary" onclick="processOrders()">⚡ Process Orders</button>
          <select id="limitSelect"><option value="10">10</option><option value="25">25</option><option value="50">50</option></select>
          <button class="btn btn-success" onclick="processSelected()">✓ Process Selected</button>
          <button class="btn btn-warning" onclick="exportToCSV()">📊 Export</button>
          <button class="btn btn-secondary" onclick="loadOrders()">↻ Refresh</button>
        </div>
        
        <div class="table-container">
          <div class="table-info">
            <span id="tableInfo">Showing 0 orders</span>
          </div>
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
      
      <!-- Draft Matching Tab -->
      <div id="tabDraftMatch" style="display:none;">
        <h2 style="margin-bottom: 1rem; color: #1e3a5f;">Match EDI Orders to Zoho Drafts</h2>
        <p style="color: #86868b; margin-bottom: 1.5rem;">Compare incoming EDI orders with existing draft orders in Zoho Books. Replace drafts with confirmed EDI data.</p>
        
        <div class="action-bar">
          <button class="btn btn-primary" onclick="loadDrafts()">📥 Load Zoho Drafts</button>
          <button class="btn btn-secondary" onclick="autoMatchDrafts()">🔀 Auto-Match</button>
        </div>
        
        <div id="draftsContainer">
          <div class="empty-state">Click "Load Zoho Drafts" to see draft orders available for matching.</div>
        </div>
      </div>
      
      <!-- Customer Mappings Tab -->
      <div id="tabMappings" style="display:none;">
        <h2 style="margin-bottom: 1.5rem; color: #1e3a5f;">Customer Mappings</h2>
        <div class="mapping-form">
          <input type="text" id="ediName" placeholder="EDI Customer Name (e.g. Fred Meyer)">
          <input type="text" id="zohoName" placeholder="Zoho Customer Name">
          <button class="btn btn-primary" onclick="addMapping()">Add Mapping</button>
        </div>
        <div id="mappingsList"></div>
      </div>
      
      <!-- Activity Log Tab -->
      <div id="tabActivity" style="display:none;">
        <h2 style="margin-bottom: 1.5rem; color: #1e3a5f;">Activity Log</h2>
        <div id="activityList"><div class="empty-state">No activity yet.</div></div>
      </div>
      
      <!-- Replaced Drafts Tab -->
      <div id="tabDrafts" style="display:none;">
        <h2 style="margin-bottom: 1.5rem; color: #1e3a5f;">Replaced Drafts Archive</h2>
        <div id="draftsList"><div class="empty-state">No replaced drafts yet.</div></div>
      </div>
    </main>
  </div>
  
  <!-- Order Detail Modal -->
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
  
  <!-- Comparison Modal -->
  <div class="modal-overlay" id="compareModal">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">Compare: EDI Order vs Draft</h2>
        <button class="modal-close" onclick="closeCompareModal()">×</button>
      </div>
      <div class="modal-body" id="compareModalBody"></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeCompareModal()">Cancel</button>
        <button class="btn btn-warning" onclick="createNewOrder()">Create as New Order</button>
        <button class="btn btn-success" onclick="replaceDraft()">Replace Draft with EDI</button>
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
    let zohoDrafts = [];
    let currentComparison = null;
    
    document.addEventListener('DOMContentLoaded', function() { loadOrders(); loadStats(); });
    
    function showTab(tab, el) {
      document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
      el.classList.add('active');
      ['tabOrders','tabDraftMatch','tabMappings','tabActivity','tabDrafts'].forEach(function(t) { 
        var elem = document.getElementById(t);
        if (elem) elem.style.display = 'none'; 
      });
      var targetTab = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
      if (targetTab) targetTab.style.display = 'block';
      
      if (tab === 'mappings') loadMappings();
      if (tab === 'activity') loadActivity();
      if (tab === 'drafts') loadReplacedDrafts();
    }
    
    async function loadOrders() {
      try {
        var res = await fetch('/orders');
        orders = await res.json();
        customers.clear();
        orders.forEach(function(o) { if (o.edi_customer_name) customers.add(o.edi_customer_name); });
        populateCustomerFilter();
        applyFilters();
        updateStats();
      } catch (e) { toast('Failed to load orders', 'error'); }
    }
    
    function populateCustomerFilter() {
      var select = document.getElementById('filterCustomer');
      var currentValue = select.value;
      select.innerHTML = '<option value="">All Customers</option>';
      Array.from(customers).sort().forEach(function(c) { select.innerHTML += '<option value="' + c + '">' + c + '</option>'; });
      select.value = currentValue;
    }
    
    function getOrderSyncStatus(o) {
      if (o.status === 'failed') return 'failed';
      if (o.status === 'pending') return 'pending';
      if (o.status === 'processed') return 'in_zoho';
      return 'pending';
    }
    
    function updateStats() {
      var total = orders.length;
      var processed = orders.filter(function(o) { return o.status === 'processed'; }).length;
      var pending = orders.filter(function(o) { return o.status === 'pending'; }).length;
      var failed = orders.filter(function(o) { return o.status === 'failed'; }).length;
      
      document.getElementById('statTotal').textContent = total;
      document.getElementById('statProcessed').textContent = processed;
      document.getElementById('statPending').textContent = pending;
      document.getElementById('statFailed').textContent = failed;
      document.getElementById('pendingBadge').textContent = pending;
    }
    
    function applyFilters() {
      var searchPO = document.getElementById('searchPO').value.toLowerCase();
      var customer = document.getElementById('filterCustomer').value;
      var status = document.getElementById('filterStatus').value;
      
      filteredOrders = orders.filter(function(o) {
        if (searchPO && !(o.edi_order_number || '').toLowerCase().includes(searchPO)) return false;
        if (customer && o.edi_customer_name !== customer) return false;
        if (status) {
          var syncStatus = getOrderSyncStatus(o);
          if (status !== syncStatus) return false;
        }
        return true;
      });
      
      renderOrders();
    }
    
    function clearFilters() {
      document.getElementById('searchPO').value = '';
      document.getElementById('filterCustomer').value = '';
      document.getElementById('filterStatus').value = '';
      applyFilters();
    }
    
    function filterByStatus(status) {
      document.getElementById('filterStatus').value = status;
      applyFilters();
    }
    
    function renderOrders() {
      var tbody = document.getElementById('ordersTable');
      document.getElementById('tableInfo').textContent = 'Showing ' + filteredOrders.length + ' of ' + orders.length + ' orders';
      
      if (!filteredOrders.length) { 
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No orders match your filters.</td></tr>'; 
        return; 
      }
      
      tbody.innerHTML = filteredOrders.map(function(o) {
        var items = o.parsed_data && o.parsed_data.items ? o.parsed_data.items : [];
        var amt = items.reduce(function(s,i) { return s + (i.quantityOrdered||0)*(i.unitPrice||0); }, 0);
        var syncStatus = getOrderSyncStatus(o);
        
        var statusBadge, zohoCell;
        if (syncStatus === 'in_zoho') {
          statusBadge = '<span class="status-badge status-in-zoho">✓ Sent to Zoho</span>';
          zohoCell = o.zoho_so_id ? '<a href="https://books.zoho.com/app/677681121#/salesorders/' + o.zoho_so_id + '" target="_blank" class="zoho-link">View ↗</a>' : '<span class="no-zoho">—</span>';
        } else if (syncStatus === 'failed') {
          statusBadge = '<span class="status-badge status-failed">❌ Failed</span>';
          zohoCell = '<span class="no-zoho">—</span>';
        } else {
          statusBadge = '<span class="status-badge status-pending">⏳ Ready</span>';
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
    
    // SYNC WITH ZOHO - Find matches and show detailed review
    async function syncWithZoho() {
      toast('Searching Zoho for matches (this may take a minute)...', 'info');
      try {
        var res = await fetch('/sync-with-zoho', { method: 'POST' });
        var data = await res.json();
        if (data.success) {
          if (data.matches && data.matches.length > 0) {
            showSmartMatchReview(data.matches, data.noMatch);
          } else {
            toast('No matches found in Zoho (' + (data.noMatch?.length || 0) + ' EDI orders have no match)', 'warning');
          }
        } else {
          toast('Sync failed: ' + (data.error || 'Unknown error'), 'error');
        }
      } catch(e) {
        toast('Sync failed: ' + e.message, 'error');
      }
    }
    
    let pendingMatches = [];
    
    function showSmartMatchReview(matches, noMatch) {
      pendingMatches = matches;
      
      var html = '<div style="max-height:70vh;overflow-y:auto;">';
      
      // Summary header
      html += '<div class="info-box" style="margin-bottom:1rem;">' +
        '<strong>Found ' + matches.length + ' potential matches</strong><br>' +
        '<span style="color:#86868b;">' + (noMatch ? noMatch.length : 0) + ' EDI orders have no match (will need to create new)</span>' +
        '</div>';
      
      // Match cards
      matches.forEach(function(m, idx) {
        var score = m.matchScore || {};
        var confidence = score.confidence || 'low';
        var pct = score.percentage || 0;
        
        var confidenceColor = confidence === 'high' ? '#34c759' : confidence === 'medium' ? '#ff9500' : '#ff3b30';
        var confidenceLabel = confidence === 'high' ? 'High Confidence' : confidence === 'medium' ? 'Medium Confidence' : 'Low Confidence';
        var borderColor = confidence === 'high' ? '#34c759' : confidence === 'medium' ? '#ff9500' : '#ff3b30';
        
        html += '<div style="background:white;border:1px solid #e0e0e0;border-radius:12px;padding:1.25rem;margin-bottom:1rem;border-left:4px solid ' + borderColor + ';">';
        
        // Header with score and checkbox
        html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;">' +
          '<div style="flex:1;">' +
            '<div style="font-size:1rem;font-weight:600;color:#1e3a5f;">PO# ' + m.poNumber + '</div>' +
            '<div style="font-size:0.85rem;color:#86868b;">' + m.ediCustomer + '</div>' +
          '</div>' +
          '<div style="text-align:center;padding:0 1rem;">' +
            '<div style="font-size:1.75rem;font-weight:700;color:' + confidenceColor + ';">' + pct + '%</div>' +
            '<div style="font-size:0.7rem;color:' + confidenceColor + ';font-weight:500;">' + confidenceLabel + '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:0.5rem;">' +
            '<span style="font-size:0.8rem;color:#86868b;">Include</span>' +
            '<input type="checkbox" class="match-checkbox" data-idx="' + idx + '" ' + (confidence !== 'low' ? 'checked' : '') + ' style="width:22px;height:22px;accent-color:#34c759;">' +
          '</div>' +
        '</div>';
        
        // Match criteria breakdown - color coded boxes
        html += '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">';
        
        // Matches (green)
        if (score.matches && score.matches.length > 0) {
          score.matches.forEach(function(match) {
            html += '<div style="background:#d4edda;border-radius:6px;padding:0.4rem 0.6rem;font-size:0.75rem;">' +
              '<span style="color:#155724;">✅ ' + match.field + '</span>' +
            '</div>';
          });
        }
        
        // Warnings (yellow)
        if (score.warnings && score.warnings.length > 0) {
          score.warnings.forEach(function(warn) {
            html += '<div style="background:#fff3cd;border-radius:6px;padding:0.4rem 0.6rem;font-size:0.75rem;">' +
              '<span style="color:#856404;">⚠️ ' + warn.field + (warn.diff ? ' (' + warn.diff + ')' : '') + '</span>' +
            '</div>';
          });
        }
        
        // Mismatches (red)
        if (score.mismatches && score.mismatches.length > 0) {
          score.mismatches.forEach(function(mis) {
            html += '<div style="background:#f8d7da;border-radius:6px;padding:0.4rem 0.6rem;font-size:0.75rem;">' +
              '<span style="color:#721c24;">❌ ' + mis.field + '</span>' +
            '</div>';
          });
        }
        
        html += '</div>';
        
        // Side by side comparison
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:0.75rem;background:#f8f9fa;border-radius:8px;">' +
          '<div>' +
            '<div style="font-size:0.65rem;color:#86868b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">EDI ORDER</div>' +
            '<div style="font-size:1.1rem;font-weight:600;color:#1e3a5f;">$' + (m.ediTotal || 0).toLocaleString('en-US', {minimumFractionDigits:2}) + '</div>' +
            '<div style="font-size:0.8rem;color:#86868b;">' + (m.ediItemCount || 0) + ' line items</div>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:0.65rem;color:#86868b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">ZOHO ORDER #' + m.zohoSoNumber + '</div>' +
            '<div style="font-size:1.1rem;font-weight:600;color:#1e3a5f;">$' + (m.zohoTotal || 0).toLocaleString('en-US', {minimumFractionDigits:2}) + '</div>' +
            '<div style="font-size:0.8rem;color:#86868b;">' + (m.zohoItemCount || 0) + ' items • <span style="color:' + (m.zohoStatus === 'draft' ? '#0088c2' : '#34c759') + ';">' + (m.zohoStatus || '') + '</span></div>' +
          '</div>' +
        '</div>';
        
        // Detail buttons
        html += '<div style="display:flex;gap:0.5rem;margin-top:0.75rem;">' +
          '<button class="btn btn-secondary" style="font-size:0.75rem;padding:0.35rem 0.7rem;" onclick="viewOrder(' + m.ediOrderId + ')">📄 EDI Details</button>' +
          '<button class="btn btn-secondary" style="font-size:0.75rem;padding:0.35rem 0.7rem;" onclick="window.open(\\'https://books.zoho.com/app/677681121#/salesorders/' + m.zohoSoId + '\\', \\'_blank\\')">🔗 Zoho Order</button>' +
        '</div>';
        
        html += '</div>'; // end card
      });
      
      // No match section
      if (noMatch && noMatch.length > 0) {
        html += '<div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e0e0e0;">' +
          '<div style="font-size:0.9rem;font-weight:600;color:#1e3a5f;margin-bottom:0.75rem;">❓ ' + noMatch.length + ' EDI Orders Without Matches</div>' +
          '<div style="font-size:0.8rem;color:#86868b;margin-bottom:0.5rem;">These will need to be created as new orders in Zoho:</div>';
        noMatch.slice(0, 10).forEach(function(n) {
          html += '<div style="background:#f8f9fa;padding:0.5rem 0.75rem;border-radius:6px;margin-bottom:0.25rem;font-size:0.8rem;">' +
            '<strong>' + n.poNumber + '</strong> - ' + n.ediCustomer + ' - $' + (n.ediTotal || 0).toLocaleString('en-US', {minimumFractionDigits:2}) +
          '</div>';
        });
        if (noMatch.length > 10) {
          html += '<div style="font-size:0.8rem;color:#86868b;margin-top:0.5rem;">... and ' + (noMatch.length - 10) + ' more</div>';
        }
        html += '</div>';
      }
      
      html += '</div>'; // end scrollable container
      
      document.getElementById('modalBody').innerHTML = html;
      document.querySelector('.modal-footer').innerHTML = 
        '<button class="btn btn-secondary" onclick="closeMatchReview()">Cancel</button>' +
        '<button class="btn btn-success" onclick="confirmSelectedMatches()">✓ Confirm Selected Matches</button>';
      document.querySelector('.modal-title').textContent = 'Review Zoho Matches';
      document.getElementById('orderModal').classList.add('active');
    }
    
    function closeMatchReview() {
      document.getElementById('orderModal').classList.remove('active');
      document.querySelector('.modal-footer').innerHTML = 
        '<button class="btn btn-secondary" onclick="closeModal()">Close</button>' +
        '<button class="btn btn-primary" id="processBtn" onclick="processCurrentOrder()">Send to Zoho</button>';
      pendingMatches = [];
    }
    
    async function confirmSelectedMatches() {
      var selectedMatches = [];
      document.querySelectorAll('.match-checkbox:checked').forEach(function(cb) {
        var idx = parseInt(cb.dataset.idx);
        var m = pendingMatches[idx];
        selectedMatches.push({
          ediOrderId: m.ediOrderId,
          zohoSoId: m.zohoSoId,
          zohoSoNumber: m.zohoSoNumber
        });
      });
      
      if (selectedMatches.length === 0) {
        toast('No matches selected', 'error');
        return;
      }
      
      toast('Confirming ' + selectedMatches.length + ' matches...', 'info');
      
      try {
        var res = await fetch('/confirm-matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matches: selectedMatches })
        });
        var data = await res.json();
        if (data.success) {
          toast('Confirmed ' + data.confirmed + ' matches!', 'success');
          closeMatchReview();
          loadOrders();
        } else {
          toast('Error: ' + data.error, 'error');
        }
      } catch(e) {
        toast('Error: ' + e.message, 'error');
      }
    }
    
    // LOAD ZOHO DRAFTS
    async function loadDrafts() {
      toast('Loading Zoho drafts...', 'info');
      try {
        var res = await fetch('/zoho-drafts');
        var data = await res.json();
        if (data.success) {
          zohoDrafts = data.drafts;
          renderDrafts();
          toast('Loaded ' + data.count + ' draft orders', 'success');
        } else {
          toast('Failed to load drafts: ' + data.error, 'error');
        }
      } catch(e) {
        toast('Failed to load drafts', 'error');
      }
    }
    
    function renderDrafts() {
      var container = document.getElementById('draftsContainer');
      if (!zohoDrafts.length) {
        container.innerHTML = '<div class="empty-state">No draft orders found in Zoho Books.</div>';
        return;
      }
      
      container.innerHTML = zohoDrafts.map(function(d) {
        return '<div class="draft-card">' +
          '<div class="draft-card-header">' +
            '<div>' +
              '<div class="draft-card-title">' + d.customer + '</div>' +
              '<div class="draft-card-meta">SO# ' + d.number + (d.reference ? ' | Ref: ' + d.reference : '') + '</div>' +
            '</div>' +
            '<span class="status-badge status-draft">Draft</span>' +
          '</div>' +
          '<div class="draft-card-body">' +
            '<div class="order-field"><div class="order-field-label">Date</div><div class="order-field-value">' + d.date + '</div></div>' +
            '<div class="order-field"><div class="order-field-label">Total</div><div class="order-field-value">$' + (d.total||0).toLocaleString('en-US',{minimumFractionDigits:2}) + '</div></div>' +
            '<div class="order-field"><div class="order-field-label">Reference</div><div class="order-field-value">' + (d.reference||'—') + '</div></div>' +
          '</div>' +
          '<div class="draft-card-actions">' +
            '<button class="btn btn-secondary" onclick="findMatchingEDI(\\'' + d.id + '\\')">🔍 Find Matching EDI</button>' +
            '<a href="https://books.zoho.com/app/677681121#/salesorders/' + d.id + '" target="_blank" class="btn btn-secondary">View in Zoho ↗</a>' +
          '</div>' +
        '</div>';
      }).join('');
    }
    
    function findMatchingEDI(draftId) {
      var draft = zohoDrafts.find(function(d) { return d.id === draftId; });
      if (!draft) return;
      
      // Find pending EDI orders for the same customer
      var matches = orders.filter(function(o) {
        return o.status === 'pending' && 
               o.edi_customer_name && 
               draft.customer && 
               o.edi_customer_name.toLowerCase().includes(draft.customer.split(' ')[0].toLowerCase());
      });
      
      if (matches.length === 0) {
        toast('No matching EDI orders found for ' + draft.customer, 'warning');
        return;
      }
      
      // For now, show the first match in comparison modal
      showComparison(matches[0], draft);
    }
    
    function showComparison(ediOrder, zohoDraft) {
      currentComparison = { edi: ediOrder, draft: zohoDraft };
      
      // Show loading state
      document.getElementById('compareModalBody').innerHTML = '<div style="text-align:center;padding:2rem;"><div class="spinner"></div><p>Loading detailed comparison...</p></div>';
      document.getElementById('compareModal').classList.add('active');
      
      // Fetch detailed comparison from server
      fetch('/compare-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ediOrderId: ediOrder.id, zohoSoId: zohoDraft.id })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          renderDetailedComparison(data.comparison);
        } else {
          // Fallback to basic comparison
          renderBasicComparison(ediOrder, zohoDraft);
        }
      })
      .catch(function(err) {
        console.error('Comparison error:', err);
        renderBasicComparison(ediOrder, zohoDraft);
      });
    }
    
    function renderDetailedComparison(comp) {
      var html = '<div style="max-height:70vh;overflow-y:auto;">';
      
      // Summary banner
      var bannerColor = comp.summary.flaggedForReview > 0 ? '#fff3cd' : '#d4edda';
      var bannerText = comp.summary.flaggedForReview > 0 
        ? '⚠️ ' + comp.summary.flaggedForReview + ' changes need review (EDI qty less than Zoho)'
        : '✓ ' + comp.summary.totalChanges + ' changes to apply';
      
      html += '<div style="background:' + bannerColor + ';padding:0.75rem 1rem;border-radius:8px;margin-bottom:1rem;font-size:0.9rem;">' + bannerText + '</div>';
      
      // Side by side headers
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">';
      
      // EDI Order header
      html += '<div style="background:#e8f5e9;border-radius:8px;padding:1rem;">' +
        '<h4 style="margin:0 0 0.75rem;color:#2e7d32;">📥 EDI Order (Confirmed)</h4>' +
        '<div style="font-size:0.85rem;"><strong>PO#:</strong> ' + (comp.edi.poNumber || 'N/A') + '</div>' +
        '<div style="font-size:0.85rem;"><strong>Customer:</strong> ' + (comp.edi.customer || 'N/A') + '</div>' +
        '<div style="font-size:0.85rem;"><strong>Ship Date:</strong> ' + (comp.edi.shipDate || 'N/A') + '</div>' +
        '<div style="font-size:0.85rem;"><strong>Cancel Date:</strong> ' + (comp.edi.cancelDate || 'N/A') + '</div>' +
        '<div style="font-size:0.85rem;margin-top:0.5rem;"><strong>Items:</strong> ' + comp.edi.items.length + ' lines, ' + comp.edi.totalQty.toLocaleString() + ' units</div>' +
        '<div style="font-size:1rem;font-weight:600;margin-top:0.5rem;">Total: $' + comp.edi.totalAmount.toLocaleString('en-US',{minimumFractionDigits:2}) + '</div>' +
      '</div>';
      
      // Zoho Order header
      html += '<div style="background:#e3f2fd;border-radius:8px;padding:1rem;">' +
        '<h4 style="margin:0 0 0.75rem;color:#1565c0;">📝 Zoho Draft #' + (comp.zoho.number || '') + '</h4>' +
        '<div style="font-size:0.85rem;"><strong>Reference:</strong> ' + (comp.zoho.reference || '(blank)') + '</div>' +
        '<div style="font-size:0.85rem;"><strong>Customer:</strong> ' + (comp.zoho.customer || 'N/A') + '</div>' +
        '<div style="font-size:0.85rem;"><strong>Ship Date:</strong> ' + (comp.zoho.shipDate || 'N/A') + '</div>' +
        '<div style="font-size:0.85rem;"><strong>Status:</strong> <span style="color:#1565c0;">' + (comp.zoho.status || 'draft') + '</span></div>' +
        '<div style="font-size:0.85rem;margin-top:0.5rem;"><strong>Items:</strong> ' + comp.zoho.items.length + ' lines, ' + comp.zoho.totalQty.toLocaleString() + ' units</div>' +
        '<div style="font-size:1rem;font-weight:600;margin-top:0.5rem;">Total: $' + comp.zoho.totalAmount.toLocaleString('en-US',{minimumFractionDigits:2}) + '</div>' +
      '</div>';
      
      html += '</div>';
      
      // Changes section
      if (comp.changes.length > 0) {
        html += '<h4 style="margin:1rem 0 0.75rem;color:#1e3a5f;">Changes to Apply:</h4>';
        html += '<div style="background:#f8f9fa;border-radius:8px;padding:0.75rem;">';
        
        comp.changes.forEach(function(change) {
          var icon, color, bg;
          if (change.flagForReview) {
            icon = '⚠️'; color = '#856404'; bg = '#fff3cd';
          } else if (change.action === 'add' || change.action === 'increase') {
            icon = '➕'; color = '#155724'; bg = '#d4edda';
          } else if (change.action === 'remove' || change.action === 'decrease') {
            icon = '➖'; color = '#721c24'; bg = '#f8d7da';
          } else {
            icon = '✏️'; color = '#004085'; bg = '#cce5ff';
          }
          
          var label = change.style 
            ? change.field + ': ' + change.style 
            : change.field;
          
          html += '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem;background:' + bg + ';border-radius:6px;margin-bottom:0.5rem;">' +
            '<span style="font-size:1.1rem;">' + icon + '</span>' +
            '<div style="flex:1;">' +
              '<div style="font-weight:500;color:' + color + ';">' + label + '</div>' +
              '<div style="font-size:0.8rem;color:#666;">' + change.oldValue + ' → ' + change.newValue + 
                (change.quantityDiff ? ' (' + (change.quantityDiff > 0 ? '+' : '') + change.quantityDiff + ' units)' : '') +
              '</div>' +
              (change.note ? '<div style="font-size:0.75rem;color:#856404;margin-top:0.25rem;">' + change.note + '</div>' : '') +
            '</div>' +
          '</div>';
        });
        
        html += '</div>';
      }
      
      // Line items comparison table
      html += '<h4 style="margin:1.5rem 0 0.75rem;color:#1e3a5f;">Line Item Comparison:</h4>';
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">';
      
      // EDI Items
      html += '<div style="max-height:250px;overflow-y:auto;"><table style="width:100%;font-size:0.75rem;border-collapse:collapse;">' +
        '<thead style="background:#e8f5e9;position:sticky;top:0;"><tr><th style="padding:0.4rem;text-align:left;">Style</th><th style="padding:0.4rem;text-align:left;">Color</th><th style="padding:0.4rem;text-align:right;">Qty</th><th style="padding:0.4rem;text-align:right;">Price</th></tr></thead><tbody>';
      comp.edi.items.forEach(function(item) {
        html += '<tr><td style="padding:0.3rem;border-bottom:1px solid #eee;">' + item.style + '</td>' +
          '<td style="padding:0.3rem;border-bottom:1px solid #eee;">' + (item.color || '—') + '</td>' +
          '<td style="padding:0.3rem;text-align:right;border-bottom:1px solid #eee;">' + item.quantity + '</td>' +
          '<td style="padding:0.3rem;text-align:right;border-bottom:1px solid #eee;">$' + item.price.toFixed(2) + '</td></tr>';
      });
      html += '</tbody></table></div>';
      
      // Zoho Items
      html += '<div style="max-height:250px;overflow-y:auto;"><table style="width:100%;font-size:0.75rem;border-collapse:collapse;">' +
        '<thead style="background:#e3f2fd;position:sticky;top:0;"><tr><th style="padding:0.4rem;text-align:left;">Style/Item</th><th style="padding:0.4rem;text-align:left;">Desc</th><th style="padding:0.4rem;text-align:right;">Qty</th><th style="padding:0.4rem;text-align:right;">Rate</th></tr></thead><tbody>';
      if (comp.zoho.items.length > 0) {
        comp.zoho.items.forEach(function(item) {
          html += '<tr><td style="padding:0.3rem;border-bottom:1px solid #eee;">' + item.style + '</td>' +
            '<td style="padding:0.3rem;border-bottom:1px solid #eee;">' + (item.description || '—').substring(0,20) + '</td>' +
            '<td style="padding:0.3rem;text-align:right;border-bottom:1px solid #eee;">' + item.quantity + '</td>' +
            '<td style="padding:0.3rem;text-align:right;border-bottom:1px solid #eee;">$' + item.price.toFixed(2) + '</td></tr>';
        });
      } else {
        html += '<tr><td colspan="4" style="padding:1rem;text-align:center;color:#86868b;">No line items in Zoho draft</td></tr>';
      }
      html += '</tbody></table></div>';
      
      html += '</div>'; // end grid
      html += '</div>'; // end scrollable
      
      // Store comparison data for update action
      currentComparison.detailed = comp;
      
      document.getElementById('compareModalBody').innerHTML = html;
      
      // Update footer buttons
      var footerHtml = '<button class="btn btn-secondary" onclick="closeCompareModal()">Cancel</button>';
      if (comp.summary.flaggedForReview > 0) {
        footerHtml += '<button class="btn" style="background:#ff9500;color:white;" onclick="updateZohoOrder(true)">⚠️ Update Zoho (Review Flagged)</button>';
      } else {
        footerHtml += '<button class="btn btn-success" onclick="updateZohoOrder(false)">✓ Update Zoho Draft</button>';
      }
      document.querySelector('#compareModal .modal-footer').innerHTML = footerHtml;
    }
    
    function renderBasicComparison(ediOrder, zohoDraft) {
      var items = ediOrder.parsed_data && ediOrder.parsed_data.items ? ediOrder.parsed_data.items : [];
      var ediTotal = items.reduce(function(s,i) { return s + (i.quantityOrdered||0)*(i.unitPrice||0); }, 0);
      
      document.getElementById('compareModalBody').innerHTML = 
        '<div class="comparison-grid">' +
          '<div class="comparison-column edi">' +
            '<h3>📥 EDI Order (Confirmed)</h3>' +
            '<div class="order-field"><div class="order-field-label">PO Number</div><div class="order-field-value">' + ediOrder.edi_order_number + '</div></div>' +
            '<div class="order-field"><div class="order-field-label">Customer</div><div class="order-field-value">' + ediOrder.edi_customer_name + '</div></div>' +
            '<div class="order-field"><div class="order-field-label">Items</div><div class="order-field-value">' + items.length + '</div></div>' +
            '<div class="order-field"><div class="order-field-label">Total</div><div class="order-field-value">$' + ediTotal.toLocaleString('en-US',{minimumFractionDigits:2}) + '</div></div>' +
          '</div>' +
          '<div class="comparison-column draft">' +
            '<h3>📝 Zoho Draft</h3>' +
            '<div class="order-field"><div class="order-field-label">SO Number</div><div class="order-field-value">' + zohoDraft.number + '</div></div>' +
            '<div class="order-field"><div class="order-field-label">Customer</div><div class="order-field-value">' + zohoDraft.customer + '</div></div>' +
            '<div class="order-field"><div class="order-field-label">Reference</div><div class="order-field-value">' + (zohoDraft.reference||'—') + '</div></div>' +
            '<div class="order-field"><div class="order-field-label">Total</div><div class="order-field-value">$' + (zohoDraft.total||0).toLocaleString('en-US',{minimumFractionDigits:2}) + '</div></div>' +
          '</div>' +
        '</div>';
    }
    
    async function updateZohoOrder(hasFlagged) {
      if (!currentComparison || !currentComparison.detailed) {
        toast('No comparison data available', 'error');
        return;
      }
      
      var comp = currentComparison.detailed;
      
      if (hasFlagged) {
        if (!confirm('Some changes are flagged for review (EDI quantities less than Zoho). Are you sure you want to proceed?')) {
          return;
        }
      }
      
      toast('Updating Zoho order...', 'info');
      
      try {
        var res = await fetch('/update-zoho-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ediOrderId: comp.edi.id,
            zohoSoId: comp.zoho.id,
            changes: comp.changes,
            applyAll: true
          })
        });
        
        var data = await res.json();
        
        if (data.success) {
          toast('Zoho order ' + data.zohoSoNumber + ' updated successfully! ' + data.appliedChanges + ' changes applied.', 'success');
          closeCompareModal();
          loadOrders();
          loadZohoDrafts();
        } else {
          toast('Update failed: ' + (data.error || 'Unknown error'), 'error');
        }
      } catch(e) {
        toast('Update failed: ' + e.message, 'error');
      }
    }
    
    function closeCompareModal() {
      document.getElementById('compareModal').classList.remove('active');
      currentComparison = null;
    }
    
    async function replaceDraft() {
      if (!currentComparison) return;
      // Use the new updateZohoOrder function
      updateZohoOrder(false);
    }
    
    function createNewOrder() {
      if (!currentComparison) return;
      // Process the EDI order as a new order
      processOrderDirect(currentComparison.edi.id);
      closeCompareModal();
    }
    
    function autoMatchDrafts() {
      toast('Auto-matching coming soon!', 'info');
    }
    
    // Activity Log - Show order changes
    async function loadActivityLog() {
      var container = document.getElementById('activityList');
      container.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="spinner"></div><p>Loading activity...</p></div>';
      
      try {
        var res = await fetch('/order-changes');
        var data = await res.json();
        
        if (data.success && data.changes.length > 0) {
          var html = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.85rem;">' +
            '<thead style="background:#f5f5f7;"><tr>' +
            '<th style="padding:0.75rem;text-align:left;">Date/Time</th>' +
            '<th style="padding:0.75rem;text-align:left;">Zoho SO#</th>' +
            '<th style="padding:0.75rem;text-align:left;">Change Type</th>' +
            '<th style="padding:0.75rem;text-align:left;">Field</th>' +
            '<th style="padding:0.75rem;text-align:left;">Style</th>' +
            '<th style="padding:0.75rem;text-align:left;">Old Value</th>' +
            '<th style="padding:0.75rem;text-align:left;">New Value</th>' +
            '<th style="padding:0.75rem;text-align:center;">Review</th>' +
            '</tr></thead><tbody>';
          
          data.changes.forEach(function(c) {
            var typeColor = c.change_type === 'increase' || c.change_type === 'add' ? '#34c759' 
              : c.change_type === 'decrease' || c.change_type === 'remove' ? '#ff3b30' 
              : '#0088c2';
            var reviewBadge = c.flagged_for_review 
              ? '<span style="background:#fff3cd;color:#856404;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;">⚠️ Review</span>' 
              : '';
            
            html += '<tr style="border-bottom:1px solid #eee;">' +
              '<td style="padding:0.5rem 0.75rem;">' + new Date(c.created_at).toLocaleString() + '</td>' +
              '<td style="padding:0.5rem 0.75rem;"><a href="https://books.zoho.com/app/677681121#/salesorders/' + c.zoho_so_id + '" target="_blank">' + (c.zoho_so_number || c.zoho_so_id) + '</a></td>' +
              '<td style="padding:0.5rem 0.75rem;color:' + typeColor + ';font-weight:500;">' + (c.change_type || '') + '</td>' +
              '<td style="padding:0.5rem 0.75rem;">' + (c.field_name || '') + '</td>' +
              '<td style="padding:0.5rem 0.75rem;">' + (c.style || '—') + '</td>' +
              '<td style="padding:0.5rem 0.75rem;">' + (c.old_value || '—') + '</td>' +
              '<td style="padding:0.5rem 0.75rem;">' + (c.new_value || '—') + '</td>' +
              '<td style="padding:0.5rem 0.75rem;text-align:center;">' + reviewBadge + '</td>' +
            '</tr>';
            
            if (c.notes) {
              html += '<tr style="background:#f8f9fa;"><td colspan="8" style="padding:0.35rem 0.75rem 0.35rem 2rem;font-size:0.8rem;color:#6e6e73;">📝 ' + c.notes + '</td></tr>';
            }
          });
          
          html += '</tbody></table></div>';
          container.innerHTML = html;
        } else {
          container.innerHTML = '<div class="empty-state">No activity recorded yet. Changes will appear here when you update Zoho orders.</div>';
        }
      } catch(e) {
        container.innerHTML = '<div class="empty-state" style="color:#ff3b30;">Error loading activity: ' + e.message + '</div>';
      }
    }
    
    function toggleSelect(id) { selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id); }
    function toggleAll() { var c = document.getElementById('selectAll').checked; filteredOrders.forEach(function(o) { c ? selectedIds.add(o.id) : selectedIds.delete(o.id); }); renderOrders(); }
    
    async function viewOrder(id) {
      try {
        var res = await fetch('/orders/' + id);
        currentOrder = await res.json();
        renderOrderModal();
        document.getElementById('orderModal').classList.add('active');
      } catch(e) { toast('Failed to load order', 'error'); }
    }
    
    function renderOrderModal() {
      var o = currentOrder;
      var p = o.parsed_data || {};
      var items = p.items || [];
      var totalQty = items.reduce(function(s,i) { return s + (i.quantityOrdered||0); }, 0);
      var totalAmt = items.reduce(function(s,i) { return s + (i.quantityOrdered||0)*(i.unitPrice||0); }, 0);
      var ship = p.parties && p.parties.shipTo ? p.parties.shipTo : {};
      var syncStatus = getOrderSyncStatus(o);
      
      var zohoSection = '';
      if (syncStatus === 'in_zoho' && o.zoho_so_id) {
        zohoSection = '<div class="zoho-link-box">' +
          '<div class="icon">✓</div>' +
          '<div>' +
            '<div class="label">SENT TO ZOHO BOOKS</div>' +
            '<div class="value"><a href="https://books.zoho.com/app/677681121#/salesorders/' + o.zoho_so_id + '" target="_blank">View Sales Order ' + (o.zoho_so_number||'') + ' ↗</a></div>' +
          '</div>' +
        '</div>';
      }
      
      var poNumber = (p.header && p.header.poNumber) ? p.header.poNumber : (o.edi_order_number || 'N/A');
      var orderDate = (p.dates && p.dates.orderDate) ? p.dates.orderDate : 'N/A';
      var shipNotBefore = (p.dates && p.dates.shipNotBefore) ? p.dates.shipNotBefore : '';
      var shipNotAfter = (p.dates && p.dates.shipNotAfter) ? p.dates.shipNotAfter : '';
      var shipToInfo = [ship.name, ship.city, ship.state].filter(Boolean).join(', ') || 'N/A';
      
      document.getElementById('modalBody').innerHTML = zohoSection +
        '<div class="order-header">' +
          '<div class="order-field"><div class="order-field-label">PO Number</div><div class="order-field-value">' + poNumber + '</div></div>' +
          '<div class="order-field"><div class="order-field-label">Customer</div><div class="order-field-value">' + (o.edi_customer_name||'Unknown') + '</div></div>' +
          '<div class="order-field"><div class="order-field-label">Order Date</div><div class="order-field-value">' + orderDate + '</div></div>' +
          '<div class="order-field"><div class="order-field-label">Status</div><div class="order-field-value"><span class="status-badge status-' + (syncStatus === 'in_zoho' ? 'in-zoho' : syncStatus) + '">' + (syncStatus === 'in_zoho' ? '✓ In Zoho' : syncStatus === 'failed' ? '❌ Failed' : '⏳ Ready') + '</span></div></div>' +
        '</div>' +
        '<div class="order-header">' +
          '<div class="order-field"><div class="order-field-label">Ship To</div><div class="order-field-value" style="font-size:0.85rem">' + shipToInfo + '</div></div>' +
          '<div class="order-field"><div class="order-field-label">Ship Window</div><div class="order-field-value">' + shipNotBefore + ' to ' + shipNotAfter + '</div></div>' +
          '<div class="order-field" style="grid-column: span 2"><div class="order-field-label">Line Items</div><div class="order-field-value">' + items.length + ' items, ' + totalQty.toLocaleString() + ' units</div></div>' +
        '</div>' +
        (o.error_message ? '<div class="error-box"><strong>Error:</strong> ' + o.error_message + '</div>' : '') +
        '<h3 style="margin:1rem 0;color:#1e3a5f">Line Items</h3>' +
        '<div class="line-items-container">' +
          '<table class="line-items-table">' +
            '<thead><tr><th>Style</th><th>Description</th><th>Color</th><th>Size</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>' +
            '<tbody>' + (items.length ? items.map(function(i) { 
              var style = (i.productIds && (i.productIds.vendorItemNumber || i.productIds.buyerItemNumber)) || i.sku || '';
              return '<tr>' +
                '<td>' + style + '</td>' +
                '<td>' + (i.description||'') + '</td>' +
                '<td>' + (i.color||'') + '</td>' +
                '<td>' + (i.size||'') + '</td>' +
                '<td>' + (i.quantityOrdered||0) + '</td>' +
                '<td>$' + (i.unitPrice||0).toFixed(2) + '</td>' +
                '<td>$' + ((i.quantityOrdered||0)*(i.unitPrice||0)).toFixed(2) + '</td>' +
              '</tr>'; 
            }).join('') : '<tr><td colspan="7" class="empty-state">No line items</td></tr>') + '</tbody>' +
          '</table>' +
        '</div>' +
        '<div class="summary-row">' +
          '<div class="summary-item"><div class="summary-value">' + items.length + '</div><div class="summary-label">Line Items</div></div>' +
          '<div class="summary-item"><div class="summary-value">' + totalQty.toLocaleString() + '</div><div class="summary-label">Total Units</div></div>' +
          '<div class="summary-item"><div class="summary-value">$' + totalAmt.toLocaleString('en-US',{minimumFractionDigits:2}) + '</div><div class="summary-label">Total Value</div></div>' +
        '</div>';
      
      var btn = document.getElementById('processBtn');
      btn.disabled = syncStatus === 'in_zoho';
      btn.textContent = syncStatus === 'in_zoho' ? 'Already in Zoho' : 'Send to Zoho';
    }
    
    function closeModal() { document.getElementById('orderModal').classList.remove('active'); currentOrder = null; }
    
    async function processCurrentOrder() {
      if (!currentOrder) return;
      document.getElementById('processBtn').disabled = true;
      document.getElementById('processBtn').textContent = 'Sending...';
      await processOrderDirect(currentOrder.id);
      document.getElementById('processBtn').disabled = false;
      document.getElementById('processBtn').textContent = 'Send to Zoho';
    }
    
    async function processOrderDirect(orderId) {
      try {
        var res = await fetch('/process-selected', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ orderIds: [orderId] }) });
        var data = await res.json();
        if (data.processed > 0) { toast('Order sent to Zoho!', 'success'); closeModal(); loadOrders(); }
        else { toast('Error: ' + (data.error || 'Failed'), 'error'); }
      } catch(e) { toast('Error: ' + e.message, 'error'); }
    }
    
    async function fetchSFTP() {
      toast('Fetching from SFTP...', 'info');
      try { var res = await fetch('/fetch-sftp', { method: 'POST' }); var data = await res.json(); toast('Fetched ' + (data.filesProcessed||0) + ' files', 'success'); loadOrders(); }
      catch(e) { toast('SFTP fetch failed', 'error'); }
    }
    
    async function processOrders() {
      var limit = document.getElementById('limitSelect').value;
      try { var res = await fetch('/process-limit', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ limit: parseInt(limit) }) }); var data = await res.json(); toast('Processed: ' + data.processed + ', Failed: ' + data.failed, data.failed ? 'error' : 'success'); loadOrders(); }
      catch(e) { toast('Processing failed', 'error'); }
    }
    
    async function processSelected() {
      if (!selectedIds.size) { toast('No orders selected', 'error'); return; }
      try { var res = await fetch('/process-selected', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ orderIds: Array.from(selectedIds) }) }); var data = await res.json(); toast('Processed: ' + data.processed, 'success'); selectedIds.clear(); loadOrders(); }
      catch(e) { toast('Failed', 'error'); }
    }
    
    function exportToCSV() {
      var exportOrders = orders.filter(function(o) { return o.status === 'processed'; });
      if (!exportOrders.length) { exportOrders = orders; }
      
      var headers = ['PO Number', 'Customer', 'Zoho SO ID', 'Zoho SO Number', 'Status', 'Items', 'Amount', 'Date'];
      var rows = [headers.join(',')];
      
      exportOrders.forEach(function(o) {
        var items = o.parsed_data && o.parsed_data.items ? o.parsed_data.items : [];
        var amt = items.reduce(function(s,i) { return s + (i.quantityOrdered||0)*(i.unitPrice||0); }, 0);
        rows.push([
          '"' + (o.edi_order_number || '') + '"',
          '"' + (o.edi_customer_name || '') + '"',
          '"' + (o.zoho_so_id || '') + '"',
          '"' + (o.zoho_so_number || '') + '"',
          '"' + o.status + '"',
          items.length,
          '"$' + amt.toFixed(2) + '"',
          '"' + new Date(o.created_at).toLocaleDateString() + '"'
        ].join(','));
      });
      
      var blob = new Blob([rows.join('\\n')], { type: 'text/csv' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'edi-orders-' + new Date().toISOString().split('T')[0] + '.csv';
      link.click();
      toast('Exported ' + exportOrders.length + ' orders', 'success');
    }
    
    async function loadMappings() {
      try { var res = await fetch('/customer-mappings'); var mappings = await res.json(); document.getElementById('mappingsList').innerHTML = mappings.length ? mappings.map(function(m) { return '<div class="mapping-item"><span style="flex:1">' + m.edi_customer_name + '</span><span class="mapping-arrow">→</span><span style="flex:1">' + m.zoho_account_name + '</span><button class="btn btn-danger" style="padding:0.25rem 0.75rem;font-size:0.75rem" onclick="deleteMapping(' + m.id + ')">Delete</button></div>'; }).join('') : '<div class="empty-state">No mappings yet.</div>'; }
      catch(e) { document.getElementById('mappingsList').innerHTML = '<div class="empty-state">No mappings yet.</div>'; }
    }
    
    async function addMapping() {
      var edi = document.getElementById('ediName').value.trim();
      var zoho = document.getElementById('zohoName').value.trim();
      if (!edi || !zoho) { toast('Fill both fields', 'error'); return; }
      try { await fetch('/add-mapping', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ ediCustomerName: edi, zohoAccountName: zoho }) }); document.getElementById('ediName').value = ''; document.getElementById('zohoName').value = ''; toast('Mapping added', 'success'); loadMappings(); }
      catch(e) { toast('Failed', 'error'); }
    }
    
    async function deleteMapping(id) { try { await fetch('/customer-mappings/' + id, { method: 'DELETE' }); loadMappings(); } catch(e) {} }
    
    async function loadActivity() {
      // Load both processing logs and order changes
      var container = document.getElementById('activityList');
      
      try {
        // Try new order-changes endpoint first
        var res = await fetch('/order-changes');
        var data = await res.json();
        
        if (data.success && data.changes && data.changes.length > 0) {
          var html = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.85rem;">' +
            '<thead style="background:#f5f5f7;position:sticky;top:0;"><tr>' +
            '<th style="padding:0.75rem;text-align:left;">Date/Time</th>' +
            '<th style="padding:0.75rem;text-align:left;">Zoho SO#</th>' +
            '<th style="padding:0.75rem;text-align:left;">Change</th>' +
            '<th style="padding:0.75rem;text-align:left;">Field/Style</th>' +
            '<th style="padding:0.75rem;text-align:left;">Old → New</th>' +
            '<th style="padding:0.75rem;text-align:center;">Flag</th>' +
            '</tr></thead><tbody>';
          
          data.changes.forEach(function(c) {
            var typeIcon = c.change_type === 'increase' || c.change_type === 'add' ? '➕' 
              : c.change_type === 'decrease' || c.change_type === 'remove' ? '➖' 
              : '✏️';
            var typeColor = c.change_type === 'increase' || c.change_type === 'add' ? '#34c759' 
              : c.change_type === 'decrease' || c.change_type === 'remove' ? '#ff3b30' 
              : '#0088c2';
            var flagBadge = c.flagged_for_review 
              ? '<span style="background:#fff3cd;color:#856404;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.7rem;">⚠️</span>' 
              : '';
            
            html += '<tr style="border-bottom:1px solid #eee;">' +
              '<td style="padding:0.5rem 0.75rem;font-size:0.8rem;">' + new Date(c.created_at).toLocaleString() + '</td>' +
              '<td style="padding:0.5rem 0.75rem;"><a href="https://books.zoho.com/app/677681121#/salesorders/' + c.zoho_so_id + '" target="_blank" style="color:#0088c2;">' + (c.zoho_so_number || '—') + '</a></td>' +
              '<td style="padding:0.5rem 0.75rem;"><span style="color:' + typeColor + ';">' + typeIcon + ' ' + (c.change_type || '') + '</span></td>' +
              '<td style="padding:0.5rem 0.75rem;">' + (c.style || c.field_name || '—') + '</td>' +
              '<td style="padding:0.5rem 0.75rem;">' + (c.old_value || '—') + ' → ' + (c.new_value || '—') + (c.quantity_diff ? ' (' + (c.quantity_diff > 0 ? '+' : '') + c.quantity_diff + ')' : '') + '</td>' +
              '<td style="padding:0.5rem 0.75rem;text-align:center;">' + flagBadge + '</td>' +
            '</tr>';
          });
          
          html += '</tbody></table></div>';
          container.innerHTML = html;
        } else {
          // Fallback to old processing-logs
          var res2 = await fetch('/processing-logs');
          var logs = await res2.json();
          container.innerHTML = logs.length ? logs.map(function(l) { 
            return '<div class="mapping-item"><span style="flex:2">' + (l.action||'Action') + '</span><span style="flex:1">' + (l.customer_name||'') + '</span><span style="flex:1;color:#86868b">' + new Date(l.created_at).toLocaleString() + '</span></div>'; 
          }).join('') : '<div class="empty-state">No activity yet. Changes will appear here when you update Zoho orders.</div>';
        }
      } catch(e) {
        container.innerHTML = '<div class="empty-state">No activity yet.</div>';
      }
    }
    
    async function loadReplacedDrafts() {
      try { var res = await fetch('/replaced-drafts'); var drafts = await res.json(); document.getElementById('draftsList').innerHTML = drafts.length ? drafts.map(function(d) { return '<div class="mapping-item"><span>' + d.original_so_number + '</span><span style="color:#86868b">→ PO# ' + d.edi_po_number + '</span><span style="color:#86868b">' + new Date(d.replaced_at).toLocaleDateString() + '</span></div>'; }).join('') : '<div class="empty-state">No replaced drafts yet.</div>'; }
      catch(e) { document.getElementById('draftsList').innerHTML = '<div class="empty-state">No replaced drafts yet.</div>'; }
    }
    
    async function loadStats() {
      try { var res = await fetch('/status'); var d = (await res.json()).last24Hours; } catch(e) {}
    }
    
    function toast(msg, type) { type = type || 'info'; var t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; document.getElementById('toasts').appendChild(t); setTimeout(function() { t.remove(); }, 4000); }
  </script>
</body>
</html>
`;

module.exports = dashboardHTML;
