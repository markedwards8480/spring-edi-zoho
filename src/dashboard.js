// Modern Dashboard HTML with Draft Matching
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
    .status-indicator { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 20px; font-size: 0.875rem; }
    .status-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    
    .main-container { display: flex; min-height: calc(100vh - 70px); }
    .sidebar { width: 220px; background: #1e293b; border-right: 1px solid #334155; padding: 1.5rem 0; }
    .nav-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; padding: 0 1.5rem; margin-bottom: 0.75rem; }
    .nav-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.5rem; color: #94a3b8; cursor: pointer; transition: all 0.2s; border-left: 3px solid transparent; }
    .nav-item:hover { background: rgba(59, 130, 246, 0.1); color: #e2e8f0; }
    .nav-item.active { background: rgba(59, 130, 246, 0.15); color: #3b82f6; border-left-color: #3b82f6; }
    .nav-badge { margin-left: auto; background: #f59e0b; color: white; font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 10px; }
    
    .content { flex: 1; padding: 2rem; overflow-y: auto; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; }
    .stat-label { font-size: 0.8rem; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem; }
    .stat-value { font-size: 2.5rem; font-weight: 700; }
    .stat-value.success { color: #22c55e; }
    .stat-value.warning { color: #f59e0b; }
    .stat-value.danger { color: #ef4444; }
    
    .action-bar { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; border-radius: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none; font-family: inherit; }
    .btn-primary { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
    .btn-primary:hover { background: linear-gradient(135deg, #2563eb, #1d4ed8); }
    .btn-secondary { background: #334155; color: #e2e8f0; border: 1px solid #475569; }
    .btn-secondary:hover { background: #475569; }
    .btn-success { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; }
    .btn-danger { background: transparent; color: #ef4444; border: 1px solid #ef4444; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    
    select { background: #334155; border: 1px solid #475569; color: #e2e8f0; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; }
    
    .tabs { display: flex; border-bottom: 1px solid #334155; margin-bottom: 1.5rem; }
    .tab { padding: 1rem 1.5rem; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; font-weight: 500; }
    .tab:hover { color: #e2e8f0; }
    .tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }
    
    .table-container { background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #0f172a; padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: #64748b; }
    td { padding: 1rem; border-top: 1px solid #334155; font-size: 0.875rem; }
    tr:hover { background: rgba(59, 130, 246, 0.05); }
    
    .status-badge { display: inline-flex; padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
    .status-pending { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
    .status-processed { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
    .status-failed { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
    
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.75); display: flex; align-items: center; justify-content: center; z-index: 1000; opacity: 0; visibility: hidden; transition: all 0.3s; }
    .modal-overlay.active { opacity: 1; visibility: visible; }
    .modal { background: #1e293b; border: 1px solid #334155; border-radius: 16px; width: 95%; max-width: 1100px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #334155; }
    .modal-title { font-size: 1.25rem; font-weight: 600; }
    .modal-close { background: none; border: none; color: #64748b; font-size: 1.5rem; cursor: pointer; }
    .modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; }
    .modal-footer { padding: 1.5rem; border-top: 1px solid #334155; display: flex; justify-content: flex-end; gap: 1rem; }
    
    .order-header { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .order-field { background: #0f172a; padding: 1rem; border-radius: 8px; }
    .order-field-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; margin-bottom: 0.25rem; }
    .order-field-value { font-size: 0.95rem; font-weight: 500; }
    
    .draft-section { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .draft-section h3 { margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .draft-card { background: #1e293b; border: 2px solid #334155; border-radius: 10px; padding: 1rem; margin-bottom: 1rem; cursor: pointer; }
    .draft-card:hover { border-color: #3b82f6; }
    .draft-card.selected { border-color: #22c55e; background: rgba(34, 197, 94, 0.05); }
    .draft-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .match-score { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
    .match-score.high { background: #22c55e; color: white; }
    .match-score.medium { background: #f59e0b; color: white; }
    .match-score.low { background: #ef4444; color: white; }
    
    .comparison-table { width: 100%; font-size: 0.8rem; margin-top: 1rem; }
    .comparison-table th { padding: 0.75rem; background: #0f172a; }
    .comparison-table td { padding: 0.75rem; border-top: 1px solid #334155; }
    .diff-positive { color: #22c55e; }
    .diff-negative { color: #ef4444; }
    .diff-row { background: rgba(245, 158, 11, 0.1); }
    
    .match-options { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; margin-top: 1.5rem; }
    .match-option { display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; border: 2px solid #334155; border-radius: 8px; margin-bottom: 1rem; cursor: pointer; }
    .match-option:hover { border-color: #475569; }
    .match-option.selected { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
    .match-option input[type="radio"] { margin-top: 0.25rem; accent-color: #3b82f6; }
    .match-option-title { font-weight: 600; margin-bottom: 0.25rem; }
    .match-option-desc { font-size: 0.8rem; color: #64748b; }
    
    .summary-row { display: flex; justify-content: space-around; padding: 1rem; background: #0f172a; border-radius: 8px; margin-top: 1rem; }
    .summary-item { text-align: center; }
    .summary-value { font-size: 1.5rem; font-weight: 700; }
    .summary-label { font-size: 0.75rem; color: #64748b; }
    
    .line-items-container { max-height: 250px; overflow-y: auto; border: 1px solid #334155; border-radius: 8px; }
    .line-items-table { width: 100%; font-size: 0.8rem; }
    .line-items-table th { position: sticky; top: 0; background: #0f172a; }
    
    .mapping-form { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
    .mapping-form input { flex: 1; background: #0f172a; border: 1px solid #334155; color: #e2e8f0; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; }
    .mapping-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #0f172a; border-radius: 8px; margin-bottom: 0.5rem; }
    
    .activity-item { display: flex; gap: 1rem; padding: 1rem; border-left: 2px solid #334155; margin-left: 1rem; }
    .activity-item.success { border-color: #22c55e; }
    .activity-item.error { border-color: #ef4444; }
    .activity-time { font-size: 0.75rem; color: #64748b; min-width: 140px; }
    .activity-content { flex: 1; }
    .activity-title { font-weight: 500; }
    .activity-details { font-size: 0.8rem; color: #94a3b8; }
    
    .toast-container { position: fixed; bottom: 2rem; right: 2rem; z-index: 2000; }
    .toast { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 1rem 1.5rem; margin-top: 0.5rem; min-width: 300px; }
    .toast.success { border-left: 4px solid #22c55e; }
    .toast.error { border-left: 4px solid #ef4444; }
    
    .empty-state { text-align: center; padding: 3rem; color: #64748b; }
    .checkbox { width: 18px; height: 18px; accent-color: #3b82f6; }
    .error-box { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; color: #ef4444; }
  </style>
</head>
<body>
  <header class="header">
    <div class="logo">
      <div class="logo-icon">ME</div>
      <div>
        <div class="logo-text">Spring EDI Integration</div>
        <div style="font-size: 0.75rem; color: #64748b;">Mark Edwards Apparel</div>
      </div>
    </div>
    <div class="status-indicator">
      <div class="status-dot"></div>
      <span>System Online</span>
    </div>
  </header>
  
  <div class="main-container">
    <nav class="sidebar">
      <div style="margin-bottom: 2rem;">
        <div class="nav-title">Orders</div>
        <div class="nav-item active" onclick="showTab('orders', this)">📦 EDI Orders <span class="nav-badge" id="pendingBadge">0</span></div>
        <div class="nav-item" onclick="showTab('mappings', this)">🔗 Customer Mappings</div>
      </div>
      <div style="margin-bottom: 2rem;">
        <div class="nav-title">History</div>
        <div class="nav-item" onclick="showTab('activity', this)">📋 Activity Log</div>
        <div class="nav-item" onclick="showTab('drafts', this)">📁 Replaced Drafts</div>
      </div>
      <div>
        <div class="nav-title">Help</div>
        <div class="nav-item" onclick="window.open('/documentation', '_blank')">📖 Documentation</div>
      </div>
    </nav>
    
    <main class="content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Orders (24h)</div>
          <div class="stat-value" id="statTotal">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Processed</div>
          <div class="stat-value success" id="statProcessed">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pending</div>
          <div class="stat-value warning" id="statPending">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Failed</div>
          <div class="stat-value danger" id="statFailed">0</div>
        </div>
      </div>
      
      <!-- Orders Tab -->
      <div id="tabOrders">
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
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" class="checkbox" id="selectAll" onchange="toggleAll()"></th>
                <th>PO #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="ordersTable"><tr><td colspan="8" class="empty-state">Loading...</td></tr></tbody>
          </table>
        </div>
      </div>
      
      <!-- Mappings Tab -->
      <div id="tabMappings" style="display:none;">
        <h2 style="margin-bottom: 1.5rem;">Customer Mappings</h2>
        <div class="mapping-form">
          <input type="text" id="ediName" placeholder="EDI Customer Name (e.g. Fred Meyer)">
          <input type="text" id="zohoName" placeholder="Zoho Customer Name">
          <button class="btn btn-primary" onclick="addMapping()">Add</button>
        </div>
        <div id="mappingsList"></div>
      </div>
      
      <!-- Activity Tab -->
      <div id="tabActivity" style="display:none;">
        <h2 style="margin-bottom: 1.5rem;">Activity Log</h2>
        <div id="activityList"></div>
      </div>
      
      <!-- Drafts Tab -->
      <div id="tabDrafts" style="display:none;">
        <h2 style="margin-bottom: 1.5rem;">Replaced Drafts Archive</h2>
        <div id="draftsList"><p class="empty-state">No replaced drafts yet.</p></div>
      </div>
    </main>
  </div>
  
  <!-- Order Modal -->
  <div class="modal-overlay" id="orderModal">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">Order Details</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body" id="modalBody"></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" id="processBtn" onclick="processCurrentOrder()">Process This Order</button>
      </div>
    </div>
  </div>
  
  <!-- Draft Match Modal -->
  <div class="modal-overlay" id="draftModal">
    <div class="modal" style="max-width: 1200px;">
      <div class="modal-header">
        <h2 class="modal-title">🔍 Draft Matching</h2>
        <button class="modal-close" onclick="closeDraftModal()">&times;</button>
      </div>
      <div class="modal-body" id="draftModalBody"></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeDraftModal()">Cancel</button>
        <button class="btn btn-success" id="confirmMatchBtn" onclick="confirmMatch()">Confirm & Process</button>
      </div>
    </div>
  </div>
  
  <div class="toast-container" id="toasts"></div>
  
  <script>
    let orders = [];
    let selectedIds = new Set();
    let currentOrder = null;
    let selectedDraft = null;
    let matchOption = 'replace';
    
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
        renderOrders();
        loadStats();
      } catch (e) { toast('Failed to load orders', 'error'); }
    }
    
    function renderOrders() {
      const tbody = document.getElementById('ordersTable');
      if (!orders.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No orders. Click "Fetch from SFTP".</td></tr>'; return; }
      tbody.innerHTML = orders.map(o => {
        const items = o.parsed_data?.items || [];
        const amt = items.reduce((s,i) => s + (i.quantityOrdered||0)*(i.unitPrice||0), 0);
        const st = o.status === 'processed' ? 'processed' : o.status === 'failed' ? 'failed' : 'pending';
        return \`<tr>
          <td><input type="checkbox" class="checkbox" \${selectedIds.has(o.id)?'checked':''} onchange="toggleSelect(\${o.id})"></td>
          <td><strong>\${o.edi_order_number||'N/A'}</strong></td>
          <td>\${o.edi_customer_name||'Unknown'}</td>
          <td>\${items.length} items</td>
          <td>$\${amt.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
          <td><span class="status-badge status-\${st}">\${st}</span></td>
          <td>\${new Date(o.created_at).toLocaleDateString()}</td>
          <td><button class="btn btn-secondary" style="padding:0.5rem 1rem" onclick="viewOrder(\${o.id})">View</button></td>
        </tr>\`;
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
    function toggleAll() { const c = document.getElementById('selectAll').checked; orders.forEach(o => c ? selectedIds.add(o.id) : selectedIds.delete(o.id)); renderOrders(); }
    
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
      
      document.getElementById('modalBody').innerHTML = \`
        <div class="order-header">
          <div class="order-field"><div class="order-field-label">PO Number</div><div class="order-field-value">\${p.header?.poNumber||o.edi_order_number||'N/A'}</div></div>
          <div class="order-field"><div class="order-field-label">Customer</div><div class="order-field-value">\${o.edi_customer_name||'Unknown'}</div></div>
          <div class="order-field"><div class="order-field-label">Order Date</div><div class="order-field-value">\${p.dates?.orderDate||'N/A'}</div></div>
          <div class="order-field"><div class="order-field-label">Status</div><div class="order-field-value"><span class="status-badge status-\${o.status}">\${o.status}</span></div></div>
        </div>
        <div class="order-header">
          <div class="order-field"><div class="order-field-label">Ship To</div><div class="order-field-value" style="font-size:0.85rem">\${[ship.name,ship.city,ship.state].filter(Boolean).join(', ')||'N/A'}</div></div>
          <div class="order-field"><div class="order-field-label">Ship Window</div><div class="order-field-value">\${p.dates?.shipNotBefore||''} to \${p.dates?.shipNotAfter||''}</div></div>
          <div class="order-field"><div class="order-field-label">Cancel Date</div><div class="order-field-value">\${p.dates?.cancelDate||'-'}</div></div>
          <div class="order-field"><div class="order-field-label">Terms</div><div class="order-field-value">\${p.header?.paymentTerms||'N/A'}</div></div>
        </div>
        \${o.error_message ? \`<div class="error-box"><strong>Error:</strong> \${o.error_message}</div>\` : ''}
        <h3 style="margin:1rem 0">Line Items (\${items.length})</h3>
        <div class="line-items-container">
          <table class="line-items-table">
            <thead><tr><th>Style</th><th>Description</th><th>Color</th><th>Size</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
            <tbody>\${items.map(i => \`<tr>
              <td>\${i.productIds?.vendorItemNumber||i.productIds?.buyerItemNumber||''}</td>
              <td>\${i.description||''}</td>
              <td>\${i.color||''}</td>
              <td>\${i.size||''}</td>
              <td>\${i.quantityOrdered||0}</td>
              <td>$\${(i.unitPrice||0).toFixed(2)}</td>
              <td>$\${((i.quantityOrdered||0)*(i.unitPrice||0)).toFixed(2)}</td>
            </tr>\`).join('')}</tbody>
          </table>
        </div>
        <div class="summary-row">
          <div class="summary-item"><div class="summary-value">\${items.length}</div><div class="summary-label">Line Items</div></div>
          <div class="summary-item"><div class="summary-value">\${totalQty.toLocaleString()}</div><div class="summary-label">Total Units</div></div>
          <div class="summary-item"><div class="summary-value">$\${totalAmt.toLocaleString('en-US',{minimumFractionDigits:2})}</div><div class="summary-label">Total Value</div></div>
        </div>
      \`;
      
      const btn = document.getElementById('processBtn');
      btn.disabled = o.status === 'processed';
      btn.textContent = o.status === 'processed' ? 'Already Processed' : 'Process This Order';
    }
    
    function closeModal() { document.getElementById('orderModal').classList.remove('active'); currentOrder = null; }
    function closeDraftModal() { document.getElementById('draftModal').classList.remove('active'); selectedDraft = null; }
    
    async function processCurrentOrder() {
      if (!currentOrder) return;
      // First search for matching drafts
      try {
        document.getElementById('processBtn').disabled = true;
        document.getElementById('processBtn').textContent = 'Searching drafts...';
        
        const res = await fetch('/find-matching-drafts', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ orderId: currentOrder.id })
        });
        const data = await res.json();
        
        if (data.drafts && data.drafts.length > 0) {
          // Show draft matching modal
          closeModal();
          showDraftMatchModal(data);
        } else {
          // No drafts found, process directly
          await processOrderDirect(currentOrder.id);
        }
      } catch(e) {
        toast('Error: ' + e.message, 'error');
      } finally {
        if (document.getElementById('processBtn')) {
          document.getElementById('processBtn').disabled = false;
          document.getElementById('processBtn').textContent = 'Process This Order';
        }
      }
    }
    
    function showDraftMatchModal(data) {
      selectedDraft = null;
      matchOption = 'replace';
      
      const drafts = data.drafts;
      const order = currentOrder;
      const items = order.parsed_data?.items || [];
      const totalAmt = items.reduce((s,i) => s + (i.quantityOrdered||0)*(i.unitPrice||0), 0);
      
      let draftsHtml = drafts.map((d, idx) => {
        const scoreClass = d.match_score >= 40 ? 'high' : d.match_score >= 20 ? 'medium' : 'low';
        return \`
          <div class="draft-card \${idx===0?'selected':''}" onclick="selectDraft(\${idx}, this)">
            <div class="draft-card-header">
              <strong>\${d.salesorder_number}</strong>
              <span class="match-score \${scoreClass}">\${d.match_score} pts</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; font-size:0.85rem; color:#94a3b8;">
              <div>Date: <strong style="color:#e2e8f0">\${d.date||'N/A'}</strong></div>
              <div>Amount: <strong style="color:#e2e8f0">$\${parseFloat(d.total||0).toLocaleString()}</strong></div>
              <div>Items: <strong style="color:#e2e8f0">\${(d.line_items||[]).length}</strong></div>
              <div>Ref: <strong style="color:#e2e8f0">\${d.reference_number||'-'}</strong></div>
            </div>
          </div>
        \`;
      }).join('');
      
      if (drafts.length === 0) {
        draftsHtml = '<p style="color:#64748b;">No matching drafts found. Order will be created as new.</p>';
      }
      
      document.getElementById('draftModalBody').innerHTML = \`
        <div class="order-header">
          <div class="order-field"><div class="order-field-label">EDI PO #</div><div class="order-field-value">\${order.edi_order_number}</div></div>
          <div class="order-field"><div class="order-field-label">Customer</div><div class="order-field-value">\${order.edi_customer_name}</div></div>
          <div class="order-field"><div class="order-field-label">Amount</div><div class="order-field-value">$\${totalAmt.toLocaleString('en-US',{minimumFractionDigits:2})}</div></div>
          <div class="order-field"><div class="order-field-label">Items</div><div class="order-field-value">\${items.length} items</div></div>
        </div>
        
        <div class="draft-section">
          <h3>📋 Matching Draft Orders in Zoho</h3>
          \${draftsHtml}
        </div>
        
        \${drafts.length > 0 ? \`
        <div class="match-options">
          <h3 style="margin-bottom:1rem;">Select Action</h3>
          <div class="match-option selected" onclick="selectOption('replace', this)">
            <input type="radio" name="matchOpt" checked>
            <div>
              <div class="match-option-title">Full Replace</div>
              <div class="match-option-desc">Delete the draft and create new Sales Order with EDI data</div>
            </div>
          </div>
          <div class="match-option" onclick="selectOption('partial', this)">
            <input type="radio" name="matchOpt">
            <div>
              <div class="match-option-title">Partial Match (Create Remainder)</div>
              <div class="match-option-desc">Create SO from EDI, and create NEW draft with remaining quantities not on this EDI</div>
            </div>
          </div>
          <div class="match-option" onclick="selectOption('new', this)">
            <input type="radio" name="matchOpt">
            <div>
              <div class="match-option-title">Create as New Order</div>
              <div class="match-option-desc">Ignore drafts and create a separate Sales Order</div>
            </div>
          </div>
        </div>
        \` : ''}
      \`;
      
      if (drafts.length > 0) selectedDraft = drafts[0];
      document.getElementById('draftModal').classList.add('active');
    }
    
    function selectDraft(idx, el) {
      document.querySelectorAll('.draft-card').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      // Get drafts from modal data - we'd need to store this
    }
    
    function selectOption(opt, el) {
      matchOption = opt;
      document.querySelectorAll('.match-option').forEach(o => { o.classList.remove('selected'); o.querySelector('input').checked = false; });
      el.classList.add('selected');
      el.querySelector('input').checked = true;
    }
    
    async function confirmMatch() {
      if (!currentOrder) return;
      try {
        document.getElementById('confirmMatchBtn').disabled = true;
        document.getElementById('confirmMatchBtn').textContent = 'Processing...';
        
        const res = await fetch('/process-with-draft-match', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            orderId: currentOrder.id,
            draftId: selectedDraft?.salesorder_id || null,
            matchOption: matchOption
          })
        });
        
        const data = await res.json();
        if (data.success) {
          toast('Order processed successfully!', 'success');
          closeDraftModal();
          loadOrders();
        } else {
          toast('Error: ' + (data.error || 'Unknown error'), 'error');
        }
      } catch(e) {
        toast('Error: ' + e.message, 'error');
      } finally {
        document.getElementById('confirmMatchBtn').disabled = false;
        document.getElementById('confirmMatchBtn').textContent = 'Confirm & Process';
      }
    }
    
    async function processOrderDirect(orderId) {
      try {
        const res = await fetch('/process-selected', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ orderIds: [orderId] })
        });
        const data = await res.json();
        if (data.success) {
          toast('Order processed! ' + data.processed + ' created', 'success');
          closeModal();
          loadOrders();
        } else {
          toast('Error: ' + (data.error || 'Failed'), 'error');
        }
      } catch(e) {
        toast('Error: ' + e.message, 'error');
      }
    }
    
    async function fetchSFTP() {
      try {
        toast('Fetching from SFTP...', 'info');
        const res = await fetch('/fetch-sftp', { method: 'POST' });
        const data = await res.json();
        toast('Fetched ' + (data.filesProcessed||0) + ' files', 'success');
        loadOrders();
      } catch(e) { toast('SFTP fetch failed', 'error'); }
    }
    
    async function processOrders() {
      const limit = document.getElementById('limitSelect').value;
      try {
        const res = await fetch('/process-limit', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ limit: parseInt(limit) })
        });
        const data = await res.json();
        toast('Processed: ' + data.processed + ', Failed: ' + data.failed, data.failed ? 'error' : 'success');
        loadOrders();
      } catch(e) { toast('Processing failed', 'error'); }
    }
    
    async function processSelected() {
      if (!selectedIds.size) { toast('No orders selected', 'error'); return; }
      try {
        const res = await fetch('/process-selected', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ orderIds: Array.from(selectedIds) })
        });
        const data = await res.json();
        toast('Processed: ' + data.processed, 'success');
        selectedIds.clear();
        loadOrders();
      } catch(e) { toast('Failed', 'error'); }
    }
    
    async function retryFailed() {
      try {
        const res = await fetch('/retry-failed', { method: 'POST' });
        const data = await res.json();
        toast('Reset ' + data.count + ' failed orders', 'success');
        loadOrders();
      } catch(e) { toast('Failed', 'error'); }
    }
    
    async function resetAll() {
      if (!confirm('Reset ALL orders to pending? This cannot be undone.')) return;
      try {
        const res = await fetch('/reset-to-pending');
        toast('All orders reset', 'success');
        loadOrders();
      } catch(e) { toast('Failed', 'error'); }
    }
    
    async function loadMappings() {
      try {
        const res = await fetch('/customer-mappings');
        const mappings = await res.json();
        document.getElementById('mappingsList').innerHTML = mappings.length ? mappings.map(m => \`
          <div class="mapping-item">
            <span>\${m.edi_customer_name}</span>
            <span style="color:#3b82f6">→</span>
            <span>\${m.zoho_account_name}</span>
            <button class="btn btn-danger" style="padding:0.25rem 0.75rem" onclick="deleteMapping(\${m.id})">Delete</button>
          </div>
        \`).join('') : '<p class="empty-state">No mappings yet.</p>';
      } catch(e) {}
    }
    
    async function addMapping() {
      const edi = document.getElementById('ediName').value.trim();
      const zoho = document.getElementById('zohoName').value.trim();
      if (!edi || !zoho) { toast('Fill both fields', 'error'); return; }
      try {
        await fetch('/add-mapping', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ ediCustomerName: edi, zohoAccountName: zoho })
        });
        document.getElementById('ediName').value = '';
        document.getElementById('zohoName').value = '';
        toast('Mapping added', 'success');
        loadMappings();
      } catch(e) { toast('Failed', 'error'); }
    }
    
    async function deleteMapping(id) {
      try {
        await fetch('/customer-mappings/' + id, { method: 'DELETE' });
        loadMappings();
      } catch(e) {}
    }
    
    async function loadActivity() {
      try {
        const res = await fetch('/processing-logs?limit=50');
        const logs = await res.json();
        document.getElementById('activityList').innerHTML = logs.length ? logs.map(l => \`
          <div class="activity-item \${l.status}">
            <div class="activity-time">\${new Date(l.created_at).toLocaleString()}</div>
            <div class="activity-content">
              <div class="activity-title">\${l.action||'Action'}</div>
              <div class="activity-details">\${l.details||''}</div>
            </div>
          </div>
        \`).join('') : '<p class="empty-state">No activity yet.</p>';
      } catch(e) { document.getElementById('activityList').innerHTML = '<p class="empty-state">Failed to load.</p>'; }
    }
    
    async function loadReplacedDrafts() {
      try {
        const res = await fetch('/replaced-drafts');
        const drafts = await res.json();
        document.getElementById('draftsList').innerHTML = drafts.length ? drafts.map(d => \`
          <div class="mapping-item">
            <div>
              <strong>\${d.original_so_number}</strong>
              <div style="font-size:0.8rem;color:#64748b">Replaced by PO# \${d.edi_po_number} on \${new Date(d.replaced_at).toLocaleDateString()}</div>
            </div>
            <button class="btn btn-secondary" style="padding:0.25rem 0.75rem" onclick="viewDraftDetails(\${d.id})">Details</button>
          </div>
        \`).join('') : '<p class="empty-state">No replaced drafts yet.</p>';
      } catch(e) {}
    }
    
    function toast(msg, type='info') {
      const t = document.createElement('div');
      t.className = 'toast ' + type;
      t.textContent = msg;
      document.getElementById('toasts').appendChild(t);
      setTimeout(() => t.remove(), 4000);
    }
  </script>
</body>
</html>
`;

module.exports = dashboardHTML;
