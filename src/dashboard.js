// Dashboard with Matching System - Mark Edwards Apparel
// Mark Edwards Design System

const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spring EDI | Mark Edwards Apparel</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            me: {
              dark: '#1e3a5f',
              hover: '#2d5a7f',
              accent: '#0088c2',
              bg: '#f5f5f7',
              border: '#e5e5e5',
              'text-primary': '#1e3a5f',
              'text-secondary': '#86868b',
              'text-muted': '#6e6e73',
              success: '#34c759',
              error: '#ff3b30',
              warning: '#ff9500',
            }
          },
          fontFamily: {
            sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
          }
        }
      }
    }
  </script>
  <style>
    * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #f5f5f7; color: #1e3a5f; }
    @keyframes pulse-green { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .pulse-green { animation: pulse-green 2s infinite; }
    kbd { display: inline-block; padding: 2px 6px; background: #f5f5f7; border: 1px solid #d2d2d7; border-radius: 4px; font-size: 11px; font-family: monospace; }
    .stage-btn { transition: all 0.2s ease; }
    .stage-btn.active { box-shadow: 0 4px 12px rgba(0,0,0,0.12); transform: scale(1.02); }
    .toast { position: fixed; bottom: 24px; right: 24px; background: #1e3a5f; color: white; padding: 12px 20px; border-radius: 8px; font-size: 14px; z-index: 9999; animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
    .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .tab-btn.active { border-bottom: 2px solid #0088c2; color: #0088c2; }
    .tab-btn { border-bottom: 2px solid transparent; }
    .inbox-layout { display: flex; gap: 24px; }
    .inbox-sidebar { width: 280px; flex-shrink: 0; }
    .inbox-main { flex: 1; min-width: 0; }
    .sidebar-section { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); padding: 16px; margin-bottom: 16px; }
    .sidebar-header { font-weight: 600; font-size: 0.875rem; color: #1e3a5f; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .sidebar-header:hover { color: #2d5a7f; }
    .sidebar-header .total { margin-left: auto; font-weight: 500; color: #86868b; }
    .customer-treemap { display: flex; flex-direction: column; gap: 6px; }
    .treemap-item { padding: 10px 12px; color: white; border-radius: 8px; cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column; }
    .treemap-item:hover { transform: translateX(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .treemap-item.active { outline: 2px solid #0088c2; outline-offset: 2px; }
    .treemap-label { font-weight: 600; font-size: 0.8125rem; margin-bottom: 2px; }
    .treemap-value { font-size: 0.75rem; opacity: 0.95; }
    .treemap-stats { font-size: 0.6875rem; opacity: 0.85; margin-top: 2px; }

    /* Mark Edwards Card Style */
    .me-card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); transition: transform 0.2s, box-shadow 0.2s; }
    .me-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
    .me-btn-primary { background: #1e3a5f; color: white; border: none; border-radius: 8px; padding: 0.5rem 1rem; font-weight: 500; transition: background 0.15s; }
    .me-btn-primary:hover { background: #2d5a7f; }
    .me-btn-secondary { background: white; color: #1e3a5f; border: 1px solid #d2d2d7; border-radius: 8px; padding: 0.5rem 1rem; font-weight: 500; transition: all 0.15s; }
    .me-btn-secondary:hover { background: #f5f5f7; }

    /* Input focus states */
    input:focus, select:focus { border-color: #1e3a5f !important; outline: none; box-shadow: 0 0 0 2px rgba(30,58,95,0.15) !important; }

    /* Table styles */
    thead { background: #f5f5f7; }
    th { color: #86868b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  </style>
</head>
<body class="min-h-screen" style="background: #f5f5f7; color: #1e3a5f;">

  <!-- Header -->
  <header style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a7f 100%); box-shadow: 0 2px 8px rgba(0,0,0,0.15);" class="text-white px-6 py-4">
    <div class="flex items-center justify-between max-w-7xl mx-auto">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-sm" style="color: #1e3a5f;">ME</div>
        <div>
          <h1 class="font-semibold text-lg">Spring EDI Integration</h1>
          <p class="text-sm" style="opacity: 0.75;">Mark Edwards Apparel</p>
        </div>
      </div>
      <div class="flex items-center gap-6">
        <button onclick="showStage('settings')" class="text-sm hover:text-white transition flex items-center gap-1.5" style="color: rgba(255,255,255,0.7);">
          ⚙️ Settings
        </button>
        <button onclick="showStage('history')" class="text-sm hover:text-white transition flex items-center gap-1.5" style="color: rgba(255,255,255,0.7);">
          📋 Activity Log
        </button>
        <div class="flex items-center gap-2 text-sm" style="color: rgba(255,255,255,0.7);">
          <div class="w-2 h-2 rounded-full pulse-green" style="background: #34c759;"></div>
          System Online
        </div>
      </div>
    </div>
  </header>

  <!-- WORKFLOW PROGRESS BAR -->
  <div style="background: white; border-bottom: 1px solid rgba(0,0,0,0.06); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-center gap-4">
        <!-- Stage 1: New Orders -->
        <button onclick="showStage('inbox')" id="stage-inbox"
          class="stage-btn flex items-center gap-3 px-5 py-3 rounded-xl transition-all text-white active" style="background: #ff9500; box-shadow: 0 4px 12px rgba(255,149,0,0.3);">
          <span class="text-xl">📥</span>
          <div class="text-left">
            <div class="font-medium">New Orders</div>
            <div class="text-sm opacity-80"><span id="inbox-count">0</span> to process</div>
          </div>
        </button>

        <svg class="w-5 h-5" style="color: #d2d2d7;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>

        <!-- Stage 2: Done -->
        <button onclick="showStage('done')" id="stage-done"
          class="stage-btn flex items-center gap-3 px-5 py-3 rounded-xl transition-all" style="background: rgba(52,199,89,0.1); color: #34c759; border: 1px solid rgba(52,199,89,0.3);">
          <span class="text-xl">✅</span>
          <div class="text-left">
            <div class="font-medium">Sent to Zoho</div>
            <div class="text-sm opacity-70"><span id="done-count">0</span> today</div>
          </div>
        </button>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-6 py-6">

    <!-- ==================== INBOX STAGE ==================== -->
    <div id="content-inbox" class="stage-content">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-semibold text-me-text-primary">New EDI Orders</h2>
          <p class="text-me-text-muted">Orders imported from SFTP, ready to match with Zoho</p>
        </div>
        <div class="flex gap-3">
          <button onclick="fetchFromSftp()" id="fetchSftpBtn" class="px-4 py-2 bg-white border border-me-border rounded-lg hover:bg-me-bg transition flex items-center gap-2 text-me-text-secondary">
            🔄 Fetch from SFTP
          </button>
          <button onclick="findMatchesForSelected()" id="findMatchesBtn"
            class="px-5 py-2 bg-me-dark text-white rounded-lg hover:bg-me-hover transition flex items-center gap-2 font-medium">
            🔍 Find Matches for <span id="pendingCountBtn">0</span> orders
          </button>
        </div>
      </div>

      <!-- Zoho Cache Status -->
      <div class="bg-me-bg rounded-lg px-4 py-3 mb-4 flex items-center justify-between text-sm">
        <div class="flex items-center gap-2 text-me-text-secondary">
          <span id="cacheIndicator">🟢</span>
          Zoho Drafts: <strong id="cacheDraftsCount">0</strong> cached • Last updated: <strong id="cacheLastRefresh">-</strong>
        </div>
        <button onclick="refreshZohoCache()" class="text-me-accent hover:text-me-dark font-medium">🔄 Refresh Zoho Data</button>
      </div>

      <!-- Two-column layout -->
      <div class="inbox-layout">
        <!-- Left Sidebar with Treemap -->
        <div class="inbox-sidebar">
          <div class="sidebar-section">
            <div class="sidebar-header" onclick="toggleTreemap()">
              <span id="treemapArrow">▼</span>
              <span>📊 By Customer</span>
              <span class="text-xs text-me-text-muted">(click to filter)</span>
            </div>
            <div id="customerTreemap" class="customer-treemap"></div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="inbox-main">
          <!-- Filters -->
          <div class="flex items-center gap-4 mb-4">
            <input type="text" id="searchBox" placeholder="Search PO#..." onkeyup="filterOrders()"
              class="px-4 py-2 border border-me-border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-me-dark">
            <select id="customerFilter" onchange="filterOrders()" class="px-4 py-2 border border-me-border rounded-lg focus:outline-none focus:ring-2 focus:ring-me-dark">
              <option value="">All Customers</option>
            </select>
            <select id="statusFilter" onchange="filterOrders()" class="px-4 py-2 border border-me-border rounded-lg focus:outline-none focus:ring-2 focus:ring-me-dark">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="partial">🟡 Partial (needs follow-up)</option>
              <option value="amended">🔄 Amended</option>
            </select>
            <label class="flex items-center gap-2 text-sm text-me-text-secondary ml-auto">
              <input type="checkbox" id="selectAll" onchange="toggleAll()" class="w-4 h-4 rounded border-me-border">
              Select All
            </label>
          </div>

          <!-- Order Cards -->
          <div id="ordersContainer" class="space-y-3">
            <div class="text-center py-12 text-me-text-muted">Loading orders...</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== REVIEW STAGE ==================== -->
    <div id="content-review" class="stage-content hidden">

      <!-- Header with Title and Filters -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <h2 class="text-xl font-semibold text-me-text-primary">Review Matches</h2>

          <!-- Customer Filter -->
          <select id="reviewCustomerFilter" onchange="filterReviewMatches()" class="px-3 py-1.5 border border-me-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-me-dark">
            <option value="">All Customers</option>
          </select>

          <!-- Confidence Filter Buttons -->
          <div id="confidenceFilters" class="flex items-center gap-1 ml-2 bg-me-bg p-1 rounded-lg">
            <button onclick="setConfidenceFilter('')" data-filter="" class="conf-filter px-3 py-1.5 rounded-md text-sm font-medium bg-white shadow-sm text-me-text-primary">All (<span id="filter-count-all">0</span>)</button>
            <button onclick="setConfidenceFilter('perfect')" data-filter="perfect" class="conf-filter px-3 py-1.5 rounded-md text-sm font-medium text-me-text-muted hover:text-me-text-primary">100% (<span id="filter-count-perfect">0</span>)</button>
            <button onclick="setConfidenceFilter('high')" data-filter="high" class="conf-filter px-3 py-1.5 rounded-md text-sm font-medium text-me-text-muted hover:text-me-text-primary">80-99% (<span id="filter-count-high">0</span>)</button>
            <button onclick="setConfidenceFilter('medium')" data-filter="medium" class="conf-filter px-3 py-1.5 rounded-md text-sm font-medium text-me-text-muted hover:text-me-text-primary">60-79% (<span id="filter-count-medium">0</span>)</button>
            <button onclick="setConfidenceFilter('nomatch')" data-filter="nomatch" class="conf-filter px-3 py-1.5 rounded-md text-sm font-medium text-me-text-muted hover:text-me-text-primary">No Match (<span id="filter-count-nomatch">0</span>)</button>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-sm text-me-success font-medium"><span id="selectedCountDisplay">0</span> selected</span>
          <button onclick="clearMatchResults()" class="px-3 py-1.5 text-sm text-me-text-muted hover:text-me-text-primary">Clear Results</button>
        </div>
      </div>

      <!-- Empty State -->
      <div id="reviewEmptyState" class="text-center py-16">
        <div class="text-6xl mb-4">🔍</div>
        <h3 class="text-xl font-semibold text-me-text-primary mb-2">No matches to review</h3>
        <p class="text-me-text-muted">Go to <strong>New Orders</strong> and click <strong>Find Matches</strong> to search for matching Zoho drafts.</p>
      </div>

      <!-- List View Container -->
      <div id="listViewContainer" class="hidden">
        <!-- Progress indicator -->
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-me-text-muted">Match <strong class="text-me-text-primary" id="list-current-match">1</strong> of <strong class="text-me-text-primary" id="list-total-matches">0</strong></span>
        </div>
        <div class="h-1.5 bg-gray-200 rounded-full mb-4">
          <div id="list-progress-bar" class="h-full bg-me-dark rounded-full transition-all" style="width: 0%"></div>
        </div>

        <!-- Match Cards List -->
        <div id="matchCardsContainer" class="space-y-3 mb-4">
          <!-- Match cards will be rendered here -->
        </div>
      </div>

      <!-- Focus Mode Container -->
      <div id="focusModeContainer" class="max-w-4xl mx-auto hidden">
        <!-- Will be populated by showFocusMode() -->
      </div>

      <!-- Bottom Action Bar (when items selected) -->
      <div id="reviewActionBar" class="hidden fixed bottom-0 left-0 right-0 bg-green-50 border-t border-green-200 px-6 py-4">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="text-me-success">
            <strong id="actionBarCount">0</strong> order(s) selected for Zoho
          </div>
          <button onclick="sendSelectedToZoho()" class="px-6 py-2.5 bg-me-success text-white rounded-lg hover:bg-me-success transition font-medium">
            Finish & Send to Zoho →
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== DONE STAGE ==================== -->
    <div id="content-done" class="stage-content hidden">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-semibold text-me-text-primary">Sent to Zoho</h2>
          <p class="text-me-text-muted">Orders successfully processed and sent to Zoho</p>
        </div>
        <button onclick="exportSentToExcel()" class="px-4 py-2 bg-white border border-me-border rounded-lg hover:bg-me-bg transition flex items-center gap-2 text-me-text-secondary">
          📊 Export Report
        </button>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-4 mb-4">
        <input type="text" id="sentSearchBox" placeholder="Search PO#..." onkeyup="filterSentOrders()"
          class="px-4 py-2 border border-me-border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-me-dark">
        <select id="sentCustomerFilter" onchange="filterSentOrders()" class="px-4 py-2 border border-me-border rounded-lg focus:outline-none focus:ring-2 focus:ring-me-dark">
          <option value="">All Customers</option>
        </select>
        <span id="sentOrderCount" class="text-sm text-me-text-muted ml-auto"></span>
      </div>

      <div class="bg-white rounded-xl border border-me-border overflow-hidden">
        <table class="w-full">
          <thead class="bg-me-bg border-b border-me-border">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-semibold text-me-text-muted uppercase">PO Number</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-me-text-muted uppercase">Customer</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-me-text-muted uppercase">Zoho SO#</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-me-text-muted uppercase">Value</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-me-text-muted uppercase">Sent At</th>
              <th class="text-center px-4 py-3 text-xs font-semibold text-me-text-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody id="sentOrdersTable">
            <tr><td colspan="6" class="px-4 py-8 text-center text-me-text-muted">No orders sent yet</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ==================== HISTORY/ACTIVITY STAGE ==================== -->
    <div id="content-history" class="stage-content hidden">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-semibold text-me-text-primary">Zoho Audit Trail</h2>
          <p class="text-me-text-muted">Orders created and modified in Zoho</p>
        </div>
        <button onclick="loadActivityLog()" class="px-4 py-2 bg-white border border-me-border rounded-lg hover:bg-me-bg transition flex items-center gap-2 text-me-text-secondary">
          🔄 Refresh
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-me-border p-4">
          <div class="text-xs text-me-text-muted uppercase mb-1">Total Orders Sent</div>
          <div class="text-2xl font-bold text-me-text-primary" id="statAllTimeSent">-</div>
        </div>
        <div class="bg-white rounded-xl border border-me-border p-4">
          <div class="text-xs text-me-text-muted uppercase mb-1">Total Value</div>
          <div class="text-2xl font-bold text-me-success" id="statAllTimeValue">-</div>
        </div>
        <div class="bg-white rounded-xl border border-me-border p-4">
          <div class="text-xs text-me-text-muted uppercase mb-1">New Orders Created</div>
          <div class="text-2xl font-bold text-me-accent" id="statNewOrders">-</div>
        </div>
        <div class="bg-white rounded-xl border border-me-border p-4">
          <div class="text-xs text-me-text-muted uppercase mb-1">Drafts Updated</div>
          <div class="text-2xl font-bold text-me-warning" id="statDraftsUpdated">-</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-4 mb-4">
        <select id="activityTypeFilter" onchange="filterActivityLog()" class="px-4 py-2 border border-me-border rounded-lg focus:outline-none focus:ring-2 focus:ring-me-dark">
          <option value="">All Types</option>
          <option value="new">New Orders Created</option>
          <option value="updated">Drafts Updated</option>
        </select>
        <input type="text" id="activitySearchFilter" placeholder="Search PO# or Customer..." onkeyup="filterActivityLog()" class="px-4 py-2 border border-me-border rounded-lg focus:outline-none focus:ring-2 focus:ring-me-dark w-64">
        <span id="activityLogCount" class="text-sm text-me-text-muted ml-auto"></span>
      </div>

      <div class="bg-white rounded-xl border border-me-border overflow-hidden">
        <table class="w-full">
          <thead class="bg-me-bg border-b border-me-border">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-semibold text-me-text-muted uppercase">Date/Time</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-me-text-muted uppercase">Type</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-me-text-muted uppercase">PO #</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-me-text-muted uppercase">Customer</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-me-text-muted uppercase">Zoho SO#</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-me-text-muted uppercase">Changes</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-me-text-muted uppercase">Amount</th>
            </tr>
          </thead>
          <tbody id="activityLogBody">
            <tr><td colspan="7" class="px-4 py-8 text-center text-me-text-muted">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ==================== SETTINGS STAGE ==================== -->
    <div id="content-settings" class="stage-content hidden">
      <div class="max-w-3xl">
        <h2 class="text-xl font-semibold text-me-text-primary mb-6">Settings</h2>

        <!-- Customer Mappings -->
        <div class="bg-white rounded-xl border border-me-border p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold text-me-text-primary">Customer Mappings</h3>
              <p class="text-me-text-muted text-sm">Map EDI customer names to Zoho customers</p>
            </div>
            <button onclick="showAddMappingModal()" class="px-4 py-2 bg-me-dark text-white rounded-lg hover:bg-me-hover transition text-sm font-medium">
              + Add Mapping
            </button>
          </div>
          <div id="mappingsContent">Loading...</div>
        </div>

        <!-- Customer Matching Rules -->
        <div class="bg-white rounded-xl border border-me-border p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold text-me-text-primary">🔧 Customer Matching Rules</h3>
              <p class="text-me-text-muted text-sm">Configure how EDI orders are matched to Zoho bulk/contract orders per customer</p>
            </div>
            <button onclick="showAddRuleModal()" class="px-4 py-2 bg-me-dark text-white rounded-lg hover:bg-me-hover transition text-sm font-medium">
              + Add Customer Rule
            </button>
          </div>
          <div id="customerRulesContent">Loading...</div>
        </div>

        <!-- SFTP Browser -->
        <div class="bg-white rounded-xl border border-me-border p-6 mb-6">
          <h3 class="text-lg font-semibold text-me-text-primary mb-4">SFTP Browser</h3>
          <p class="text-me-text-muted mb-4">Browse and manage files on the SFTP server</p>
          <button onclick="refreshSftpStatus()" class="px-4 py-2 bg-me-dark text-white rounded-lg hover:bg-me-hover transition">
            🔄 Refresh SFTP
          </button>
          <div id="sftpContent" class="mt-4"></div>
        </div>

        <!-- Re-parse Orders -->
        <div class="bg-white rounded-xl border border-me-border p-6 mb-6">
          <h3 class="text-lg font-semibold text-me-text-primary mb-2">Re-parse Orders</h3>
          <p class="text-me-text-muted mb-4">Re-process existing orders with updated CSV parsing logic (e.g., pack qty calculation from prices)</p>
          <div class="flex items-center gap-3">
            <button onclick="reparseAllOrders()" id="reparseBtn" class="px-4 py-2 bg-me-warning text-white rounded-lg hover:bg-me-warning transition flex items-center gap-2">
              🔄 Re-parse All Orders
            </button>
            <span id="reparseStatus" class="text-sm text-me-text-muted"></span>
          </div>
          <div id="reparseResults" class="mt-4 hidden">
            <div class="bg-me-bg rounded-lg p-4 max-h-64 overflow-y-auto">
              <pre id="reparseResultsContent" class="text-sm text-me-text-secondary whitespace-pre-wrap"></pre>
            </div>
          </div>
        </div>

        <!-- Discrepancy Reports -->
        <div class="bg-white rounded-xl border border-me-border p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold text-me-text-primary">📊 Discrepancy Reports</h3>
              <p class="text-me-text-muted text-sm">Track and export EDI vs Zoho mismatches for sales team review</p>
            </div>
          </div>

          <!-- Date Range Filter -->
          <div class="flex items-center gap-4 mb-4 p-3 bg-me-bg rounded-lg">
            <div class="flex items-center gap-2">
              <label class="text-sm text-me-text-secondary">From:</label>
              <input type="date" id="discrepancyStartDate" class="px-3 py-1.5 border border-me-border rounded-lg text-sm focus:ring-2 focus:ring-me-dark focus:border-me-dark">
            </div>
            <div class="flex items-center gap-2">
              <label class="text-sm text-me-text-secondary">To:</label>
              <input type="date" id="discrepancyEndDate" class="px-3 py-1.5 border border-me-border rounded-lg text-sm focus:ring-2 focus:ring-me-dark focus:border-me-dark">
            </div>
            <button onclick="loadDiscrepancies()" class="px-4 py-1.5 bg-me-dark text-white rounded-lg hover:bg-me-hover transition text-sm font-medium">
              🔍 Load
            </button>
            <button onclick="exportDiscrepanciesToExcel()" id="exportDiscrepanciesBtn" class="px-4 py-1.5 bg-me-success text-white rounded-lg hover:bg-me-success transition text-sm font-medium flex items-center gap-1">
              📥 Export Excel
            </button>
          </div>

          <!-- Summary Stats -->
          <div id="discrepancySummary" class="grid grid-cols-4 gap-4 mb-4">
            <div class="bg-me-bg rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-me-text-primary" id="discrepancyTotalCount">-</div>
              <div class="text-xs text-me-text-muted">Total Discrepancies</div>
            </div>
            <div class="bg-amber-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-me-warning" id="discrepancyOpenCount">-</div>
              <div class="text-xs text-me-text-muted">Unresolved</div>
            </div>
            <div class="bg-green-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-me-success" id="discrepancyResolvedCount">-</div>
              <div class="text-xs text-me-text-muted">Resolved</div>
            </div>
            <div class="bg-blue-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-me-accent" id="discrepancyOrdersCount">-</div>
              <div class="text-xs text-me-text-muted">Orders Affected</div>
            </div>
          </div>

          <!-- Discrepancy List -->
          <div id="discrepancyListContainer" class="border border-me-border rounded-lg overflow-hidden">
            <div class="bg-me-bg px-4 py-2 border-b border-me-border flex items-center justify-between">
              <span class="text-sm font-medium text-me-text-secondary">Recent Discrepancies</span>
              <select id="discrepancyTypeFilter" onchange="loadDiscrepancies()" class="text-sm border border-me-border rounded px-2 py-1">
                <option value="">All Types</option>
                <option value="date_mismatch">Date Mismatch</option>
                <option value="amount_mismatch">Amount Mismatch</option>
                <option value="quantity_mismatch">Quantity Mismatch</option>
                <option value="reference_mismatch">Reference Mismatch</option>
                <option value="line_qty_mismatch">Line Item Qty</option>
                <option value="line_price_mismatch">Line Item Price</option>
              </select>
            </div>
            <div id="discrepancyList" class="max-h-96 overflow-y-auto">
              <div class="p-4 text-center text-me-text-muted text-sm">Select a date range and click Load to view discrepancies</div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </main>

  <!-- Toast Container -->
  <div id="toastContainer"></div>

  <!-- Modal Container -->
  <div id="modalContainer"></div>

<script>
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  let orders = [];
  let sentOrdersData = [];
  let selectedIds = new Set();
  let matchResults = null;
  let selectedMatchIds = new Set();
  let selectedMatchDrafts = new Map();
  let flaggedMatchIds = new Set();
  let focusModeActive = false;

  // Field selection state for selective processing
  // Key: orderId, Value: { fields: { shipDate: true, cancelDate: true, ... }, overrides: { shipDate: '2026-03-01', ... }, lineItems: [0, 1, 2] }
  let fieldSelections = new Map();
  let focusModeIndex = 0;
  let currentConfidenceFilter = '';
  let currentReviewCustomerFilter = '';
  let activityLogData = [];
  let viewMode = 'list'; // 'list' or 'focus'

  // ============================================================
  // INITIALIZATION
  // ============================================================
  document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
    loadCacheStatus();
    loadSession();
  });

  // ============================================================
  // STAGE NAVIGATION
  // ============================================================
  let currentStage = 'inbox';

  function showStage(stage, skipSave = false) {
    currentStage = stage;

    // Hide all content
    document.querySelectorAll('.stage-content').forEach(el => el.classList.add('hidden'));

    // Remove active from all stage buttons
    document.querySelectorAll('.stage-btn').forEach(btn => {
      btn.classList.remove('active', 'text-white', 'shadow-lg');
      btn.style.background = '';
      btn.style.boxShadow = '';
      btn.style.color = '';
      btn.style.border = '1px solid #d2d2d7';
    });

    // Show selected content
    const contentEl = document.getElementById('content-' + stage);
    if (contentEl) contentEl.classList.remove('hidden');

    // Highlight active stage button
    const stageBtn = document.getElementById('stage-' + stage);
    if (stageBtn) {
      stageBtn.classList.add('active');
      if (stage === 'inbox') {
        stageBtn.style.background = '#ff9500';
        stageBtn.style.color = 'white';
        stageBtn.style.boxShadow = '0 4px 12px rgba(255,149,0,0.3)';
        stageBtn.style.border = 'none';
      } else if (stage === 'review') {
        stageBtn.style.background = '#0088c2';
        stageBtn.style.color = 'white';
        stageBtn.style.boxShadow = '0 4px 12px rgba(0,136,194,0.3)';
        stageBtn.style.border = 'none';
      } else if (stage === 'done') {
        stageBtn.style.background = '#34c759';
        stageBtn.style.color = 'white';
        stageBtn.style.boxShadow = '0 4px 12px rgba(52,199,89,0.3)';
        stageBtn.style.border = 'none';
      }
    }

    // Load data for specific stages
    if (stage === 'done') loadSentOrders();
    if (stage === 'history') { loadActivityLog(); loadAuditStats(); }
    if (stage === 'settings') { loadMappings(); loadCustomerRules(); }
    if (stage === 'review') {
      // If no matches in memory, try to load from session first
      if (!matchResults || (!matchResults.matches?.length && !matchResults.noMatches?.length)) {
        loadMatchesFromSession().then(() => {
          updateFilterCounts();
          updateReviewCustomerFilter();
          showListView();
        });
      } else {
        updateFilterCounts();
        updateReviewCustomerFilter();
        showListView();
      }
    }

    // Save stage to session (debounced)
    if (!skipSave) saveSession();
  }

  // ============================================================
  // TOAST NOTIFICATIONS
  // ============================================================
  function toast(message) {
    const container = document.getElementById('toastContainer');
    const toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.textContent = message;
    container.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  }

  // ============================================================
  // DATE FORMATTING
  // ============================================================
  function formatDateWithTime(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (inputDate.getTime() === today.getTime()) {
      return 'Today, ' + timeStr;
    } else if (inputDate.getTime() === yesterday.getTime()) {
      return 'Yesterday, ' + timeStr;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + timeStr;
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Format raw data for clean grid display
  function formatRawDataDisplay(data) {
    if (!data || typeof data !== 'object') return '<div class="text-me-text-muted">No data</div>';

    let html = '';

    // Helper to format a value for display
    const formatValue = (val) => {
      if (val === null || val === undefined || val === '') return '<span class="text-me-text-muted italic">—</span>';
      if (typeof val === 'boolean') return val ? '<span class="text-me-success">Yes</span>' : '<span class="text-me-error">No</span>';
      if (typeof val === 'number') return '<span class="text-me-accent font-medium">' + val.toLocaleString() + '</span>';
      if (typeof val === 'string') {
        // Format dates
        if (/^\\d{4}-\\d{2}-\\d{2}/.test(val)) {
          return '<span class="text-purple-600">' + escapeHtml(val) + '</span>';
        }
        return '<span class="text-me-text-primary">' + escapeHtml(val) + '</span>';
      }
      return '<span class="text-me-text-muted">' + escapeHtml(String(val)) + '</span>';
    };

    // Recursive function to render any object/array structure
    const renderObject = (obj, depth = 0) => {
      if (!obj || typeof obj !== 'object') return formatValue(obj);

      if (Array.isArray(obj)) {
        if (obj.length === 0) return '<span class="text-me-text-muted italic">empty array</span>';

        // For arrays of objects (like items), render as expandable sections
        let arrayHtml = '';
        obj.forEach((item, idx) => {
          if (typeof item === 'object' && item !== null) {
            arrayHtml += '<div class="border border-me-border rounded mb-2 overflow-hidden">';
            arrayHtml += '<div class="bg-me-bg px-3 py-1.5 text-sm font-medium text-me-text-secondary">Item ' + (idx + 1) + '</div>';
            arrayHtml += '<div class="p-2">' + renderObject(item, depth + 1) + '</div>';
            arrayHtml += '</div>';
          } else {
            arrayHtml += '<div class="py-1">' + formatValue(item) + '</div>';
          }
        });
        return arrayHtml;
      }

      // Regular object - render as table
      const entries = Object.entries(obj);
      if (entries.length === 0) return '<span class="text-me-text-muted italic">empty</span>';

      let tableHtml = '<table class="w-full text-sm">';
      entries.forEach(([key, value], idx) => {
        const bgClass = idx % 2 === 0 ? 'bg-me-bg' : 'bg-white';
        // Format the key name nicely
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/_/g, ' ');

        tableHtml += '<tr class="' + bgClass + ' border-b border-gray-100">';
        tableHtml += '<td class="px-3 py-2 text-me-text-muted font-medium align-top" style="width: 200px;">' + escapeHtml(formattedKey) + '</td>';

        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            tableHtml += '<td class="px-3 py-2">';
            if (value.length === 0) {
              tableHtml += '<span class="text-me-text-muted italic">empty array</span>';
            } else if (typeof value[0] === 'object') {
              // Array of objects - show count and expandable
              tableHtml += '<details class="cursor-pointer"><summary class="text-me-accent hover:text-me-dark">' + value.length + ' items (click to expand)</summary>';
              tableHtml += '<div class="mt-2">' + renderObject(value, depth + 1) + '</div></details>';
            } else {
              // Array of primitives - show inline
              tableHtml += value.map(v => formatValue(v)).join(', ');
            }
            tableHtml += '</td>';
          } else {
            // Nested object - show inline or expand
            const nestedEntries = Object.entries(value).filter(([k, v]) => v !== null && v !== undefined && v !== '');
            if (nestedEntries.length <= 4) {
              // Small object - show inline
              tableHtml += '<td class="px-3 py-2">';
              nestedEntries.forEach(([subKey, subVal]) => {
                const subKeyFormatted = subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/_/g, ' ');
                tableHtml += '<div class="flex gap-2"><span class="text-me-text-muted">' + subKeyFormatted + ':</span> ' + formatValue(subVal) + '</div>';
              });
              tableHtml += '</td>';
            } else {
              // Large object - make expandable
              tableHtml += '<td class="px-3 py-2">';
              tableHtml += '<details class="cursor-pointer"><summary class="text-me-accent hover:text-me-dark">' + nestedEntries.length + ' fields (click to expand)</summary>';
              tableHtml += '<div class="mt-2 pl-2 border-l-2 border-me-border">' + renderObject(value, depth + 1) + '</div></details>';
              tableHtml += '</td>';
            }
          }
        } else {
          tableHtml += '<td class="px-3 py-2">' + formatValue(value) + '</td>';
        }
        tableHtml += '</tr>';
      });
      tableHtml += '</table>';
      return tableHtml;
    };

    // Render all the data
    html += '<div class="bg-white border border-me-border rounded-lg overflow-hidden">';
    html += renderObject(data);
    html += '</div>';

    return html || '<div class="text-me-text-muted">No data available</div>';
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ============================================================
  // SESSION PERSISTENCE
  // ============================================================
  async function loadSession() {
    try {
      const res = await fetch('/session');
      const data = await res.json();
      if (data.matchResults && (data.matchResults.matches?.length > 0 || data.matchResults.noMatches?.length > 0)) {
        matchResults = data.matchResults;
        selectedMatchIds = new Set(data.selectedMatchIds || []);
        flaggedMatchIds = new Set(data.flaggedMatchIds || []);
        selectedMatchDrafts = new Map(Object.entries(data.selectedMatchDrafts || {}).map(([k, v]) => [parseInt(k), v]));
        focusModeIndex = data.focusModeIndex || 0;
        updateWorkflowCounts();
        updateFilterCounts();
        updateReviewCustomerFilter();
        const matchCount = (matchResults.matches?.length || 0) + (matchResults.noMatches?.length || 0);
        if (matchCount > 0) {
          toast('Restored ' + matchCount + ' matches from previous session');
          // Navigate to the saved stage (or review if we have matches)
          const savedStage = data.currentStage || 'review';
          showStage(savedStage, true);
        }
      } else if (data.currentStage) {
        // No matches but we have a saved stage
        showStage(data.currentStage, true);
      }
    } catch (e) {
      console.log('No saved session');
    }
  }

  // Load just the matches from session (called when navigating to review tab)
  async function loadMatchesFromSession() {
    try {
      const res = await fetch('/session');
      const data = await res.json();
      if (data.matchResults && (data.matchResults.matches?.length > 0 || data.matchResults.noMatches?.length > 0)) {
        matchResults = data.matchResults;
        selectedMatchIds = new Set(data.selectedMatchIds || []);
        flaggedMatchIds = new Set(data.flaggedMatchIds || []);
        selectedMatchDrafts = new Map(Object.entries(data.selectedMatchDrafts || {}).map(([k, v]) => [parseInt(k), v]));
        focusModeIndex = data.focusModeIndex || 0;
        updateWorkflowCounts();
        const matchCount = (matchResults.matches?.length || 0) + (matchResults.noMatches?.length || 0);
        if (matchCount > 0) {
          console.log('Loaded ' + matchCount + ' matches from session');
        }
      }
    } catch (e) {
      console.log('Could not load matches from session:', e);
    }
  }

  let saveSessionTimeout = null;
  function saveSession() {
    if (saveSessionTimeout) clearTimeout(saveSessionTimeout);
    saveSessionTimeout = setTimeout(async () => {
      try {
        await fetch('/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchResults: matchResults,
            selectedMatchIds: Array.from(selectedMatchIds),
            flaggedMatchIds: Array.from(flaggedMatchIds),
            selectedMatchDrafts: Object.fromEntries(selectedMatchDrafts),
            focusModeIndex: focusModeIndex,
            currentStage: currentStage
          })
        });
      } catch (e) {
        console.error('Failed to save session:', e);
      }
    }, 500);
  }

  async function clearSession() {
    try {
      await fetch('/session', { method: 'DELETE' });
      matchResults = null;
      selectedMatchIds.clear();
      flaggedMatchIds.clear();
      selectedMatchDrafts.clear();
      focusModeIndex = 0;
    } catch (e) {
      console.error('Failed to clear session:', e);
    }
  }

  // ============================================================
  // ORDERS LOADING & RENDERING
  // ============================================================
  async function loadOrders() {
    try {
      const res = await fetch('/orders');
      orders = await res.json();
      window.currentOrders = orders;
      buildCustomerTreemap(orders);
      renderOrders();
      updateCustomerFilter();
      updateWorkflowCounts();
    } catch (e) {
      toast('Failed to load orders');
    }
  }

  function renderOrders() {
    const search = (document.getElementById('searchBox')?.value || '').toLowerCase();
    const customer = document.getElementById('customerFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';

    let filtered = orders.filter(o => {
      // Show pending and partial orders, hide fully processed
      if (o.status === 'processed' && !o.is_partial) return false;
      if (o.zoho_so_number && !o.is_partial) return false; // Hide fully processed
      if (search && !(o.edi_order_number || '').toLowerCase().includes(search)) return false;
      if (customer && o.edi_customer_name !== customer) return false;

      // Status filter
      if (statusFilter === 'pending' && (o.status !== 'pending' || o.is_partial)) return false;
      if (statusFilter === 'partial' && !o.is_partial) return false;
      if (statusFilter === 'amended' && !o.is_amended) return false;

      return true;
    });

    const container = document.getElementById('ordersContainer');

    if (!filtered.length) {
      container.innerHTML = '<div class="text-center py-12 text-me-text-muted">No pending orders found.</div>';
      return;
    }

    container.innerHTML = filtered.map(o => {
      const items = o.parsed_data?.items || [];
      const amt = items.reduce((s, i) => s + (i.quantityOrdered || 0) * (i.unitPrice || 0), 0);
      const importDate = new Date(o.created_at);
      const daysSinceImport = Math.floor((new Date() - importDate) / (1000 * 60 * 60 * 24));
      const isOld = daysSinceImport >= 3;
      const importedStr = formatDateWithTime(importDate);

      // Age badge based on days since import - always show
      const ageBadge = daysSinceImport === 0
        ? '<span class="text-xs bg-green-100 text-me-success px-2 py-0.5 rounded-full">📅 Today</span>'
        : daysSinceImport === 1
        ? '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">📅 1 day</span>'
        : daysSinceImport < 3
        ? '<span class="text-xs bg-me-bg text-me-text-secondary px-2 py-0.5 rounded-full">📅 ' + daysSinceImport + ' days</span>'
        : '<span class="text-xs bg-amber-100 text-me-warning px-2 py-0.5 rounded-full">⚠️ ' + (daysSinceImport || 0) + ' days</span>';
      const ediDate = o.parsed_data?.dates?.orderDate || o.parsed_data?.dates?.poDate || '';
      const ediDateStr = ediDate ? new Date(ediDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A';

      // Check for prepacks - must have UOM of AS/ST AND packQty > 1 to be a true prepack
      const prepackItems = items.filter(i =>
        (i.isPrepack || i.unitOfMeasure === 'AS' || i.unitOfMeasure === 'ST') &&
        i.packQty > 1
      );
      const hasPrepack = prepackItems.length > 0;
      const totalUnits = items.reduce((s, i) => s + (i.totalUnits || i.quantityOrdered || 0), 0);

      // Check for amendments
      const isAmended = o.is_amended === true;
      const amendmentCount = o.amendment_count || 0;
      const amendmentType = o.amendment_type || '';
      const is860 = o.transaction_type === '860' || amendmentType === '860_change';

      // Check for partial processing
      const isPartial = o.is_partial === true || o.status === 'partial';
      const fieldsPending = o.fields_pending || {};
      const pendingCount = Object.keys(fieldsPending).length;

      // Check for match results (check both matches and noMatches arrays)
      const match = matchResults?.matches?.find(m => m.ediOrder?.id === o.id);
      const noMatchResult = matchResults?.noMatches?.find(m => m.ediOrder?.id === o.id);
      const hasMatch = match && match.zohoDraft;
      const matchConf = match?.confidence || 0;
      const isNoMatch = !!noMatchResult;

      // Determine border color priority: partial > amended > old > default
      let borderClass = 'border-me-border';
      if (isPartial) borderClass = 'border-yellow-400 bg-yellow-50/30';
      else if (isAmended) borderClass = 'border-orange-300 bg-orange-50/30';
      else if (isOld) borderClass = 'border-amber-200 bg-amber-50/30';

      // Match indicator badge
      let matchBadge = '';
      if (hasMatch) {
        if (matchConf >= 100) matchBadge = '<span class="text-xs bg-green-100 text-me-success px-2 py-0.5 rounded-full font-medium">✓ 100% match</span>';
        else if (matchConf >= 80) matchBadge = '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">✓ ' + matchConf + '% match</span>';
        else if (matchConf >= 60) matchBadge = '<span class="text-xs bg-amber-100 text-me-warning px-2 py-0.5 rounded-full font-medium">⚠️ ' + matchConf + '% match</span>';
        else matchBadge = '<span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⚠️ ' + matchConf + '% match</span>';
      } else if (isNoMatch) {
        matchBadge = '<span class="text-xs bg-red-100 text-me-error px-2 py-0.5 rounded-full">❌ No match</span>';
      }

      return \`
        <div class="bg-white rounded-xl border \${borderClass} p-4 hover:border-me-border transition">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <input type="checkbox" \${selectedIds.has(o.id) ? 'checked' : ''} onchange="toggleSelect(\${o.id})"
                class="w-5 h-5 rounded border-me-border text-me-accent cursor-pointer">
              <div>
                <div class="font-semibold text-me-text-primary">\${o.edi_order_number || 'N/A'}</div>
                <div class="text-sm text-me-text-muted">\${o.edi_customer_name || 'Unknown'}</div>
              </div>
              \${ageBadge}
              \${matchBadge}
              \${isPartial ? '<span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">🟡 Partial' + (pendingCount > 0 ? ' (' + pendingCount + ' pending)' : '') + '</span>' : ''}
              \${isAmended ? '<span class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">🔄 Amended' + (amendmentCount > 1 ? ' (' + amendmentCount + 'x)' : '') + '</span>' : ''}
              \${is860 ? '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">860 Change</span>' : ''}
              \${hasPrepack ? '<span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">📦 Prepack</span>' : ''}
            </div>
            <div class="flex items-center gap-8">
              <div class="text-right">
                <div class="text-sm text-me-text-muted">\${items.length} items\${hasPrepack ? ' <span class="text-purple-500">(' + totalUnits + ' units)</span>' : ''}</div>
                <div class="font-semibold text-me-text-primary">$\${amt.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-me-text-muted uppercase">Imported</div>
                <div class="text-sm \${isOld ? 'text-me-warning font-medium' : 'text-me-text-secondary'}">\${importedStr}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-me-text-muted uppercase">EDI Date</div>
                <div class="text-sm text-me-text-secondary">\${ediDateStr}</div>
              </div>
              <button onclick="viewEdiDetails(\${o.id})" class="p-2 hover:bg-me-bg rounded-lg transition" title="View Details">
                👁️
              </button>
            </div>
          </div>
        </div>
      \`;
    }).join('');
  }

  function filterOrders() { renderOrders(); }

  // Customer Treemap Functions
  var treemapFilter = null;

  function toggleTreemap() {
    const container = document.getElementById('customerTreemap');
    const arrow = document.getElementById('treemapArrow');
    if (container.style.display === 'none') {
      container.style.display = 'flex';
      arrow.textContent = '▼';
    } else {
      container.style.display = 'none';
      arrow.textContent = '▶';
    }
  }

  function buildCustomerTreemap(orders) {
    const pendingOrders = orders.filter(o => o.status !== 'processed' && !o.zoho_so_number);
    const customerData = {};

    pendingOrders.forEach(o => {
      const customer = o.edi_customer_name || 'Unknown';
      if (!customerData[customer]) customerData[customer] = { count: 0, units: 0, amount: 0 };
      customerData[customer].count++;

      const parsed = typeof o.parsed_data === 'string' ? JSON.parse(o.parsed_data) : o.parsed_data;
      if (parsed && parsed.items) {
        parsed.items.forEach(item => {
          customerData[customer].units += item.totalUnits || item.quantityOrdered || 0;
          customerData[customer].amount += (item.unitPrice || 0) * (item.quantityOrdered || 0);
        });
      }
    });

    const sorted = Object.entries(customerData).sort((a, b) => b[1].amount - a[1].amount);
    const totalAmount = sorted.reduce((s, [_, d]) => s + d.amount, 0);
    const colors = ['#1e3a5f', '#0088c2', '#2d5a7f', '#34c759', '#ff9500', '#5a6b7f', '#3a7ca5', '#ff3b30'];

    let html = '';
    sorted.forEach(([customer, data], idx) => {
      const isActive = treemapFilter === customer;
      const pct = totalAmount > 0 ? (data.amount / totalAmount * 100).toFixed(1) : 0;
      const amtStr = data.amount >= 1000000 ? '$' + (data.amount / 1000000).toFixed(2) + 'M'
                   : data.amount >= 1000 ? '$' + (data.amount / 1000).toFixed(1) + 'K'
                   : '$' + Math.round(data.amount).toLocaleString();

      html += '<div class="treemap-item ' + (isActive ? 'active' : '') + '" style="background:' + colors[idx % colors.length] + '" onclick="filterByCustomer(\\'' + customer.replace(/'/g, "\\\\'") + '\\')">';
      html += '<div class="treemap-label">' + customer + '</div>';
      html += '<div class="treemap-value">' + amtStr + '</div>';
      html += '<div class="treemap-stats">' + data.count + ' orders · ' + data.units.toLocaleString() + ' units · ' + pct + '%</div>';
      html += '</div>';
    });

    document.getElementById('customerTreemap').innerHTML = html;
  }

  function filterByCustomer(customer) {
    const customerDropdown = document.getElementById('customerFilter');

    if (treemapFilter === customer) {
      treemapFilter = null;
      customerDropdown.value = '';
    } else {
      treemapFilter = customer;
      customerDropdown.value = customer;
    }

    filterOrders();
    buildCustomerTreemap(window.currentOrders);
  }

  function toggleSelect(id) {
    selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id);
    renderOrders();
    updatePendingCount();
  }

  function toggleAll() {
    const checked = document.getElementById('selectAll')?.checked;
    const filtered = orders.filter(o => !o.zoho_so_number && o.status !== 'processed');
    filtered.forEach(o => checked ? selectedIds.add(o.id) : selectedIds.delete(o.id));
    renderOrders();
    updatePendingCount();
  }

  function updateCustomerFilter() {
    const customers = [...new Set(orders.map(o => o.edi_customer_name).filter(Boolean))].sort();
    document.getElementById('customerFilter').innerHTML = '<option value="">All Customers</option>' +
      customers.map(c => '<option value="' + c + '">' + c + '</option>').join('');
  }

  function updatePendingCount() {
    const pending = orders.filter(o => !o.zoho_so_number && o.status !== 'processed');
    const count = selectedIds.size > 0 ? selectedIds.size : pending.length;
    const el = document.getElementById('pendingCountBtn');
    if (el) el.textContent = count;
  }

  function updateWorkflowCounts() {
    const pendingCount = orders.filter(o => o.status === 'pending' && !o.zoho_so_number).length;
    const inboxEl = document.getElementById('inbox-count');
    if (inboxEl) inboxEl.textContent = pendingCount;

    // Update Review Matches count - show different text when no matching has been run
    const reviewCountEl = document.getElementById('review-count');
    const reviewLabelEl = document.getElementById('review-count-label');
    if (reviewCountEl && reviewLabelEl) {
      if (matchResults) {
        const reviewCount = (matchResults.matches?.length || 0) + (matchResults.noMatches?.length || 0);
        reviewCountEl.textContent = reviewCount;
        reviewLabelEl.textContent = 'to review';
      } else {
        reviewCountEl.textContent = '—';
        reviewLabelEl.textContent = 'click Find Matches';
      }
    }

    const sentCount = orders.filter(o => o.status === 'processed' || o.zoho_so_number).length;
    const doneEl = document.getElementById('done-count');
    if (doneEl) doneEl.textContent = sentCount;

    updatePendingCount();
    updateSelectedDisplay();
  }

  function updateSelectedDisplay() {
    const count = selectedMatchIds.size;
    const countDisplay = document.getElementById('selectedCountDisplay');
    const actionBarCount = document.getElementById('actionBarCount');
    if (countDisplay) countDisplay.textContent = count;
    if (actionBarCount) actionBarCount.textContent = count;

    const actionBar = document.getElementById('reviewActionBar');
    if (actionBar) {
      if (count > 0) {
        actionBar.classList.remove('hidden');
      } else {
        actionBar.classList.add('hidden');
      }
    }
  }

  // ============================================================
  // SFTP & CACHE
  // ============================================================
  async function fetchFromSftp() {
    const btn = document.getElementById('fetchSftpBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Fetching...';

    try {
      const res = await fetch('/fetch-sftp', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast('Fetched ' + (data.newOrders || 0) + ' new orders');
        loadOrders();
      } else {
        toast('Error: ' + (data.error || 'Unknown'));
      }
    } catch (e) {
      toast('Error: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔄 Fetch from SFTP';
    }
  }

  async function loadCacheStatus() {
    try {
      const res = await fetch('/cache/status');
      const data = await res.json();
      if (data.success) {
        document.getElementById('cacheDraftsCount').textContent = data.draftsCount || 0;
        if (!data.lastRefresh) {
          document.getElementById('cacheIndicator').textContent = '⚠️';
          document.getElementById('cacheLastRefresh').textContent = 'Never';
        } else if (data.isStale) {
          document.getElementById('cacheIndicator').textContent = '🟡';
          document.getElementById('cacheLastRefresh').textContent = data.minutesSinceRefresh + ' min ago (stale)';
        } else {
          document.getElementById('cacheIndicator').textContent = '🟢';
          document.getElementById('cacheLastRefresh').textContent = data.minutesSinceRefresh + ' min ago';
        }
      }
    } catch (e) {}
  }

  async function refreshZohoCache() {
    toast('Refreshing Zoho data...');
    try {
      const res = await fetch('/cache/refresh', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast('Refreshed ' + data.draftsCount + ' Zoho drafts');
        loadCacheStatus();
      } else {
        toast('Error: ' + (data.error || 'Unknown'));
      }
    } catch (e) {
      toast('Error: ' + e.message);
    }
  }

  // ============================================================
  // FIND MATCHES
  // ============================================================
  async function findMatchesForSelected() {
    const pendingOrders = selectedIds.size > 0
      ? orders.filter(o => selectedIds.has(o.id))
      : orders.filter(o => o.status === 'pending' && !o.zoho_so_number);

    if (!pendingOrders.length) {
      toast('No orders to match');
      return;
    }

    const btn = document.getElementById('findMatchesBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Checking Zoho cache...';

    try {
      // Check if cache is stale - if so, show "Refreshing Zoho..." message
      const cacheRes = await fetch('/cache/status');
      const cacheStatus = await cacheRes.json();

      if (cacheStatus.isStale || cacheStatus.draftsCount === 0) {
        btn.innerHTML = '<span class="spinner"></span> Refreshing Zoho data...';
      } else {
        btn.innerHTML = '<span class="spinner"></span> Finding matches...';
      }

      const res = await fetch('/find-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: pendingOrders.map(o => o.id) })
      });
      const data = await res.json();

      if (data.success) {
        matchResults = data;
        selectedMatchIds.clear();
        flaggedMatchIds.clear();
        selectedMatchDrafts.clear();
        focusModeIndex = 0;
        saveSession();
        updateWorkflowCounts();
        updateFilterCounts();
        updateReviewCustomerFilter();
        loadCacheStatus(); // Refresh the cache status display
        currentReviewCustomerFilter = ''; // Reset customer filter for new results

        // Stay on inbox - user can click orders to see matches in modal
        loadOrders(); // Refresh order list to show match indicators

        // Show appropriate toast message
        const matchCount = data.matches?.length || 0;
        const perfectCount = data.matches?.filter(m => m.confidence >= 100).length || 0;
        if (data.cacheRefreshed) {
          toast('Zoho data refreshed • Found ' + matchCount + ' matches (' + perfectCount + ' perfect)');
        } else {
          toast('✓ Found ' + matchCount + ' matches (' + perfectCount + ' perfect) - Click orders to review');
        }
      } else {
        toast('Error: ' + (data.error || 'Unknown'));
      }
    } catch (e) {
      toast('Error: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔍 Find Matches for <span id="pendingCountBtn">' + (selectedIds.size || orders.filter(o => o.status === 'pending' && !o.zoho_so_number).length) + '</span> orders';
    }
  }

  // ============================================================
  // CONFIDENCE FILTER
  // ============================================================
  function getConfidenceLevel(conf) {
    if (conf >= 100) return 'perfect';
    if (conf >= 80) return 'high';
    if (conf >= 60) return 'medium';
    return 'low'; // Below 60% but still has a match
  }

  function updateFilterCounts() {
    if (!matchResults) return;

    const matches = matchResults.matches || [];
    const noMatches = matchResults.noMatches || [];

    // Apply customer filter to counts
    let filteredMatches = matches;
    let filteredNoMatches = noMatches;
    if (currentReviewCustomerFilter) {
      filteredMatches = matches.filter(m => m.ediOrder?.customer === currentReviewCustomerFilter);
      filteredNoMatches = noMatches.filter(m => m.ediOrder?.customer === currentReviewCustomerFilter);
    }

    let counts = { all: filteredMatches.length + filteredNoMatches.length, perfect: 0, high: 0, medium: 0, nomatch: filteredNoMatches.length };

    filteredMatches.forEach(m => {
      const conf = m.confidence || 0;
      if (conf >= 100) counts.perfect++;
      else if (conf >= 80) counts.high++;
      else if (conf >= 60) counts.medium++;
      // Below 60% matches are included in 'all' but not shown separately
    });

    document.getElementById('filter-count-all').textContent = counts.all;
    document.getElementById('filter-count-perfect').textContent = counts.perfect;
    document.getElementById('filter-count-high').textContent = counts.high;
    document.getElementById('filter-count-medium').textContent = counts.medium;
    document.getElementById('filter-count-nomatch').textContent = counts.nomatch;
  }

  function setConfidenceFilter(level) {
    currentConfidenceFilter = level;

    // Update button styles
    document.querySelectorAll('.conf-filter').forEach(btn => {
      const btnFilter = btn.dataset.filter;
      if (btnFilter === level) {
        btn.classList.add('bg-white', 'shadow-sm', 'text-me-text-primary');
        btn.classList.remove('text-me-text-muted');
      } else {
        btn.classList.remove('bg-white', 'shadow-sm', 'text-me-text-primary');
        btn.classList.add('text-me-text-muted');
      }
    });

    showListView();
  }

  function getFilteredMatches() {
    if (!matchResults) return [];

    let matches = matchResults.matches || [];
    const noMatches = matchResults.noMatches || [];

    // Combine all for filtering
    let allMatches;
    if (currentConfidenceFilter === 'nomatch') {
      allMatches = noMatches.map(m => ({ ...m, confidence: 0, isNoMatch: true }));
    } else if (currentConfidenceFilter === '') {
      allMatches = [...matches, ...noMatches.map(m => ({ ...m, confidence: 0, isNoMatch: true }))];
    } else {
      allMatches = matches.filter(m => getConfidenceLevel(m.confidence || 0) === currentConfidenceFilter);
    }

    // Apply customer filter
    if (currentReviewCustomerFilter) {
      allMatches = allMatches.filter(m => m.ediOrder?.customer === currentReviewCustomerFilter);
    }

    return allMatches;
  }

  function filterReviewMatches() {
    currentReviewCustomerFilter = document.getElementById('reviewCustomerFilter')?.value || '';
    updateFilterCounts();
    showListView();
  }

  function updateReviewCustomerFilter() {
    if (!matchResults) return;

    const matches = matchResults.matches || [];
    const noMatches = matchResults.noMatches || [];
    const allMatches = [...matches, ...noMatches];

    const customers = [...new Set(allMatches.map(m => m.ediOrder?.customer).filter(Boolean))].sort();

    const select = document.getElementById('reviewCustomerFilter');
    if (select) {
      const currentValue = select.value;
      select.innerHTML = '<option value="">All Customers</option>' +
        customers.map(c => '<option value="' + c + '"' + (c === currentValue ? ' selected' : '') + '>' + c + '</option>').join('');
    }
  }

  // ============================================================
  // LIST VIEW (Match Cards)
  // ============================================================
  function showListView() {
    if (!matchResults || (!matchResults.matches?.length && !matchResults.noMatches?.length)) {
      document.getElementById('reviewEmptyState').classList.remove('hidden');
      document.getElementById('listViewContainer').classList.add('hidden');
      document.getElementById('focusModeContainer').classList.add('hidden');
      return;
    }

    viewMode = 'list';
    document.getElementById('reviewEmptyState').classList.add('hidden');
    document.getElementById('listViewContainer').classList.remove('hidden');
    document.getElementById('focusModeContainer').classList.add('hidden');

    const filteredMatches = getFilteredMatches();

    // Update progress
    document.getElementById('list-total-matches').textContent = filteredMatches.length;

    renderMatchCards(filteredMatches);
  }

  function renderMatchCards(matches) {
    const container = document.getElementById('matchCardsContainer');

    if (!matches.length) {
      container.innerHTML = '<div class="text-center py-12 text-me-text-muted">No matches in this category.</div>';
      return;
    }

    container.innerHTML = matches.map((match, index) => {
      const edi = match.ediOrder;
      const zoho = match.zohoDraft;
      const conf = match.confidence || 0;
      const isNoMatch = match.isNoMatch;
      const isSelected = selectedMatchIds.has(edi.id);
      const isFlagged = flaggedMatchIds.has(edi.id);

      // Confidence badge styling
      let confBg, confBorder;
      if (conf >= 100) {
        confBg = 'bg-green-100 text-me-success'; confBorder = 'border-green-500';
      } else if (conf >= 80) {
        confBg = 'bg-blue-100 text-blue-700'; confBorder = 'border-blue-500';
      } else if (conf >= 60) {
        confBg = 'bg-amber-100 text-me-warning'; confBorder = 'border-amber-500';
      } else {
        confBg = 'bg-red-100 text-red-700'; confBorder = 'border-red-500';
      }

      // Card border based on selection state
      let cardBorder = 'border-me-border';
      if (isSelected) cardBorder = 'border-green-500 bg-green-50/30';
      if (isFlagged) cardBorder = 'border-red-500 bg-red-50/30';

      const items = edi.items || [];
      // Extract styles from SKU/vendorItemNumber (e.g., "79643J-BB-NAVY-S" -> "79643J")
      const styles = [...new Set(items.map(i => {
        const sku = i.productIds?.sku || i.productIds?.vendorItemNumber || i.style || '';
        // Extract base style (digits + optional letter, like "79643J")
        const match = sku.match(/^(\d{4,6}[A-Za-z]?)/);
        return match ? match[1] : '';
      }).filter(Boolean))];

      return \`
        <div class="bg-white rounded-xl border-2 \${cardBorder} p-4 hover:shadow-md transition cursor-pointer" onclick="openFocusMode(\${index})">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <input type="checkbox" \${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleMatchSelect(\${edi.id}, '\${zoho?.id || ''}')"
                class="w-5 h-5 rounded border-me-border text-green-500 cursor-pointer">
              <div>
                <div class="font-semibold text-me-text-primary">\${edi.customer}</div>
                <div class="text-sm text-me-text-muted">PO# \${edi.poNumber}\${zoho ? ' → Zoho Ref# ' + (zoho.reference || zoho.number) : ''}</div>
              </div>
              \${isFlagged ? '<span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">🚩 Flagged</span>' : ''}
              \${isSelected ? '<span class="text-xs bg-green-100 text-me-success px-2 py-0.5 rounded-full">✓ Selected</span>' : ''}
            </div>
            <div class="flex items-center gap-6">
              <div class="text-right">
                <div class="text-xs text-me-text-muted uppercase">Units</div>
                <div class="text-sm font-medium">\${(edi.totalUnits || 0).toLocaleString()}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-me-text-muted uppercase">Amount</div>
                <div class="text-sm font-medium">$\${(edi.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-me-text-muted uppercase">Styles</div>
                <div class="text-sm">\${styles.length > 0 ? styles.slice(0, 2).join(', ') + (styles.length > 2 ? '...' : '') : '-'}</div>
              </div>
              <div class="px-3 py-1.5 rounded-lg \${confBg} font-bold text-lg border \${confBorder}">
                \${isNoMatch ? 'No Match' : conf + '%'}
              </div>
              <button onclick="event.stopPropagation(); openFocusMode(\${index})" class="ml-2 px-3 py-1.5 bg-me-bg hover:bg-gray-200 text-me-text-secondary rounded-lg text-sm font-medium transition">
                Review →
              </button>
            </div>
          </div>
        </div>
      \`;
    }).join('');
  }

  function toggleMatchSelect(ediId, draftId) {
    if (selectedMatchIds.has(ediId)) {
      selectedMatchIds.delete(ediId);
      selectedMatchDrafts.delete(ediId);
    } else {
      selectedMatchIds.add(ediId);
      if (draftId) selectedMatchDrafts.set(ediId, draftId);
      flaggedMatchIds.delete(ediId);
    }
    saveSession();
    updateSelectedDisplay();
    showListView();
  }

  // ============================================================
  // FIELD SELECTION FOR SELECTIVE PROCESSING
  // ============================================================

  // Initialize field selections for an order (all fields selected by default)
  function initFieldSelection(orderId, ediOrder, zohoDraft) {
    if (!fieldSelections.has(orderId)) {
      fieldSelections.set(orderId, {
        fields: {
          shipDate: true,
          cancelDate: true,
          customer: true,
          poNumber: true
        },
        overrides: {},
        lineItems: (ediOrder.items || []).map((_, idx) => idx), // All line items selected by default
        allLinesSelected: true
      });
    }
    return fieldSelections.get(orderId);
  }

  // Toggle a field selection
  function toggleFieldSelection(orderId, fieldName) {
    const sel = fieldSelections.get(orderId);
    if (sel) {
      sel.fields[fieldName] = !sel.fields[fieldName];
      updateFieldSelectionUI(orderId);
    }
  }

  // Set a field override value
  function setFieldOverride(orderId, fieldName, value) {
    const sel = fieldSelections.get(orderId);
    if (sel) {
      if (value === null || value === undefined || value === '') {
        delete sel.overrides[fieldName];
      } else {
        sel.overrides[fieldName] = value;
      }
      updateFieldSelectionUI(orderId);
    }
  }

  // Toggle a line item selection
  function toggleLineItemSelection(orderId, lineIdx) {
    const sel = fieldSelections.get(orderId);
    if (sel) {
      const idx = sel.lineItems.indexOf(lineIdx);
      if (idx >= 0) {
        sel.lineItems.splice(idx, 1);
      } else {
        sel.lineItems.push(lineIdx);
        sel.lineItems.sort((a, b) => a - b);
      }
      sel.allLinesSelected = false;
      updateFieldSelectionUI(orderId);
    }
  }

  // Toggle all line items
  function toggleAllLineItems(orderId, totalLines) {
    const sel = fieldSelections.get(orderId);
    if (sel) {
      if (sel.lineItems.length === totalLines) {
        sel.lineItems = [];
        sel.allLinesSelected = false;
      } else {
        sel.lineItems = Array.from({ length: totalLines }, (_, i) => i);
        sel.allLinesSelected = true;
      }
      updateFieldSelectionUI(orderId);
    }
  }

  // Check if all fields are selected (no partial)
  function isFullSelection(orderId, totalLines) {
    const sel = fieldSelections.get(orderId);
    if (!sel) return true;
    const allFieldsSelected = Object.values(sel.fields).every(v => v === true);
    const allLinesSelected = sel.lineItems.length === totalLines;
    const noOverrides = Object.keys(sel.overrides).length === 0;
    return allFieldsSelected && allLinesSelected && noOverrides;
  }

  // Get count of selected fields/items
  function getSelectionCounts(orderId, totalLines) {
    const sel = fieldSelections.get(orderId);
    if (!sel) return { fields: 4, lines: totalLines, hasOverrides: false };
    return {
      fields: Object.values(sel.fields).filter(v => v).length,
      lines: sel.lineItems.length,
      hasOverrides: Object.keys(sel.overrides).length > 0
    };
  }

  // Update the UI to reflect current selections
  function updateFieldSelectionUI(orderId) {
    // Re-render focus mode if we're in it
    if (focusModeActive) {
      showFocusMode();
    }
  }

  // Show inline edit input for a field
  function showFieldEdit(orderId, fieldName, currentValue) {
    const inputId = 'edit-' + orderId + '-' + fieldName;
    const existingInput = document.getElementById(inputId);
    if (existingInput) {
      existingInput.focus();
      return;
    }

    // Create inline edit
    const container = document.getElementById('field-cell-' + orderId + '-' + fieldName);
    if (container) {
      const isDate = fieldName.toLowerCase().includes('date');
      container.innerHTML = \`
        <input type="\${isDate ? 'date' : 'text'}" id="\${inputId}"
          value="\${currentValue || ''}"
          class="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-me-dark"
          onblur="saveFieldEdit(\${orderId}, '\${fieldName}')"
          onkeydown="if(event.key==='Enter'){saveFieldEdit(\${orderId}, '\${fieldName}')}"
        >
      \`;
      document.getElementById(inputId).focus();
    }
  }

  // Save inline edit
  function saveFieldEdit(orderId, fieldName) {
    const inputId = 'edit-' + orderId + '-' + fieldName;
    const input = document.getElementById(inputId);
    if (input) {
      const newValue = input.value;
      setFieldOverride(orderId, fieldName, newValue);
    }
  }

  // Reset field selection to all selected
  function resetFieldSelection(orderId, totalLines) {
    fieldSelections.set(orderId, {
      fields: {
        shipDate: true,
        cancelDate: true,
        customer: true,
        poNumber: true
      },
      overrides: {},
      lineItems: Array.from({ length: totalLines }, (_, i) => i),
      allLinesSelected: true
    });
    updateFieldSelectionUI(orderId);
  }

  // ============================================================
  // FOCUS MODE
  // ============================================================
  function openFocusMode(index) {
    focusModeIndex = index;
    viewMode = 'focus';
    focusModeActive = true;
    document.addEventListener('keydown', focusModeKeyHandler);

    document.getElementById('listViewContainer').classList.add('hidden');
    document.getElementById('focusModeContainer').classList.remove('hidden');

    showFocusMode();
  }

  function exitFocusMode() {
    focusModeActive = false;
    document.removeEventListener('keydown', focusModeKeyHandler);
    showListView();
  }

  function focusModeKeyHandler(e) {
    if (!focusModeActive) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'a' || e.key === 'A') { e.preventDefault(); focusModeApprove(); }
    else if (e.key === 's' || e.key === 'S') { e.preventDefault(); focusModeSkip(); }
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); focusModeFlag(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); focusModeNext(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); focusModePrev(); }
    else if (e.key === 'Escape') { e.preventDefault(); exitFocusMode(); }
  }

  function showFocusMode() {
    const allMatches = getFilteredMatches();
    if (allMatches.length === 0) {
      exitFocusMode();
      return;
    }

    if (focusModeIndex >= allMatches.length) focusModeIndex = allMatches.length - 1;
    if (focusModeIndex < 0) focusModeIndex = 0;

    const match = allMatches[focusModeIndex];
    const edi = match.ediOrder;
    const zoho = match.zohoDraft;
    const conf = match.confidence || 0;
    const score = match.score || {};
    const details = score.details || {};
    const isNoMatch = match.isNoMatch;

    // Status determination
    let statusBg, statusIcon, statusTitle, statusDesc;
    if (isNoMatch) {
      statusBg = 'bg-red-50 border-red-500'; statusIcon = '🚨';
      statusTitle = 'No Match Found'; statusDesc = 'No matching Zoho draft found for this order';
    } else if (conf >= 100) {
      statusBg = 'bg-green-50 border-green-500'; statusIcon = '✅';
      statusTitle = 'Perfect Match'; statusDesc = 'All fields match - safe to approve';
    } else if (conf >= 80) {
      statusBg = 'bg-blue-50 border-blue-500'; statusIcon = '👍';
      statusTitle = 'High Confidence'; statusDesc = 'Most fields match';
    } else if (conf >= 60) {
      statusBg = 'bg-amber-50 border-amber-500'; statusIcon = '⚠️';
      statusTitle = 'Review Recommended'; statusDesc = 'Some differences found';
    } else {
      statusBg = 'bg-red-50 border-red-500'; statusIcon = '🚨';
      statusTitle = 'Low Confidence'; statusDesc = 'Significant differences - verify carefully';
    }

    // Confidence badge color
    let confBg = conf >= 100 ? 'bg-green-100 text-me-success border-green-200' :
                 conf >= 80 ? 'bg-blue-100 text-blue-700 border-blue-200' :
                 conf >= 60 ? 'bg-amber-100 text-me-warning border-amber-200' :
                 'bg-red-100 text-red-700 border-red-200';

    const selectedCount = selectedMatchIds.size;
    const flaggedCount = flaggedMatchIds.size;
    const progressPercent = Math.round(((focusModeIndex + 1) / allMatches.length) * 100);

    // Format data
    const ediShipDate = edi.shipDate ? formatDate(edi.shipDate) : 'N/A';
    const zohoShipDate = zoho?.shipDate ? formatDate(zoho.shipDate) : 'N/A';
    const ediCancelDate = edi.cancelDate ? formatDate(edi.cancelDate) : 'N/A';
    const zohoCancelDate = zoho?.cancelDate ? formatDate(zoho.cancelDate) : '—';

    // Extract styles from items
    const ediItems = edi.items || [];
    const zohoItems = zoho?.items || [];
    // Extract base style from SKU/vendorItemNumber (e.g., "79643J-BB-NAVY-S" -> "79643J")
    const ediStyles = [...new Set(ediItems.map(i => {
      const sku = i.productIds?.sku || i.productIds?.vendorItemNumber || i.style || '';
      const match = sku.match(/^(\d{4,6}[A-Za-z]?)/);
      return match ? match[1] : '';
    }).filter(Boolean))];
    // Extract style from Zoho item name (e.g., "79643J-BB-NAVY-S" -> "79643J")
    const zohoStyles = [...new Set(zohoItems.map(i => {
      const name = i.name || '';
      const match = name.match(/^(\d{4,6}[A-Za-z]?)/);
      return match ? match[1] : '';
    }).filter(Boolean))];

    // Check if styles match
    const stylesMatch = ediStyles.length > 0 && zohoStyles.length > 0 &&
      ediStyles.some(es => zohoStyles.some(zs => es === zs));

    // Build HTML
    const html = \`
      <!-- Progress Bar -->
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-me-text-muted">Match <strong class="text-me-text-primary">\${focusModeIndex + 1}</strong> of <strong class="text-me-text-primary">\${allMatches.length}</strong></span>
        <div class="flex items-center gap-4 text-sm">
          <span class="text-me-success"><strong>\${selectedCount}</strong> selected</span>
          \${flaggedCount > 0 ? '<span class="text-me-error"><strong>' + flaggedCount + '</strong> flagged</span>' : ''}
        </div>
      </div>
      <div class="h-1.5 bg-gray-200 rounded-full mb-6">
        <div class="h-full bg-me-dark rounded-full transition-all" style="width: \${progressPercent}%"></div>
      </div>

      <!-- Focus Card -->
      <div class="bg-white rounded-xl border border-me-border shadow-sm overflow-hidden">

        <!-- Status Banner -->
        <div class="px-5 py-3 flex items-center gap-3 \${statusBg} border-b-2">
          <span class="text-xl">\${statusIcon}</span>
          <div>
            <div class="font-semibold">\${statusTitle}</div>
            <div class="text-sm opacity-80">\${statusDesc}</div>
          </div>
        </div>

        <!-- Header -->
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div class="text-lg font-semibold text-me-text-primary">\${edi.customer}</div>
            <div class="text-sm text-me-text-muted flex items-center gap-3">
              <span>PO# \${edi.poNumber}\${zoho ? ' → Zoho Ref# ' + (zoho.reference || zoho.number) : ''}</span>
              <button onclick="viewEdiDetails(\${edi.id})" class="text-xs bg-me-bg hover:bg-gray-200 text-me-text-secondary px-2 py-1 rounded transition">
                📄 View EDI Details
              </button>
            </div>
          </div>
          <div class="px-4 py-2 rounded-lg \${confBg} border font-bold text-xl">
            \${isNoMatch ? 'N/A' : conf + '%'}
          </div>
        </div>

        \${!isNoMatch ? \`
        <!-- Field Selection Info -->
        \${(() => {
          const sel = initFieldSelection(edi.id, edi, zoho);
          const counts = getSelectionCounts(edi.id, ediItems.length);
          const isFull = isFullSelection(edi.id, ediItems.length);
          return !isFull ? \`
          <div class="mx-5 mt-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-me-warning">
              <span>⚡</span>
              <span><strong>Selective Processing:</strong> \${counts.fields}/4 fields, \${counts.lines}/\${ediItems.length} line items\${counts.hasOverrides ? ', with overrides' : ''}</span>
            </div>
            <button onclick="resetFieldSelection(\${edi.id}, \${ediItems.length})" class="text-xs text-me-warning hover:text-amber-800 underline">Reset to All</button>
          </div>
          \` : '';
        })()}

        <!-- Comparison Table with Checkboxes -->
        <div class="px-5 py-4">
          <div class="text-xs text-me-text-muted mb-2 flex items-center gap-2">
            <span>💡</span>
            <span>EDI stays unchanged. Click ✏️ to customize what gets sent to Zoho.</span>
          </div>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-me-border">
                <th class="text-center py-2 font-medium text-me-text-muted w-10">✓</th>
                <th class="text-left py-2 font-medium text-me-text-muted w-24">Field</th>
                <th class="text-left py-2 font-medium text-me-accent bg-blue-50/50 px-2">EDI (source)</th>
                <th class="text-left py-2 font-medium text-me-success bg-green-50/50 px-2">Zoho Now</th>
                <th class="text-left py-2 font-medium text-purple-600 bg-purple-50/50 px-2">→ Send to Zoho</th>
                <th class="text-center py-2 font-medium text-me-text-muted w-12">✏️</th>
              </tr>
            </thead>
            <tbody>
              \${(() => {
                const sel = fieldSelections.get(edi.id) || { fields: {}, overrides: {} };
                const rows = [
                  { key: 'poNumber', label: 'PO / Ref', ediVal: edi.poNumber, zohoVal: zoho?.reference || zoho?.number || '-', match: details.po, editable: true, rawVal: edi.poNumber },
                  { key: 'customer', label: 'Customer', ediVal: edi.customer, zohoVal: zoho?.customer || '-', match: details.customer, editable: false },
                  { key: 'shipDate', label: 'Ship Date', ediVal: ediShipDate, zohoVal: zohoShipDate, match: details.shipDate, editable: true, rawVal: edi.shipDate },
                  { key: 'cancelDate', label: 'Cancel', ediVal: ediCancelDate, zohoVal: zohoCancelDate, match: details.cancelDate, editable: true, rawVal: edi.cancelDate }
                ];
                return rows.map(r => {
                  const isChecked = sel.fields[r.key] !== false;
                  const hasOverride = sel.overrides[r.key] !== undefined;
                  const sendVal = hasOverride ? sel.overrides[r.key] : r.ediVal;
                  return \`
                  <tr class="border-b border-gray-100 \${!isChecked ? 'opacity-40 bg-me-bg' : ''}">
                    <td class="py-2 text-center">
                      <input type="checkbox" \${isChecked ? 'checked' : ''} onchange="toggleFieldSelection(\${edi.id}, '\${r.key}')"
                        class="w-4 h-4 rounded border-me-border text-me-accent cursor-pointer">
                    </td>
                                                <td class="py-2 text-me-text-muted text-xs">\${r.match ? '<span class="text-me-success mr-1">✓</span>' : '<span class="text-me-error mr-1">✗</span>'}\${r.label}</td>
                    <td class="py-2 bg-blue-50/30 px-2 text-me-text-secondary text-xs">\${r.ediVal}</td>
                    <td class="py-2 bg-green-50/30 px-2 text-xs">\${r.zohoVal}</td>
                    <td class="py-2 bg-purple-50/30 px-2" id="field-cell-\${edi.id}-\${r.key}">
                      \${isChecked ?
                        (hasOverride ?
                          '<span class="text-purple-700 font-semibold">' + sendVal + '</span> <span class="text-xs text-purple-400">(custom)</span>' :
                          '<span class="text-purple-600">' + sendVal + '</span>') :
                        '<span class="text-me-text-muted italic text-xs">skip</span>'}
                    </td>
                    <td class="py-2 text-center">
                      \${r.editable && isChecked ? '<button onclick="showFieldEdit(' + edi.id + ', \\'' + r.key + '\\', \\'' + (sendVal || '').replace(/'/g, "\\\\'") + '\\')" class="text-me-text-muted hover:text-purple-600 text-xs">✏️</button>' : ''}
                    </td>
                  </tr>
                  \`;
                }).join('');
              })()}
              <tr class="border-b border-gray-100 bg-me-bg/50">
                <td class="py-2 text-center text-gray-300">—</td>
                <td class="py-2 text-me-text-muted text-xs">Units</td>
                <td class="py-2 bg-blue-50/30 px-2 font-semibold text-xs">\${(edi.totalUnits || 0).toLocaleString()}</td>
                <td class="py-2 bg-green-50/30 px-2 font-semibold text-xs">\${(zoho?.totalUnits || 0).toLocaleString()}</td>
                <td class="py-2 bg-purple-50/30 px-2 text-purple-600 text-xs">\${(edi.totalUnits || 0).toLocaleString()}</td>
                <td class="py-2"></td>
              </tr>
              <tr class="border-b border-gray-100 bg-me-bg">
                <td class="py-2 text-center text-gray-300">—</td>
                <td class="py-2 text-me-text-muted text-xs">Amount</td>
                <td class="py-2 bg-blue-50/30 px-2 font-semibold text-xs">$\${(edi.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td class="py-2 bg-green-50/30 px-2 font-semibold text-xs">$\${(zoho?.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} \${details.totalAmount ? '<span class="text-me-success">✓</span>' : '<span class="text-amber-500">⚠️</span>'}</td>
                <td class="py-2 bg-purple-50/30 px-2 text-purple-600 text-xs">$\${(edi.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td class="py-2"></td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="py-2 text-center text-gray-300">—</td>
                <td class="py-2 text-me-text-muted text-xs">Base Style</td>
                <td class="py-2 bg-blue-50/30 px-2">
                  \${ediStyles.length > 0 ? ediStyles.map(s => '<span class="inline-block bg-blue-100 px-1.5 py-0.5 rounded text-xs mr-1">' + s + '</span>').join('') : '-'}
                </td>
                <td class="py-2 bg-green-50/30 px-2">
                  \${zohoStyles.length > 0 ? zohoStyles.map(s => '<span class="inline-block bg-green-100 px-1.5 py-0.5 rounded text-xs mr-1">' + s + '</span>').join('') : '-'}
                  \${details.baseStyle ? '<span class="text-me-success ml-1">✓</span>' : '<span class="text-amber-500 ml-1">⚠️</span>'}
                </td>
                <td class="py-2 bg-purple-50/30 px-2">
                  \${ediStyles.length > 0 ? ediStyles.map(s => '<span class="inline-block bg-purple-100 px-1.5 py-0.5 rounded text-xs mr-1">' + s + '</span>').join('') : '-'}
                </td>
                <td class="py-2"></td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="py-2 text-center text-gray-300">—</td>
                <td class="py-2 text-me-text-muted text-xs">Suffix</td>
                <td class="py-2 bg-blue-50/30 px-2">
                  \${details.ediSuffixes ? '<span class="inline-block bg-blue-100 px-1.5 py-0.5 rounded text-xs">' + details.ediSuffixes + '</span>' : '-'}
                </td>
                <td class="py-2 bg-green-50/30 px-2">
                  \${details.zohoSuffixes ? '<span class="inline-block bg-green-100 px-1.5 py-0.5 rounded text-xs">' + details.zohoSuffixes + '</span>' : '-'}
                  \${details.styleSuffix ? '<span class="text-me-success ml-1">✓</span>' : (details.suffixWarning ? '<span class="text-amber-500 ml-1">⚠️</span>' : '')}
                </td>
                <td class="py-2 bg-purple-50/30 px-2">
                  \${details.ediSuffixes ? '<span class="inline-block bg-purple-100 px-1.5 py-0.5 rounded text-xs">' + details.ediSuffixes + '</span>' : '-'}
                </td>
                <td class="py-2"></td>
              </tr>
              \${details.upcMatch ? \`
              <tr class="border-b border-gray-100 bg-green-50/50">
                <td class="py-2 text-center text-gray-300">—</td>
                <td class="py-2 text-me-text-muted text-xs">UPC</td>
                <td class="py-2 bg-blue-50/30 px-2 text-xs font-mono">\${details.ediUpcCount || 0} UPCs</td>
                <td class="py-2 bg-green-50/30 px-2 text-xs font-mono">\${details.zohoUpcCount || 0} UPCs <span class="text-me-success font-medium">✓ \${details.upcMatchCount || 0}</span></td>
                <td class="py-2 bg-purple-50/30 px-2 text-xs font-mono">\${details.ediUpcCount || 0} UPCs</td>
                <td class="py-2"></td>
              </tr>
              \` : ''}
            </tbody>
          </table>
        </div>

        <!-- Line Items Comparison (expanded by default) -->
        <div class="px-5 pb-4">
          <button onclick="toggleLineItems()" class="text-sm text-me-text-secondary hover:text-me-text-primary flex items-center gap-2">
            <span id="lineItemsToggle">▼</span> View line items (\${ediItems.length} EDI → \${zohoItems.length} Zoho)
          </button>
          <div id="lineItemsContainer" class="mt-4">
            \${(() => {
              // Check if any items are prepacks - must have packQty > 1 to show the prepack math
              const prepackItems = ediItems.filter(i =>
                (i.isPrepack || i.unitOfMeasure === 'AS' || i.unitOfMeasure === 'ST') &&
                i.packQty > 1
              );
              const hasPrepack = prepackItems.length > 0;
              return hasPrepack ? \`
              <div class="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                <div class="flex items-center gap-2 text-purple-700 font-medium text-sm mb-2">
                  📦 Pre-Pack Order (\${prepackItems.length} prepack line\${prepackItems.length > 1 ? 's' : ''})
                </div>
                <div class="text-xs text-purple-600 space-y-1">
                  <p><strong>How it works:</strong> Customer orders by pack, we match by unit price</p>
                  <p>• <strong>Pack Price</strong> ÷ <strong>Pack Qty</strong> = <strong>Unit Price</strong> (what we match to Zoho)</p>
                  \${prepackItems.slice(0, 2).map(item => \`
                    <p class="bg-white/50 rounded px-2 py-1 mt-1">
                      Example: $\${(item.packPrice || 0).toFixed(2)} ÷ \${item.packQty || 1} units =
                      <strong>$\${(item.unitPrice || 0).toFixed(2)}/ea</strong>
                      \${item.unitPriceCalculated ? ' <span class="text-purple-500">(calculated)</span>' : ''}
                    </p>
                  \`).join('')}
                </div>
              </div>
              \` : '';
            })()}

            <!-- Sync behavior note -->
            <div class="bg-green-50 border border-green-200 rounded-lg p-2 mb-3 flex items-start gap-2">
              <span class="text-me-success">🔒</span>
              <div class="text-xs text-me-success">
                <strong>Zoho items preserved:</strong> Item names, SKUs, and descriptions stay unchanged.
                Only <span class="font-semibold">Qty</span> and <span class="font-semibold">Price</span> can be synced from EDI.
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <!-- EDI Items -->
              <div>
                <div class="text-sm font-semibold text-me-accent mb-2 flex items-center justify-between">
                  <span>EDI Order Line Items</span>
                  <label class="flex items-center gap-1 text-xs font-normal text-me-text-muted cursor-pointer">
                    <input type="checkbox" \${(() => { const sel = fieldSelections.get(edi.id); return sel && sel.lineItems.length === ediItems.length ? 'checked' : ''; })()}
                      onchange="toggleAllLineItems(\${edi.id}, \${ediItems.length})" class="w-3 h-3 rounded">
                    All
                  </label>
                </div>
                <table class="w-full text-xs">
                  <thead class="bg-blue-50">
                    <tr>
                      <th class="text-center px-1 py-1 w-8">✓</th>
                      <th class="text-left px-2 py-1">Style</th>
                      <th class="text-left px-2 py-1">Color</th>
                      <th class="text-center px-2 py-1">UOM</th>
                      <th class="text-right px-2 py-1">Qty</th>
                      <th class="text-right px-2 py-1">Unit $</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${ediItems.slice(0, 15).map((item, idx) => {
                      const uom = item.unitOfMeasure || 'EA';
                      const isPrepack = item.isPrepack || uom === 'AS' || uom === 'ST';
                      const sku = item.productIds?.sku || item.productIds?.vendorItemNumber || item.style || '';
                      const packPrice = item.packPrice || 0;
                      const unitPrice = item.unitPrice || 0;
                      const packQty = item.packQty || 1;
                      const sel = fieldSelections.get(edi.id);
                      const isSelected = sel ? sel.lineItems.includes(idx) : true;
                      return \`
                      <tr class="border-t border-gray-100 \${isPrepack ? 'bg-purple-50/30' : ''} \${!isSelected ? 'opacity-40 bg-me-bg' : ''}">
                        <td class="px-1 py-1 text-center">
                          <input type="checkbox" \${isSelected ? 'checked' : ''} onchange="toggleLineItemSelection(\${edi.id}, \${idx})"
                            class="w-3 h-3 rounded border-me-border text-me-accent cursor-pointer">
                        </td>
                        <td class="px-2 py-1">\${sku || '-'}</td>
                        <td class="px-2 py-1">\${item.color || '-'}</td>
                        <td class="px-2 py-1 text-center">
                          <span class="\${isPrepack ? 'bg-purple-100 text-purple-700' : 'bg-me-bg text-me-text-secondary'} px-1.5 py-0.5 rounded text-xs">\${uom}</span>
                          \${isPrepack && packQty > 1 ? '<div class="text-xs text-purple-500">' + packQty + '/pk</div>' : ''}
                        </td>
                        <td class="px-2 py-1 text-right">
                          \${item.quantityOrdered || 0}
                          \${isPrepack && packQty > 1 ? '<div class="text-xs text-me-text-muted">=' + (item.totalUnits || item.quantityOrdered * packQty) + ' ea</div>' : ''}
                        </td>
                        <td class="px-2 py-1 text-right font-medium \${item.unitPriceCalculated ? 'text-me-accent' : ''}">
                          $\${unitPrice.toFixed(2)}
                        </td>
                      </tr>
                    \`}).join('')}
                    \${ediItems.length > 10 ? '<tr><td colspan="7" class="px-2 py-1 text-center text-me-text-muted">... and ' + (ediItems.length - 10) + ' more</td></tr>' : ''}
                  </tbody>
                </table>
                <div class="text-xs text-me-text-muted mt-1">* Unit price calculated from pack price ÷ pack qty</div>
              </div>
              <!-- Zoho Items -->
              <div>
                <div class="text-sm font-semibold text-me-success mb-2 flex items-center gap-2">
                  <span>Zoho Draft</span>
                  <span class="text-xs font-normal text-green-500 bg-green-100 px-1.5 py-0.5 rounded">🔒 Items preserved</span>
                </div>
                <table class="w-full text-xs">
                  <thead class="bg-green-50">
                    <tr>
                      <th class="text-left px-2 py-1">Item <span class="text-green-500">🔒</span></th>
                      <th class="text-left px-2 py-1">UPC</th>
                      <th class="text-right px-2 py-1 text-me-accent">Qty ✎</th>
                      <th class="text-right px-2 py-1 text-me-accent">Rate ✎</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${zohoItems.slice(0, 10).map(item => {
                      const zohoUpc = item.cf_upc || item.upc || item.item?.upc || '';
                      return \`
                      <tr class="border-t border-gray-100">
                        <td class="px-2 py-1">\${item.name || item.sku || '-'}</td>
                        <td class="px-2 py-1 font-mono text-xs">\${zohoUpc || '-'}</td>
                        <td class="px-2 py-1 text-right">\${item.quantity || 0}</td>
                        <td class="px-2 py-1 text-right">$\${(item.rate || 0).toFixed(2)}</td>
                      </tr>
                    \`}).join('')}
                    \${zohoItems.length > 10 ? '<tr><td colspan="4" class="px-2 py-1 text-center text-me-text-muted">... and ' + (zohoItems.length - 10) + ' more</td></tr>' : ''}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        \` : \`
        <!-- No Match Info -->
        <div class="px-5 py-8 text-center">
          <p class="text-me-text-muted mb-4">No matching Zoho draft was found for this EDI order.</p>
          <button onclick="viewEdiDetails(\${edi.id})" class="px-4 py-2 bg-me-dark text-white rounded-lg hover:bg-me-hover transition">
            View Full EDI Details
          </button>
        </div>
        \`}

        \${!isNoMatch && match.alternativeMatches && match.alternativeMatches.length > 0 ? \`
        <!-- Alternative Matches -->
        <div class="px-5 py-3 bg-amber-50 border-t border-amber-200">
          <div class="text-sm font-medium text-me-warning mb-2">
            🔄 Alternative Matches (\${match.alternativeMatches.length} other potential matches)
          </div>
          <div class="space-y-2">
            \${match.alternativeMatches.map((alt, idx) => \`
              <div class="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">
                <div class="flex items-center gap-3">
                  <span class="text-xs text-me-text-muted">#\${idx + 2}</span>
                  <div>
                    <div class="font-medium text-sm text-me-text-primary">\${alt.zohoDraft.customer}</div>
                    <div class="text-xs text-me-text-muted">
                      Ref# \${alt.zohoDraft.reference || alt.zohoDraft.number}
                      • \${alt.zohoDraft.itemCount} items
                      • $\${alt.zohoDraft.totalAmount.toLocaleString()}
                      \${alt.zohoDraft.shipDate ? '• Ship: ' + formatDate(alt.zohoDraft.shipDate) : ''}
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-1 rounded text-xs font-medium \${alt.confidence >= 60 ? 'bg-amber-100 text-me-warning' : 'bg-me-bg text-me-text-secondary'}">
                    \${alt.confidence}%
                  </span>
                  <button onclick="switchToAlternativeMatch(\${focusModeIndex}, \${idx})" class="px-2 py-1 bg-me-dark text-white text-xs rounded hover:bg-me-hover transition">
                    Use This
                  </button>
                </div>
              </div>
            \`).join('')}
          </div>
        </div>
        \` : ''}

        <!-- Actions -->
        <div class="px-5 py-4 bg-me-bg border-t border-me-border flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button onclick="focusModeSkip()" class="px-4 py-2 bg-white border border-me-border rounded-lg hover:bg-me-bg transition text-me-text-secondary font-medium">
              Skip
            </button>
            <button onclick="focusModeFlag()" class="px-4 py-2 bg-white border border-me-border rounded-lg hover:bg-red-50 hover:border-red-200 transition text-me-text-secondary font-medium \${flaggedMatchIds.has(edi.id) ? 'bg-red-100 border-red-300 text-red-700' : ''}">
              \${flaggedMatchIds.has(edi.id) ? '🚩 Flagged' : '🚩 Flag'}
            </button>
            \${zoho ? \`<button onclick="window.open('https://books.zoho.com/app/677681121#/salesorders/\${zoho.id}','_blank')" class="px-4 py-2 bg-white border border-me-border rounded-lg hover:bg-me-bg transition text-me-text-secondary font-medium">
              🔗 Zoho
            </button>\` : ''}
          </div>
          \${!isNoMatch ? \`
          \${(() => {
            const isFull = isFullSelection(edi.id, ediItems.length);
            const counts = getSelectionCounts(edi.id, ediItems.length);
            const isSelected = selectedMatchIds.has(edi.id);
            if (isSelected) {
              return '<button onclick="focusModeApprove()" class="px-6 py-2.5 bg-me-success text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2">✓ Selected' + (!isFull ? ' (Partial)' : '') + '</button>';
            } else if (isFull) {
              return '<button onclick="focusModeApprove()" class="px-6 py-2.5 bg-me-success text-white rounded-lg hover:bg-me-success transition font-medium flex items-center gap-2">✓ Select All & Next →</button>';
            } else {
              return '<button onclick="focusModeApprove()" class="px-6 py-2.5 bg-me-warning text-white rounded-lg hover:bg-me-warning transition font-medium flex items-center gap-2">⚡ Select Partial (' + counts.fields + '/4 fields, ' + counts.lines + '/' + ediItems.length + ' items) →</button>';
            }
          })()}
          \` : \`
          <button onclick="createZohoOrder(\${edi.id})" class="px-6 py-2.5 bg-me-dark text-white rounded-lg hover:bg-me-hover transition font-medium flex items-center gap-2">
            ➕ Create in Zoho
          </button>
          \`}
        </div>
      </div>

      <!-- Navigation Footer -->
      <div class="flex items-center justify-between mt-4 text-sm">
        <button onclick="focusModePrev()" class="px-4 py-2 bg-white border border-me-border rounded-lg hover:bg-me-bg transition text-me-text-secondary \${focusModeIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}" \${focusModeIndex === 0 ? 'disabled' : ''}>
          ← Previous
        </button>
        <div class="text-me-text-muted">
          <kbd>A</kbd> select <kbd>S</kbd> skip <kbd>F</kbd> flag <kbd>←</kbd><kbd>→</kbd> navigate <kbd>Esc</kbd> exit
        </div>
        <button onclick="focusModeNext()" class="px-4 py-2 bg-white border border-me-border rounded-lg hover:bg-me-bg transition text-me-text-secondary \${focusModeIndex >= allMatches.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}" \${focusModeIndex >= allMatches.length - 1 ? 'disabled' : ''}>
          Next →
        </button>
      </div>
    \`;

    document.getElementById('focusModeContainer').innerHTML = html;
  }

  function toggleLineItems() {
    const container = document.getElementById('lineItemsContainer');
    const toggle = document.getElementById('lineItemsToggle');
    if (container.classList.contains('hidden')) {
      container.classList.remove('hidden');
      toggle.textContent = '▼';
    } else {
      container.classList.add('hidden');
      toggle.textContent = '▶';
    }
  }

  function focusModeApprove() {
    const allMatches = getFilteredMatches();
    if (focusModeIndex >= allMatches.length) return;

    const match = allMatches[focusModeIndex];
    if (match.isNoMatch) return;

    const ediId = match.ediOrder.id;
    const draftId = match.zohoDraft.id;

    selectedMatchIds.add(ediId);
    selectedMatchDrafts.set(ediId, draftId);
    flaggedMatchIds.delete(ediId);
    saveSession();
    updateSelectedDisplay();
    focusModeNext();
  }

  function focusModeSkip() {
    focusModeNext();
  }

  function switchToAlternativeMatch(matchIndex, altIndex) {
    // Swap the primary match with the alternative match
    const allMatches = getFilteredMatches();
    if (matchIndex >= allMatches.length) return;

    const match = allMatches[matchIndex];
    if (!match.alternativeMatches || altIndex >= match.alternativeMatches.length) return;

    // Get the alternative
    const alternative = match.alternativeMatches[altIndex];

    // Store the current primary as a new alternative
    const oldPrimary = {
      zohoDraft: match.zohoDraft,
      score: match.score,
      confidence: match.confidence,
      confidenceLevel: match.confidenceLevel
    };

    // Update the match object
    match.zohoDraft = alternative.zohoDraft;
    match.score = alternative.score;
    match.confidence = alternative.confidence;
    match.confidenceLevel = alternative.confidenceLevel;

    // Update alternatives list: remove the selected one and add the old primary
    match.alternativeMatches.splice(altIndex, 1);
    match.alternativeMatches.unshift(oldPrimary);

    // Update the selection if this match was already selected
    const ediId = match.ediOrder.id;
    if (selectedMatchIds.has(ediId)) {
      selectedMatchDrafts.set(ediId, match.zohoDraft.id);
    }

    saveSession();
    showFocusMode(); // Re-render
    toast('Switched to alternative match', 'success');
  }

  async function createZohoOrder(ediId) {
    if (!confirm('Create a new Sales Order in Zoho from this EDI order?\\n\\nThis will create a new draft order in Zoho Books.')) return;

    try {
      toast('Creating order in Zoho...');
      const res = await fetch('/create-new-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ediOrderId: ediId, confirmed: true })
      });
      const data = await res.json();

      if (data.success) {
        toast('Order created in Zoho: ' + data.salesOrderNumber, 'success');
        // Move to next
        focusModeNext();
      } else {
        toast('Error: ' + (data.error || 'Failed to create order'), 'error');
      }
    } catch (e) {
      toast('Error creating order: ' + e.message, 'error');
    }
  }

  function focusModeFlag() {
    const allMatches = getFilteredMatches();
    if (focusModeIndex >= allMatches.length) return;

    const match = allMatches[focusModeIndex];
    const ediId = match.ediOrder.id;

    if (flaggedMatchIds.has(ediId)) {
      flaggedMatchIds.delete(ediId);
    } else {
      flaggedMatchIds.add(ediId);
      selectedMatchIds.delete(ediId);
      selectedMatchDrafts.delete(ediId);
    }
    saveSession();
    updateSelectedDisplay();
    showFocusMode();
  }

  function focusModeNext() {
    const allMatches = getFilteredMatches();
    if (focusModeIndex < allMatches.length - 1) {
      focusModeIndex++;
      saveSession();
      showFocusMode();
    } else {
      // End of list - go back to list view
      exitFocusMode();
    }
  }

  function focusModePrev() {
    if (focusModeIndex > 0) {
      focusModeIndex--;
      saveSession();
      showFocusMode();
    }
  }

  function clearMatchResults() {
    if (!confirm('Clear all match results?')) return;
    clearSession();
    document.getElementById('reviewEmptyState').classList.remove('hidden');
    document.getElementById('listViewContainer').classList.add('hidden');
    document.getElementById('focusModeContainer').classList.add('hidden');
    document.getElementById('reviewActionBar').classList.add('hidden');
    updateWorkflowCounts();
    updateFilterCounts();
  }

  // ============================================================
  // SEND TO ZOHO
  // ============================================================
  async function sendSelectedToZoho() {
    if (selectedMatchIds.size === 0) {
      toast('No matches selected');
      return;
    }

    const allMatches = matchResults?.matches || [];
    const selectedMatches = allMatches.filter(m => selectedMatchIds.has(m.ediOrder.id));

    // Build diff table
    // Store for removal functionality
    window.pendingSendMatches = [...selectedMatches];

    renderSendReviewModal();
  }

  function renderSendReviewModal() {
    const selectedMatches = window.pendingSendMatches || [];

    if (selectedMatches.length === 0) {
      closeModal();
      toast('No orders to send');
      return;
    }

    // Helper to format dates nicely
    const fmtDate = (d) => {
      if (!d) return '—';
      const date = new Date(d);
      if (isNaN(date.getTime())) return d;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Calculate totals
    const totalEdiAmount = selectedMatches.reduce((sum, m) => sum + (m.ediOrder.totalAmount || 0), 0);
    const totalZohoAmount = selectedMatches.reduce((sum, m) => sum + (m.zohoDraft?.totalAmount || 0), 0);
    const totalEdiUnits = selectedMatches.reduce((sum, m) => sum + (m.ediOrder.totalUnits || 0), 0);
    const totalZohoUnits = selectedMatches.reduce((sum, m) => sum + (m.zohoDraft?.totalUnits || 0), 0);
    const ordersWithChanges = selectedMatches.filter(m => {
      const edi = m.ediOrder;
      const zoho = m.zohoDraft;
      return (edi.shipDate && edi.shipDate !== zoho?.shipDate) ||
             Math.abs((edi.totalAmount || 0) - (zoho?.totalAmount || 0)) > 1 ||
             edi.totalUnits !== zoho?.totalUnits;
    }).length;

    let ordersHtml = '';
    selectedMatches.forEach((match, index) => {
      const edi = match.ediOrder;
      const zoho = match.zohoDraft;

      let changes = [];
      if (edi.shipDate && edi.shipDate !== zoho?.shipDate) {
        changes.push({ field: 'Ship Date', from: fmtDate(zoho?.shipDate), to: fmtDate(edi.shipDate) });
      }
      if (Math.abs((edi.totalAmount || 0) - (zoho?.totalAmount || 0)) > 1) {
        changes.push({ field: 'Amount', from: '$' + (zoho?.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2}), to: '$' + (edi.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2}) });
      }
      if (edi.totalUnits !== zoho?.totalUnits) {
        changes.push({ field: 'Units', from: (zoho?.totalUnits || 0).toLocaleString(), to: (edi.totalUnits || 0).toLocaleString() });
      }

      ordersHtml += \`
        <div class="bg-white border border-me-border rounded-lg p-4 mb-3 relative" id="send-order-\${index}">
          <button onclick="removeFromSendList(\${index})" class="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-me-text-muted hover:text-me-error hover:bg-red-50 rounded transition" title="Remove from list">
            ✕
          </button>
          <div class="flex items-start gap-3 mb-3 pr-6">
            <div class="flex-1">
              <div class="font-semibold text-me-text-primary">\${edi.customer}</div>
              <div class="text-sm text-me-text-muted">PO# \${edi.poNumber} → Zoho Ref# \${zoho?.reference || zoho?.number || 'N/A'}</div>
            </div>
            <div class="text-right">
              <div class="font-semibold text-me-success">$\${(edi.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
              <div class="text-xs text-me-text-muted">\${edi.totalUnits?.toLocaleString() || 0} units</div>
            </div>
          </div>
          \${changes.length > 0 ? \`
            <div class="bg-amber-50 border border-amber-200 rounded p-2">
              <div class="text-xs font-semibold text-me-warning mb-1">Changes to apply:</div>
              <table class="w-full text-sm">
                <tbody>
                  \${changes.map(c => \`
                    <tr>
                      <td class="py-1 text-me-text-secondary w-24">\${c.field}</td>
                      <td class="py-1 text-red-400 line-through text-sm">\${c.from}</td>
                      <td class="py-1 text-me-success font-medium">→ \${c.to}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          \` : '<div class="text-sm text-me-success bg-green-50 border border-green-200 rounded p-2">✓ No field changes - will sync order</div>'}
        </div>
      \`;
    });

    const modalHtml = \`
      <div class="modal-overlay" onclick="closeModal()">
        <div class="bg-white rounded-xl max-w-3xl w-full mx-4 overflow-hidden" onclick="event.stopPropagation()">
          <div class="bg-me-dark text-white px-6 py-4 flex justify-between items-center">
            <h3 class="text-lg font-semibold">📋 Review & Confirm — \${selectedMatches.length} Order\${selectedMatches.length !== 1 ? 's' : ''}</h3>
            <button onclick="closeModal()" class="text-white hover:text-gray-300 text-xl">✕</button>
          </div>

          <!-- Summary Stats -->
          <div class="bg-me-bg px-6 py-4 border-b border-me-border">
            <div class="grid grid-cols-4 gap-4 text-center">
              <div>
                <div class="text-2xl font-bold text-me-text-primary">\${selectedMatches.length}</div>
                <div class="text-xs text-me-text-muted uppercase">Orders</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-me-success">$\${totalEdiAmount.toLocaleString('en-US', {minimumFractionDigits: 0})}</div>
                <div class="text-xs text-me-text-muted uppercase">Total Value</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-me-accent">\${totalEdiUnits.toLocaleString()}</div>
                <div class="text-xs text-me-text-muted uppercase">Total Units</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-me-warning">\${ordersWithChanges}</div>
                <div class="text-xs text-me-text-muted uppercase">With Changes</div>
              </div>
            </div>
          </div>

          <!-- Progress indicator (hidden initially) -->
          <div id="sendProgressBar" class="hidden px-6 py-3 bg-blue-50 border-b border-blue-200">
            <div class="flex items-center gap-3">
              <span class="spinner border-blue-500"></span>
              <span id="sendProgressText" class="text-blue-700 font-medium">Preparing...</span>
            </div>
            <div class="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
              <div id="sendProgressFill" class="h-full bg-me-dark transition-all duration-300" style="width: 0%"></div>
            </div>
          </div>

          <!-- Orders List -->
          <div class="p-6 max-h-[50vh] overflow-y-auto" id="sendOrdersList">
            \${ordersHtml}
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 bg-me-bg border-t flex justify-between items-center">
            <div class="text-sm text-me-text-muted">
              Click ✕ on any order to remove it from this batch
            </div>
            <div class="flex gap-3">
              <button onclick="closeModal()" class="px-4 py-2 border border-me-border rounded-lg hover:bg-me-bg font-medium">
                Cancel
              </button>
              <button onclick="executeBulkUpdate()" id="confirmBulkBtn" class="px-6 py-2.5 bg-me-success text-white rounded-lg hover:bg-me-success font-semibold flex items-center gap-2">
                ✓ Send \${selectedMatches.length} to Zoho
              </button>
            </div>
          </div>
        </div>
      </div>
    \`;

    document.getElementById('modalContainer').innerHTML = modalHtml;
  }

  function removeFromSendList(index) {
    if (!window.pendingSendMatches) return;

    const match = window.pendingSendMatches[index];
    if (match) {
      // Remove from the pending list
      window.pendingSendMatches.splice(index, 1);

      // Also remove from selected sets
      const ediId = match.ediOrder.id;
      selectedMatchIds.delete(ediId);
      selectedMatchDrafts.delete(ediId);
      saveSession();
      updateSelectedDisplay();

      // Re-render the modal
      renderSendReviewModal();

      toast('Removed from batch');
    }
  }

  function closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
    window.pendingSendMatches = null;
  }

  async function executeBulkUpdate() {
    const matches = window.pendingSendMatches || [];
    if (matches.length === 0) {
      closeModal();
      return;
    }

    const btn = document.getElementById('confirmBulkBtn');
    const progressBar = document.getElementById('sendProgressBar');
    const progressText = document.getElementById('sendProgressText');
    const progressFill = document.getElementById('sendProgressFill');
    const ordersList = document.getElementById('sendOrdersList');

    // Disable button and show progress
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Sending...';
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    progressBar.classList.remove('hidden');

    // Dim the orders list
    ordersList.classList.add('opacity-50', 'pointer-events-none');

    let success = 0, failed = 0;
    const total = matches.length;
    const results = [];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const ediOrderId = match.ediOrder.id;
      const draftId = match.zohoDraft?.id;

      // Update progress
      const percent = Math.round(((i + 1) / total) * 100);
      progressText.textContent = \`Sending order \${i + 1} of \${total}... (PO# \${match.ediOrder.poNumber})\`;
      progressFill.style.width = percent + '%';

      try {
        // Include field selections if any
        const sel = fieldSelections.get(ediOrderId);
        const ediItems = match.ediOrder.items || [];
        const requestBody = {
          ediOrderId: ediOrderId,
          zohoDraftId: draftId,
          fieldSelections: sel ? {
            fields: sel.fields,
            overrides: sel.overrides,
            lineItems: sel.lineItems,
            isPartial: !isFullSelection(ediOrderId, ediItems.length)
          } : null
        };

        const res = await fetch('/update-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        const data = await res.json();
        if (data.success) {
          success++;
          selectedMatchIds.delete(ediOrderId);
          selectedMatchDrafts.delete(ediOrderId);
          results.push({ poNumber: match.ediOrder.poNumber, success: true });

          // Mark as complete in UI
          const orderEl = document.getElementById('send-order-' + i);
          if (orderEl) {
            orderEl.classList.remove('opacity-50');
            orderEl.classList.add('border-green-300', 'bg-green-50');
            orderEl.innerHTML = '<div class="flex items-center gap-2 text-me-success font-medium"><span class="text-xl">✓</span> PO# ' + match.ediOrder.poNumber + ' — Sent successfully</div>';
          }
        } else {
          failed++;
          results.push({ poNumber: match.ediOrder.poNumber, success: false, error: data.error });

          // Mark as failed in UI
          const orderEl = document.getElementById('send-order-' + i);
          if (orderEl) {
            orderEl.classList.remove('opacity-50');
            orderEl.classList.add('border-red-300', 'bg-red-50');
            orderEl.innerHTML = '<div class="flex items-center gap-2 text-me-error font-medium"><span class="text-xl">✕</span> PO# ' + match.ediOrder.poNumber + ' — Failed: ' + (data.error || 'Unknown error') + '</div>';
          }
        }
      } catch (e) {
        failed++;
        results.push({ poNumber: match.ediOrder.poNumber, success: false, error: e.message });

        const orderEl = document.getElementById('send-order-' + i);
        if (orderEl) {
          orderEl.classList.remove('opacity-50');
          orderEl.classList.add('border-red-300', 'bg-red-50');
          orderEl.innerHTML = '<div class="flex items-center gap-2 text-me-error font-medium"><span class="text-xl">✕</span> PO# ' + match.ediOrder.poNumber + ' — Error: ' + e.message + '</div>';
        }
      }
    }

    // Update progress to complete
    progressFill.style.width = '100%';
    progressText.textContent = \`Complete! \${success} sent\${failed > 0 ? ', ' + failed + ' failed' : ''}\`;
    progressBar.classList.remove('bg-blue-50', 'border-blue-200');
    progressBar.classList.add(failed > 0 ? 'bg-amber-50' : 'bg-green-50', failed > 0 ? 'border-amber-200' : 'border-green-200');
    progressText.classList.remove('text-blue-700');
    progressText.classList.add(failed > 0 ? 'text-me-warning' : 'text-me-success');

    // Update button to close
    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-me-success', 'hover:bg-me-success');
    btn.classList.add('bg-me-hover', 'hover:bg-me-dark');
    btn.innerHTML = '✓ Done — Close';
    btn.onclick = () => {
      closeModal();

      // Refresh the UI
      saveSession();
      loadOrders();
      updateWorkflowCounts();
      updateSelectedDisplay();

      if (success > 0 && matchResults) {
        matchResults.matches = matchResults.matches.filter(m => selectedMatchIds.has(m.ediOrder.id));
        updateFilterCounts();
        if (matchResults.matches.length > 0 || matchResults.noMatches?.length > 0) {
          showListView();
        } else {
          showStage('done');
        }
      }

      toast('✅ ' + success + ' order' + (success !== 1 ? 's' : '') + ' sent to Zoho' + (failed > 0 ? ', ' + failed + ' failed' : ''));
    };

    // Re-enable orders list for viewing results
    ordersList.classList.remove('opacity-50', 'pointer-events-none');
  }

  // ============================================================
  // EDI DETAILS MODAL (Full tabbed interface)
  // ============================================================
  async function viewEdiDetails(orderId) {
    try {
      const res = await fetch('/orders/' + orderId);
      const order = await res.json();

      const items = order.parsed_data?.items || [];
      const amt = items.reduce((s, i) => s + (i.quantityOrdered || 0) * (i.unitPrice || 0), 0);
      const totalUnits = items.reduce((s, i) => s + (i.quantityOrdered || 0), 0);
      const dates = order.parsed_data?.dates || {};
      const shipping = order.parsed_data?.shipping || {};
      const pricing = order.parsed_data?.pricing || {};

      const modalHtml = \`
        <div class="modal-overlay" onclick="closeModal()">
          <div class="bg-white rounded-xl max-w-4xl w-full mx-4 overflow-hidden max-h-[90vh] flex flex-col" onclick="event.stopPropagation()">
            <div class="bg-me-dark text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 class="text-lg font-semibold">EDI Order Details</h3>
                <div class="text-sm text-gray-300">PO# \${order.edi_order_number} • \${order.edi_customer_name}</div>
              </div>
              <button onclick="closeModal()" class="text-white hover:text-gray-300 text-xl">✕</button>
            </div>

            <!-- Tabs -->
            <div class="border-b border-me-border px-6">
              <div class="flex gap-6">
                <button onclick="showEdiTab('summary')" class="tab-btn active py-3 text-sm font-medium" data-tab="summary">Summary</button>
                <button onclick="showEdiTab('lineitems')" class="tab-btn py-3 text-sm font-medium text-me-text-muted" data-tab="lineitems">📦 Line Items</button>
                <button onclick="showEdiTab('matches'); loadOrderMatch(\${order.id})" class="tab-btn py-3 text-sm font-medium text-me-text-muted" data-tab="matches" id="matchesTab-\${order.id}">🔍 Matches</button>
                \${order.is_amended ? '<button onclick="showEdiTab(\\'changes\\')" class="tab-btn py-3 text-sm font-medium text-orange-500" data-tab="changes">🔄 Changes (' + (order.amendment_count || 1) + ')</button>' : ''}
                <button onclick="showEdiTab('raw')" class="tab-btn py-3 text-sm font-medium text-me-text-muted" data-tab="raw">All Raw Data</button>
              </div>
            </div>

            <div class="p-6 overflow-y-auto flex-1">
              <!-- Summary Tab -->
              <div id="edi-tab-summary" class="edi-tab-content">
                <div class="grid grid-cols-4 gap-4 mb-6">
                  <div class="bg-me-bg rounded-lg p-4 text-center">
                    <div class="text-xs text-me-text-muted uppercase mb-1">PO Number</div>
                    <div class="text-lg font-semibold">\${order.edi_order_number || 'N/A'}</div>
                  </div>
                  <div class="bg-me-bg rounded-lg p-4 text-center">
                    <div class="text-xs text-me-text-muted uppercase mb-1">Customer</div>
                    <div class="text-lg font-semibold">\${order.edi_customer_name || 'Unknown'}</div>
                  </div>
                  <div class="bg-me-bg rounded-lg p-4 text-center">
                    <div class="text-xs text-me-text-muted uppercase mb-1">Order Date</div>
                    <div class="text-lg font-semibold">\${formatDate(dates.orderDate || dates.poDate)}</div>
                  </div>
                  <div class="bg-me-bg rounded-lg p-4 text-center">
                    <div class="text-xs text-me-text-muted uppercase mb-1">Unit of Measure</div>
                    <div class="text-lg font-semibold"><span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm">EA</span> Each</div>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-4 mb-6">
                  <div class="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
                    <div class="text-3xl font-bold text-blue-700">\${items.length}</div>
                    <div class="text-sm text-me-accent">Line Items</div>
                  </div>
                  <div class="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
                    <div class="text-3xl font-bold text-blue-700">\${totalUnits.toLocaleString()}</div>
                    <div class="text-sm text-me-accent">Units Ordered</div>
                  </div>
                  <div class="bg-green-50 rounded-lg p-4 text-center border border-green-100">
                    <div class="text-3xl font-bold text-me-success">$\${amt.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                    <div class="text-sm text-me-success">Total Value</div>
                  </div>
                </div>

                \${(() => {
                  const sampleItem = items[0] || {};
                  const packQty = sampleItem.packQty || 1;
                  const packPrice = sampleItem.packPrice || sampleItem.unitPrice || 0;
                  const eachPrice = sampleItem.eachPrice || sampleItem.unitPrice || (packQty > 1 ? packPrice / packQty : packPrice);
                  const isPrepack = sampleItem.isPrepack || (packQty > 1);
                  const uom = sampleItem.unitOfMeasure || 'EA';

                  if (isPrepack && packQty > 1) {
                    return \`
                      <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div class="font-semibold text-purple-800 mb-3">📦 Pre-Pack Order</div>
                        <div class="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <div class="text-xs text-me-text-muted uppercase">Pack Price</div>
                            <div class="font-bold text-purple-700 text-lg">$\${packPrice.toFixed(2)}</div>
                          </div>
                          <div class="flex items-center justify-center">
                            <div class="text-me-text-muted text-lg">÷</div>
                          </div>
                          <div>
                            <div class="text-xs text-me-text-muted uppercase">Pack Qty</div>
                            <div class="font-bold text-purple-700 text-lg">\${packQty}</div>
                          </div>
                          <div>
                            <div class="text-xs text-me-text-muted uppercase">= Each Price</div>
                            <div class="font-bold text-me-success text-lg">$\${eachPrice.toFixed(2)}</div>
                          </div>
                        </div>
                        <div class="mt-3 pt-3 border-t border-purple-200 text-xs text-purple-600">
                          UOM: <strong>\${uom}</strong> • Packs ordered are multiplied by pack qty to get total units
                        </div>
                      </div>
                    \`;
                  } else {
                    return \`
                      <div class="bg-me-bg rounded-lg p-4 border border-me-border">
                        <div class="font-semibold text-me-text-primary mb-2">💰 Pricing Details</div>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div class="text-xs text-me-text-muted uppercase">Unit Price</div>
                            <div class="font-bold text-me-success text-lg">$\${eachPrice.toFixed(2)}</div>
                          </div>
                          <div>
                            <div class="text-xs text-me-text-muted uppercase">Total Amount</div>
                            <div class="font-bold text-me-text-primary text-lg">$\${amt.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                          </div>
                        </div>
                      </div>
                    \`;
                  }
                })()}
              </div>

              <!-- Line Items Tab -->
              <div id="edi-tab-lineitems" class="edi-tab-content hidden">
                <div class="border border-me-border rounded-lg overflow-hidden overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead class="bg-me-bg">
                      <tr>
                        <th class="text-left px-3 py-2 text-me-text-muted">Style/SKU</th>
                        <th class="text-left px-3 py-2 text-me-text-muted">UPC</th>
                        <th class="text-left px-3 py-2 text-me-text-muted">Color</th>
                        <th class="text-left px-3 py-2 text-me-text-muted">Size</th>
                        <th class="text-center px-3 py-2 text-me-text-muted">UOM</th>
                        <th class="text-right px-3 py-2 text-me-text-muted">Qty</th>
                        <th class="text-right px-3 py-2 text-me-text-muted">Pack Price</th>
                        <th class="text-right px-3 py-2 text-me-text-muted">Each Price</th>
                        <th class="text-right px-3 py-2 text-me-text-muted">Retail</th>
                        <th class="text-right px-3 py-2 text-me-text-muted">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      \${items.map(item => {
                        const uom = item.unitOfMeasure || 'EA';
                        const isPrepack = item.isPrepack || uom === 'AS' || uom === 'ST';
                        const packQty = item.packQty || 1;
                        const packPrice = item.packPrice || item.unitPrice || 0;
                        const eachPrice = item.eachPrice || item.unitPrice || (packQty > 1 ? packPrice / packQty : packPrice);
                        const lineTotal = item.amount || ((item.quantityOrdered || 0) * packPrice);
                        const totalUnitsLine = item.totalUnits || (isPrepack && packQty > 1 ? (item.quantityOrdered || 0) * packQty : item.quantityOrdered || 0);
                        const upc = item.productIds?.upc || item.productIds?.gtin || '';
                        const sku = item.productIds?.sku || item.productIds?.vendorItemNumber || item.style || '';
                        const skuIsUpc = sku && /^\\d{10,14}$/.test(sku);
                        const retailPrice = item.retailPrice || 0;
                        return \`
                        <tr class="border-t border-gray-100 hover:bg-me-bg">
                          <td class="px-3 py-2 font-medium">\${skuIsUpc ? '<span class="text-me-text-muted text-xs">see UPC</span>' : sku || '-'}</td>
                          <td class="px-3 py-2 font-mono text-xs text-me-text-secondary">\${skuIsUpc ? sku : (upc || '-')}</td>
                          <td class="px-3 py-2">\${item.color || '-'}</td>
                          <td class="px-3 py-2">\${item.size || '-'}</td>
                          <td class="px-3 py-2 text-center">
                            <span class="\${isPrepack ? 'bg-purple-100 text-purple-700' : 'bg-me-bg text-me-text-secondary'} px-2 py-0.5 rounded text-xs font-medium">\${uom}</span>
                            \${isPrepack && packQty > 1 ? '<div class="text-xs text-me-text-muted mt-0.5">' + packQty + '/pk</div>' : ''}
                          </td>
                          <td class="px-3 py-2 text-right">
                            \${item.quantityOrdered || 0}
                            \${isPrepack && packQty > 1 ? '<div class="text-xs text-me-text-muted">(' + totalUnitsLine + ' ea)</div>' : ''}
                          </td>
                          <td class="px-3 py-2 text-right \${isPrepack ? 'font-medium' : 'text-me-text-muted'}">$\${packPrice.toFixed(2)}</td>
                          <td class="px-3 py-2 text-right \${!isPrepack ? 'font-medium' : ''}\${item.unitPriceCalculated ? ' text-me-accent' : ''}">
                            $\${eachPrice.toFixed(2)}
                            \${item.unitPriceCalculated ? '<span class="text-xs text-me-accent ml-1">*</span>' : ''}
                          </td>
                          <td class="px-3 py-2 text-right text-me-text-muted">\${retailPrice > 0 ? '$' + retailPrice.toFixed(2) : '-'}</td>
                          <td class="px-3 py-2 text-right font-medium text-me-success">$\${lineTotal.toFixed(2)}</td>
                        </tr>
                      \`}).join('')}
                    </tbody>
                    <tfoot class="bg-me-bg font-semibold">
                      <tr class="border-t border-me-border">
                        <td colspan="5" class="px-3 py-2 text-right">Totals:</td>
                        <td class="px-3 py-2 text-right">\${totalUnits.toLocaleString()} units</td>
                        <td colspan="3" class="px-3 py-2"></td>
                        <td class="px-3 py-2 text-right text-me-success">$\${amt.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <!-- Changes Tab (for amended orders) -->
              \${order.is_amended ? \`
              <div id="edi-tab-changes" class="edi-tab-content hidden">
                <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-orange-600 text-xl">🔄</span>
                    <h4 class="font-semibold text-orange-800">Order Amendment Detected</h4>
                    <span class="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full ml-2">
                      \${order.amendment_type === '860_change' ? 'EDI 860 Change Order' : 'Revised 850'}
                    </span>
                  </div>
                  <p class="text-sm text-orange-700">
                    This order has been modified \${order.amendment_count || 1} time(s). Review the changes below.
                  </p>
                </div>

                \${(() => {
                  const changes = order.changes_detected || [];
                  if (typeof changes === 'string') {
                    try { return JSON.parse(changes); } catch { return []; }
                  }
                  return changes;
                })().length > 0 ? \`
                <div class="mb-4">
                  <h4 class="font-semibold text-me-text-primary mb-2">📋 What Changed</h4>
                  <div class="bg-white rounded-lg border overflow-hidden">
                    <table class="w-full text-sm">
                      <thead class="bg-me-bg">
                        <tr>
                          <th class="text-left px-4 py-2 text-me-text-secondary font-medium">Field</th>
                          <th class="text-left px-4 py-2 text-me-text-secondary font-medium">Previous Value</th>
                          <th class="text-center px-2 py-2 text-me-text-muted">→</th>
                          <th class="text-left px-4 py-2 text-me-text-secondary font-medium">New Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        \${(() => {
                          let changes = order.changes_detected || [];
                          if (typeof changes === 'string') {
                            try { changes = JSON.parse(changes); } catch { changes = []; }
                          }
                          return changes.map((c, idx) => \`
                            <tr class="\${idx % 2 === 0 ? 'bg-white' : 'bg-me-bg'} border-t border-gray-100">
                              <td class="px-4 py-2 font-medium text-me-text-primary">\${c.field}</td>
                              <td class="px-4 py-2 text-me-error">\${c.from !== null && c.from !== undefined ? c.from : '<span class="text-me-text-muted italic">none</span>'}</td>
                              <td class="px-2 py-2 text-center text-me-text-muted">→</td>
                              <td class="px-4 py-2 text-me-success font-medium">\${c.to !== null && c.to !== undefined ? c.to : '<span class="text-me-text-muted italic">removed</span>'}</td>
                            </tr>
                          \`).join('');
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
                \` : '<p class="text-me-text-muted">No detailed changes recorded.</p>'}

                \${order.previous_data ? \`
                <div>
                  <h4 class="font-semibold text-me-text-primary mb-2">📜 Previous Order Data</h4>
                  <details class="bg-me-bg rounded-lg border">
                    <summary class="px-4 py-2 cursor-pointer text-sm text-me-text-secondary hover:text-me-text-primary">
                      Click to expand previous version
                    </summary>
                    <div class="p-4 border-t max-h-60 overflow-auto">
                      <pre class="text-xs text-me-text-secondary whitespace-pre-wrap">\${JSON.stringify(order.previous_data, null, 2)}</pre>
                    </div>
                  </details>
                </div>
                \` : ''}
              </div>
              \` : ''}

              <!-- Raw Data Tab -->
              <div id="edi-tab-raw" class="edi-tab-content hidden">
                <!-- Raw CSV Fields from Spring Systems -->
                \${order.parsed_data?.rawCsvData ? \`
                <div class="mb-4">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-me-text-primary">📄 Raw CSV Fields (Spring System)</h4>
                    <div class="relative">
                      <input type="text" id="rawDataSearch" placeholder="Search fields..."
                        oninput="filterRawDataTable(this.value)"
                        class="pl-8 pr-3 py-1.5 text-sm border border-me-border rounded-lg focus:ring-2 focus:ring-me-dark focus:border-me-dark w-48">
                      <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-me-text-muted">🔍</span>
                    </div>
                  </div>
                  <div class="bg-white rounded-lg border max-h-80 overflow-auto">
                    <table class="w-full text-sm" id="rawDataTable">
                      <thead class="bg-me-bg sticky top-0">
                        <tr>
                          <th class="text-left px-3 py-2 text-me-text-secondary font-medium w-1/3">Field Name</th>
                          <th class="text-left px-3 py-2 text-me-text-secondary font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody id="rawDataTableBody">
                        \${Object.entries(order.parsed_data.rawCsvData)
                          .filter(([k, v]) => v !== null && v !== undefined && v !== '')
                          .sort((a, b) => a[0].localeCompare(b[0]))
                          .map(([key, value], idx) => \`
                          <tr class="raw-data-row \${idx % 2 === 0 ? 'bg-white' : 'bg-me-bg'} border-b border-gray-100" data-field="\${key.toLowerCase()}" data-value="\${String(value).toLowerCase()}">
                            <td class="px-3 py-1.5 font-mono text-xs text-blue-700">\${key}</td>
                            <td class="px-3 py-1.5 text-me-text-primary">\${typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value}</td>
                          </tr>
                        \`).join('')}
                      </tbody>
                    </table>
                  </div>
                  <div id="rawDataSearchCount" class="text-xs text-me-text-muted mt-1"></div>
                </div>
                \` : ''}

                <!-- Parsed/Structured Data -->
                <div>
                  <h4 class="font-semibold text-me-text-primary mb-2">🔧 Parsed Data (Structured)</h4>
                  <div class="bg-me-bg rounded-lg border max-h-80 overflow-auto">
                    \${formatRawDataDisplay(order.parsed_data)}
                  </div>
                </div>
              </div>

              <!-- Matches Tab -->
              <div id="edi-tab-matches" class="edi-tab-content hidden">
                <div id="matchesContent-\${order.id}" class="matches-content">
                  <div class="text-center py-8 text-me-text-muted">
                    <div class="text-4xl mb-3">🔍</div>
                    <div class="font-medium">Click to Find Zoho Match</div>
                    <button onclick="loadOrderMatch(\${order.id})" class="mt-4 px-6 py-2 bg-me-dark text-white rounded-lg hover:bg-me-hover transition font-medium">
                      Find Match
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="px-6 py-4 bg-me-bg border-t flex justify-between items-center">
              <button onclick="closeModal()" class="px-4 py-2 bg-me-dark text-white rounded-lg hover:bg-me-hover">Close</button>
              <div id="matchActions-\${order.id}" class="hidden">
                <button onclick="processMatchFromModal(\${order.id})" class="px-6 py-2 bg-me-success text-white rounded-lg hover:bg-me-success transition font-medium flex items-center gap-2">
                  ✓ Process Match
                </button>
              </div>
            </div>
          </div>
        </div>
      \`;

      document.getElementById('modalContainer').innerHTML = modalHtml;
    } catch (e) {
      toast('Error loading order');
    }
  }

  function showEdiTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.edi-tab-content').forEach(el => el.classList.add('hidden'));
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.classList.add('text-me-text-muted');
    });
    // Show selected tab
    document.getElementById('edi-tab-' + tabName)?.classList.remove('hidden');
    // Activate button
    document.querySelector('.tab-btn[data-tab="' + tabName + '"]')?.classList.add('active');
    document.querySelector('.tab-btn[data-tab="' + tabName + '"]')?.classList.remove('text-me-text-muted');

    // Clear search when switching to raw tab
    if (tabName === 'raw') {
      const searchInput = document.getElementById('rawDataSearch');
      if (searchInput) searchInput.value = '';
      filterRawDataTable('');
    }
  }

  // Store matches found for individual orders in modal
  let modalMatchCache = new Map();

  // Load match for a single order (used in modal)
  async function loadOrderMatch(orderId) {
    const contentEl = document.getElementById('matchesContent-' + orderId);
    const actionsEl = document.getElementById('matchActions-' + orderId);
    const tabEl = document.getElementById('matchesTab-' + orderId);

    if (!contentEl) return;

    // Check if we already have cached modal results
    if (modalMatchCache.has(orderId)) {
      renderModalMatch(orderId, modalMatchCache.get(orderId));
      return;
    }

    // Check if we have bulk results from "Find Matches for X orders"
    if (matchResults && (matchResults.matches || matchResults.noMatches)) {
      const match = matchResults.matches?.find(m => m.ediOrder?.id === orderId);
      const noMatch = matchResults.noMatches?.find(m => m.ediOrder?.id === orderId);
      const result = match || (noMatch ? { ...noMatch, isNoMatch: true } : null);
      if (result) {
        modalMatchCache.set(orderId, result);
        renderModalMatch(orderId, result);
        return;
      }
    }

    // Show loading state
    contentEl.innerHTML = '<div class="text-center py-8"><div class="spinner border-blue-500 border-t-transparent w-8 h-8 mx-auto mb-3"></div><div class="text-me-text-muted">Finding Zoho match...</div></div>';

    try {
      // Add timeout to prevent infinite waiting
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const res = await fetch('/find-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [orderId] }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (data.success) {
        const match = data.matches?.find(m => m.ediOrder.id === orderId);
        const noMatch = data.noMatches?.find(m => m.ediOrder.id === orderId);
        const result = match || (noMatch ? { ...noMatch, isNoMatch: true } : null);

        modalMatchCache.set(orderId, result);
        renderModalMatch(orderId, result);
      } else {
        contentEl.innerHTML = '<div class="text-center py-8 text-me-error"><div class="text-4xl mb-3">⚠️</div><div>Error: ' + (data.error || 'Unknown error') + '</div></div>';
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        contentEl.innerHTML = '<div class="text-center py-8 text-me-error"><div class="text-4xl mb-3">⏱️</div><div>Request timed out. Try clicking "Find Matches" on the main screen first.</div></div>';
      } else {
        contentEl.innerHTML = '<div class="text-center py-8 text-me-error"><div class="text-4xl mb-3">⚠️</div><div>Error: ' + e.message + '</div></div>';
      }
    }
  }

  // Render match result in modal - FULL DETAILED VIEW with checkboxes and edit
  function renderModalMatch(orderId, result) {
    const contentEl = document.getElementById('matchesContent-' + orderId);
    const actionsEl = document.getElementById('matchActions-' + orderId);
    const tabEl = document.getElementById('matchesTab-' + orderId);

    if (!contentEl) return;

    if (!result) {
      contentEl.innerHTML = '<div class="text-center py-8 text-me-text-muted"><div class="text-4xl mb-3">🤷</div><div class="font-medium">No match data available</div></div>';
      if (actionsEl) actionsEl.classList.add('hidden');
      return;
    }

    const edi = result.ediOrder;
    const zoho = result.zohoDraft;
    const conf = result.confidence || 0;
    const score = result.score || {};
    const details = score.details || {};
    const isNoMatch = result.isNoMatch || !zoho;

    // Update tab with confidence badge
    if (tabEl) {
      let confColor = conf >= 100 ? 'text-me-success' : conf >= 80 ? 'text-me-accent' : conf >= 60 ? 'text-me-warning' : 'text-me-error';
      tabEl.innerHTML = '🔍 Matches <span class="ml-1 ' + confColor + ' font-bold">' + (isNoMatch ? '⚠️' : conf + '%') + '</span>';
    }

    if (isNoMatch) {
      // Extract EDI details for "what we searched for"
      const ediItems = edi?.items || [];
      const ediStyles = [...new Set(ediItems.map(i => {
        const sku = i.productIds?.sku || i.productIds?.vendorItemNumber || i.style || '';
        const match = sku.match(/^(\\d{4,6}[A-Za-z]?)/);
        return match ? match[1] : '';
      }).filter(Boolean))];
      const zohoCount = matchResults?.draftsChecked || 'unknown';

      // Rule info for no-match
      const noMatchRuleInfo = result.matchingRule;
      let noMatchRuleHTML = '';
      if (noMatchRuleInfo) {
        const ruleMethodLabel = noMatchRuleInfo.matchMethod === 'customer_po' ? 'Customer PO' :
                                noMatchRuleInfo.matchMethod === 'contract_ref' ? 'Contract Ref (' + (noMatchRuleInfo.contractRefField || 'po_rel_num') + ')' :
                                'Style + Customer';
        noMatchRuleHTML = '<div class="bg-me-bg border border-me-border rounded-lg p-3 mb-4">' +
          '<div class="flex items-center gap-3 text-sm text-me-text-secondary">' +
            '<span class="font-medium">🔧 Matching Rule:</span>' +
            '<span>' + (noMatchRuleInfo.isDefault ? 'Default (all customers)' : noMatchRuleInfo.customerName) + '</span>' +
            '<span class="text-me-text-muted">|</span>' +
            '<span>Searched by: <strong>' + ruleMethodLabel + '</strong></span>' +
          '</div>' +
        '</div>';
      }

      contentEl.innerHTML =
        '<div class="text-center py-4">' +
          '<div class="text-5xl mb-4">🔴</div>' +
          '<div class="text-xl font-semibold text-me-error mb-2">No Zoho Match Found</div>' +
          '<div class="text-me-text-muted mb-4">This EDI order does not have a matching draft in Zoho.</div>' +
        '</div>' +

        // Rule info (if available)
        noMatchRuleHTML +

        // What we searched for
        '<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">' +
          '<div class="font-medium text-blue-800 mb-2">🔍 What we searched for:</div>' +
          '<div class="text-sm text-blue-700 space-y-1">' +
            '<div><strong>PO Number:</strong> ' + (edi?.poNumber || 'N/A') + '</div>' +
            '<div><strong>Customer:</strong> ' + (edi?.customer || 'N/A') + '</div>' +
            '<div><strong>Base Style(s):</strong> ' + (ediStyles.length > 0 ? ediStyles.join(', ') : 'None detected') + '</div>' +
            '<div><strong>Ship Date:</strong> ' + (edi?.shipDate ? formatDate(edi.shipDate) : 'N/A') + '</div>' +
          '</div>' +
        '</div>' +

        // Why no match
        '<div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">' +
          '<div class="font-medium text-amber-800 mb-2">❌ Why no match was found:</div>' +
          '<div class="text-sm text-me-warning space-y-2">' +
            '<div class="flex items-start gap-2">' +
              '<span class="text-me-error">✗</span>' +
              '<span>No Zoho draft has PO/Reference = <strong>"' + (edi?.poNumber || '') + '"</strong></span>' +
            '</div>' +
            '<div class="flex items-start gap-2">' +
              '<span class="text-me-error">✗</span>' +
              '<span>No Zoho draft for <strong>' + (edi?.customer || 'this customer') + '</strong> with base style <strong>' + (ediStyles[0] || 'N/A') + '</strong></span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // What to do
        '<div class="bg-me-bg border border-me-border rounded-lg p-4">' +
          '<div class="font-medium text-me-text-primary mb-2">💡 What to do:</div>' +
          '<ul class="text-sm text-me-text-secondary space-y-1 list-disc list-inside">' +
            '<li>Check if a draft exists in Zoho for this order</li>' +
            '<li>Verify the PO number matches the Zoho reference field</li>' +
            '<li>Ensure customer name and style match between systems</li>' +
            '<li>Click <strong>Refresh Zoho Data</strong> if draft was just created</li>' +
          '</ul>' +
        '</div>';

      if (actionsEl) actionsEl.classList.add('hidden');
      return;
    }

    // Initialize field selection for this order
    initFieldSelection(orderId, edi, zoho);
    const sel = fieldSelections.get(orderId) || { fields: {}, overrides: {}, lineItems: [] };

    // Confidence styling
    let confBg, confIcon, statusBg, statusTitle, statusDesc;
    if (conf >= 100) {
      confBg = 'bg-green-100 text-me-success border-green-300'; confIcon = '🟢';
      statusBg = 'bg-green-50 border-green-500'; statusTitle = 'Perfect Match'; statusDesc = 'All fields match - safe to approve';
    } else if (conf >= 80) {
      confBg = 'bg-blue-100 text-blue-700 border-blue-300'; confIcon = '🔵';
      statusBg = 'bg-blue-50 border-blue-500'; statusTitle = 'High Confidence'; statusDesc = 'Most fields match';
    } else if (conf >= 60) {
      confBg = 'bg-amber-100 text-me-warning border-amber-300'; confIcon = '🟡';
      statusBg = 'bg-amber-50 border-amber-500'; statusTitle = 'Review Recommended'; statusDesc = 'Some differences found';
    } else {
      confBg = 'bg-red-100 text-red-700 border-red-300'; confIcon = '🔴';
      statusBg = 'bg-red-50 border-red-500'; statusTitle = 'Low Confidence'; statusDesc = 'Significant differences - verify carefully';
    }

    // Format dates
    const ediShipDate = edi.shipDate ? formatDate(edi.shipDate) : 'N/A';
    const zohoShipDate = zoho?.shipDate ? formatDate(zoho.shipDate) : 'N/A';
    const ediCancelDate = edi.cancelDate ? formatDate(edi.cancelDate) : 'N/A';
    const zohoCancelDate = zoho?.cancelDate ? formatDate(zoho.cancelDate) : '—';

    // Extract items
    const ediItems = edi.items || [];
    const zohoItems = zoho?.line_items || zoho?.items || [];

    // Check for prepacks - UOM of AS (assortment) or ST (set) indicates prepack
    // Don't require packQty > 1 as it may not always be populated
    const prepackItems = ediItems.filter(i =>
      i.isPrepack || i.unitOfMeasure === 'AS' || i.unitOfMeasure === 'ST'
    );
    const hasPrepack = prepackItems.length > 0;

    // Build field comparison rows with checkboxes
    const fieldRows = [
      { key: 'poNumber', label: 'PO / Ref', ediVal: edi.poNumber, zohoVal: zoho?.reference || zoho?.number || '-', match: details.po, editable: true, rawVal: edi.poNumber },
      { key: 'customer', label: 'Customer', ediVal: edi.customer, zohoVal: zoho?.customer || zoho?.customer_name || '-', match: details.customer, editable: false },
      { key: 'shipDate', label: 'Ship Date', ediVal: ediShipDate, zohoVal: zohoShipDate, match: details.shipDate, editable: true, rawVal: edi.shipDate },
      { key: 'cancelDate', label: 'Cancel', ediVal: ediCancelDate, zohoVal: zohoCancelDate, match: details.cancelDate, editable: true, rawVal: edi.cancelDate }
    ];

    let fieldTableHTML = fieldRows.map(r => {
      const isChecked = sel.fields[r.key] !== false;
      const hasOverride = sel.overrides[r.key] !== undefined;
      const sendVal = hasOverride ? sel.overrides[r.key] : r.ediVal;
      return '<tr class="border-b border-gray-100 ' + (!isChecked ? 'opacity-40 bg-me-bg' : '') + '">' +
        '<td class="py-2 text-center">' +
          '<input type="checkbox" ' + (isChecked ? 'checked' : '') + ' onchange="toggleModalFieldSelection(' + orderId + ', \\'' + r.key + '\\')" class="w-4 h-4 rounded border-me-border text-me-accent cursor-pointer">' +
        '</td>' +
        '<td class="py-2 text-me-text-muted text-xs">' + (r.match ? '<span class="text-me-success mr-1">✓</span>' : '<span class="text-me-error mr-1">✗</span>') + r.label + '</td>' +
        '<td class="py-2 bg-blue-50/30 px-2 text-me-text-primary text-xs">' + r.ediVal + '</td>' +
        '<td class="py-2 bg-green-50/30 px-2 text-xs">' + r.zohoVal + '</td>' +
        '<td class="py-2 bg-purple-50/30 px-2" id="modal-field-cell-' + orderId + '-' + r.key + '">' +
          (isChecked ?
            (hasOverride ?
              '<span class="text-purple-700 font-semibold text-xs">' + sendVal + '</span> <span class="text-xs text-purple-400">(custom)</span>' :
              '<span class="text-purple-600 text-xs">' + sendVal + '</span>') :
            '<span class="text-me-text-muted italic text-xs">skip</span>') +
        '</td>' +
        '<td class="py-2 text-center">' +
          (r.editable && isChecked ? '<button onclick="showModalFieldEdit(' + orderId + ', \\'' + r.key + '\\', \\'' + (sendVal || '').replace(/'/g, "\\\\'") + '\\')" class="text-me-text-muted hover:text-purple-600 text-xs">✏️</button>' : '') +
        '</td>' +
      '</tr>';
    }).join('');

    // Add units and amount rows (read-only)
    fieldTableHTML += '<tr class="border-b border-gray-100 bg-me-bg/50">' +
      '<td class="py-2 text-center text-gray-300">—</td>' +
      '<td class="py-2 text-me-text-muted text-xs">Units</td>' +
      '<td class="py-2 bg-blue-50/30 px-2 font-semibold text-xs">' + (edi.totalUnits || 0).toLocaleString() + '</td>' +
      '<td class="py-2 bg-green-50/30 px-2 font-semibold text-xs">' + (zoho?.totalUnits || 0).toLocaleString() + '</td>' +
      '<td class="py-2 bg-purple-50/30 px-2 text-purple-600 text-xs">' + (edi.totalUnits || 0).toLocaleString() + '</td>' +
      '<td class="py-2"></td>' +
    '</tr>';
    fieldTableHTML += '<tr class="border-b border-gray-100 bg-me-bg">' +
      '<td class="py-2 text-center text-gray-300">—</td>' +
      '<td class="py-2 text-me-text-muted text-xs">Amount</td>' +
      '<td class="py-2 bg-blue-50/30 px-2 font-semibold text-xs">$' + (edi.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2}) + '</td>' +
      '<td class="py-2 bg-green-50/30 px-2 font-semibold text-xs">$' + (zoho?.total || zoho?.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2}) + ' ' + (details.totalAmount ? '<span class="text-me-success">✓</span>' : '<span class="text-amber-500">⚠️</span>') + '</td>' +
      '<td class="py-2 bg-purple-50/30 px-2 text-purple-600 text-xs">$' + (edi.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2}) + '</td>' +
      '<td class="py-2"></td>' +
    '</tr>';

    // Build EDI items table with checkboxes
    let ediItemsHTML = ediItems.slice(0, 15).map((item, idx) => {
      const uom = item.unitOfMeasure || 'EA';
      const isPrepack = item.isPrepack || uom === 'AS' || uom === 'ST';
      const sku = item.productIds?.sku || item.productIds?.vendorItemNumber || item.style || '';
      const packQty = item.packQty || 1;
      const unitPrice = item.unitPrice || 0;
      const isSelected = sel.lineItems ? sel.lineItems.includes(idx) : true;
      return '<tr class="border-t border-gray-100 ' + (isPrepack ? 'bg-purple-50/30' : '') + ' ' + (!isSelected ? 'opacity-40 bg-me-bg' : '') + '">' +
        '<td class="px-1 py-1 text-center">' +
          '<input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="toggleModalLineItem(' + orderId + ', ' + idx + ')" class="w-3 h-3 rounded border-me-border text-me-accent cursor-pointer">' +
        '</td>' +
        '<td class="px-2 py-1 text-xs">' + (sku || '-') + '</td>' +
        '<td class="px-2 py-1 text-xs">' + (item.color || '-') + '</td>' +
        '<td class="px-2 py-1 text-center">' +
          '<span class="' + (isPrepack ? 'bg-purple-100 text-purple-700' : 'bg-me-bg text-me-text-secondary') + ' px-1.5 py-0.5 rounded text-xs">' + uom + '</span>' +
          (isPrepack && packQty > 1 ? '<div class="text-xs text-purple-500">' + packQty + '/pk</div>' : '') +
        '</td>' +
        '<td class="px-2 py-1 text-right text-xs">' + (item.quantityOrdered || 0) +
          (isPrepack && packQty > 1 ? '<div class="text-xs text-me-text-muted">=' + (item.totalUnits || item.quantityOrdered * packQty) + ' ea</div>' : '') +
        '</td>' +
        '<td class="px-2 py-1 text-right font-medium text-xs ' + (item.unitPriceCalculated ? 'text-me-accent' : '') + '">$' + unitPrice.toFixed(2) + '</td>' +
      '</tr>';
    }).join('');
    if (ediItems.length > 15) {
      ediItemsHTML += '<tr><td colspan="6" class="px-2 py-1 text-center text-me-text-muted text-xs">... and ' + (ediItems.length - 15) + ' more</td></tr>';
    }

    // Build Zoho items table
    let zohoItemsHTML = zohoItems.slice(0, 10).map(item => {
      const zohoUpc = item.cf_upc || item.upc || item.item?.upc || '';
      return '<tr class="border-t border-gray-100">' +
        '<td class="px-2 py-1 text-xs">' + (item.name || item.sku || '-') + '</td>' +
        '<td class="px-2 py-1 font-mono text-xs">' + (zohoUpc || '-') + '</td>' +
        '<td class="px-2 py-1 text-right text-xs">' + (item.quantity || 0) + '</td>' +
        '<td class="px-2 py-1 text-right text-xs">$' + (item.rate || 0).toFixed(2) + '</td>' +
      '</tr>';
    }).join('');
    if (zohoItems.length > 10) {
      zohoItemsHTML += '<tr><td colspan="4" class="px-2 py-1 text-center text-me-text-muted text-xs">... and ' + (zohoItems.length - 10) + ' more</td></tr>';
    }

    // Build alternative matches section
    let altMatchesHTML = '';
    if (result.alternativeMatches && result.alternativeMatches.length > 0) {
      altMatchesHTML = '<div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">' +
        '<div class="text-sm font-medium text-me-warning mb-2">🔄 Alternative Matches (' + result.alternativeMatches.length + ' other potential matches)</div>' +
        '<div class="space-y-2">' +
        result.alternativeMatches.map((alt, idx) =>
          '<div class="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">' +
            '<div class="flex items-center gap-3">' +
              '<span class="text-xs text-me-text-muted">#' + (idx + 2) + '</span>' +
              '<div>' +
                '<div class="font-medium text-sm text-me-text-primary">' + alt.zohoDraft.customer + '</div>' +
                '<div class="text-xs text-me-text-muted">' +
                  'Ref# ' + (alt.zohoDraft.reference || alt.zohoDraft.number) +
                  ' • ' + (alt.zohoDraft.itemCount || 0) + ' items' +
                  ' • $' + (alt.zohoDraft.totalAmount || 0).toLocaleString() +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="flex items-center gap-2">' +
              '<span class="px-2 py-1 rounded text-xs font-medium ' + (alt.confidence >= 60 ? 'bg-amber-100 text-me-warning' : 'bg-me-bg text-me-text-secondary') + '">' + alt.confidence + '%</span>' +
              '<button onclick="switchModalMatch(' + orderId + ', ' + idx + ')" class="px-2 py-1 bg-me-dark text-white text-xs rounded hover:bg-me-hover transition">Use This</button>' +
            '</div>' +
          '</div>'
        ).join('') +
        '</div></div>';
    }

    // Prepack explanation - more detailed
    let prepackHTML = '';
    if (hasPrepack) {
      // Check if any prepacks have packQty > 1 for showing calculation examples
      const prepacksWithQty = prepackItems.filter(i => i.packQty > 1);
      const examplesHTML = prepacksWithQty.length > 0
        ? prepacksWithQty.slice(0, 3).map(item =>
            '<p class="bg-white/50 rounded px-2 py-1 mt-1">Example: $' + (item.packPrice || 0).toFixed(2) + ' ÷ ' + (item.packQty || 1) + ' units = <strong>$' + (item.unitPrice || 0).toFixed(2) + '/ea</strong>' + (item.unitPriceCalculated ? ' <span class="text-purple-500">(calculated)</span>' : '') + '</p>'
          ).join('')
        : '<p class="bg-white/50 rounded px-2 py-1 mt-1">Items marked AS/ST are sold as assortments/sets</p>';

      prepackHTML = '<div class="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">' +
        '<div class="flex items-center gap-2 text-purple-700 font-medium text-sm mb-2">📦 Pre-Pack Order (' + prepackItems.length + ' prepack line' + (prepackItems.length > 1 ? 's' : '') + ')</div>' +
        '<div class="text-xs text-purple-600 space-y-1">' +
          '<p><strong>How it works:</strong> Customer orders by pack/assortment, we match by unit price</p>' +
          '<p>• <strong>UOM: AS</strong> = Assortment, <strong>ST</strong> = Set (multi-unit packs)</p>' +
          examplesHTML +
        '</div></div>';
    }

    // Matching rule info banner
    const ruleInfo = result.matchingRule;
    let ruleInfoHTML = '';
    if (ruleInfo) {
      const ruleMethodLabel = ruleInfo.matchMethod === 'customer_po' ? '🔗 Customer PO' :
                              ruleInfo.matchMethod === 'contract_ref' ? '📋 Contract Ref (' + (ruleInfo.contractRefField || 'po_rel_num') + ')' :
                              '👤 Style + Customer';
      const actionLabel = ruleInfo.actionOnMatch === 'create_new_drawdown' ?
        '<span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">Create New + Drawdown</span>' :
        '<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">Update Bulk</span>';
      ruleInfoHTML = '<div class="mb-3 px-3 py-2 bg-me-bg border border-me-border rounded-lg">' +
        '<div class="flex items-center justify-between">' +
          '<div class="flex items-center gap-3 text-sm text-me-text-secondary">' +
            '<span class="font-medium">🔧 Rule:</span>' +
            '<span>' + (ruleInfo.isDefault ? 'Default (all customers)' : ruleInfo.customerName) + '</span>' +
            '<span class="text-me-text-muted">|</span>' +
            '<span>Match by: <strong>' + ruleMethodLabel + '</strong></span>' +
          '</div>' +
          '<div>' + actionLabel + '</div>' +
        '</div>' +
      '</div>';
    }

    // Selection info banner
    const counts = getSelectionCounts(orderId, ediItems.length);
    const isFull = isFullSelection(orderId, ediItems.length);
    let selectionInfoHTML = '';
    if (!isFull) {
      selectionInfoHTML = '<div class="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">' +
        '<div class="flex items-center gap-2 text-sm text-me-warning">' +
          '<span>⚡</span>' +
          '<span><strong>Selective Processing:</strong> ' + counts.fields + '/4 fields, ' + counts.lines + '/' + ediItems.length + ' line items' + (counts.hasOverrides ? ', with overrides' : '') + '</span>' +
        '</div>' +
        '<button onclick="resetModalFieldSelection(' + orderId + ', ' + ediItems.length + ')" class="text-xs text-me-warning hover:text-amber-800 underline">Reset to All</button>' +
      '</div>';
    }

    // Build main HTML
    contentEl.innerHTML =
      // Status Banner
      '<div class="px-4 py-3 flex items-center gap-3 ' + statusBg + ' border-b-2 rounded-t-lg -mx-4 -mt-4 mb-4">' +
        '<span class="text-xl">' + confIcon + '</span>' +
        '<div class="flex-1">' +
          '<div class="font-semibold">' + statusTitle + '</div>' +
          '<div class="text-sm opacity-80">' + statusDesc + '</div>' +
        '</div>' +
        '<div class="px-4 py-2 rounded-lg border ' + confBg + ' font-bold text-xl">' + conf + '%</div>' +
      '</div>' +

      // Matching rule info (if using customer rules)
      ruleInfoHTML +

      // Selection info
      selectionInfoHTML +

      // Instruction note
      '<div class="text-xs text-me-text-muted mb-2 flex items-center gap-2">' +
        '<span>💡</span>' +
        '<span>EDI stays unchanged. Click ✏️ to customize what gets sent to Zoho.</span>' +
      '</div>' +

      // Field Comparison Table with checkboxes
      '<div class="mb-4">' +
        '<table class="w-full text-sm">' +
          '<thead>' +
            '<tr class="border-b border-me-border">' +
              '<th class="text-center py-2 font-medium text-me-text-muted w-10">✓</th>' +
              '<th class="text-left py-2 font-medium text-me-text-muted w-24">Field</th>' +
              '<th class="text-left py-2 font-medium text-me-accent bg-blue-50/50 px-2">EDI (source)</th>' +
              '<th class="text-left py-2 font-medium text-me-success bg-green-50/50 px-2">Zoho Now</th>' +
              '<th class="text-left py-2 font-medium text-purple-600 bg-purple-50/50 px-2">→ Send to Zoho</th>' +
              '<th class="text-center py-2 font-medium text-me-text-muted w-10">✏️</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' + fieldTableHTML + '</tbody>' +
        '</table>' +
      '</div>' +

      // Pre-pack explanation
      prepackHTML +

      // Line Items Comparison
      '<div class="mb-4">' +
        '<div class="flex items-center justify-between mb-2">' +
          '<h5 class="text-sm font-semibold text-me-text-secondary cursor-pointer" onclick="toggleModalLineItems(' + orderId + ')">' +
            '<span id="lineItemsToggle-' + orderId + '">▼</span> Line Items (' + ediItems.length + ' EDI → ' + zohoItems.length + ' Zoho)' +
          '</h5>' +
          '<label class="flex items-center gap-1 text-xs font-normal text-me-text-muted cursor-pointer">' +
            '<input type="checkbox" ' + (sel.lineItems && sel.lineItems.length === ediItems.length ? 'checked' : '') + ' onchange="toggleAllModalLineItems(' + orderId + ', ' + ediItems.length + ')" class="w-3 h-3 rounded"> All' +
          '</label>' +
        '</div>' +
        '<div id="lineItemsContainer-' + orderId + '" class="grid grid-cols-2 gap-3">' +
          // EDI Items
          '<div>' +
            '<div class="text-xs font-semibold text-me-accent mb-1">EDI Order Line Items</div>' +
            '<table class="w-full text-xs">' +
              '<thead class="bg-blue-50">' +
                '<tr>' +
                  '<th class="text-center px-1 py-1 w-6">✓</th>' +
                  '<th class="text-left px-2 py-1">Style</th>' +
                  '<th class="text-left px-2 py-1">Color</th>' +
                  '<th class="text-center px-2 py-1">UOM</th>' +
                  '<th class="text-right px-2 py-1">Qty</th>' +
                  '<th class="text-right px-2 py-1">Unit $</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' + ediItemsHTML + '</tbody>' +
            '</table>' +
          '</div>' +
          // Zoho Items
          '<div>' +
            '<div class="text-xs font-semibold text-me-success mb-1 flex items-center gap-2">' +
              '<span>Zoho Draft Items</span>' +
              '<span class="text-xs font-normal text-green-500 bg-green-100 px-1.5 py-0.5 rounded">🔒 Items preserved</span>' +
            '</div>' +
            '<table class="w-full text-xs">' +
              '<thead class="bg-green-50">' +
                '<tr>' +
                  '<th class="text-left px-2 py-1">Item 🔒</th>' +
                  '<th class="text-left px-2 py-1">UPC</th>' +
                  '<th class="text-right px-2 py-1">Qty</th>' +
                  '<th class="text-right px-2 py-1">Rate</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' + zohoItemsHTML + '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Alternative matches
      altMatchesHTML;

    // Show process button
    if (actionsEl) {
      actionsEl.classList.remove('hidden');
      actionsEl.setAttribute('data-zoho-id', zoho.id || '');
    }
  }

  // Modal-specific field selection toggle
  function toggleModalFieldSelection(orderId, fieldKey) {
    toggleFieldSelection(orderId, fieldKey);
    const cached = modalMatchCache.get(orderId);
    if (cached) renderModalMatch(orderId, cached);
  }

  // Modal-specific line item toggle
  function toggleModalLineItem(orderId, lineIndex) {
    toggleLineItemSelection(orderId, lineIndex);
    const cached = modalMatchCache.get(orderId);
    if (cached) renderModalMatch(orderId, cached);
  }

  // Toggle all line items in modal
  function toggleAllModalLineItems(orderId, totalLines) {
    toggleAllLineItems(orderId, totalLines);
    const cached = modalMatchCache.get(orderId);
    if (cached) renderModalMatch(orderId, cached);
  }

  // Reset field selection in modal
  function resetModalFieldSelection(orderId, totalLines) {
    resetFieldSelection(orderId, totalLines);
    const cached = modalMatchCache.get(orderId);
    if (cached) renderModalMatch(orderId, cached);
  }

  // Show field edit in modal
  function showModalFieldEdit(orderId, fieldName, currentValue) {
    const inputId = 'modal-edit-' + orderId + '-' + fieldName;
    const existingInput = document.getElementById(inputId);
    if (existingInput) {
      existingInput.focus();
      return;
    }

    const container = document.getElementById('modal-field-cell-' + orderId + '-' + fieldName);
    if (container) {
      const isDate = fieldName.toLowerCase().includes('date');
      container.innerHTML =
        '<input type="' + (isDate ? 'date' : 'text') + '" id="' + inputId + '" ' +
          'value="' + (currentValue || '') + '" ' +
          'class="w-full px-2 py-1 border border-purple-400 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500" ' +
          'onblur="saveModalFieldEdit(' + orderId + ', \\'' + fieldName + '\\')" ' +
          'onkeydown="if(event.key===\\'Enter\\'){saveModalFieldEdit(' + orderId + ', \\'' + fieldName + '\\')}"' +
        '>';
      document.getElementById(inputId).focus();
    }
  }

  // Save field edit in modal
  function saveModalFieldEdit(orderId, fieldName) {
    const inputId = 'modal-edit-' + orderId + '-' + fieldName;
    const input = document.getElementById(inputId);
    if (input) {
      const newValue = input.value;
      setFieldOverride(orderId, fieldName, newValue);
      const cached = modalMatchCache.get(orderId);
      if (cached) renderModalMatch(orderId, cached);
    }
  }

  // Toggle line items in modal
  function toggleModalLineItems(orderId) {
    const container = document.getElementById('lineItemsContainer-' + orderId);
    const toggle = document.getElementById('lineItemsToggle-' + orderId);
    if (container.classList.contains('hidden')) {
      container.classList.remove('hidden');
      toggle.textContent = '▼';
    } else {
      container.classList.add('hidden');
      toggle.textContent = '▶';
    }
  }

  // Switch to alternative match in modal
  function switchModalMatch(orderId, altIndex) {
    const cached = modalMatchCache.get(orderId);
    if (!cached || !cached.alternativeMatches || !cached.alternativeMatches[altIndex]) {
      toast('Alternative match not found');
      return;
    }

    const alt = cached.alternativeMatches[altIndex];
    // Swap the primary match with the alternative
    const newResult = {
      ...cached,
      zohoDraft: alt.zohoDraft,
      confidence: alt.confidence,
      score: alt.score,
      alternativeMatches: [
        { zohoDraft: cached.zohoDraft, confidence: cached.confidence, score: cached.score },
        ...cached.alternativeMatches.filter((_, i) => i !== altIndex)
      ]
    };

    modalMatchCache.set(orderId, newResult);
    renderModalMatch(orderId, newResult);
    toast('Switched to alternative match');
  }

  // Process match directly from modal
  async function processMatchFromModal(orderId) {
    const actionsEl = document.getElementById('matchActions-' + orderId);
    const zohoId = actionsEl?.getAttribute('data-zoho-id');

    if (!zohoId) {
      toast('No Zoho draft selected');
      return;
    }

    const btn = actionsEl.querySelector('button');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Processing...';
    }

    try {
      const res = await fetch('/process-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matches: [{ ediOrderId: orderId, zohoDraftId: zohoId }]
        })
      });
      const data = await res.json();

      if (data.success) {
        toast('✓ Order processed successfully!');
        closeModal();
        loadOrders();
        modalMatchCache.delete(orderId);
      } else {
        toast('Error: ' + (data.error || 'Processing failed'));
        if (btn) { btn.disabled = false; btn.innerHTML = '✓ Process Match'; }
      }
    } catch (e) {
      toast('Error: ' + e.message);
      if (btn) { btn.disabled = false; btn.innerHTML = '✓ Process Match'; }
    }
  }

  // Filter raw data table based on search term with highlighting
  function filterRawDataTable(searchTerm) {
    const rows = document.querySelectorAll('.raw-data-row');
    const countEl = document.getElementById('rawDataSearchCount');
    const term = searchTerm.toLowerCase().trim();
    let visibleCount = 0;
    let totalCount = rows.length;

    rows.forEach(row => {
      const field = row.getAttribute('data-field') || '';
      const value = row.getAttribute('data-value') || '';
      const fieldCell = row.querySelector('td:first-child');
      const valueCell = row.querySelector('td:last-child');

      // Get or store original content (preserve on first search)
      if (!row.getAttribute('data-original-field') && fieldCell) {
        row.setAttribute('data-original-field', fieldCell.innerHTML);
        row.setAttribute('data-original-value', valueCell?.innerHTML || '');
      }
      const originalField = row.getAttribute('data-original-field') || '';
      const originalValue = row.getAttribute('data-original-value') || '';

      if (!term) {
        // No search term - show all rows, remove highlights
        row.style.display = '';
        row.classList.remove('bg-yellow-50', 'border-l-4', 'border-yellow-400');
        if (fieldCell) fieldCell.innerHTML = originalField;
        if (valueCell) valueCell.innerHTML = originalValue;
        visibleCount++;
      } else if (field.includes(term) || value.includes(term)) {
        // Match found - show row and highlight matches
        row.style.display = '';
        row.classList.add('bg-yellow-50', 'border-l-4', 'border-yellow-400');
        visibleCount++;

        // Highlight matching text in cells
        if (fieldCell) {
          fieldCell.innerHTML = field.includes(term) ? highlightMatch(originalField, searchTerm) : originalField;
        }
        if (valueCell) {
          valueCell.innerHTML = value.includes(term) ? highlightMatch(originalValue, searchTerm) : originalValue;
        }
      } else {
        // No match - hide row
        row.style.display = 'none';
        row.classList.remove('bg-yellow-50', 'border-l-4', 'border-yellow-400');
      }
    });

    // Update count display with colored feedback
    if (countEl) {
      if (term) {
        if (visibleCount > 0) {
          countEl.innerHTML = '<span class="text-me-success">✓ ' + visibleCount + ' of ' + totalCount + ' fields match "' + searchTerm + '"</span>';
        } else {
          countEl.innerHTML = '<span class="text-me-warning">✗ No fields match "' + searchTerm + '"</span>';
        }
      } else {
        countEl.innerHTML = '<span class="text-me-text-muted">' + totalCount + ' fields total</span>';
      }
    }
  }

  // Highlight matching text (case-insensitive)
  function highlightMatch(text, term) {
    if (!term || !text) return text;
    const escaped = term.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(' + escaped + ')', 'gi');
    return text.replace(regex, '<mark class="bg-yellow-300 px-0.5 rounded">$1</mark>');
  }

  // ============================================================
  // SENT ORDERS
  // ============================================================
  async function loadSentOrders() {
    sentOrdersData = orders.filter(o => o.status === 'processed' || o.zoho_so_number);

    const customers = [...new Set(sentOrdersData.map(o => o.edi_customer_name).filter(Boolean))].sort();
    document.getElementById('sentCustomerFilter').innerHTML = '<option value="">All Customers</option>' +
      customers.map(c => '<option value="' + c + '">' + c + '</option>').join('');

    filterSentOrders();
  }

  function filterSentOrders() {
    const search = (document.getElementById('sentSearchBox')?.value || '').toLowerCase();
    const customer = document.getElementById('sentCustomerFilter')?.value || '';

    let filtered = sentOrdersData.filter(o => {
      if (search && !(o.edi_order_number || '').toLowerCase().includes(search)) return false;
      if (customer && o.edi_customer_name !== customer) return false;
      return true;
    });

    const tbody = document.getElementById('sentOrdersTable');

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-me-text-muted">No orders found</td></tr>';
      document.getElementById('sentOrderCount').textContent = '';
      return;
    }

    tbody.innerHTML = filtered.map(o => {
      const items = o.parsed_data?.items || [];
      const amt = items.reduce((s, i) => s + (i.quantityOrdered || 0) * (i.unitPrice || 0), 0);
      const zohoId = o.zoho_so_id || o.matched_draft_id || '';
      const zohoNum = o.zoho_so_number || zohoId || 'N/A';
      const zohoLink = zohoId ?
        '<a href="https://books.zoho.com/app/677681121#/salesorders/' + zohoId + '" target="_blank" class="text-me-success font-medium hover:underline">' + zohoNum + ' ↗</a>' :
        zohoNum;
      const sentAtHtml = o.processed_at ? formatDateWithTime(new Date(o.processed_at)) : '-';

      return \`
        <tr class="border-b border-gray-100 hover:bg-me-bg">
          <td class="px-4 py-3 font-medium text-me-text-primary">\${o.edi_order_number || 'N/A'}</td>
          <td class="px-4 py-3 text-me-text-secondary">\${o.edi_customer_name || 'Unknown'}</td>
          <td class="px-4 py-3">\${zohoLink}</td>
          <td class="px-4 py-3 text-right text-me-text-primary">$\${amt.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
          <td class="px-4 py-3 text-right text-me-text-muted">\${sentAtHtml}</td>
          <td class="px-4 py-3 text-center">
            <button onclick="viewEdiDetails(\${o.id})" class="px-3 py-1 text-sm bg-me-bg hover:bg-gray-200 rounded transition">View</button>
          </td>
        </tr>
      \`;
    }).join('');

    document.getElementById('sentOrderCount').textContent = 'Showing ' + filtered.length + ' of ' + sentOrdersData.length + ' orders';
  }

  function exportSentToExcel() {
    toast('Exporting to CSV...');
    // Implementation would go here
  }

  // ============================================================
  // ACTIVITY LOG
  // ============================================================
  async function loadActivityLog() {
    try {
      const res = await fetch('/audit/zoho-orders?limit=200');
      const data = await res.json();
      activityLogData = data.orders || [];
      document.getElementById('activityLogCount').textContent = activityLogData.length + ' orders';

      // Update stats
      const newOrders = activityLogData.filter(o => o.was_new_order).length;
      const updatedDrafts = activityLogData.filter(o => !o.was_new_order).length;
      document.getElementById('statNewOrders').textContent = newOrders;
      document.getElementById('statDraftsUpdated').textContent = updatedDrafts;

      filterActivityLog();
    } catch (e) {
      console.error('Failed to load activity log:', e);
    }
  }

  function filterActivityLog() {
    const typeFilter = document.getElementById('activityTypeFilter')?.value || '';
    const searchFilter = (document.getElementById('activitySearchFilter')?.value || '').toLowerCase();

    let filtered = activityLogData;

    if (typeFilter === 'new') {
      filtered = filtered.filter(o => o.was_new_order);
    } else if (typeFilter === 'updated') {
      filtered = filtered.filter(o => !o.was_new_order);
    }

    if (searchFilter) {
      filtered = filtered.filter(o =>
        (o.edi_po_number || '').toLowerCase().includes(searchFilter) ||
        (o.edi_order_number || '').toLowerCase().includes(searchFilter) ||
        (o.customer_name || '').toLowerCase().includes(searchFilter) ||
        (o.zoho_so_number || '').toLowerCase().includes(searchFilter)
      );
    }

    document.getElementById('activityLogCount').textContent = filtered.length + ' orders';
    renderActivityLog(filtered);
  }

  function renderActivityLog(orders) {
    const tbody = document.getElementById('activityLogBody');
    orders = orders || activityLogData;

    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-me-text-muted">No orders found</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(order => {
      const time = order.sent_at ? formatDateWithTime(new Date(order.sent_at)) : '-';
      const typeLabel = order.was_new_order ?
        '<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">➕ New</span>' :
        '<span class="bg-amber-100 text-me-warning px-2 py-0.5 rounded text-xs font-medium">✏️ Updated</span>';

      // Format changes
      let changesHtml = '-';
      if (order.changes_applied) {
        const changes = typeof order.changes_applied === 'string' ? JSON.parse(order.changes_applied) : order.changes_applied;
        if (changes && changes.length > 0) {
          changesHtml = changes.map(c =>
            '<span class="inline-block bg-me-bg text-me-text-secondary px-1.5 py-0.5 rounded text-xs mr-1">' + c.field + '</span>'
          ).join('');
        } else {
          changesHtml = '<span class="text-me-text-muted text-xs">No changes</span>';
        }
      } else if (order.was_new_order) {
        changesHtml = '<span class="text-me-accent text-xs">Created new</span>';
      }

      const amount = order.order_amount ? '$' + parseFloat(order.order_amount).toLocaleString('en-US', {minimumFractionDigits: 2}) : '-';

      return \`
        <tr class="border-b border-gray-100 hover:bg-me-bg cursor-pointer" onclick="showOrderDetail(\${order.id})">
          <td class="px-4 py-3 text-me-text-muted text-sm">\${time}</td>
          <td class="px-4 py-3">\${typeLabel}</td>
          <td class="px-4 py-3 font-medium text-me-text-primary">\${order.edi_po_number || order.edi_order_number || '-'}</td>
          <td class="px-4 py-3 text-me-text-secondary">\${order.customer_name || '-'}</td>
          <td class="px-4 py-3 text-me-text-secondary">\${order.zoho_so_number || '-'}</td>
          <td class="px-4 py-3 text-sm">\${changesHtml}</td>
          <td class="px-4 py-3 text-right font-medium text-me-success">\${amount}</td>
        </tr>
      \`;
    }).join('');
  }

  async function showOrderDetail(orderId) {
    const order = activityLogData.find(o => o.id === orderId);
    if (!order) return;

    const time = order.sent_at ? formatDateWithTime(new Date(order.sent_at)) : '-';
    const changes = order.changes_applied ? (typeof order.changes_applied === 'string' ? JSON.parse(order.changes_applied) : order.changes_applied) : [];

    let changesHtml = '';
    if (changes && changes.length > 0) {
      changesHtml = \`
        <div class="mt-4">
          <div class="text-sm font-semibold text-me-text-secondary mb-2">Changes Made:</div>
          <table class="w-full text-sm border border-me-border rounded">
            <thead class="bg-me-bg">
              <tr>
                <th class="text-left px-3 py-2 text-me-text-muted">Field</th>
                <th class="text-left px-3 py-2 text-me-text-muted">Before (Zoho)</th>
                <th class="text-left px-3 py-2 text-me-text-muted">After (EDI)</th>
              </tr>
            </thead>
            <tbody>
              \${changes.map(c => \`
                <tr class="border-t border-gray-100">
                  <td class="px-3 py-2 font-medium">\${c.field}</td>
                  <td class="px-3 py-2 text-red-400 line-through">\${c.from || '—'}</td>
                  <td class="px-3 py-2 text-me-success font-medium">\${c.to || '—'}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
      \`;
    } else if (order.was_new_order) {
      changesHtml = '<div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">This was a new order created in Zoho (no existing draft was updated).</div>';
    } else {
      changesHtml = '<div class="mt-4 p-3 bg-me-bg border border-me-border rounded text-me-text-secondary text-sm">No field changes were recorded for this update.</div>';
    }

    const modalHtml = \`
      <div class="modal-overlay" onclick="closeModal()">
        <div class="bg-white rounded-xl max-w-2xl w-full mx-4 overflow-hidden max-h-[80vh] overflow-y-auto" onclick="event.stopPropagation()">
          <div class="bg-me-dark text-white px-6 py-4 flex justify-between items-center sticky top-0">
            <h3 class="text-lg font-semibold">📋 Order Audit Detail</h3>
            <button onclick="closeModal()" class="text-white hover:text-gray-300">✕</button>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-2 gap-4 text-sm mb-4">
              <div class="bg-me-bg rounded p-3">
                <div class="text-xs text-me-text-muted uppercase mb-1">Sent to Zoho</div>
                <div class="font-medium">\${time}</div>
              </div>
              <div class="bg-me-bg rounded p-3">
                <div class="text-xs text-me-text-muted uppercase mb-1">Type</div>
                <div class="font-medium">\${order.was_new_order ? '➕ New Order Created' : '✏️ Draft Updated'}</div>
              </div>
              <div class="bg-me-bg rounded p-3">
                <div class="text-xs text-me-text-muted uppercase mb-1">EDI PO #</div>
                <div class="font-medium">\${order.edi_po_number || order.edi_order_number || '-'}</div>
              </div>
              <div class="bg-me-bg rounded p-3">
                <div class="text-xs text-me-text-muted uppercase mb-1">Zoho SO #</div>
                <div class="font-medium">\${order.zoho_so_number || '-'}</div>
              </div>
              <div class="bg-me-bg rounded p-3">
                <div class="text-xs text-me-text-muted uppercase mb-1">Customer</div>
                <div class="font-medium">\${order.customer_name || '-'}</div>
              </div>
              <div class="bg-green-50 rounded p-3 border border-green-100">
                <div class="text-xs text-me-success uppercase mb-1">Order Amount</div>
                <div class="font-bold text-me-success">$\${order.order_amount ? parseFloat(order.order_amount).toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00'}</div>
              </div>
              \${order.match_confidence ? \`
              <div class="bg-me-bg rounded p-3">
                <div class="text-xs text-me-text-muted uppercase mb-1">Match Confidence</div>
                <div class="font-medium">\${order.match_confidence}%</div>
              </div>\` : ''}
              \${order.matched_draft_number ? \`
              <div class="bg-me-bg rounded p-3">
                <div class="text-xs text-me-text-muted uppercase mb-1">Matched Draft</div>
                <div class="font-medium">\${order.matched_draft_number}</div>
              </div>\` : ''}
            </div>
            \${changesHtml}
          </div>
          <div class="px-6 py-4 bg-me-bg border-t flex justify-between">
            <button onclick="closeModal()" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-200">Close</button>
            \${order.zoho_so_id ? \`<a href="https://books.zoho.com/app/677681121#/salesorders/\${order.zoho_so_id}" target="_blank" class="px-4 py-2 bg-me-dark text-white rounded-lg hover:bg-me-hover">View in Zoho →</a>\` : ''}
          </div>
        </div>
      </div>
    \`;

    document.getElementById('modalContainer').innerHTML = modalHtml;
  }

  async function loadAuditStats() {
    try {
      const res = await fetch('/audit/stats');
      const data = await res.json();
      document.getElementById('statAllTimeSent').textContent = data.allTimeSent || 0;
      document.getElementById('statAllTimeValue').textContent = '$' + ((data.allTimeValue || 0) / 1000).toFixed(1) + 'K';
      // New/Updated stats are now calculated from the orders list in loadActivityLog
    } catch (e) {}
  }

  // ============================================================
  // SETTINGS
  // ============================================================
  let zohoCustomersCache = [];

  async function loadMappings() {
    try {
      const res = await fetch('/customer-mappings');
      const data = await res.json();

      if (!data.mappings || data.mappings.length === 0) {
        document.getElementById('mappingsContent').innerHTML = \`
          <div class="text-center py-8 text-me-text-muted">
            <p class="mb-2">No customer mappings configured yet.</p>
            <p class="text-sm">Click "Add Mapping" to map an EDI customer to a Zoho customer.</p>
          </div>
        \`;
        return;
      }

      document.getElementById('mappingsContent').innerHTML = \`
        <div class="border border-me-border rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-me-bg">
              <tr>
                <th class="text-left px-4 py-3 text-me-text-secondary font-medium">EDI Customer Name</th>
                <th class="text-left px-4 py-3 text-me-text-secondary font-medium">Zoho Customer</th>
                <th class="text-right px-4 py-3 text-me-text-secondary font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              \${data.mappings.map(m => \`
                <tr class="border-t border-gray-100 hover:bg-me-bg">
                  <td class="px-4 py-3 font-medium">\${m.edi_customer_name}</td>
                  <td class="px-4 py-3">
                    <span class="text-me-text-primary">\${m.zoho_customer_name || m.zoho_account_name || '-'}</span>
                    \${m.zoho_customer_id ? '<span class="text-xs text-me-text-muted ml-2">ID: ' + m.zoho_customer_id + '</span>' : ''}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button onclick="editMapping(\${m.id}, '\${escapeQuotes(m.edi_customer_name)}', '\${m.zoho_customer_id || ''}')"
                      class="text-me-accent hover:text-me-dark text-sm mr-3">Edit</button>
                    <button onclick="deleteMapping(\${m.id}, '\${escapeQuotes(m.edi_customer_name)}')"
                      class="text-me-error hover:text-red-800 text-sm">Delete</button>
                  </td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
      \`;
    } catch (e) {
      document.getElementById('mappingsContent').innerHTML = '<p class="text-me-error">Failed to load mappings: ' + e.message + '</p>';
    }
  }

  function escapeQuotes(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
  }

  async function loadZohoCustomers() {
    if (zohoCustomersCache.length > 0) return zohoCustomersCache;
    try {
      const res = await fetch('/zoho/customers');
      const data = await res.json();
      if (data.success && data.customers) {
        zohoCustomersCache = data.customers.sort((a, b) =>
          (a.contact_name || '').localeCompare(b.contact_name || '')
        );
      }
      return zohoCustomersCache;
    } catch (e) {
      console.error('Failed to load Zoho customers:', e);
      return [];
    }
  }

  async function showAddMappingModal(editId = null, editEdiName = '', editZohoId = '') {
    const customers = await loadZohoCustomers();
    const isEdit = editId !== null;

    const modalHtml = \`
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="closeModal(event)">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4" onclick="event.stopPropagation()">
          <div class="px-6 py-4 border-b border-me-border">
            <h3 class="text-lg font-semibold text-me-text-primary">\${isEdit ? 'Edit' : 'Add'} Customer Mapping</h3>
          </div>
          <div class="p-6">
            <div class="mb-4">
              <label class="block text-sm font-medium text-me-text-primary mb-2">EDI Customer Name</label>
              <input type="text" id="mappingEdiName" value="\${editEdiName}"
                placeholder="e.g., BURLINGTON COAT FACTORY"
                class="w-full px-4 py-2 border border-me-border rounded-lg focus:outline-none focus:ring-2 focus:ring-me-dark \${isEdit ? 'bg-me-bg' : ''}"
                \${isEdit ? 'readonly' : ''}>
              <p class="text-xs text-me-text-muted mt-1">Enter the customer name exactly as it appears in EDI orders</p>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-me-text-primary mb-2">Zoho Customer</label>
              <select id="mappingZohoCustomer" class="w-full px-4 py-2 border border-me-border rounded-lg focus:outline-none focus:ring-2 focus:ring-me-dark">
                <option value="">-- Select Zoho Customer --</option>
                \${customers.map(c => \`
                  <option value="\${c.contact_id}" data-name="\${escapeQuotes(c.contact_name || '')}" \${c.contact_id === editZohoId ? 'selected' : ''}>
                    \${c.contact_name || 'Unnamed'} \${c.company_name && c.company_name !== c.contact_name ? '(' + c.company_name + ')' : ''}
                  </option>
                \`).join('')}
              </select>
              <p class="text-xs text-me-text-muted mt-1">\${customers.length} customers loaded from Zoho</p>
            </div>
          </div>
          <div class="px-6 py-4 bg-me-bg rounded-b-xl flex justify-end gap-3">
            <button onclick="closeModal()" class="px-4 py-2 text-me-text-secondary hover:text-me-text-primary transition">Cancel</button>
            <button onclick="saveMapping(\${editId})" class="px-5 py-2 bg-me-dark text-white rounded-lg hover:bg-me-hover transition font-medium">
              \${isEdit ? 'Update' : 'Save'} Mapping
            </button>
          </div>
        </div>
      </div>
    \`;

    document.getElementById('modalContainer').innerHTML = modalHtml;
  }

  function editMapping(id, ediName, zohoId) {
    showAddMappingModal(id, ediName, zohoId);
  }

  async function saveMapping(editId = null) {
    const ediName = document.getElementById('mappingEdiName').value.trim();
    const zohoSelect = document.getElementById('mappingZohoCustomer');
    const zohoId = zohoSelect.value;
    const zohoName = zohoSelect.options[zohoSelect.selectedIndex]?.dataset?.name || '';

    if (!ediName) {
      toast('Please enter the EDI customer name');
      return;
    }
    if (!zohoId) {
      toast('Please select a Zoho customer');
      return;
    }

    try {
      const res = await fetch('/customer-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ediCustomerName: ediName,
          zohoCustomerId: zohoId,
          zohoCustomerName: zohoName
        })
      });
      const data = await res.json();

      if (data.success) {
        toast(editId ? 'Mapping updated!' : 'Mapping added!');
        closeModal();
        loadMappings();
      } else {
        toast('Error: ' + (data.error || 'Failed to save'));
      }
    } catch (e) {
      toast('Error: ' + e.message);
    }
  }

  async function deleteMapping(id, ediName) {
    if (!confirm('Delete mapping for "' + ediName + '"?')) return;

    try {
      const res = await fetch('/customer-mappings/' + id, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        toast('Mapping deleted');
        loadMappings();
      } else {
        toast('Error: ' + (data.error || 'Failed to delete'));
      }
    } catch (e) {
      toast('Error: ' + e.message);
    }
  }

  function closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('modalContainer').innerHTML = '';
  }

  async function refreshSftpStatus() {
    document.getElementById('sftpContent').innerHTML = '<p class="text-me-text-muted">Checking SFTP...</p>';
    try {
      const res = await fetch('/sftp/status');
      const data = await res.json();
      const statusText = data.connected ? '🟢 Connected' : '🟡 Ready (connects on fetch)';
      document.getElementById('sftpContent').innerHTML = \`
        <div class="text-sm space-y-1">
          <p><strong>Status:</strong> \${statusText}</p>
          <p><strong>Host:</strong> \${data.host || process.env.SFTP_HOST || 'Configured'}</p>
          <p><strong>Files in Inbox:</strong> \${data.inboxCount || 0}</p>
          <p class="text-xs text-me-text-muted mt-2">SFTP connects automatically when you click "Fetch from SFTP"</p>
        </div>
      \`;
    } catch (e) {
      document.getElementById('sftpContent').innerHTML = \`
        <div class="text-sm">
          <p><strong>Status:</strong> 🟡 Ready (connects on fetch)</p>
          <p class="text-xs text-me-text-muted mt-2">Click "Fetch from SFTP" on the New Orders page to connect and download orders.</p>
        </div>
      \`;
    }
  }

  // Re-parse all orders with updated CSV logic
  async function reparseAllOrders() {
    const btn = document.getElementById('reparseBtn');
    const statusEl = document.getElementById('reparseStatus');
    const resultsEl = document.getElementById('reparseResults');
    const resultsContent = document.getElementById('reparseResultsContent');

    if (!confirm('This will re-process all existing orders with the updated CSV parsing logic.\\n\\nThis is useful after updates to pack qty calculation, pricing logic, etc.\\n\\nContinue?')) {
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Re-parsing...';
    statusEl.textContent = 'Processing orders...';
    resultsEl.classList.add('hidden');

    try {
      const res = await fetch('/reparse-orders', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        statusEl.innerHTML = '✅ <span class="text-me-success">' + data.message + '</span>';

        // Show detailed results
        let detailText = 'Summary: ' + data.summary.success + ' successful, ' + data.summary.failed + ' failed\\n\\n';

        if (data.results && data.results.length > 0) {
          detailText += 'Details:\\n';
          data.results.forEach(r => {
            if (r.success) {
              detailText += '✓ PO#' + r.poNumber + ' - ' + r.itemCount + ' items';
              if (r.sampleItem && r.sampleItem.packQty > 1) {
                detailText += ' (pack qty: ' + r.sampleItem.packQty + ', unit price: $' + r.sampleItem.unitPrice?.toFixed(2) + ')';
              }
              detailText += '\\n';
            } else {
              detailText += '✗ PO#' + r.poNumber + ' - ' + (r.error || r.reason) + '\\n';
            }
          });
        }

        resultsContent.textContent = detailText;
        resultsEl.classList.remove('hidden');

        // Reload orders to show updated data
        loadOrders();
        toast('Re-parsed ' + data.summary.success + ' orders successfully');

      } else {
        statusEl.innerHTML = '❌ <span class="text-me-error">Error: ' + (data.error || 'Unknown error') + '</span>';
        toast('Re-parse failed: ' + (data.error || 'Unknown error'));
      }

    } catch (e) {
      statusEl.innerHTML = '❌ <span class="text-me-error">Error: ' + e.message + '</span>';
      toast('Error: ' + e.message);
    }

    btn.disabled = false;
    btn.innerHTML = '🔄 Re-parse All Orders';
  }

  // ============================================================
  // CUSTOMER MATCHING RULES
  // ============================================================
  let customerRulesCache = [];

  async function loadCustomerRules() {
    try {
      const res = await fetch('/customer-rules');
      const data = await res.json();

      if (!data.rules || data.rules.length === 0) {
        document.getElementById('customerRulesContent').innerHTML = \`
          <div class="text-center py-8 text-me-text-muted">
            <p class="mb-2">No customer matching rules configured yet.</p>
            <p class="text-sm">Click "Add Customer Rule" to set up matching rules for specific customers.</p>
          </div>
        \`;
        return;
      }

      customerRulesCache = data.rules;

      document.getElementById('customerRulesContent').innerHTML = \`
        <div class="space-y-3">
          \${data.rules.map(rule => {
            const isDefault = rule.is_default;
            const matchMethod = rule.match_by_customer_po ? 'Customer PO' :
                               rule.match_by_contract_ref ? 'Contract Ref (' + rule.contract_ref_field + ')' :
                               'Style + Customer';
            const actionLabel = rule.action_on_match === 'create_new_drawdown' ? 'Create New + Drawdown' : 'Update Bulk';
            const statusBadge = rule.bulk_order_status === 'confirmed' ? 'bg-green-100 text-me-success' : 'bg-amber-100 text-me-warning';

            return \`
              <div class="border border-me-border rounded-lg p-4 \${isDefault ? 'bg-blue-50/30 border-blue-200' : 'hover:bg-me-bg'}">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-me-text-primary">\${isDefault ? '📋 Default Rule (All Customers)' : '🏪 ' + rule.customer_name}</span>
                    \${isDefault ? '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Default</span>' : ''}
                  </div>
                  <div class="flex items-center gap-2">
                    <button onclick="editCustomerRule(\${rule.id})" class="text-me-accent hover:text-me-dark text-sm">Edit</button>
                    \${!isDefault ? '<button onclick="deleteCustomerRule(' + rule.id + ', \\'' + escapeQuotes(rule.customer_name) + '\\')" class="text-me-error hover:text-red-800 text-sm">Delete</button>' : ''}
                  </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span class="text-me-text-muted">Match By:</span>
                    <span class="font-medium text-me-text-primary ml-1">\${matchMethod}</span>
                  </div>
                  <div>
                    <span class="text-me-text-muted">Bulk Status:</span>
                    <span class="px-2 py-0.5 rounded text-xs \${statusBadge} ml-1">\${rule.bulk_order_status}</span>
                  </div>
                  <div>
                    <span class="text-me-text-muted">On Match:</span>
                    <span class="font-medium text-me-text-primary ml-1">\${actionLabel}</span>
                  </div>
                  <div>
                    <span class="text-me-text-muted">860 & 850R Action:</span>
                    <span class="font-medium text-me-text-primary ml-1">\${rule.edi_860_action === 'update_existing' ? 'Update Existing' : 'Create New Order & Draw Down Bulk'}</span>
                  </div>
                </div>
                \${rule.notes ? '<div class="mt-2 text-xs text-me-text-muted italic">' + rule.notes + '</div>' : ''}
              </div>
            \`;
          }).join('')}
        </div>
      \`;
    } catch (e) {
      document.getElementById('customerRulesContent').innerHTML = '<p class="text-me-error">Failed to load rules: ' + e.message + '</p>';
    }
  }

  async function showAddRuleModal(editId = null) {
    // Load existing rule if editing
    let rule = null;
    if (editId) {
      rule = customerRulesCache.find(r => r.id === editId);
    }

    const isEdit = editId !== null;
    const isDefault = rule?.is_default;

    const modalHtml = \`
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="closeModal(event)">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
          <div class="px-6 py-4 border-b border-me-border sticky top-0 bg-white">
            <h3 class="text-lg font-semibold text-me-text-primary">\${isEdit ? 'Edit' : 'Add'} Customer Matching Rule</h3>
          </div>
          <div class="p-6 space-y-6">

            <!-- Customer Name -->
            <div>
              <label class="block text-sm font-medium text-me-text-primary mb-2">Customer Name</label>
              \${isDefault ?
                '<input type="text" value="Default Rule (All Customers)" disabled class="w-full px-4 py-2 border border-me-border rounded-lg bg-me-bg text-me-text-muted">' :
                '<input type="text" id="ruleCustomerName" value="' + (rule?.customer_name || '') + '" placeholder="e.g., Kohls, JC Penney, Burlington Coat Factory" class="w-full px-4 py-2 border border-me-border rounded-lg focus:outline-none focus:ring-2 focus:ring-me-dark">'
              }
              <p class="text-xs text-me-text-muted mt-1">Enter customer name exactly as it appears in EDI orders, or leave blank for default rule</p>
            </div>

            <!-- Bulk Order Identification -->
            <div class="p-4 bg-me-bg rounded-lg">
              <h4 class="font-medium text-me-text-primary mb-3">📦 How to Identify Bulk/Contract Orders in Zoho</h4>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm text-me-text-secondary mb-1">Bulk Order Status</label>
                  <select id="ruleBulkStatus" class="w-full px-3 py-2 border border-me-border rounded-lg text-sm">
                    <option value="draft" \${rule?.bulk_order_status === 'draft' ? 'selected' : ''}>Draft</option>
                    <option value="confirmed" \${rule?.bulk_order_status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm text-me-text-secondary mb-1">Bulk Order Category</label>
                  <select id="ruleBulkCategory" class="w-full px-3 py-2 border border-me-border rounded-lg text-sm">
                    <option value="unconfirmed" \${rule?.bulk_order_category === 'unconfirmed' ? 'selected' : ''}>Unconfirmed</option>
                    <option value="confirmed" \${rule?.bulk_order_category === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                  </select>
                </div>
              </div>
              <div class="mt-3">
                <label class="block text-sm text-me-text-secondary mb-1">PO Field Pattern (optional)</label>
                <input type="text" id="rulePOPattern" value="\${rule?.bulk_po_field_pattern || 'EDI'}" placeholder="e.g., EDI" class="w-full px-3 py-2 border border-me-border rounded-lg text-sm">
                <p class="text-xs text-me-text-muted mt-1">Pattern to look for in the PO field to identify bulk orders</p>
              </div>
            </div>

            <!-- Matching Method - 850 -->
            <div class="p-4 bg-blue-50 rounded-lg">
              <h4 class="font-medium text-me-text-primary mb-1">🔗 How to Match EDI 850 to Bulk Order</h4>
              <p class="text-xs text-me-text-muted mb-3">Applies to new Purchase Orders (EDI 850)</p>
              <div class="space-y-3">
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="matchMethod850" value="style_customer" \${!rule?.match_by_customer_po && !rule?.match_by_contract_ref ? 'checked' : ''} onchange="toggleContractRefField()" class="mt-1">
                  <div>
                    <span class="font-medium text-me-text-primary">Match by Style + Customer</span>
                    <p class="text-xs text-me-text-muted">Match using customer name, style, color, and delivery date</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="matchMethod850" value="customer_po" \${rule?.match_by_customer_po ? 'checked' : ''} onchange="toggleContractRefField()" class="mt-1">
                  <div>
                    <span class="font-medium text-me-text-primary">Match by Customer PO Number</span>
                    <p class="text-xs text-me-text-muted">EDI and bulk order share the same Customer PO number (e.g., Kohls)</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="matchMethod850" value="contract_ref" \${rule?.match_by_contract_ref ? 'checked' : ''} onchange="toggleContractRefField()" class="mt-1">
                  <div>
                    <span class="font-medium text-me-text-primary">Match by Contract Reference Field</span>
                    <p class="text-xs text-me-text-muted">EDI has a reference to the contract order number (e.g., JCP uses po_rel_num)</p>
                  </div>
                </label>
                <div id="contractRefFieldContainer" class="ml-6 \${rule?.match_by_contract_ref ? '' : 'hidden'}">
                  <label class="block text-sm text-me-text-secondary mb-1">Contract Reference Field Name</label>
                  <input type="text" id="ruleContractRefField" value="\${rule?.contract_ref_field || 'po_rel_num'}" placeholder="e.g., po_rel_num" class="w-full px-3 py-2 border border-me-border rounded-lg text-sm">
                </div>
              </div>
            </div>

            <!-- Matching Method - 860 / 850R -->
            <div class="p-4 bg-indigo-50 rounded-lg">
              <h4 class="font-medium text-me-text-primary mb-1">🔗 How to Match EDI 860 / 850R to Bulk Order</h4>
              <p class="text-xs text-me-text-muted mb-3">Applies to Change Orders and Revised Purchase Orders (EDI 860 / 850R)</p>
              <div class="space-y-3">
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="matchMethod860" value="style_customer" \${!rule?.match_860_by_customer_po && !rule?.match_860_by_contract_ref ? 'checked' : ''} onchange="toggleContractRefField860()" class="mt-1">
                  <div>
                    <span class="font-medium text-me-text-primary">Match by Style + Customer</span>
                    <p class="text-xs text-me-text-muted">Match using customer name, style, color, and delivery date</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="matchMethod860" value="customer_po" \${rule?.match_860_by_customer_po ? 'checked' : ''} onchange="toggleContractRefField860()" class="mt-1">
                  <div>
                    <span class="font-medium text-me-text-primary">Match by Customer PO Number</span>
                    <p class="text-xs text-me-text-muted">860 and bulk order share the same Customer PO number</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="matchMethod860" value="contract_ref" \${rule?.match_860_by_contract_ref ? 'checked' : ''} onchange="toggleContractRefField860()" class="mt-1">
                  <div>
                    <span class="font-medium text-me-text-primary">Match by Contract Reference Field</span>
                    <p class="text-xs text-me-text-muted">860 has a reference to the contract order number</p>
                  </div>
                </label>
                <div id="contractRefFieldContainer860" class="ml-6 \${rule?.match_860_by_contract_ref ? '' : 'hidden'}">
                  <label class="block text-sm text-me-text-secondary mb-1">Contract Reference Field Name</label>
                  <input type="text" id="ruleContractRefField860" value="\${rule?.contract_ref_field_860 || 'po_rel_num'}" placeholder="e.g., po_rel_num" class="w-full px-3 py-2 border border-me-border rounded-lg text-sm">
                </div>
              </div>
            </div>

            <!-- Matching Criteria -->
            <div class="p-4 bg-green-50 rounded-lg">
              <h4 class="font-medium text-me-text-primary mb-3">✅ Matching Criteria</h4>
              <div class="grid grid-cols-2 gap-3">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="ruleMatchStyle" \${rule?.match_style !== false ? 'checked' : ''} class="w-4 h-4 rounded">
                  <span class="text-sm text-me-text-primary">Match Style</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="ruleMatchColor" \${rule?.match_color !== false ? 'checked' : ''} class="w-4 h-4 rounded">
                  <span class="text-sm text-me-text-primary">Match Color</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="ruleMatchUnits" \${rule?.match_units ? 'checked' : ''} class="w-4 h-4 rounded">
                  <span class="text-sm text-me-text-primary">Match Units</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="ruleMatchDelivery" \${rule?.match_delivery_date !== false ? 'checked' : ''} class="w-4 h-4 rounded">
                  <span class="text-sm text-me-text-primary">Match Delivery Date</span>
                </label>
              </div>
            </div>

            <!-- Action on Match -->
            <div class="p-4 bg-amber-50 rounded-lg">
              <h4 class="font-medium text-me-text-primary mb-3">⚡ Action When Match Found</h4>
              <div class="space-y-3">
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="actionOnMatch" value="update_bulk" \${rule?.action_on_match !== 'create_new_drawdown' ? 'checked' : ''} class="mt-1">
                  <div>
                    <span class="font-medium text-me-text-primary">Update Bulk Order</span>
                    <p class="text-xs text-me-text-muted">EDI data updates the bulk order directly (current behavior)</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="actionOnMatch" value="create_new_drawdown" \${rule?.action_on_match === 'create_new_drawdown' ? 'checked' : ''} class="mt-1">
                  <div>
                    <span class="font-medium text-me-text-primary">Create New Order + Draw Down Bulk</span>
                    <p class="text-xs text-me-text-muted">Create new Zoho order from EDI, reduce quantities from bulk order (contract matching)</p>
                  </div>
                </label>
              </div>
            </div>

            <!-- 860 Handling -->
            <div class="p-4 bg-purple-50 rounded-lg">
              <h4 class="font-medium text-me-text-primary mb-3">🔄 EDI 860 & 850R (Change Order) Handling</h4>
              <div class="space-y-3">
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="edi860Action" value="update_existing" \${rule?.edi_860_action !== 'create_amendment' ? 'checked' : ''} class="mt-1">
                  <div>
                    <span class="font-medium text-me-text-primary">Update Existing Order</span>
                    <p class="text-xs text-me-text-muted">Find and update the Zoho order created from the original EDI</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="edi860Action" value="create_amendment" \${rule?.edi_860_action === 'create_amendment' ? 'checked' : ''} class="mt-1">
                  <div>
                    <span class="font-medium text-me-text-primary">Create New Order & Draw Down Bulk</span>
                    <p class="text-xs text-me-text-muted">Create a new Zoho order from the 860 and reduce quantities from the bulk order</p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-me-text-primary mb-2">Notes (optional)</label>
              <textarea id="ruleNotes" rows="2" placeholder="Add any notes about this customer's matching rules..." class="w-full px-4 py-2 border border-me-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-me-dark">\${rule?.notes || ''}</textarea>
            </div>
          </div>

          <div class="px-6 py-4 bg-me-bg rounded-b-xl flex justify-end gap-3 sticky bottom-0">
            <button onclick="closeModal()" class="px-4 py-2 text-me-text-secondary hover:text-me-text-primary transition">Cancel</button>
            <button onclick="saveCustomerRule(\${editId}, \${isDefault})" class="px-5 py-2 bg-me-dark text-white rounded-lg hover:bg-me-hover transition font-medium">
              \${isEdit ? 'Update' : 'Save'} Rule
            </button>
          </div>
        </div>
      </div>
    \`;

    document.getElementById('modalContainer').innerHTML = modalHtml;
  }

  function toggleContractRefField() {
    const contractRefRadio = document.querySelector('input[name="matchMethod850"][value="contract_ref"]');
    const container = document.getElementById('contractRefFieldContainer');
    if (contractRefRadio && container) {
      container.classList.toggle('hidden', !contractRefRadio.checked);
    }
  }

  function toggleContractRefField860() {
    const contractRefRadio = document.querySelector('input[name="matchMethod860"][value="contract_ref"]');
    const container = document.getElementById('contractRefFieldContainer860');
    if (contractRefRadio && container) {
      container.classList.toggle('hidden', !contractRefRadio.checked);
    }
  }

  function editCustomerRule(id) {
    showAddRuleModal(id);
  }

  async function saveCustomerRule(editId = null, isDefault = false) {
    const customerName = isDefault ? '__default__' : document.getElementById('ruleCustomerName')?.value.trim();

    if (!isDefault && !customerName) {
      toast('Please enter a customer name');
      return;
    }

    const matchMethod850 = document.querySelector('input[name="matchMethod850"]:checked')?.value || 'style_customer';
    const matchMethod860 = document.querySelector('input[name="matchMethod860"]:checked')?.value || 'style_customer';
    const actionOnMatch = document.querySelector('input[name="actionOnMatch"]:checked')?.value || 'update_bulk';
    const edi860Action = document.querySelector('input[name="edi860Action"]:checked')?.value || 'update_existing';

    const ruleData = {
      customer_name: customerName,
      is_default: isDefault,
      bulk_order_status: document.getElementById('ruleBulkStatus')?.value || 'draft',
      bulk_order_category: document.getElementById('ruleBulkCategory')?.value || 'unconfirmed',
      bulk_po_field_pattern: document.getElementById('rulePOPattern')?.value || 'EDI',
      match_by_customer_po: matchMethod850 === 'customer_po',
      match_by_contract_ref: matchMethod850 === 'contract_ref',
      contract_ref_field: document.getElementById('ruleContractRefField')?.value || 'po_rel_num',
      match_by_style_customer: matchMethod850 === 'style_customer',
      match_860_by_customer_po: matchMethod860 === 'customer_po',
      match_860_by_contract_ref: matchMethod860 === 'contract_ref',
      contract_ref_field_860: document.getElementById('ruleContractRefField860')?.value || 'po_rel_num',
      match_style: document.getElementById('ruleMatchStyle')?.checked !== false,
      match_color: document.getElementById('ruleMatchColor')?.checked !== false,
      match_units: document.getElementById('ruleMatchUnits')?.checked || false,
      match_delivery_date: document.getElementById('ruleMatchDelivery')?.checked !== false,
      action_on_match: actionOnMatch,
      edi_860_action: edi860Action,
      notes: document.getElementById('ruleNotes')?.value || null
    };

    try {
      const res = await fetch('/customer-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      });
      const data = await res.json();

      if (data.success) {
        toast('✓ Rule saved for ' + (isDefault ? 'Default' : customerName));
        closeModal();
        loadCustomerRules();
      } else {
        toast('Error: ' + (data.error || 'Failed to save rule'));
      }
    } catch (e) {
      toast('Error: ' + e.message);
    }
  }

  async function deleteCustomerRule(id, customerName) {
    if (!confirm('Delete matching rule for "' + customerName + '"?\\n\\nThis customer will use the default rule instead.')) {
      return;
    }

    try {
      const res = await fetch('/customer-rules/' + id, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        toast('✓ Rule deleted');
        loadCustomerRules();
      } else {
        toast('Error: ' + (data.error || 'Failed to delete'));
      }
    } catch (e) {
      toast('Error: ' + e.message);
    }
  }

  // ============================================================
  // DISCREPANCY REPORTS
  // ============================================================
  let discrepanciesData = [];

  async function loadDiscrepancies() {
    const startDate = document.getElementById('discrepancyStartDate')?.value || '';
    const endDate = document.getElementById('discrepancyEndDate')?.value || '';
    const typeFilter = document.getElementById('discrepancyTypeFilter')?.value || '';

    const listEl = document.getElementById('discrepancyList');
    listEl.innerHTML = '<div class="p-4 text-center text-me-text-muted text-sm">Loading...</div>';

    try {
      // Build query params
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate + 'T23:59:59');
      if (typeFilter) params.append('type', typeFilter);

      // Fetch discrepancies
      const res = await fetch('/discrepancies?' + params.toString());
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      discrepanciesData = data.discrepancies || [];

      // Also fetch summary
      const summaryRes = await fetch('/discrepancies/summary?' + params.toString());
      const summaryData = await summaryRes.json();

      if (summaryData.success && summaryData.summary) {
        const totals = summaryData.summary.totals || {};
        document.getElementById('discrepancyTotalCount').textContent = totals.total || 0;
        document.getElementById('discrepancyOpenCount').textContent = totals.unresolved || 0;
        document.getElementById('discrepancyResolvedCount').textContent = totals.resolved || 0;
        document.getElementById('discrepancyOrdersCount').textContent = totals.unique_orders || 0;
      }

      // Render list
      renderDiscrepancyList(discrepanciesData);

    } catch (e) {
      listEl.innerHTML = '<div class="p-4 text-center text-me-error text-sm">Error: ' + e.message + '</div>';
    }
  }

  function renderDiscrepancyList(discrepancies) {
    const listEl = document.getElementById('discrepancyList');

    if (!discrepancies || discrepancies.length === 0) {
      listEl.innerHTML = '<div class="p-4 text-center text-me-text-muted text-sm">No discrepancies found for the selected filters</div>';
      return;
    }

    const typeColors = {
      date_mismatch: 'bg-amber-100 text-me-warning',
      amount_mismatch: 'bg-red-100 text-red-700',
      quantity_mismatch: 'bg-orange-100 text-orange-700',
      reference_mismatch: 'bg-blue-100 text-blue-700',
      line_qty_mismatch: 'bg-purple-100 text-purple-700',
      line_price_mismatch: 'bg-pink-100 text-pink-700',
      line_count_mismatch: 'bg-me-bg text-me-text-primary'
    };

    listEl.innerHTML = '<table class="w-full text-sm">' +
      '<thead class="bg-me-bg sticky top-0">' +
        '<tr>' +
          '<th class="text-left px-3 py-2 font-medium text-me-text-secondary">Date</th>' +
          '<th class="text-left px-3 py-2 font-medium text-me-text-secondary">Customer</th>' +
          '<th class="text-left px-3 py-2 font-medium text-me-text-secondary">PO#</th>' +
          '<th class="text-left px-3 py-2 font-medium text-me-text-secondary">Field</th>' +
          '<th class="text-left px-3 py-2 font-medium text-me-text-secondary">EDI Value</th>' +
          '<th class="text-left px-3 py-2 font-medium text-me-text-secondary">Zoho Value</th>' +
          '<th class="text-center px-3 py-2 font-medium text-me-text-secondary">Type</th>' +
          '<th class="text-center px-3 py-2 font-medium text-me-text-secondary">Status</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' +
        discrepancies.map(d => {
          const date = new Date(d.detected_at).toLocaleDateString();
          const typeClass = typeColors[d.discrepancy_type] || 'bg-me-bg text-me-text-primary';
          const statusClass = d.resolved_at ? 'bg-green-100 text-me-success' : 'bg-amber-100 text-me-warning';
          const status = d.resolved_at ? 'Resolved' : 'Open';
          return '<tr class="border-t border-gray-100 hover:bg-me-bg">' +
            '<td class="px-3 py-2 text-me-text-muted">' + date + '</td>' +
            '<td class="px-3 py-2 truncate max-w-[150px]" title="' + (d.customer_name || '') + '">' + (d.customer_name || '-').substring(0, 25) + '</td>' +
            '<td class="px-3 py-2 font-mono text-xs">' + (d.po_number || '-') + '</td>' +
            '<td class="px-3 py-2">' + (d.field_label || d.field_name || '-') + '</td>' +
            '<td class="px-3 py-2 font-mono text-xs bg-blue-50">' + (d.edi_value || '-') + '</td>' +
            '<td class="px-3 py-2 font-mono text-xs bg-green-50">' + (d.zoho_value || '-') + '</td>' +
            '<td class="px-3 py-2 text-center"><span class="px-2 py-0.5 rounded text-xs ' + typeClass + '">' + (d.discrepancy_type || '-').replace(/_/g, ' ') + '</span></td>' +
            '<td class="px-3 py-2 text-center"><span class="px-2 py-0.5 rounded text-xs ' + statusClass + '">' + status + '</span></td>' +
          '</tr>';
        }).join('') +
      '</tbody>' +
    '</table>';
  }

  async function exportDiscrepanciesToExcel() {
    const startDate = document.getElementById('discrepancyStartDate')?.value || '';
    const endDate = document.getElementById('discrepancyEndDate')?.value || '';
    const typeFilter = document.getElementById('discrepancyTypeFilter')?.value || '';

    const btn = document.getElementById('exportDiscrepanciesBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Exporting...';

    try {
      // Build query params
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate + 'T23:59:59');
      if (typeFilter) params.append('type', typeFilter);

      const res = await fetch('/discrepancies/export?' + params.toString());
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      if (!data.data || data.data.length === 0) {
        toast('No discrepancies to export');
        return;
      }

      // Generate CSV and trigger download
      const headers = Object.keys(data.data[0]);
      const csvContent = [
        headers.join(','),
        ...data.data.map(row =>
          headers.map(h => {
            const val = row[h] || '';
            // Escape quotes and wrap in quotes if contains comma
            const escaped = String(val).replace(/"/g, '""');
            return escaped.includes(',') || escaped.includes('\\n') ? '"' + escaped + '"' : escaped;
          }).join(',')
        )
      ].join('\\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const filename = 'discrepancy_report_' + (startDate || 'all') + '_' + (endDate || 'today') + '.csv';

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast('Exported ' + data.count + ' discrepancies to ' + filename);

    } catch (e) {
      toast('Export failed: ' + e.message);
    }

    btn.disabled = false;
    btn.innerHTML = '📥 Export Excel';
  }

  // Set default date range (last 30 days)
  function initDiscrepancyDateRange() {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startEl = document.getElementById('discrepancyStartDate');
    const endEl = document.getElementById('discrepancyEndDate');
    if (startEl) startEl.value = startDate;
    if (endEl) endEl.value = endDate;
  }

  // Initialize date range when settings page loads
  const origShowStage = showStage;
  showStage = function(stage, skipSave) {
    if (stage === 'settings') {
      setTimeout(initDiscrepancyDateRange, 100);
    }
    return origShowStage(stage, skipSave);
  };

</script>
</body>
</html>
`;

module.exports = dashboardHTML;
