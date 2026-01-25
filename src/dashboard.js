// Dashboard v2 - With Status Tabs, Filters, Bulk Actions
// Mark Edwards Apparel Light Theme

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
    @keyframes loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    
    /* Layout */
    .main-container { display: flex; min-height: calc(100vh - 70px); }
    .sidebar { width: 220px; background: white; border-right: 1px solid rgba(0,0,0,0.06); padding: 1.5rem 0; }
    .nav-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; padding: 0 1.5rem; margin-bottom: 0.75rem; margin-top: 1.5rem; }
    .nav-title:first-child { margin-top: 0; }
    .nav-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.5rem; color: #6e6e73; cursor: pointer; transition: all 0.15s; border-left: 3px solid transparent; font-size: 0.875rem; }
    .nav-item:hover { background: #f5f5f7; color: #1e3a5f; }
    .nav-item.active { background: rgba(0,136,194,0.08); color: #0088c2; border-left-color: #0088c2; }
    .nav-badge { margin-left: auto; background: #ff9500; color: white; padding: 0.15rem 0.5rem; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
    .nav-badge.green { background: #34c759; }
    .nav-badge.blue { background: #0088c2; }
    
    .content { flex: 1; padding: 2rem; overflow-y: auto; }
    
    /* Stats */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); cursor: pointer; transition: all 0.2s; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .stat-card.active { border: 2px solid #0088c2; }
    .stat-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; margin-bottom: 0.5rem; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #1e3a5f; }
    .stat-card.warning .stat-value { color: #ff9500; }
    .stat-card.success .stat-value { color: #34c759; }
    .stat-card.info .stat-value { color: #0088c2; }
    
    /* Buttons */
    .btn { padding: 0.5rem 1rem; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: none; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 0.5rem; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: #1e3a5f; color: white; }
    .btn-primary:hover:not(:disabled) { background: #2d5a7f; }
    .btn-secondary { background: white; color: #1e3a5f; border: 1px solid #d2d2d7; }
    .btn-secondary:hover:not(:disabled) { background: #f5f5f7; }
    .btn-success { background: #34c759; color: white; }
    .btn-success:hover:not(:disabled) { background: #2db54d; }
    .btn-warning { background: #ff9500; color: white; }
    .btn-lg { padding: 0.75rem 1.5rem; font-size: 1rem; }
    
    /* Sub-tabs */
    .sub-tabs { display: flex; gap: 0; margin-bottom: 1.5rem; background: white; border-radius: 10px; padding: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .sub-tab { padding: 0.6rem 1.25rem; border-radius: 8px; cursor: pointer; font-size: 0.8125rem; font-weight: 500; color: #6e6e73; transition: all 0.15s; display: flex; align-items: center; gap: 0.5rem; }
    .sub-tab:hover { color: #1e3a5f; }
    .sub-tab.active { background: #0088c2; color: white; }
    .sub-tab .count { background: rgba(0,0,0,0.1); padding: 0.1rem 0.4rem; border-radius: 6px; font-size: 0.7rem; }
    .sub-tab.active .count { background: rgba(255,255,255,0.2); }
    
    /* Table */
    .table-container { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden; }
    .orders-table { width: 100%; border-collapse: collapse; }
    .orders-table th { text-align: left; padding: 1rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; border-bottom: 1px solid rgba(0,0,0,0.06); background: #f5f5f7; }
    .orders-table td { padding: 1rem; border-bottom: 1px solid rgba(0,0,0,0.06); font-size: 0.875rem; }
    .orders-table tr:hover { background: rgba(0,136,194,0.04); }
    
    .status-badge { padding: 0.25rem 0.75rem; border-radius: 980px; font-size: 0.75rem; font-weight: 500; }
    .status-pending { background: rgba(255,149,0,0.12); color: #ff9500; }
    .status-review { background: rgba(0,136,194,0.12); color: #0088c2; }
    .status-sent { background: rgba(52,199,89,0.12); color: #34c759; }
    .status-nodraft { background: rgba(255,59,48,0.12); color: #ff3b30; }
    
    .checkbox { width: 18px; height: 18px; accent-color: #0088c2; cursor: pointer; }
    .toolbar { display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: center; flex-wrap: wrap; }
    .search-box { background: white; border: 1px solid #d2d2d7; border-radius: 8px; padding: 0.5rem 0.75rem; color: #1e3a5f; width: 200px; font-size: 0.875rem; }
    .search-box:focus { outline: none; border-color: #0088c2; }
    .filter-select { background: white; border: 1px solid #d2d2d7; border-radius: 8px; padding: 0.5rem 0.75rem; color: #1e3a5f; font-size: 0.875rem; min-width: 150px; }
    
    .bulk-actions { display: flex; gap: 0.5rem; align-items: center; padding: 0.5rem 1rem; background: #e3f2fd; border-radius: 8px; }
    .bulk-actions.hidden { display: none; }
    
    /* Modal */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: white; border-radius: 18px; max-width: 1200px; width: 95%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; background: #f5f5f7; }
    .modal-header h2 { font-size: 1.25rem; font-weight: 600; color: #1e3a5f; display: flex; align-items: center; gap: 0.75rem; }
    .modal-close { background: #e5e5e5; border: none; color: #86868b; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 1.25rem; }
    .modal-close:hover { background: #d2d2d7; color: #1e3a5f; }
    
    .modal-tabs { display: flex; border-bottom: 1px solid rgba(0,0,0,0.06); background: #f5f5f7; padding: 0 1rem; }
    .modal-tab { padding: 1rem 1.25rem; cursor: pointer; color: #86868b; border-bottom: 2px solid transparent; transition: all 0.15s; font-size: 0.875rem; font-weight: 500; margin-bottom: -1px; }
    .modal-tab:hover { color: #1e3a5f; }
    .modal-tab.active { color: #0088c2; border-bottom-color: #0088c2; background: white; border-radius: 8px 8px 0 0; }
    
    .modal-body { flex: 1; overflow-y: auto; padding: 1.5rem; }
    .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: flex-end; gap: 1rem; background: #f5f5f7; }
    
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
    /* Info boxes */
    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .info-box { background: #f5f5f7; border-radius: 12px; padding: 1rem; }
    .info-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; margin-bottom: 0.25rem; }
    .info-value { font-size: 1rem; font-weight: 600; color: #1e3a5f; }
    
    .summary-boxes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .summary-box { background: #f5f5f7; border-radius: 12px; padding: 1.25rem; text-align: center; }
    .summary-box.highlight { background: linear-gradient(135deg, rgba(0,136,194,0.1), rgba(0,136,194,0.05)); }
    .summary-box.green { background: linear-gradient(135deg, rgba(52,199,89,0.1), rgba(52,199,89,0.05)); }
    .summary-number { font-size: 2rem; font-weight: 700; color: #1e3a5f; }
    .summary-box.highlight .summary-number { color: #0088c2; }
    .summary-box.green .summary-number { color: #34c759; }
    .summary-label { font-size: 0.75rem; color: #86868b; margin-top: 0.25rem; }
    
    /* Pack details */
    .pack-details { background: #f5f5f7; border-radius: 12px; padding: 1.25rem; margin-top: 1rem; }
    .pack-details h4 { margin: 0 0 1rem 0; color: #1e3a5f; font-size: 0.875rem; font-weight: 600; }
    .pack-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
    .pack-item-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.02em; color: #86868b; margin-bottom: 0.25rem; }
    .pack-item-value { font-size: 1.1rem; font-weight: 600; color: #1e3a5f; }
    .pack-item-value.success { color: #34c759; }
    .pack-item-value.warning { color: #ff9500; }
    .pack-item-value.muted { color: #86868b; font-style: italic; font-weight: 400; font-size: 0.875rem; }
    
    /* Alerts */
    .alert { border-radius: 12px; padding: 1rem; margin-top: 1rem; font-size: 0.875rem; }
    .alert-warning { background: rgba(255,149,0,0.1); border: 1px solid rgba(255,149,0,0.3); color: #1e3a5f; }
    .alert-success { background: rgba(52,199,89,0.1); border: 1px solid rgba(52,199,89,0.3); color: #1e3a5f; }
    .alert-info { background: rgba(0,136,194,0.1); border: 1px solid rgba(0,136,194,0.3); color: #1e3a5f; }
    .alert-danger { background: rgba(255,59,48,0.1); border: 1px solid rgba(255,59,48,0.3); color: #c62828; }
    
    /* UOM badges */
    .uom-badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 6px; font-size: 0.65rem; font-weight: 600; }
    .uom-ea { background: #34c759; color: white; }
    .uom-as { background: #ff9500; color: white; }
    .uom-st { background: #0088c2; color: white; }
    
    /* Line items table */
    .line-items-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    .line-items-table th { text-align: left; padding: 0.75rem; background: #f5f5f7; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; }
    .line-items-table td { padding: 0.75rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
    
    /* Data tables */
    .data-section { margin-bottom: 2rem; }
    .data-section h3 { font-size: 0.9375rem; margin-bottom: 1rem; color: #1e3a5f; font-weight: 600; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; background: white; border-radius: 8px; overflow: hidden; }
    .data-table th { text-align: left; padding: 0.5rem 0.75rem; background: #f5f5f7; font-size: 0.65rem; text-transform: uppercase; color: #86868b; }
    .data-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .data-table td:first-child { font-family: ui-monospace, monospace; font-size: 0.75rem; color: #86868b; max-width: 300px; word-break: break-all; }
    .data-table tr.has-value { background: rgba(0,136,194,0.04); }
    .data-table tr.has-value td:first-child { color: #1e3a5f; }
    .empty-value { color: #d2d2d7; font-style: italic; }
    
    .raw-search { width: 100%; padding: 0.75rem; background: #f5f5f7; border: 1px solid #d2d2d7; border-radius: 8px; color: #1e3a5f; margin-bottom: 1rem; font-size: 0.875rem; }
    .raw-search:focus { outline: none; border-color: #0088c2; }
    
    /* Match Review Styles */
    .match-summary { background: #e8f5e9; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
    .match-summary h3 { margin: 0; color: #1e3a5f; }
    .match-summary p { margin: 0.25rem 0 0 0; color: #6e6e73; font-size: 0.875rem; }
    
    .match-card { background: white; border: 1px solid #e5e5e5; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; transition: all 0.15s; }
    .match-card:hover { border-color: #0088c2; }
    .match-card.selected { border-color: #0088c2; background: rgba(0,136,194,0.04); }
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
    
    .match-actions { display: flex; gap: 0.75rem; margin-top: 1rem; align-items: center; }
    .include-checkbox { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #6e6e73; }
    
    /* Comparison modal */
    .comparison-modal { width: 1200px; }
    .comparison-header { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 1.5rem; }
    .comparison-side { padding: 1.25rem; border-radius: 12px; }
    .comparison-side.edi { background: linear-gradient(135deg, #e3f2fd, #bbdefb); }
    .comparison-side.zoho { background: linear-gradient(135deg, #e8f5e9, #c8e6c9); }
    .comparison-side h3 { margin: 0 0 1rem 0; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .comparison-field { margin-bottom: 0.75rem; }
    .comparison-field-label { font-size: 0.7rem; color: #6e6e73; text-transform: uppercase; }
    .comparison-field-value { font-size: 0.9375rem; font-weight: 500; color: #1e3a5f; }
    .comparison-total { font-size: 1.5rem; font-weight: 700; color: #1e3a5f; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.1); }
    
    .changes-summary { background: #fff3e0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.75rem; }
    .changes-summary.no-changes { background: #e8f5e9; }
    
    .line-comparison-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    .line-comparison-table th { padding: 0.75rem; text-align: left; background: #f5f5f7; font-size: 0.7rem; text-transform: uppercase; color: #86868b; }
    .line-comparison-table td { padding: 0.75rem; border-bottom: 1px solid #f0f0f0; }
    .line-comparison-table .edi-col { background: rgba(227, 242, 253, 0.3); }
    .line-comparison-table .zoho-col { background: rgba(232, 245, 233, 0.3); }
    .line-comparison-table .divider { width: 1px; background: #e5e5e5; }
    
    .toast { position: fixed; bottom: 2rem; right: 2rem; background: #1e3a5f; color: white; padding: 1rem 1.5rem; border-radius: 12px; display: none; z-index: 2000; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .toast.show { display: block; }
    .empty-state { text-align: center; padding: 3rem; color: #86868b; }
    
    .no-draft-section { margin-top: 2rem; padding-top: 2rem; border-top: 2px dashed #ff9500; }
    .no-draft-section h3 { color: #ff9500; margin-bottom: 1rem; }
    
    @media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } .info-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 768px) { .sidebar { display: none; } }
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
      <div class="nav-item active" id="navOrders" onclick="showTab('orders', this)">
        📥 EDI Orders <span class="nav-badge" id="inboxBadge">0</span>
      </div>
      <div class="nav-item" id="navReview" onclick="showTab('review', this)">
        🔍 Ready to Review <span class="nav-badge blue" id="reviewBadge" style="display:none">0</span>
      </div>
      <div class="nav-item" id="navSent" onclick="showTab('sent', this)">
        ✅ In Zoho <span class="nav-badge green" id="sentBadge" style="display:none">0</span>
      </div>
      <div class="nav-title">Settings</div>
      <div class="nav-item" onclick="showTab('mappings', this)">🔗 Customer Mappings</div>
      <div class="nav-title">History</div>
      <div class="nav-item" onclick="showTab('activity', this)">📊 Activity Log</div>
    </div>
    
    <div class="content">
      <div class="stats-grid">
        <div class="stat-card" onclick="filterByStatus('pending')">
          <div class="stat-label">📥 Inbox</div>
          <div class="stat-value" id="statInbox">0</div>
        </div>
        <div class="stat-card info" onclick="filterByStatus('ready_to_review')">
          <div class="stat-label">🔍 Ready to Review</div>
          <div class="stat-value" id="statReview">0</div>
        </div>
        <div class="stat-card warning" onclick="filterByStatus('no_draft')">
          <div class="stat-label">⚠️ No Draft Found</div>
          <div class="stat-value" id="statNoDraft">0</div>
        </div>
        <div class="stat-card success" onclick="filterByStatus('sent')">
          <div class="stat-label">✅ In Zoho</div>
          <div class="stat-value" id="statSent">0</div>
        </div>
      </div>
      
      <!-- EDI Orders Tab -->
      <div id="tabOrders">
        <div class="sub-tabs" id="orderSubTabs">
          <div class="sub-tab active" onclick="setOrderFilter('all', this)">All <span class="count" id="countAll">0</span></div>
          <div class="sub-tab" onclick="setOrderFilter('pending', this)">📥 Inbox <span class="count" id="countPending">0</span></div>
          <div class="sub-tab" onclick="setOrderFilter('ready_to_review', this)">🔍 Ready to Review <span class="count" id="countReady">0</span></div>
          <div class="sub-tab" onclick="setOrderFilter('no_draft', this)">⚠️ No Draft <span class="count" id="countNoDraft">0</span></div>
          <div class="sub-tab" onclick="setOrderFilter('sent', this)">✅ In Zoho <span class="count" id="countSent">0</span></div>
        </div>
        
        <div class="toolbar">
          <input type="text" class="search-box" placeholder="Search PO#..." id="searchBox" onkeyup="filterOrders()">
          <select class="filter-select" id="customerFilter" onchange="filterOrders()"><option value="">All Customers</option></select>
          <div style="flex:1"></div>
          <div class="bulk-actions hidden" id="bulkActions">
            <span id="selectedCount">0 selected</span>
            <button class="btn btn-success" onclick="sendSelectedToZoho()">✓ Send to Zoho</button>
          </div>
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
      
      <!-- Ready to Review Tab -->
      <div id="tabReview" style="display:none">
        <div class="toolbar">
          <input type="text" class="search-box" placeholder="Search PO#..." id="reviewSearchBox" onkeyup="filterMatchResults()">
          <select class="filter-select" id="reviewCustomerFilter" onchange="filterMatchResults()"><option value="">All Customers</option></select>
          <select class="filter-select" id="confidenceFilter" onchange="filterMatchResults()">
            <option value="">All Confidence</option>
            <option value="perfect">Perfect (100%)</option>
            <option value="high">High (80-99%)</option>
            <option value="medium">Medium (60-79%)</option>
            <option value="low">Low (&lt;60%)</option>
          </select>
          <div style="flex:1"></div>
          <div class="bulk-actions hidden" id="reviewBulkActions">
            <span id="reviewSelectedCount">0 selected</span>
            <button class="btn btn-success" onclick="sendSelectedMatchesToZoho()">✓ Send Selected to Zoho</button>
          </div>
        </div>
        <div id="matchReviewContent">
          <div class="empty-state">
            <p style="font-size:1.25rem;margin-bottom:1rem;">No matches to review</p>
            <p>Go to <strong>EDI Orders</strong> and click <strong>"Find Matches"</strong> to search for matching Zoho drafts.</p>
          </div>
        </div>
      </div>
      
      <!-- In Zoho Tab -->
      <div id="tabSent" style="display:none">
        <h2 style="margin-bottom:1rem;font-weight:600">✅ Orders In Zoho</h2>
        <div class="toolbar">
          <input type="text" class="search-box" placeholder="Search PO#..." id="sentSearchBox">
          <select class="filter-select" id="sentCustomerFilter"><option value="">All Customers</option></select>
        </div>
        <div class="table-container">
          <table class="orders-table">
            <thead><tr><th>PO #</th><th>Customer</th><th>Zoho SO#</th><th>Value</th><th>Sent At</th><th>Matched Draft</th><th>Actions</th></tr></thead>
            <tbody id="sentOrdersTable"><tr><td colspan="7" class="empty-state">No orders sent yet</td></tr></tbody>
          </table>
        </div>
      </div>
      
      <!-- Customer Mappings Tab -->
      <div id="tabMappings" style="display:none">
        <h2 style="margin-bottom:1rem;font-weight:600">Customer Mappings</h2>
        <div id="mappingsContent"></div>
      </div>
      
      <!-- Activity Tab -->
      <div id="tabActivity" style="display:none">
        <h2 style="margin-bottom:1rem;font-weight:600">Activity Log</h2>
        <div id="activityContent"><p style="color:#86868b">Activity log coming soon...</p></div>
      </div>
    </div>
  </div>
  
  <div id="modalContainer"></div>
  <div class="toast" id="toast"><span id="toastMsg"></span></div>
  <script>
    // ============================================================
    // STATE
    // ============================================================
    let orders = [];
    let selectedIds = new Set();
    let matchResults = null;
    let selectedMatchIds = new Set();
    let currentOrder = null;
    let currentRawFields = {};
    let currentOrderFilter = 'all';
    
    document.addEventListener('DOMContentLoaded', () => { loadOrders(); });
    
    // ============================================================
    // TAB NAVIGATION
    // ============================================================
    
    function showTab(tab, el) {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      if (el) el.classList.add('active');
      ['tabOrders','tabReview','tabSent','tabMappings','tabActivity'].forEach(t => {
        const elem = document.getElementById(t);
        if (elem) elem.style.display = 'none';
      });
      const tabId = 'tab' + tab.charAt(0).toUpperCase() + tab.slice(1);
      document.getElementById(tabId).style.display = 'block';
      if (tab === 'sent') loadSentOrders();
      if (tab === 'mappings') loadMappings();
    }
    
    function setOrderFilter(filter, el) {
      currentOrderFilter = filter;
      document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
      if (el) el.classList.add('active');
      renderOrders();
    }
    
    function filterByStatus(status) {
      showTab('orders', document.getElementById('navOrders'));
      currentOrderFilter = status;
      document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
      renderOrders();
    }
    
    // ============================================================
    // LOAD & RENDER ORDERS
    // ============================================================
    
    async function loadOrders() {
      try {
        const res = await fetch('/orders');
        orders = await res.json();
        renderOrders();
        updateCustomerFilter();
        updateStats();
      } catch (e) { toast('Failed to load orders'); }
    }
    
    function updateStats() {
      const pending = orders.filter(o => o.status === 'pending' && !o.zoho_so_id).length;
      const review = orders.filter(o => o.status === 'ready_to_review' || o.status === 'matched').length;
      const noDraft = orders.filter(o => o.status === 'no_draft').length;
      const sent = orders.filter(o => o.status === 'sent' || o.status === 'processed' || o.zoho_so_id).length;
      
      document.getElementById('statInbox').textContent = pending;
      document.getElementById('statReview').textContent = review;
      document.getElementById('statNoDraft').textContent = noDraft;
      document.getElementById('statSent').textContent = sent;
      
      document.getElementById('inboxBadge').textContent = pending;
      
      const reviewBadge = document.getElementById('reviewBadge');
      if (matchResults && matchResults.matches) {
        reviewBadge.textContent = matchResults.matches.length;
        reviewBadge.style.display = matchResults.matches.length > 0 ? 'inline' : 'none';
      }
      
      const sentBadge = document.getElementById('sentBadge');
      sentBadge.textContent = sent;
      sentBadge.style.display = sent > 0 ? 'inline' : 'none';
      
      // Update sub-tab counts
      document.getElementById('countAll').textContent = orders.length;
      document.getElementById('countPending').textContent = pending;
      document.getElementById('countReady').textContent = review;
      document.getElementById('countNoDraft').textContent = noDraft;
      document.getElementById('countSent').textContent = sent;
    }
    
    function renderOrders() {
      const search = (document.getElementById('searchBox')?.value || '').toLowerCase();
      const customer = document.getElementById('customerFilter')?.value || '';
      
      let filtered = orders.filter(o => {
        // Status filter
        if (currentOrderFilter !== 'all') {
          if (currentOrderFilter === 'pending' && (o.status !== 'pending' || o.zoho_so_id)) return false;
          if (currentOrderFilter === 'ready_to_review' && o.status !== 'ready_to_review' && o.status !== 'matched') return false;
          if (currentOrderFilter === 'no_draft' && o.status !== 'no_draft') return false;
          if (currentOrderFilter === 'sent' && o.status !== 'sent' && o.status !== 'processed' && !o.zoho_so_id) return false;
        }
        // Search filter
        if (search && !(o.edi_order_number || '').toLowerCase().includes(search)) return false;
        // Customer filter
        if (customer && o.edi_customer_name !== customer) return false;
        return true;
      });
      
      const tbody = document.getElementById('ordersTable');
      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No orders found.</td></tr>';
        document.getElementById('orderCount').textContent = '';
        return;
      }
      
      tbody.innerHTML = filtered.map(o => {
        const items = o.parsed_data?.items || [];
        const amt = items.reduce((s,i) => s + (i.quantityOrdered||0)*(i.unitPrice||0), 0);
        
        let statusClass, statusText;
        if (o.zoho_so_id || o.status === 'sent' || o.status === 'processed') {
          statusClass = 'sent'; statusText = '✅ In Zoho';
        } else if (o.status === 'ready_to_review' || o.status === 'matched') {
          statusClass = 'review'; statusText = '🔍 Ready to Review';
        } else if (o.status === 'no_draft') {
          statusClass = 'nodraft'; statusText = '⚠️ No Draft';
        } else {
          statusClass = 'pending'; statusText = '📥 Inbox';
        }
        
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
      updateBulkActions();
    }
    
    function filterOrders() { renderOrders(); }
    
    function toggleSelect(id) { 
      selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id); 
      renderOrders(); 
    }
    
    function toggleAll() { 
      const c = document.getElementById('selectAll')?.checked; 
      orders.forEach(o => c ? selectedIds.add(o.id) : selectedIds.delete(o.id)); 
      renderOrders(); 
    }
    
    function updateBulkActions() {
      const bulkEl = document.getElementById('bulkActions');
      if (selectedIds.size > 0) {
        bulkEl.classList.remove('hidden');
        document.getElementById('selectedCount').textContent = selectedIds.size + ' selected';
      } else {
        bulkEl.classList.add('hidden');
      }
    }
    
    function updateCustomerFilter() {
      const customers = [...new Set(orders.map(o => o.edi_customer_name).filter(Boolean))].sort();
      const html = '<option value="">All Customers</option>' + customers.map(c => '<option value="' + c + '">' + c + '</option>').join('');
      document.getElementById('customerFilter').innerHTML = html;
      document.getElementById('reviewCustomerFilter').innerHTML = html;
    }
    
    // ============================================================
    // SFTP FETCH
    // ============================================================
    
    async function fetchFromSftp() {
      const btn = event.target;
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '⏳ Fetching...';
      
      try {
        const res = await fetch('/fetch-sftp', { method: 'POST' });
        const data = await res.json();
        btn.disabled = false;
        btn.innerHTML = originalText;
        toast(data.success ? 'Fetched ' + (data.result?.filesProcessed || 0) + ' files' : 'Error: ' + data.error);
        loadOrders();
      } catch (e) { 
        btn.disabled = false;
        btn.innerHTML = originalText;
        toast('Error: ' + e.message); 
      }
    }
    
    // ============================================================
    // ORDER DETAIL MODAL (FULL VERSION)
    // ============================================================
    
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
        
        currentRawFields = {};
        if (currentOrder.raw_edi) {
          const lines = currentOrder.raw_edi.split('\\n');
          if (lines.length >= 2) {
            const headers = parseCSVLine(lines[0]);
            const values = parseCSVLine(lines[1]);
            headers.forEach((h, i) => { currentRawFields[h.trim()] = values[i] || ''; });
          }
        }
        
        renderOrderModal();
      } catch (e) { toast('Failed to load order'); }
    }
    
    function renderOrderModal() {
      const o = currentOrder;
      const parsed = o.parsed_data || {};
      const items = parsed.items || [];
      const totalUnits = items.reduce((s, i) => s + (i.quantityOrdered || 0), 0);
      const totalValue = items.reduce((s, i) => s + ((i.quantityOrdered || 0) * (i.unitPrice || 0)), 0);
      
      const uom = currentRawFields['po_item_po_item_uom'] || items[0]?.unitOfMeasure || 'EA';
      const packPrice = parseFloat(currentRawFields['po_item_po_item_unit_price']) || 0;
      const itemPrice = parseFloat(currentRawFields['product_pack_product_pack_unit_price']) || 0;
      const packQty = parseInt(currentRawFields['product_pack_product_pack_product_qty']) || 0;
      const totalItems = parseInt(currentRawFields['product_pack_product_pack_product_qty_calculated']) || 0;
      const retailPrice = parseFloat(currentRawFields['po_item_attributes_retail_price']) || 0;
      const lineAmount = parseFloat(currentRawFields['po_item_attributes_amount']) || 0;
      
      const uomLabel = uom === 'AS' ? 'Prepack' : uom === 'EA' ? 'Each' : uom === 'ST' ? 'Set' : uom;
      const uomClass = uom === 'AS' ? 'uom-as' : uom === 'EA' ? 'uom-ea' : uom === 'ST' ? 'uom-st' : '';
      const hasItemPrice = itemPrice > 0;
      const hasPackQty = packQty > 0;
      
      const html = \`
        <div class="modal-overlay" onclick="closeModal()">
          <div class="modal" onclick="event.stopPropagation()">
            <div class="modal-header">
              <h2>Order Details - \${o.edi_order_number || 'N/A'} <span class="uom-badge \${uomClass}">\${uom} - \${uomLabel}</span></h2>
              <button class="modal-close" onclick="closeModal()">×</button>
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
                  <div class="info-box"><div class="info-label">PO Number</div><div class="info-value">\${o.edi_order_number || 'N/A'}</div></div>
                  <div class="info-box"><div class="info-label">Customer</div><div class="info-value">\${o.edi_customer_name || 'Unknown'}</div></div>
                  <div class="info-box"><div class="info-label">Order Date</div><div class="info-value">\${parsed.dates?.orderDate || currentRawFields['po_po_created']?.split(' ')[0] || 'N/A'}</div></div>
                  <div class="info-box"><div class="info-label">Unit of Measure</div><div class="info-value"><span class="uom-badge \${uomClass}">\${uom}</span> \${uomLabel}</div></div>
                </div>
                
                <div class="summary-boxes">
                  <div class="summary-box highlight"><div class="summary-number">\${items.length}</div><div class="summary-label">Line Items</div></div>
                  <div class="summary-box highlight"><div class="summary-number">\${totalUnits.toLocaleString()}</div><div class="summary-label">Units Ordered</div></div>
                  <div class="summary-box green"><div class="summary-number">$\${totalValue.toLocaleString('en-US', {minimumFractionDigits: 2})}</div><div class="summary-label">Total Value</div></div>
                </div>
                
                <div class="pack-details">
                  <h4>📦 Pack & Pricing Details</h4>
                  <div class="pack-grid">
                    <div><div class="pack-item-label">Unit Price (per \${uom})</div><div class="pack-item-value">$\${packPrice.toFixed(2)}</div></div>
                    <div><div class="pack-item-label">Item Price (per each)</div>\${hasItemPrice ? \`<div class="pack-item-value success">$\${itemPrice.toFixed(2)}</div>\` : \`<div class="pack-item-value muted">Not provided in EDI</div>\`}</div>
                    <div><div class="pack-item-label">Items per Pack</div>\${hasPackQty ? \`<div class="pack-item-value">\${packQty}</div>\` : \`<div class="pack-item-value muted">Not provided in EDI</div>\`}</div>
                    \${totalItems > 0 ? \`<div><div class="pack-item-label">Total Items</div><div class="pack-item-value">\${totalItems.toLocaleString()}</div></div>\` : ''}
                    \${retailPrice > 0 ? \`<div><div class="pack-item-label">Retail Price</div><div class="pack-item-value warning">$\${retailPrice.toFixed(2)}</div></div>\` : ''}
                    <div><div class="pack-item-label">Line Amount</div><div class="pack-item-value">$\${lineAmount > 0 ? lineAmount.toLocaleString('en-US', {minimumFractionDigits: 2}) : totalValue.toFixed(2)}</div></div>
                  </div>
                </div>
                
                \${(uom === 'AS' && !hasItemPrice) ? \`<div class="alert alert-warning"><strong>⚠️ Prepack Order:</strong> This is a prepack/assortment order. The unit price ($\${packPrice.toFixed(2)}) is for the entire prepack bundle.</div>\` : ''}
                \${o.zoho_so_number || o.zoho_so_id ? \`<div class="alert alert-success"><strong>✅ In Zoho:</strong> Sales Order \${o.zoho_so_number || o.zoho_so_id}</div>\` : ''}
              </div>
              
              <!-- Line Items Tab -->
              <div class="tab-content" id="tab-items">
                <div style="background:#f5f5f7;border-radius:8px;padding:0.75rem 1rem;margin-bottom:1rem;display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.8125rem;">
                  <div><span class="uom-badge uom-ea">EA</span> Each - Individual items</div>
                  <div><span class="uom-badge uom-as">AS</span> Assortment - Prepack bundle</div>
                  <div><span class="uom-badge uom-st">ST</span> Set - Multiple items per unit</div>
                </div>
                
                \${(hasPackQty || hasItemPrice) ? \`<div class="alert alert-info" style="margin-bottom:1rem;"><strong>📦 Pack Info:</strong> \${hasPackQty ? \`Pack contains <strong>\${packQty}</strong> items. \` : ''}\${hasItemPrice ? \`Item price: <strong>$\${itemPrice.toFixed(2)}</strong> per each.\` : ''}</div>\` : ''}
                
                <div class="table-container">
                  <table class="line-items-table">
                    <thead><tr><th>#</th><th>Style/SKU</th><th>Description</th><th>Color</th><th>Size</th><th>UOM</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
                    <tbody>
                      \${items.map((item, idx) => {
                        const itemUom = item.unitOfMeasure || uom;
                        const iuomClass = itemUom === 'AS' ? 'uom-as' : itemUom === 'EA' ? 'uom-ea' : itemUom === 'ST' ? 'uom-st' : '';
                        return \`<tr>
                          <td>\${item.lineNumber || idx + 1}</td>
                          <td><strong>\${item.productIds?.sku || item.productIds?.vendorItemNumber || item.productIds?.buyerItemNumber || 'N/A'}</strong></td>
                          <td>\${item.description || ''}</td>
                          <td>\${item.color || ''}</td>
                          <td>\${item.size || ''}</td>
                          <td><span class="uom-badge \${iuomClass}">\${itemUom}</span></td>
                          <td style="text-align:right">\${item.quantityOrdered || 0}</td>
                          <td style="text-align:right">$\${(item.unitPrice || 0).toFixed(2)}</td>
                          <td style="text-align:right"><strong>$\${((item.quantityOrdered || 0) * (item.unitPrice || 0)).toFixed(2)}</strong></td>
                        </tr>\`;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <!-- Pricing Tab -->
              <div class="tab-content" id="tab-pricing">
                <div class="data-section">
                  <h3>💰 Price Fields</h3>
                  <table class="data-table">
                    <thead><tr><th>Field Name</th><th>Value</th></tr></thead>
                    <tbody>
                      \${Object.entries(currentRawFields).filter(([k]) => k.toLowerCase().includes('price') || k.toLowerCase().includes('amount') || k.toLowerCase().includes('cost') || k.toLowerCase().includes('rate')).map(([k, v]) => \`<tr class="\${v ? 'has-value' : ''}"><td>\${k}</td><td>\${v || '<span class="empty-value">(empty)</span>'}</td></tr>\`).join('') || '<tr><td colspan="2">No price fields found</td></tr>'}
                    </tbody>
                  </table>
                </div>
                <div class="data-section">
                  <h3>📦 Quantity & Pack Fields</h3>
                  <table class="data-table">
                    <thead><tr><th>Field Name</th><th>Value</th></tr></thead>
                    <tbody>
                      \${Object.entries(currentRawFields).filter(([k]) => k.toLowerCase().includes('qty') || k.toLowerCase().includes('quantity') || k.toLowerCase().includes('pack') || k.toLowerCase().includes('inner') || k.toLowerCase().includes('uom')).map(([k, v]) => \`<tr class="\${v ? 'has-value' : ''}"><td>\${k}</td><td>\${v || '<span class="empty-value">(empty)</span>'}</td></tr>\`).join('') || '<tr><td colspan="2">No quantity fields found</td></tr>'}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <!-- Shipping Tab -->
              <div class="tab-content" id="tab-shipping">
                <div class="info-grid" style="grid-template-columns: 1fr 1fr;">
                  <div class="info-box">
                    <div class="info-label">Ship To</div>
                    <div class="info-value" style="font-size:0.9375rem;line-height:1.5;">
                      <strong>\${currentRawFields['ship_to_location_tp_location_name'] || 'N/A'}</strong><br>
                      \${currentRawFields['ship_to_location_tp_location_address'] || ''}<br>
                      \${currentRawFields['ship_to_location_tp_location_city'] || ''}, \${currentRawFields['ship_to_location_tp_location_state_province'] || ''} \${currentRawFields['ship_to_location_tp_location_postal'] || ''}
                    </div>
                  </div>
                  <div class="info-box">
                    <div class="info-label">Shipping Dates</div>
                    <div class="info-value" style="font-size:0.9375rem;line-height:1.8;">
                      <strong>Ship Open:</strong> \${currentRawFields['po_po_ship_open_date'] || 'N/A'}<br>
                      <strong>Ship Close:</strong> \${currentRawFields['po_po_ship_close_date'] || 'N/A'}<br>
                      <strong>Must Arrive:</strong> \${currentRawFields['po_attributes_must_arrive_by_date'] || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Raw Data Tab -->
              <div class="tab-content" id="tab-raw">
                <input type="text" class="raw-search" placeholder="Search fields..." id="rawSearch" onkeyup="filterRawData()">
                <div style="max-height:400px;overflow-y:auto">
                  <table class="data-table" id="rawDataTable">
                    <thead><tr><th style="width:50px">#</th><th>Field Name</th><th>Value</th></tr></thead>
                    <tbody>
                      \${Object.entries(currentRawFields).map(([k, v], idx) => \`<tr class="raw-row \${v ? 'has-value' : ''}" data-field="\${k.toLowerCase()}" data-value="\${(v || '').toLowerCase()}"><td style="color:#86868b">\${idx}</td><td>\${k}</td><td>\${v || '<span class="empty-value">(empty)</span>'}</td></tr>\`).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="closeModal()">Close</button>
              \${!o.zoho_so_id && o.status !== 'sent' && o.status !== 'processed' ? '<button class="btn btn-success" onclick="sendToZoho(' + o.id + ')">Send to Zoho</button>' : ''}
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
        row.style.display = (row.dataset.field.includes(search) || row.dataset.value.includes(search)) ? '' : 'none';
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
        if (data.success) { toast('Order sent! SO#: ' + (data.zohoSoNumber || 'Created')); closeModal(); loadOrders(); }
        else { toast('Error: ' + (data.error || 'Unknown')); }
      } catch (e) { toast('Error: ' + e.message); }
    }
    
    // ============================================================
    // MATCHING SYSTEM
    // ============================================================
    
    async function findMatches() {
      const btn = event.target;
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '⏳ Finding Matches...';
      
      // Only get orders that haven't been sent to Zoho
      const pendingOrders = orders.filter(o => !o.zoho_so_id && o.status !== 'sent' && o.status !== 'processed');
      if (pendingOrders.length === 0) { 
        toast('No pending orders to match'); 
        btn.disabled = false;
        btn.innerHTML = originalText;
        return; 
      }
      
      // Show persistent progress
      document.getElementById('matchReviewContent').innerHTML = `
        <div style="text-align:center;padding:3rem;">
          <div style="font-size:3rem;margin-bottom:1rem;">⏳</div>
          <h3 style="margin-bottom:0.5rem;">Finding Matches...</h3>
          <p style="color:#86868b;">Searching ${pendingOrders.length} EDI orders against Zoho drafts.</p>
          <p style="color:#86868b;">This may take 1-2 minutes. Please wait...</p>
          <div style="margin-top:1.5rem;width:200px;height:4px;background:#e5e5e5;border-radius:2px;margin:1.5rem auto;overflow:hidden;">
            <div style="width:100%;height:100%;background:linear-gradient(90deg,#0088c2,#34c759,#0088c2);background-size:200% 100%;animation:loading 1.5s ease-in-out infinite;"></div>
          </div>
        </div>
      `;
      showTab('review', document.getElementById('navReview'));
      
      try {
        const res = await fetch('/find-matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: pendingOrders.map(o => o.id) })
        });
        const data = await res.json();
        btn.disabled = false;
        btn.innerHTML = originalText;
        if (data.success) {
          // Filter out any matches where the order is already in Zoho
          data.matches = (data.matches || []).filter(m => {
            const order = orders.find(o => o.id === m.ediOrder.id);
            return !order?.zoho_so_id && order?.status !== 'sent' && order?.status !== 'processed';
          });
          
          matchResults = data;
          selectedMatchIds = new Set();
          showMatchReview(data);
          updateStats();
          toast('Found ' + (data.matches?.length || 0) + ' matches');
        } else { toast('Error: ' + (data.error || 'Unknown')); }
      } catch (e) { 
        btn.disabled = false;
        btn.innerHTML = originalText;
        toast('Error: ' + e.message); 
      }
    }
    
    function filterMatchResults() {
      if (!matchResults) return;
      showMatchReview(matchResults);
    }
    
    function showMatchReview(data) {
      let matches = data.matches || [];
      const noMatches = data.noMatches || [];
      
      // Apply filters
      const search = (document.getElementById('reviewSearchBox')?.value || '').toLowerCase();
      const customer = document.getElementById('reviewCustomerFilter')?.value || '';
      const confidence = document.getElementById('confidenceFilter')?.value || '';
      
      let filteredMatches = [...matches];
      
      if (search) {
        filteredMatches = filteredMatches.filter(m => (m.ediOrder.poNumber || '').toLowerCase().includes(search));
      }
      if (customer) {
        filteredMatches = filteredMatches.filter(m => m.ediOrder.customer === customer);
      }
      if (confidence) {
        filteredMatches = filteredMatches.filter(m => {
          const conf = m.confidence || 0;
          if (confidence === 'perfect') return conf === 100;
          if (confidence === 'high') return conf >= 80 && conf < 100;
          if (confidence === 'medium') return conf >= 60 && conf < 80;
          if (confidence === 'low') return conf < 60;
          return true;
        });
      }
      
      // Update review badge
      const reviewBadge = document.getElementById('reviewBadge');
      reviewBadge.textContent = matches.length;
      reviewBadge.style.display = matches.length > 0 ? 'inline' : 'none';
      
      let html = `
        <div class="match-summary">
          <div>
            <h3>Found ${matches.length} potential matches</h3>
            <p>${filteredMatches.length !== matches.length ? 'Showing ' + filteredMatches.length + ' filtered • ' : ''}${noMatches.length} orders have no draft</p>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-secondary" onclick="clearMatchResults()">Clear Results</button>
            <button class="btn btn-success btn-lg" onclick="sendAllMatchesToZoho()" ${filteredMatches.length === 0 ? 'disabled' : ''}>✓ Send All to Zoho</button>
          </div>
        </div>
      `;
      
      // Render filtered matches
      filteredMatches.forEach((match, idx) => {
        const actualIdx = matches.indexOf(match);
        const conf = match.confidence || 0;
        const confLevel = conf === 100 ? 'high' : conf >= 80 ? 'high' : conf >= 60 ? 'medium' : 'low';
        const isSelected = selectedMatchIds.has(match.ediOrder.id);
        
        html += `
          <div class="match-card ${isSelected ? 'selected' : ''}" onclick="toggleMatchSelect(${match.ediOrder.id}, event)">
            <div class="match-card-header">
              <div>
                <div class="match-po">PO# ${match.ediOrder.poNumber}</div>
                <div class="match-customer">${match.ediOrder.customer}</div>
              </div>
              <div style="text-align:right">
                <div class="confidence-badge confidence-${confLevel}">${conf}%</div>
                <div style="font-size:0.75rem;color:#86868b;margin-top:0.25rem">${conf === 100 ? 'Perfect Match' : conf >= 80 ? 'High' : conf >= 60 ? 'Medium' : 'Low'}</div>
              </div>
            </div>
            <div class="match-criteria">
              <span class="criteria-badge ${match.score.details.poNumber ? 'criteria-matched' : 'criteria-unmatched'}">${match.score.details.poNumber ? '✓' : '○'} PO Number</span>
              <span class="criteria-badge ${match.score.details.customer ? 'criteria-matched' : 'criteria-unmatched'}">${match.score.details.customer ? '✓' : '○'} Customer</span>
              <span class="criteria-badge ${match.score.details.shipDate ? 'criteria-matched' : 'criteria-unmatched'}">${match.score.details.shipDate ? '✓' : '○'} Ship Date</span>
              <span class="criteria-badge ${match.score.details.totalAmount ? 'criteria-matched' : 'criteria-unmatched'}">${match.score.details.totalAmount ? '✓' : '○'} Total Amount</span>
              <span class="criteria-badge ${match.score.details.styles ? 'criteria-matched' : 'criteria-unmatched'}">${match.score.details.styles ? '✓' : '○'} Styles</span>
            </div>
            <div class="match-comparison">
              <div class="match-side edi">
                <div class="match-side-label">EDI Order</div>
                <div class="match-side-amount">\$${match.ediOrder.totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</div>
                <div class="match-side-detail">${match.ediOrder.itemCount} items • ${match.ediOrder.totalUnits.toLocaleString()} units</div>
              </div>
              <div class="match-side zoho">
                <div class="match-side-label">Zoho #${match.zohoDraft.number}</div>
                <div class="match-side-amount">\$${match.zohoDraft.totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</div>
                <div class="match-side-detail">${match.zohoDraft.itemCount} items • ${match.zohoDraft.status}</div>
              </div>
            </div>
            <div class="match-actions" onclick="event.stopPropagation()">
              <button class="btn btn-secondary" onclick="viewOrder(${match.ediOrder.id})">📄 EDI Details</button>
              <button class="btn btn-secondary" onclick="window.open('https://books.zoho.com/app/677681121#/salesorders/${match.zohoDraft.id}','_blank')">🔗 Zoho Order</button>
              <button class="btn btn-primary" onclick="showComparison(${actualIdx})">Compare Side-by-Side</button>
              <div style="flex:1"></div>
              <label class="include-checkbox" onclick="event.stopPropagation()">
                <input type="checkbox" class="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleMatchSelect(${match.ediOrder.id}, event)">
                Select
              </label>
            </div>
          </div>
        `;
      });
      
      // No Draft Found Section
      if (noMatches.length > 0) {
        html += `
          <div class="no-draft-section">
            <h3>⚠️ No Draft Found (${noMatches.length})</h3>
            <p style="color:#86868b;margin-bottom:1rem">These orders have no matching Zoho draft. Review carefully before creating new orders.</p>
        `;
        
        noMatches.slice(0, 10).forEach((item) => {
          html += `
            <div class="match-card" style="border-left:4px solid #ff9500">
              <div class="match-card-header">
                <div>
                  <div class="match-po">PO# ${item.ediOrder.poNumber}</div>
                  <div class="match-customer">${item.ediOrder.customer}</div>
                </div>
                <span class="status-badge status-nodraft">No Draft</span>
              </div>
              <div class="match-side edi" style="max-width:400px">
                <div class="match-side-label">EDI Order</div>
                <div class="match-side-amount">\$${item.ediOrder.totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</div>
                <div class="match-side-detail">${item.ediOrder.itemCount} items</div>
              </div>
              <div class="match-actions">
                <button class="btn btn-secondary" onclick="viewOrder(${item.ediOrder.id})">📄 EDI Details</button>
                <button class="btn btn-warning" onclick="createNewInZoho(${item.ediOrder.id})">➕ Create New in Zoho</button>
              </div>
            </div>
          `;
        });
        
        if (noMatches.length > 10) {
          html += `<p style="color:#86868b;margin-top:1rem">...and ${noMatches.length - 10} more</p>`;
        }
        html += '</div>';
      }
      
      // Bulk actions bar
      html += `
        <div style="margin-top:2rem;padding:1.5rem;background:#f5f5f7;border-radius:12px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <span style="font-weight:600" id="matchSelectCount">${selectedMatchIds.size}</span> orders selected
          </div>
          <div style="display:flex;gap:1rem">
            <button class="btn btn-secondary" onclick="selectAllMatches()">Select All Visible</button>
            <button class="btn btn-secondary" onclick="clearMatchSelection()">Clear Selection</button>
            <button class="btn btn-success btn-lg" onclick="sendSelectedMatchesToZoho()" ${selectedMatchIds.size === 0 ? 'disabled' : ''}>✓ Send Selected to Zoho</button>
          </div>
        </div>
      `;
      
      document.getElementById('matchReviewContent').innerHTML = html;
    }
    
    function toggleMatchSelect(ediOrderId, event) {
      if (event) event.stopPropagation();
      if (selectedMatchIds.has(ediOrderId)) {
        selectedMatchIds.delete(ediOrderId);
      } else {
        selectedMatchIds.add(ediOrderId);
      }
      showMatchReview(matchResults);
    }
    
    function selectAllMatches() {
      if (matchResults && matchResults.matches) {
        // Only select visible/filtered matches
        const search = (document.getElementById('reviewSearchBox')?.value || '').toLowerCase();
        const customer = document.getElementById('reviewCustomerFilter')?.value || '';
        const confidence = document.getElementById('confidenceFilter')?.value || '';
        
        matchResults.matches.forEach(m => {
          let include = true;
          if (search && !(m.ediOrder.poNumber || '').toLowerCase().includes(search)) include = false;
          if (customer && m.ediOrder.customer !== customer) include = false;
          if (confidence) {
            const conf = m.confidence || 0;
            if (confidence === 'perfect' && conf !== 100) include = false;
            if (confidence === 'high' && (conf < 80 || conf === 100)) include = false;
            if (confidence === 'medium' && (conf < 60 || conf >= 80)) include = false;
            if (confidence === 'low' && conf >= 60) include = false;
          }
          if (include) selectedMatchIds.add(m.ediOrder.id);
        });
        showMatchReview(matchResults);
      }
    }
    
    function clearMatchSelection() {
      selectedMatchIds.clear();
      showMatchReview(matchResults);
    }
    
    function clearMatchResults() {
      if (!confirm('Clear all match results? You will need to run Find Matches again.')) return;
      matchResults = null;
      selectedMatchIds.clear();
      document.getElementById('matchReviewContent').innerHTML = `
        <div class="empty-state">
          <p style="font-size:1.25rem;margin-bottom:1rem;">No matches to review</p>
          <p>Go to <strong>EDI Orders</strong> and click <strong>"Find Matches"</strong> to search for matching Zoho drafts.</p>
        </div>
      `;
      updateStats();
    }
    
    async function sendAllMatchesToZoho() {
      if (!matchResults || !matchResults.matches || matchResults.matches.length === 0) {
        toast('No matches to send');
        return;
      }
      
      // Get filtered matches
      const search = (document.getElementById('reviewSearchBox')?.value || '').toLowerCase();
      const customer = document.getElementById('reviewCustomerFilter')?.value || '';
      const confidence = document.getElementById('confidenceFilter')?.value || '';
      
      let filteredMatches = matchResults.matches.filter(m => {
        if (search && !(m.ediOrder.poNumber || '').toLowerCase().includes(search)) return false;
        if (customer && m.ediOrder.customer !== customer) return false;
        if (confidence) {
          const conf = m.confidence || 0;
          if (confidence === 'perfect' && conf !== 100) return false;
          if (confidence === 'high' && (conf < 80 || conf === 100)) return false;
          if (confidence === 'medium' && (conf < 60 || conf >= 80)) return false;
          if (confidence === 'low' && conf >= 60) return false;
        }
        return true;
      });
      
      if (!confirm('Send ' + filteredMatches.length + ' matched orders to Zoho?')) return;
      
      filteredMatches.forEach(m => selectedMatchIds.add(m.ediOrder.id));
      await sendSelectedMatchesToZoho();
    }
    
    async function sendSelectedMatchesToZoho() {
      if (selectedMatchIds.size === 0) {
        toast('No orders selected');
        return;
      }
      
      const selectedMatches = matchResults.matches.filter(m => selectedMatchIds.has(m.ediOrder.id));
      
      toast('Processing ' + selectedMatches.length + ' orders...');
      
      try {
        const res = await fetch('/confirm-matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            matches: selectedMatches.map(m => ({ ediOrderId: m.ediOrder.id, zohoDraftId: m.zohoDraft.id })),
            newOrders: []
          })
        });
        const data = await res.json();
        if (data.success) {
          toast('Processed ' + data.processed + ' orders!');
          
          // Remove sent orders from match results
          matchResults.matches = matchResults.matches.filter(m => !selectedMatchIds.has(m.ediOrder.id));
          selectedMatchIds.clear();
          
          loadOrders();
          showMatchReview(matchResults);
        } else { toast('Error: ' + (data.error || 'Unknown')); }
      } catch (e) { toast('Error: ' + e.message); }
    }
    
    async function createNewInZoho(ediOrderId) {
      if (!confirm('Create a NEW Sales Order in Zoho for this EDI order?\n\nNote: This will NOT update an existing draft - it creates a brand new order.')) return;
      
      toast('Creating new order in Zoho...');
      
      try {
        const res = await fetch('/confirm-matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            matches: [],
            newOrders: [{ ediOrderId: ediOrderId }]
          })
        });
        const data = await res.json();
        if (data.success && data.processed > 0) {
          toast('Order created in Zoho!');
          loadOrders();
          if (matchResults) {
            matchResults.noMatches = matchResults.noMatches.filter(m => m.ediOrder.id !== ediOrderId);
            showMatchReview(matchResults);
          }
        } else { 
          toast('Error: ' + (data.error || data.results?.[0]?.error || 'Unknown')); 
        }
      } catch (e) { toast('Error: ' + e.message); }
    }
    
    // ============================================================
    // ENHANCED COMPARISON MODAL
    // ============================================================
    
    function showComparison(matchIndex) {
      const match = matchResults.matches[matchIndex];
      if (!match) return;
      const edi = match.ediOrder;
      const zoho = match.zohoDraft;
      
      // Calculate all differences
      const amtDiff = Math.abs(edi.totalAmount - zoho.totalAmount);
      const hasAmtDiff = amtDiff > 0.01;
      
      const ediShipDate = edi.shipDate ? new Date(edi.shipDate) : null;
      const zohoShipDate = zoho.shipDate ? new Date(zoho.shipDate) : null;
      let shipDateDiffDays = 0;
      if (ediShipDate && zohoShipDate) {
        shipDateDiffDays = Math.abs(Math.round((ediShipDate - zohoShipDate) / (1000 * 60 * 60 * 24)));
      }
      const hasShipDateDiff = shipDateDiffDays > 7;
      
      // Check style differences
      const ediStyles = new Set((edi.items || []).map(i => (i.productIds?.sku || i.productIds?.vendorItemNumber || '').toUpperCase()).filter(Boolean));
      const zohoStyles = new Set((zoho.items || []).map(i => (i.name || '').split(' ')[0].toUpperCase()).filter(Boolean));
      let styleMatchCount = 0;
      ediStyles.forEach(es => {
        zohoStyles.forEach(zs => {
          if (es === zs || es.includes(zs) || zs.includes(es)) styleMatchCount++;
        });
      });
      const hasStyleMismatch = ediStyles.size > 0 && zohoStyles.size > 0 && styleMatchCount === 0;
      
      // Build warnings HTML
      let warningsHtml = '';
      if (hasStyleMismatch) {
        warningsHtml += `<div class="alert alert-danger" style="margin-bottom:1rem;"><strong>🚨 STYLE MISMATCH</strong> - EDI styles (${[...ediStyles].slice(0,3).join(', ')}) do not match Zoho styles (${[...zohoStyles].slice(0,3).join(', ')}). This may be the WRONG match!</div>`;
      }
      if (hasShipDateDiff) {
        warningsHtml += `<div class="alert alert-warning" style="margin-bottom:1rem;"><strong>⚠️ Ship Date Difference:</strong> ${shipDateDiffDays} days (EDI: ${edi.shipDate || 'N/A'} vs Zoho: ${zoho.shipDate || 'N/A'})</div>`;
      }
      if (hasAmtDiff) {
        warningsHtml += `<div class="alert alert-warning" style="margin-bottom:1rem;"><strong>⚠️ Amount Difference:</strong> \$${amtDiff.toFixed(2)}</div>`;
      }
      if (!warningsHtml) {
        warningsHtml = `<div class="alert alert-success" style="margin-bottom:1rem;"><strong>✓ Perfect Match</strong> - No significant differences found</div>`;
      }
      
      const html = `
        <div class="modal-overlay" onclick="closeModal()">
          <div class="modal comparison-modal" onclick="event.stopPropagation()">
            <div class="modal-header">
              <h2>Compare: EDI Order vs Zoho Draft</h2>
              <button class="modal-close" onclick="closeModal()">×</button>
            </div>
            
            <div class="modal-tabs">
              <div class="modal-tab active" onclick="showCompareTab('compare', this)">Side-by-Side</div>
              <div class="modal-tab" onclick="showCompareTab('edilines', this)">EDI Line Items</div>
              <div class="modal-tab" onclick="showCompareTab('edipricing', this)">💰 EDI Pricing</div>
              <div class="modal-tab" onclick="showCompareTab('edishipping', this)">📦 EDI Shipping</div>
            </div>
            
            <div class="modal-body">
              <!-- Side-by-Side Compare Tab -->
              <div class="tab-content active" id="tab-compare">
                ${warningsHtml}
                
                <div class="comparison-header">
                  <div class="comparison-side edi">
                    <h3>📄 EDI Order (Confirmed)</h3>
                    <div class="comparison-field"><div class="comparison-field-label">PO#</div><div class="comparison-field-value">${edi.poNumber}</div></div>
                    <div class="comparison-field"><div class="comparison-field-label">Customer</div><div class="comparison-field-value">${edi.customer}</div></div>
                    <div class="comparison-field"><div class="comparison-field-label">Ship Date</div><div class="comparison-field-value" style="${hasShipDateDiff ? 'color:#f57c00;font-weight:600' : ''}">${edi.shipDate || 'N/A'}</div></div>
                    <div class="comparison-field"><div class="comparison-field-label">Items</div><div class="comparison-field-value">${edi.itemCount} lines, ${edi.totalUnits.toLocaleString()} units</div></div>
                    <div class="comparison-total" style="${hasAmtDiff ? 'color:#f57c00' : ''}">Total: \$${edi.totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</div>
                  </div>
                  <div class="comparison-side zoho">
                    <h3>📋 Zoho Draft #${zoho.number}</h3>
                    <div class="comparison-field"><div class="comparison-field-label">Reference</div><div class="comparison-field-value">${zoho.reference || 'N/A'}</div></div>
                    <div class="comparison-field"><div class="comparison-field-label">Customer</div><div class="comparison-field-value">${zoho.customer}</div></div>
                    <div class="comparison-field"><div class="comparison-field-label">Ship Date</div><div class="comparison-field-value" style="${hasShipDateDiff ? 'color:#f57c00;font-weight:600' : ''}">${zoho.shipDate || 'N/A'}</div></div>
                    <div class="comparison-field"><div class="comparison-field-label">Items</div><div class="comparison-field-value">${zoho.itemCount} lines, ${zoho.totalUnits.toLocaleString()} units</div></div>
                    <div class="comparison-total" style="${hasAmtDiff ? 'color:#f57c00' : ''}">Total: \$${zoho.totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</div>
                  </div>
                </div>
                
                <h3 style="margin:1.5rem 0 1rem">Line Item Comparison:</h3>
                <div class="table-container">
                  <table class="line-comparison-table">
                    <thead><tr><th class="edi-col">Style</th><th class="edi-col">Color</th><th class="edi-col">Qty</th><th class="edi-col">Price</th><th class="divider"></th><th class="zoho-col">Style/Item</th><th class="zoho-col">Desc</th><th class="zoho-col">Qty</th><th class="zoho-col">Rate</th></tr></thead>
                    <tbody>${renderLineComparison(edi.items || [], zoho.items || [])}</tbody>
                  </table>
                </div>
              </div>
              
              <!-- EDI Line Items Tab -->
              <div class="tab-content" id="tab-edilines">
                <h3 style="margin-bottom:1rem">EDI Line Items (${edi.itemCount} items, ${edi.totalUnits.toLocaleString()} units)</h3>
                <div class="table-container">
                  <table class="line-items-table">
                    <thead><tr><th>#</th><th>Style/SKU</th><th>Description</th><th>Color</th><th>Size</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Amount</th></tr></thead>
                    <tbody>
                      ${(edi.items || []).map((item, idx) => `
                        <tr>
                          <td>${idx + 1}</td>
                          <td><strong>${item.productIds?.sku || item.productIds?.vendorItemNumber || 'N/A'}</strong></td>
                          <td>${item.description || ''}</td>
                          <td>${item.color || ''}</td>
                          <td>${item.size || ''}</td>
                          <td style="text-align:right">${item.quantityOrdered || 0}</td>
                          <td style="text-align:right">\$${(item.unitPrice || 0).toFixed(2)}</td>
                          <td style="text-align:right"><strong>\$${((item.quantityOrdered || 0) * (item.unitPrice || 0)).toFixed(2)}</strong></td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <!-- EDI Pricing Tab -->
              <div class="tab-content" id="tab-edipricing">
                <p style="color:#86868b;margin-bottom:1rem">To see full pricing details, click "EDI Details" to open the full order modal.</p>
                <div class="summary-boxes">
                  <div class="summary-box highlight"><div class="summary-number">${edi.itemCount}</div><div class="summary-label">Line Items</div></div>
                  <div class="summary-box highlight"><div class="summary-number">${edi.totalUnits.toLocaleString()}</div><div class="summary-label">Total Units</div></div>
                  <div class="summary-box green"><div class="summary-number">\$${edi.totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}</div><div class="summary-label">Total Value</div></div>
                </div>
                <button class="btn btn-primary" onclick="closeModal(); viewOrder(${edi.id})">📄 Open Full EDI Details</button>
              </div>
              
              <!-- EDI Shipping Tab -->
              <div class="tab-content" id="tab-edishipping">
                <div class="info-grid" style="grid-template-columns: 1fr 1fr;">
                  <div class="info-box">
                    <div class="info-label">Ship Date</div>
                    <div class="info-value">${edi.shipDate || 'N/A'}</div>
                  </div>
                  <div class="info-box">
                    <div class="info-label">Cancel Date</div>
                    <div class="info-value">${edi.cancelDate || 'N/A'}</div>
                  </div>
                </div>
                <p style="color:#86868b;margin-top:1rem">For full shipping details including address, click "EDI Details".</p>
                <button class="btn btn-primary" style="margin-top:1rem" onclick="closeModal(); viewOrder(${edi.id})">📄 Open Full EDI Details</button>
              </div>
            </div>
            
            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
              <button class="btn btn-success" onclick="updateZohoDraft(${matchIndex})">${hasStyleMismatch ? '⚠️ Update Anyway' : '✓ Update Zoho Draft'}</button>
            </div>
          </div>
        </div>
      `;
      document.getElementById('modalContainer').innerHTML = html;
    }
    
    function showCompareTab(tabName, el) {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      document.getElementById('tab-' + tabName).classList.add('active');
    }
    
    function renderLineComparison(ediItems, zohoItems) {
      const maxRows = Math.max(ediItems.length, zohoItems.length);
      let html = '';
      for (let i = 0; i < maxRows; i++) {
        const edi = ediItems[i];
        const zoho = zohoItems[i];
        html += '<tr>';
        html += edi ? `<td class="edi-col">${edi.productIds?.sku || edi.productIds?.vendorItemNumber || '-'}</td><td class="edi-col">${edi.color || '-'}</td><td class="edi-col">${edi.quantityOrdered || 0}</td><td class="edi-col">\$${(edi.unitPrice || 0).toFixed(2)}</td>` : '<td class="edi-col">-</td><td class="edi-col">-</td><td class="edi-col">-</td><td class="edi-col">-</td>';
        html += '<td class="divider"></td>';
        html += zoho ? `<td class="zoho-col">${zoho.name || '-'}</td><td class="zoho-col">${(zoho.description || '').substring(0, 30)}</td><td class="zoho-col">${zoho.quantity || 0}</td><td class="zoho-col">\$${(zoho.rate || 0).toFixed(2)}</td>` : '<td class="zoho-col">-</td><td class="zoho-col">-</td><td class="zoho-col">-</td><td class="zoho-col">-</td>';
        html += '</tr>';
      }
      return html;
    }
    
    async function updateZohoDraft(matchIndex) {
      const match = matchResults.matches[matchIndex];
      if (!match) return;
      
      toast('Updating Zoho draft...');
      
      try {
        const res = await fetch('/update-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ediOrderId: match.ediOrder.id, zohoDraftId: match.zohoDraft.id })
        });
        const data = await res.json();
        if (data.success) {
          toast('Zoho draft updated!');
          closeModal();
          
          // Remove from match results
          matchResults.matches = matchResults.matches.filter((m, idx) => idx !== matchIndex);
          selectedMatchIds.delete(match.ediOrder.id);
          
          loadOrders();
          showMatchReview(matchResults);
        } else { toast('Error: ' + (data.error || 'Unknown')); }
      } catch (e) { toast('Error: ' + e.message); }
    }
    
    // ============================================================
    // SENT TO ZOHO TAB
    // ============================================================
    
    async function loadSentOrders() {
      const sentOrders = orders.filter(o => o.zoho_so_id || o.status === 'sent' || o.status === 'processed');
      const tbody = document.getElementById('sentOrdersTable');
      
      if (!sentOrders.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No orders sent to Zoho yet</td></tr>';
        return;
      }
      
      tbody.innerHTML = sentOrders.map(o => {
        const items = o.parsed_data?.items || [];
        const amt = items.reduce((s,i) => s + (i.quantityOrdered||0)*(i.unitPrice||0), 0);
        return `<tr>
          <td><strong>${o.edi_order_number||'N/A'}</strong></td>
          <td>${o.edi_customer_name||'Unknown'}</td>
          <td><a href="https://books.zoho.com/app/677681121#/salesorders/${o.zoho_so_id}" target="_blank">${o.zoho_so_number || o.zoho_so_id || 'N/A'}</a></td>
          <td>\$${amt.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
          <td>${o.processed_at ? new Date(o.processed_at).toLocaleString() : '-'}</td>
          <td>${o.matched_draft_id || '-'}</td>
          <td><button class="btn btn-secondary" style="padding:0.35rem 0.75rem;font-size:0.8125rem" onclick="viewOrder(${o.id})">View</button></td>
        </tr>`;
      }).join('');
    }
    
    // ============================================================
    // CUSTOMER MAPPINGS
    // ============================================================
    
    async function loadMappings() {
      try {
        const res = await fetch('/customer-mappings');
        const mappings = await res.json();
        document.getElementById('mappingsContent').innerHTML = mappings.length ? 
          '<div class="table-container"><table class="orders-table"><thead><tr><th>EDI Customer</th><th>Zoho Customer</th><th>Zoho ID</th></tr></thead><tbody>' +
          mappings.map(m => '<tr><td>' + m.edi_customer_name + '</td><td>' + m.zoho_customer_name + '</td><td>' + m.zoho_customer_id + '</td></tr>').join('') +
          '</tbody></table></div>' : '<p style="color:#86868b">No customer mappings configured yet.</p>';
      } catch (e) { 
        document.getElementById('mappingsContent').innerHTML = '<p style="color:#ff3b30">Failed to load mappings</p>'; 
      }
    }
    
    // ============================================================
    // BULK SEND FROM ORDERS TAB
    // ============================================================
    
    async function sendSelectedToZoho() {
      if (selectedIds.size === 0) {
        toast('No orders selected');
        return;
      }
      
      if (!confirm('Send ' + selectedIds.size + ' orders to Zoho?')) return;
      
      toast('Processing ' + selectedIds.size + ' orders...');
      
      try {
        const res = await fetch('/process-selected', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: [...selectedIds] })
        });
        const data = await res.json();
        if (data.success || data.processed > 0) {
          toast('Processed ' + (data.processed || 0) + ' orders');
          selectedIds.clear();
          loadOrders();
        } else { toast('Error: ' + (data.error || 'Unknown')); }
      } catch (e) { toast('Error: ' + e.message); }
    }
    
    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    
    function toast(msg) {
      document.getElementById('toastMsg').textContent = msg;
      document.getElementById('toast').classList.add('show');
      setTimeout(() => document.getElementById('toast').classList.remove('show'), 4000);
    }
  </script>
</body>
</html>
`;

module.exports = dashboardHTML;
