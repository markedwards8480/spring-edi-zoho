// Dashboard with Matching System - Mark Edwards Apparel
// Light theme with Review Matches and Side-by-Side Comparison

const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spring EDI Integration | Mark Edwards Apparel</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f7; color: #1e3a5f; min-height: 100vh; }
    
    /* Header */
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a7f 100%); color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
    .logo { display: flex; align-items: center; gap: 1rem; }
    .logo-icon { width: 40px; height: 40px; background: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #1e3a5f; font-size: 0.875rem; }
    .logo-text { font-size: 1.25rem; font-weight: 600; }
    .logo-sub { font-size: 0.75rem; opacity: 0.8; }
    .status-indicator { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; opacity: 0.9; }
    .status-dot { width: 8px; height: 8px; background: #34c759; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    
    /* Layout */
    .main-container { display: flex; min-height: calc(100vh - 70px); }
    .sidebar { width: 220px; background: white; border-right: 1px solid rgba(0,0,0,0.06); padding: 1.5rem 0; }
    .nav-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; padding: 0 1.5rem; margin-bottom: 0.75rem; margin-top: 1.5rem; }
    .nav-title:first-child { margin-top: 0; }
    .nav-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.5rem; color: #6e6e73; cursor: pointer; transition: all 0.15s; border-left: 3px solid transparent; font-size: 0.875rem; }
    .nav-item:hover { background: #f5f5f7; color: #1e3a5f; }
    .nav-item.active { background: rgba(0,136,194,0.08); color: #0088c2; border-left-color: #0088c2; }
    .nav-badge { margin-left: auto; background: #ff9500; color: white; padding: 0.15rem 0.5rem; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
    
    .content { flex: 1; padding: 2rem; overflow-y: auto; }
    
    /* Stats */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .stat-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; margin-bottom: 0.5rem; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #1e3a5f; }
    .stat-card.success .stat-value { color: #34c759; }
    .stat-card.warning .stat-value { color: #ff9500; }
    .stat-card.danger .stat-value { color: #ff3b30; }
    
    /* Buttons */
    .btn { padding: 0.5rem 1rem; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: none; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 0.5rem; }
    .btn-primary { background: #1e3a5f; color: white; }
    .btn-primary:hover { background: #2d5a7f; }
    .btn-secondary { background: white; color: #1e3a5f; border: 1px solid #d2d2d7; }
    .btn-secondary:hover { background: #f5f5f7; }
    .btn-success { background: #34c759; color: white; }
    .btn-success:hover { background: #2db54d; }
    .btn-warning { background: #ff9500; color: white; }
    .btn-lg { padding: 0.75rem 1.5rem; font-size: 1rem; }
    
    /* Table */
    .table-container { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden; }
    .orders-table { width: 100%; border-collapse: collapse; }
    .orders-table th { text-align: left; padding: 1rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; border-bottom: 1px solid rgba(0,0,0,0.06); background: #f5f5f7; }
    .orders-table td { padding: 1rem; border-bottom: 1px solid rgba(0,0,0,0.06); font-size: 0.875rem; }
    .orders-table tr:hover { background: rgba(0,136,194,0.04); }
    
    .status-badge { padding: 0.25rem 0.75rem; border-radius: 980px; font-size: 0.75rem; font-weight: 500; }
    .status-pending { background: rgba(255,149,0,0.12); color: #ff9500; }
    .status-processed { background: rgba(52,199,89,0.12); color: #34c759; }
    .status-matched { background: rgba(0,136,194,0.12); color: #0088c2; }
    .status-failed { background: rgba(255,59,48,0.12); color: #ff3b30; }
    
    .checkbox { width: 18px; height: 18px; accent-color: #0088c2; cursor: pointer; }
    
    /* Modal */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: white; border-radius: 18px; max-width: 95vw; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; background: #f5f5f7; }
    .modal-header h2 { font-size: 1.25rem; font-weight: 600; color: #1e3a5f; }
    .modal-close { background: #e5e5e5; border: none; color: #86868b; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 1.25rem; }
    .modal-close:hover { background: #d2d2d7; color: #1e3a5f; }
    .modal-body { flex: 1; overflow-y: auto; padding: 1.5rem; }
    .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; background: #f5f5f7; }
    
    /* Match Review Styles */
    .match-summary { background: #e8f5e9; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; }
    .match-summary h3 { margin: 0 0 0.5rem 0; color: #1e3a5f; }
    .match-summary p { margin: 0; color: #6e6e73; }
    
    .match-card { background: white; border: 1px solid #e5e5e5; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; }
    .match-card:hover { border-color: #0088c2; }
    .match-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
    .match-po { font-size: 1.125rem; font-weight: 600; color: #1e3a5f; }
    .match-customer { font-size: 0.875rem; color: #86868b; }
    
    .confidence-badge { padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; font-size: 1rem; }
    .confidence-high { background: #e8f5e9; color: #2e7d32; }
    .confidence-medium { background: #fff3e0; color: #f57c00; }
    .confidence-low { background: #ffebee; color: #c62828; }
    
    .match-criteria { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .criteria-badge { padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.75rem; font-weight: 500; }
    .criteria-matched { background: #e8f5e9; color: #2e7d32; }
    .criteria-unmatched { background: #f5f5f7; color: #86868b; }
    
    .match-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .match-side { padding: 1rem; border-radius: 8px; }
    .match-side.edi { background: #e3f2fd; }
    .match-side.zoho { background: #e8f5e9; }
    .match-side-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; margin-bottom: 0.5rem; }
    .match-side-amount { font-size: 1.5rem; font-weight: 700; color: #1e3a5f; }
    .match-side-detail { font-size: 0.8125rem; color: #6e6e73; margin-top: 0.25rem; }
    
    .match-actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
    
    /* Side by side comparison modal */
    .comparison-modal { width: 1200px; }
    .comparison-header { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 1.5rem; }
    .comparison-side { padding: 1.25rem; border-radius: 12px; }
    .comparison-side.edi { background: linear-gradient(135deg, #e3f2fd, #bbdefb); }
    .comparison-side.zoho { background: linear-gradient(135deg, #e8f5e9, #c8e6c9); }
    .comparison-side h3 { margin: 0 0 1rem 0; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .comparison-side h3 .icon { font-size: 1.25rem; }
    .comparison-field { margin-bottom: 0.75rem; }
    .comparison-field-label { font-size: 0.7rem; color: #6e6e73; text-transform: uppercase; }
    .comparison-field-value { font-size: 0.9375rem; font-weight: 500; color: #1e3a5f; }
    .comparison-total { font-size: 1.5rem; font-weight: 700; color: #1e3a5f; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.1); }
    
    .changes-summary { background: #fff3e0; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; }
    .changes-summary.no-changes { background: #e8f5e9; }
    .changes-icon { font-size: 1.5rem; }
    
    .line-comparison-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    .line-comparison-table th { padding: 0.75rem; text-align: left; background: #f5f5f7; font-size: 0.7rem; text-transform: uppercase; color: #86868b; }
    .line-comparison-table td { padding: 0.75rem; border-bottom: 1px solid #f0f0f0; }
    .line-comparison-table .edi-col { background: rgba(227, 242, 253, 0.3); }
    .line-comparison-table .zoho-col { background: rgba(232, 245, 233, 0.3); }
    .line-comparison-table .divider { width: 1px; background: #e5e5e5; }
    
    /* Toolbar */
    .toolbar { display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: center; flex-wrap: wrap; }
    .search-box { background: white; border: 1px solid #d2d2d7; border-radius: 8px; padding: 0.5rem 0.75rem; color: #1e3a5f; width: 250px; font-size: 0.875rem; }
    .filter-select { background: white; border: 1px solid #d2d2d7; border-radius: 8px; padding: 0.5rem 0.75rem; color: #1e3a5f; font-size: 0.875rem; }
    
    .toast { position: fixed; bottom: 2rem; right: 2rem; background: #1e3a5f; color: white; padding: 1rem 1.5rem; border-radius: 12px; display: none; z-index: 2000; }
    .toast.show { display: block; }
    
    .empty-state { text-align: center; padding: 3rem; color: #86868b; }
    
    .include-checkbox { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #6e6e73; }
    
    @media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 768px) { .sidebar { display: none; } .stats-grid { grid-template-columns: 1fr; } }
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
      <div class="nav-title">Workflow</div>
      <div class="nav-item active" onclick="showTab('orders', this)">
        📥 EDI Orders <span class="nav-badge" id="pendingBadge">0</span>
      </div>
      <div class="nav-item" onclick="showTab('review', this)">
        🔍 Review Matches
      </div>
      <div class="nav-item" onclick="showTab('sent', this)">
        ✅ Sent to Zoho
      </div>
      <div class="nav-title">Settings</div>
      <div class="nav-item" onclick="showTab('mappings', this)">🔗 Customer Mappings</div>
      <div class="nav-title">History</div>
      <div class="nav-item" onclick="showTab('activity', this)">📊 Activity Log</div>
    </div>
    
    <div class="content">
      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">EDI Orders</div>
          <div class="stat-value" id="statTotal">0</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">Ready to Match</div>
          <div class="stat-value" id="statPending">0</div>
        </div>
        <div class="stat-card" style="border-left: 4px solid #0088c2;">
          <div class="stat-label">Matched</div>
          <div class="stat-value" id="statMatched">0</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">Sent to Zoho</div>
          <div class="stat-value" id="statProcessed">0</div>
        </div>
      </div>
      
      <!-- Tab: EDI Orders -->
      <div id="tabOrders">
        <div class="toolbar">
          <input type="text" class="search-box" placeholder="Search PO#..." id="searchBox" onkeyup="filterOrders()">
          <select class="filter-select" id="customerFilter" onchange="filterOrders()">
            <option value="">All Customers</option>
          </select>
          <select class="filter-select" id="statusFilter" onchange="filterOrders()">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="matched">Matched</option>
            <option value="processed">Sent to Zoho</option>
          </select>
          <div style="flex:1"></div>
          <button class="btn btn-primary" onclick="fetchFromSftp()">📥 Fetch from SFTP</button>
          <button class="btn btn-success btn-lg" onclick="findMatches()">🔍 Find Matches</button>
        </div>
        
        <div class="table-container">
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
        <div style="margin-top:1rem;color:#86868b;font-size:0.8125rem;" id="orderCount"></div>
      </div>
      
      <!-- Tab: Review Matches -->
      <div id="tabReview" style="display:none">
        <div id="matchReviewContent">
          <div class="empty-state">
            <p style="font-size:1.25rem;margin-bottom:1rem;">No matches to review</p>
            <p>Go to <strong>EDI Orders</strong> and click <strong>"Find Matches"</strong> to search for matching Zoho drafts.</p>
          </div>
        </div>
      </div>
      
      <!-- Tab: Sent to Zoho -->
      <div id="tabSent" style="display:none">
        <h2 style="margin-bottom:1rem;font-weight:600">Orders Sent to Zoho</h2>
        <div class="table-container">
          <table class="orders-table">
            <thead>
              <tr>
                <th>PO #</th>
                <th>Customer</th>
                <th>Zoho SO#</th>
                <th>Value</th>
                <th>Sent At</th>
                <th>Matched Draft</th>
              </tr>
            </thead>
            <tbody id="sentOrdersTable">
              <tr><td colspan="6" class="empty-state">No orders sent yet</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Tab: Customer Mappings -->
      <div id="tabMappings" style="display:none">
        <h2 style="margin-bottom:1rem;font-weight:600">Customer Mappings</h2>
        <p style="color:#86868b;margin-bottom:1.5rem">Map EDI customer names to Zoho Books customers.</p>
        <div id="mappingsContent"></div>
      </div>
      
      <!-- Tab: Activity Log -->
      <div id="tabActivity" style="display:none">
        <h2 style="margin-bottom:1rem;font-weight:600">Activity Log</h2>
        <div id="activityContent"><p style="color:#86868b">Activity log coming soon...</p></div>
      </div>
    </div>
  </div>
  
  <div id="modalContainer"></div>
  <div class="toast" id="toast"><span id="toastMsg"></span></div>
  
  <script>
    let orders = [];
    let selectedIds = new Set();
    let matchResults = null;
    
    document.addEventListener('DOMContentLoaded', () => { loadOrders(); loadStats(); });
    
    function showTab(tab, el) {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      if (el) el.classList.add('active');
      ['tabOrders','tabReview','tabSent','tabMappings','tabActivity'].forEach(t => {
        const elem = document.getElementById(t);
        if (elem) elem.style.display = 'none';
      });
      const tabId = 'tab' + tab.charAt(0).toUpperCase() + tab.slice(1);
      const tabElem = document.getElementById(tabId);
      if (tabElem) tabElem.style.display = 'block';
      
      if (tab === 'sent') loadSentOrders();
      if (tab === 'mappings') loadMappings();
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
      const search = (document.getElementById('searchBox')?.value || '').toLowerCase();
      const customer = document.getElementById('customerFilter')?.value || '';
      const status = document.getElementById('statusFilter')?.value || '';
      
      let filtered = orders.filter(o => {
        if (search && !(o.edi_order_number || '').toLowerCase().includes(search)) return false;
        if (customer && o.edi_customer_name !== customer) return false;
        if (status && o.status !== status) return false;
        return true;
      });
      
      const tbody = document.getElementById('ordersTable');
      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No orders found. Click "Fetch from SFTP" to load EDI orders.</td></tr>';
        return;
      }
      
      tbody.innerHTML = filtered.map(o => {
        const items = o.parsed_data?.items || [];
        const amt = items.reduce((s,i) => s + (i.quantityOrdered||0)*(i.unitPrice||0), 0);
        const statusClass = o.status === 'processed' ? 'processed' : o.status === 'matched' ? 'matched' : 'pending';
        const statusText = o.status === 'processed' ? '✓ Sent' : o.status === 'matched' ? '🔗 Matched' : '⏳ Pending';
        return \`<tr>
          <td><input type="checkbox" class="checkbox" \${selectedIds.has(o.id)?'checked':''} onchange="toggleSelect(\${o.id})"></td>
          <td><strong>\${o.edi_order_number||'N/A'}</strong></td>
          <td>\${o.edi_customer_name||'Unknown'}</td>
          <td>\${items.length} items</td>
          <td>$\${amt.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
          <td><span class="status-badge status-\${statusClass}">\${statusText}</span></td>
          <td>\${new Date(o.created_at).toLocaleDateString()}</td>
          <td><button class="btn btn-secondary" style="padding:0.35rem 0.75rem;font-size:0.8125rem" onclick="viewOrder(\${o.id})">View</button></td>
        </tr>\`;
      }).join('');
      
      document.getElementById('orderCount').textContent = 'Showing ' + filtered.length + ' of ' + orders.length + ' orders';
    }
    
    function filterOrders() { renderOrders(); }
    
    function updateCustomerFilter() {
      const customers = [...new Set(orders.map(o => o.edi_customer_name).filter(Boolean))].sort();
      const select = document.getElementById('customerFilter');
      if (select) {
        select.innerHTML = '<option value="">All Customers</option>' + 
          customers.map(c => '<option value="' + c + '">' + c + '</option>').join('');
      }
    }
    
    async function loadStats() {
      try {
        const res = await fetch('/status');
        const d = (await res.json()).last24Hours || {};
        document.getElementById('statTotal').textContent = d.total || 0;
        document.getElementById('statPending').textContent = d.pending || 0;
        document.getElementById('statMatched').textContent = d.matched || 0;
        document.getElementById('statProcessed').textContent = d.processed || 0;
        document.getElementById('pendingBadge').textContent = d.pending || 0;
      } catch(e) {}
    }
    
    function toggleSelect(id) { selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id); renderOrders(); }
    function toggleAll() { 
      const c = document.getElementById('selectAll')?.checked; 
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
    
    // ============================================================
    // MATCHING SYSTEM
    // ============================================================
    
    async function findMatches() {
      toast('Finding matches with Zoho drafts...');
      
      // Get pending orders
      const pendingOrders = orders.filter(o => o.status === 'pending');
      if (pendingOrders.length === 0) {
        toast('No pending orders to match');
        return;
      }
      
      try {
        const res = await fetch('/find-matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: pendingOrders.map(o => o.id) })
        });
        
        const data = await res.json();
        if (data.success) {
          matchResults = data;
          showMatchReview(data);
          showTab('review', document.querySelector('.nav-item:nth-child(2)'));
          toast('Found ' + (data.matches?.length || 0) + ' potential matches');
        } else {
          toast('Error: ' + (data.error || 'Unknown'));
        }
      } catch (e) { toast('Error: ' + e.message); }
    }
    
    function showMatchReview(data) {
      const matches = data.matches || [];
      const noMatches = data.noMatches || [];
      
      let html = \`
        <div class="match-summary">
          <h3>Found \${matches.length} potential matches</h3>
          <p>\${noMatches.length} EDI orders have no match (will need to create new)</p>
        </div>
      \`;
      
      // Render matches
      matches.forEach((match, idx) => {
        const conf = match.confidence || 0;
        const confLevel = conf >= 80 ? 'high' : conf >= 60 ? 'medium' : 'low';
        const confLabel = conf >= 80 ? 'High Confidence' : conf >= 60 ? 'Medium' : 'Low';
        
        html += \`
          <div class="match-card">
            <div class="match-card-header">
              <div>
                <div class="match-po">PO# \${match.ediOrder.poNumber}</div>
                <div class="match-customer">\${match.ediOrder.customer}</div>
              </div>
              <div style="text-align:right">
                <div class="confidence-badge confidence-\${confLevel}">\${conf}%</div>
                <div style="font-size:0.75rem;color:#86868b;margin-top:0.25rem">\${confLabel}</div>
              </div>
            </div>
            
            <div class="match-criteria">
              <span class="criteria-badge \${match.score.details.poNumber ? 'criteria-matched' : 'criteria-unmatched'}">
                \${match.score.details.poNumber ? '✓' : '○'} PO Number
              </span>
              <span class="criteria-badge \${match.score.details.customer ? 'criteria-matched' : 'criteria-unmatched'}">
                \${match.score.details.customer ? '✓' : '○'} Customer
              </span>
              <span class="criteria-badge \${match.score.details.shipDate ? 'criteria-matched' : 'criteria-unmatched'}">
                \${match.score.details.shipDate ? '✓' : '○'} Ship Date
              </span>
              <span class="criteria-badge \${match.score.details.totalAmount ? 'criteria-matched' : 'criteria-unmatched'}">
                \${match.score.details.totalAmount ? '✓' : '○'} Total Amount
              </span>
              <span class="criteria-badge \${match.score.details.styles ? 'criteria-matched' : 'criteria-unmatched'}">
                \${match.score.details.styles ? '✓' : '○'} Styles
              </span>
            </div>
            
            <div class="match-comparison">
              <div class="match-side edi">
                <div class="match-side-label">EDI Order</div>
                <div class="match-side-amount">$\${match.ediOrder.totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</div>
                <div class="match-side-detail">\${match.ediOrder.itemCount} line items • \${match.ediOrder.totalUnits.toLocaleString()} units</div>
              </div>
              <div class="match-side zoho">
                <div class="match-side-label">Zoho Order #\${match.zohoDraft.number}</div>
                <div class="match-side-amount">$\${match.zohoDraft.totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</div>
                <div class="match-side-detail">\${match.zohoDraft.itemCount} items • \${match.zohoDraft.status}</div>
              </div>
            </div>
            
            <div class="match-actions">
              <button class="btn btn-secondary" onclick="showEdiDetails(\${match.ediOrder.id})">📄 EDI Details</button>
              <button class="btn btn-secondary" onclick="showZohoOrder('\${match.zohoDraft.id}')">🔗 Zoho Order</button>
              <button class="btn btn-primary" onclick="showComparison(\${idx})">Compare Side-by-Side</button>
              <div style="flex:1"></div>
              <label class="include-checkbox">
                <input type="checkbox" class="checkbox" id="include-\${idx}" checked>
                Include
              </label>
            </div>
          </div>
        \`;
      });
      
      // Render no-matches section
      if (noMatches.length > 0) {
        html += \`
          <h3 style="margin-top:2rem;margin-bottom:1rem;color:#ff9500">⚠️ No Match Found (\${noMatches.length})</h3>
          <p style="color:#86868b;margin-bottom:1rem">These orders will create new Sales Orders in Zoho:</p>
        \`;
        
        noMatches.forEach((item, idx) => {
          html += \`
            <div class="match-card" style="border-left:4px solid #ff9500">
              <div class="match-card-header">
                <div>
                  <div class="match-po">PO# \${item.ediOrder.poNumber}</div>
                  <div class="match-customer">\${item.ediOrder.customer}</div>
                </div>
                <div>
                  <span class="status-badge status-pending">New Order</span>
                </div>
              </div>
              <div class="match-side edi" style="max-width:400px">
                <div class="match-side-label">EDI Order</div>
                <div class="match-side-amount">$\${item.ediOrder.totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</div>
                <div class="match-side-detail">\${item.ediOrder.itemCount} line items • \${item.ediOrder.totalUnits.toLocaleString()} units</div>
              </div>
              <div class="match-actions">
                <button class="btn btn-secondary" onclick="showEdiDetails(\${item.ediOrder.id})">📄 EDI Details</button>
                <div style="flex:1"></div>
                <label class="include-checkbox">
                  <input type="checkbox" class="checkbox" id="include-new-\${idx}" checked>
                  Include
                </label>
              </div>
            </div>
          \`;
        });
      }
      
      html += \`
        <div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid #e5e5e5;display:flex;justify-content:space-between;align-items:center">
          <div>
            <span style="font-weight:600">\${matches.length + noMatches.length}</span> orders selected
          </div>
          <button class="btn btn-success btn-lg" onclick="confirmSelectedMatches()">✓ Confirm Selected Matches</button>
        </div>
      \`;
      
      document.getElementById('matchReviewContent').innerHTML = html;
    }
    
    function showComparison(matchIndex) {
      const match = matchResults.matches[matchIndex];
      if (!match) return;
      
      const edi = match.ediOrder;
      const zoho = match.zohoDraft;
      const amtDiff = edi.totalAmount - zoho.totalAmount;
      const hasChanges = Math.abs(amtDiff) > 0.01 || edi.itemCount !== zoho.itemCount;
      
      const html = \`
        <div class="modal-overlay" onclick="closeModal()">
          <div class="modal comparison-modal" onclick="event.stopPropagation()">
            <div class="modal-header">
              <h2>Compare: EDI Order vs Draft</h2>
              <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="changes-summary \${hasChanges ? '' : 'no-changes'}">
                <span class="changes-icon">\${hasChanges ? '⚠️' : '✓'}</span>
                <span>\${hasChanges ? Math.abs(amtDiff) > 0.01 ? 'Amount difference: $' + Math.abs(amtDiff).toFixed(2) : 'Item differences detected' : '0 changes to apply'}</span>
              </div>
              
              <div class="comparison-header">
                <div class="comparison-side edi">
                  <h3><span class="icon">📄</span> EDI Order (Confirmed)</h3>
                  <div class="comparison-field">
                    <div class="comparison-field-label">PO#</div>
                    <div class="comparison-field-value">\${edi.poNumber}</div>
                  </div>
                  <div class="comparison-field">
                    <div class="comparison-field-label">Customer</div>
                    <div class="comparison-field-value">\${edi.customer}</div>
                  </div>
                  <div class="comparison-field">
                    <div class="comparison-field-label">Ship Date</div>
                    <div class="comparison-field-value">\${edi.shipDate || 'N/A'}</div>
                  </div>
                  <div class="comparison-field">
                    <div class="comparison-field-label">Cancel Date</div>
                    <div class="comparison-field-value">\${edi.cancelDate || 'N/A'}</div>
                  </div>
                  <div class="comparison-field">
                    <div class="comparison-field-label">Items</div>
                    <div class="comparison-field-value">\${edi.itemCount} lines, \${edi.totalUnits.toLocaleString()} units</div>
                  </div>
                  <div class="comparison-total">Total: $\${edi.totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</div>
                </div>
                
                <div class="comparison-side zoho">
                  <h3><span class="icon">📋</span> Zoho Draft #\${zoho.number}</h3>
                  <div class="comparison-field">
                    <div class="comparison-field-label">Reference</div>
                    <div class="comparison-field-value">\${zoho.reference || 'N/A'}</div>
                  </div>
                  <div class="comparison-field">
                    <div class="comparison-field-label">Customer</div>
                    <div class="comparison-field-value">\${zoho.customer}</div>
                  </div>
                  <div class="comparison-field">
                    <div class="comparison-field-label">Ship Date</div>
                    <div class="comparison-field-value">\${zoho.shipDate || 'N/A'}</div>
                  </div>
                  <div class="comparison-field">
                    <div class="comparison-field-label">Status</div>
                    <div class="comparison-field-value">\${zoho.status}</div>
                  </div>
                  <div class="comparison-field">
                    <div class="comparison-field-label">Items</div>
                    <div class="comparison-field-value">\${zoho.itemCount} lines, \${zoho.totalUnits.toLocaleString()} units</div>
                  </div>
                  <div class="comparison-total">Total: $\${zoho.totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</div>
                </div>
              </div>
              
              <h3 style="margin:1.5rem 0 1rem">Line Item Comparison:</h3>
              <div class="table-container">
                <table class="line-comparison-table">
                  <thead>
                    <tr>
                      <th class="edi-col">Style</th>
                      <th class="edi-col">Color</th>
                      <th class="edi-col">Qty</th>
                      <th class="edi-col">Price</th>
                      <th class="divider"></th>
                      <th class="zoho-col">Style/Item</th>
                      <th class="zoho-col">Desc</th>
                      <th class="zoho-col">Qty</th>
                      <th class="zoho-col">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${renderLineComparison(edi.items, zoho.items)}
                  </tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
              <button class="btn btn-success" onclick="updateZohoDraft(\${matchIndex})">✓ Update Zoho Draft</button>
            </div>
          </div>
        </div>
      \`;
      
      document.getElementById('modalContainer').innerHTML = html;
    }
    
    function renderLineComparison(ediItems, zohoItems) {
      const maxRows = Math.max(ediItems.length, zohoItems.length);
      let html = '';
      
      for (let i = 0; i < maxRows; i++) {
        const edi = ediItems[i];
        const zoho = zohoItems[i];
        
        html += '<tr>';
        if (edi) {
          html += \`
            <td class="edi-col">\${edi.productIds?.sku || edi.productIds?.vendorItemNumber || '-'}</td>
            <td class="edi-col">\${edi.color || '-'}</td>
            <td class="edi-col">\${edi.quantityOrdered || 0}</td>
            <td class="edi-col">$\${(edi.unitPrice || 0).toFixed(2)}</td>
          \`;
        } else {
          html += '<td class="edi-col">-</td><td class="edi-col">-</td><td class="edi-col">-</td><td class="edi-col">-</td>';
        }
        
        html += '<td class="divider"></td>';
        
        if (zoho) {
          html += \`
            <td class="zoho-col">\${zoho.name || '-'}</td>
            <td class="zoho-col">\${(zoho.description || '').substring(0, 30)}</td>
            <td class="zoho-col">\${zoho.quantity || 0}</td>
            <td class="zoho-col">$\${(zoho.rate || 0).toFixed(2)}</td>
          \`;
        } else {
          html += '<td class="zoho-col">-</td><td class="zoho-col">-</td><td class="zoho-col">-</td><td class="zoho-col">-</td>';
        }
        
        html += '</tr>';
      }
      
      return html;
    }
    
    async function confirmSelectedMatches() {
      // Gather selected matches and no-matches
      const selectedMatches = [];
      const selectedNewOrders = [];
      
      if (matchResults) {
        matchResults.matches.forEach((match, idx) => {
          const checkbox = document.getElementById('include-' + idx);
          if (checkbox && checkbox.checked) {
            selectedMatches.push({
              ediOrderId: match.ediOrder.id,
              zohoDraftId: match.zohoDraft.id
            });
          }
        });
        
        matchResults.noMatches.forEach((item, idx) => {
          const checkbox = document.getElementById('include-new-' + idx);
          if (checkbox && checkbox.checked) {
            selectedNewOrders.push({
              ediOrderId: item.ediOrder.id
            });
          }
        });
      }
      
      if (selectedMatches.length === 0 && selectedNewOrders.length === 0) {
        toast('No orders selected');
        return;
      }
      
      toast('Processing ' + (selectedMatches.length + selectedNewOrders.length) + ' orders...');
      
      try {
        const res = await fetch('/confirm-matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matches: selectedMatches, newOrders: selectedNewOrders })
        });
        
        const data = await res.json();
        if (data.success) {
          toast('Successfully processed ' + data.processed + ' orders');
          matchResults = null;
          document.getElementById('matchReviewContent').innerHTML = '<div class="empty-state"><p>✓ All matches confirmed!</p><p>Go to "Sent to Zoho" to see processed orders.</p></div>';
          loadOrders();
          loadStats();
        } else {
          toast('Error: ' + (data.error || 'Unknown'));
        }
      } catch (e) { toast('Error: ' + e.message); }
    }
    
    async function updateZohoDraft(matchIndex) {
      const match = matchResults.matches[matchIndex];
      if (!match) return;
      
      toast('Updating Zoho draft...');
      
      try {
        const res = await fetch('/update-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ediOrderId: match.ediOrder.id,
            zohoDraftId: match.zohoDraft.id
          })
        });
        
        const data = await res.json();
        if (data.success) {
          toast('Draft updated successfully');
          closeModal();
          loadOrders();
        } else {
          toast('Error: ' + (data.error || 'Unknown'));
        }
      } catch (e) { toast('Error: ' + e.message); }
    }
    
    // ============================================================
    // VIEW ORDER DETAILS
    // ============================================================
    
    async function viewOrder(orderId) {
      try {
        const res = await fetch('/orders/' + orderId);
        const order = await res.json();
        showOrderModal(order);
      } catch (e) { toast('Failed to load order'); }
    }
    
    function showOrderModal(order) {
      const parsed = order.parsed_data || {};
      const items = parsed.items || [];
      const totalValue = items.reduce((s, i) => s + ((i.quantityOrdered || 0) * (i.unitPrice || 0)), 0);
      
      const html = \`
        <div class="modal-overlay" onclick="closeModal()">
          <div class="modal" style="width:900px" onclick="event.stopPropagation()">
            <div class="modal-header">
              <h2>Order Details - \${order.edi_order_number || 'N/A'}</h2>
              <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem">
                <div style="background:#f5f5f7;padding:1rem;border-radius:8px">
                  <div style="font-size:0.7rem;color:#86868b;text-transform:uppercase">PO Number</div>
                  <div style="font-weight:600">\${order.edi_order_number || 'N/A'}</div>
                </div>
                <div style="background:#f5f5f7;padding:1rem;border-radius:8px">
                  <div style="font-size:0.7rem;color:#86868b;text-transform:uppercase">Customer</div>
                  <div style="font-weight:600">\${order.edi_customer_name || 'Unknown'}</div>
                </div>
                <div style="background:#f5f5f7;padding:1rem;border-radius:8px">
                  <div style="font-size:0.7rem;color:#86868b;text-transform:uppercase">Ship Date</div>
                  <div style="font-weight:600">\${parsed.dates?.shipNotBefore || 'N/A'}</div>
                </div>
                <div style="background:#f5f5f7;padding:1rem;border-radius:8px">
                  <div style="font-size:0.7rem;color:#86868b;text-transform:uppercase">Status</div>
                  <div style="font-weight:600">\${order.status || 'pending'}</div>
                </div>
              </div>
              
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem">
                <div style="background:#e3f2fd;padding:1rem;border-radius:8px;text-align:center">
                  <div style="font-size:1.5rem;font-weight:700;color:#1565c0">\${items.length}</div>
                  <div style="font-size:0.75rem;color:#1976d2">Line Items</div>
                </div>
                <div style="background:#e3f2fd;padding:1rem;border-radius:8px;text-align:center">
                  <div style="font-size:1.5rem;font-weight:700;color:#1565c0">\${items.reduce((s,i) => s + (i.quantityOrdered||0), 0).toLocaleString()}</div>
                  <div style="font-size:0.75rem;color:#1976d2">Total Units</div>
                </div>
                <div style="background:#e8f5e9;padding:1rem;border-radius:8px;text-align:center">
                  <div style="font-size:1.5rem;font-weight:700;color:#2e7d32">$\${totalValue.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
                  <div style="font-size:0.75rem;color:#388e3c">Total Value</div>
                </div>
              </div>
              
              <h3 style="margin-bottom:1rem">Line Items</h3>
              <div class="table-container">
                <table class="orders-table" style="font-size:0.8125rem">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Style/SKU</th>
                      <th>Description</th>
                      <th>Color</th>
                      <th>Size</th>
                      <th style="text-align:right">Qty</th>
                      <th style="text-align:right">Price</th>
                      <th style="text-align:right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${items.map((item, idx) => \`
                      <tr>
                        <td>\${item.lineNumber || idx + 1}</td>
                        <td><strong>\${item.productIds?.sku || item.productIds?.vendorItemNumber || 'N/A'}</strong></td>
                        <td>\${item.description || ''}</td>
                        <td>\${item.color || ''}</td>
                        <td>\${item.size || ''}</td>
                        <td style="text-align:right">\${item.quantityOrdered || 0}</td>
                        <td style="text-align:right">$\${(item.unitPrice || 0).toFixed(2)}</td>
                        <td style="text-align:right"><strong>$\${((item.quantityOrdered || 0) * (item.unitPrice || 0)).toFixed(2)}</strong></td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer">
              <div></div>
              <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            </div>
          </div>
        </div>
      \`;
      
      document.getElementById('modalContainer').innerHTML = html;
    }
    
    function showEdiDetails(orderId) {
      viewOrder(orderId);
    }
    
    function showZohoOrder(zohoId) {
      window.open('https://books.zoho.com/app/677681121#/salesorders/' + zohoId, '_blank');
    }
    
    function closeModal() {
      document.getElementById('modalContainer').innerHTML = '';
    }
    
    // ============================================================
    // OTHER TABS
    // ============================================================
    
    async function loadSentOrders() {
      try {
        const res = await fetch('/orders?status=processed');
        const sentOrders = await res.json();
        const tbody = document.getElementById('sentOrdersTable');
        
        if (!sentOrders.length) {
          tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No orders sent to Zoho yet</td></tr>';
          return;
        }
        
        tbody.innerHTML = sentOrders.filter(o => o.status === 'processed').map(o => {
          const items = o.parsed_data?.items || [];
          const amt = items.reduce((s,i) => s + (i.quantityOrdered||0)*(i.unitPrice||0), 0);
          return \`<tr>
            <td><strong>\${o.edi_order_number||'N/A'}</strong></td>
            <td>\${o.edi_customer_name||'Unknown'}</td>
            <td>\${o.zoho_so_number || o.zoho_so_id || 'N/A'}</td>
            <td>$\${amt.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
            <td>\${o.processed_at ? new Date(o.processed_at).toLocaleString() : '-'}</td>
            <td>\${o.matched_draft_id || '-'}</td>
          </tr>\`;
        }).join('');
      } catch (e) { toast('Failed to load sent orders'); }
    }
    
    async function loadMappings() {
      try {
        const res = await fetch('/customer-mappings');
        const mappings = await res.json();
        document.getElementById('mappingsContent').innerHTML = mappings.length ? 
          '<div class="table-container"><table class="orders-table"><thead><tr><th>EDI Customer</th><th>Zoho Customer</th><th>Actions</th></tr></thead><tbody>' +
          mappings.map(m => '<tr><td>' + m.edi_customer_name + '</td><td>' + m.zoho_customer_name + '</td><td><button class="btn btn-secondary" style="padding:0.25rem 0.5rem;font-size:0.75rem">Delete</button></td></tr>').join('') +
          '</tbody></table></div>' : '<p style="color:#86868b">No mappings configured.</p>';
      } catch (e) {}
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
