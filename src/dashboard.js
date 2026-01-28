// Dashboard with Matching System - Mark Edwards Apparel
// Clean UI Design with Tailwind CSS

const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EDI Order Processing | Mark Edwards Apparel</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @keyframes pulse-green { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .pulse-green { animation: pulse-green 2s infinite; }
    kbd { display: inline-block; padding: 2px 6px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px; font-family: monospace; }
    .stage-btn.active { box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: scale(1.02); }
    .toast { position: fixed; bottom: 24px; right: 24px; background: #1e293b; color: white; padding: 12px 20px; border-radius: 8px; font-size: 14px; z-index: 9999; animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .tab-btn.active { border-bottom: 2px solid #3b82f6; color: #3b82f6; }
    .tab-btn { border-bottom: 2px solid transparent; }
  </style>
</head>
<body class="bg-slate-50 min-h-screen">

  <!-- Header -->
  <header class="bg-slate-800 text-white px-6 py-4">
    <div class="flex items-center justify-between max-w-7xl mx-auto">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-800 font-bold text-sm">ME</div>
        <div>
          <h1 class="font-semibold">Spring EDI Integration</h1>
          <p class="text-slate-400 text-sm">Mark Edwards Apparel</p>
        </div>
      </div>
      <div class="flex items-center gap-6">
        <button onclick="showStage('settings')" class="text-sm text-slate-400 hover:text-white transition flex items-center gap-1.5">
          ⚙️ Settings
        </button>
        <button onclick="showStage('history')" class="text-sm text-slate-400 hover:text-white transition flex items-center gap-1.5">
          📋 Activity Log
        </button>
        <div class="flex items-center gap-2 text-sm text-slate-400">
          <div class="w-2 h-2 bg-green-400 rounded-full pulse-green"></div>
          System Online
        </div>
      </div>
    </div>
  </header>

  <!-- WORKFLOW PROGRESS BAR -->
  <div class="bg-white border-b shadow-sm">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-center gap-4">
        <!-- Stage 1: New Orders -->
        <button onclick="showStage('inbox')" id="stage-inbox"
          class="stage-btn flex items-center gap-3 px-5 py-3 rounded-xl transition-all bg-amber-500 text-white shadow-lg shadow-amber-200 active">
          <span class="text-xl">📥</span>
          <div class="text-left">
            <div class="font-medium">New Orders</div>
            <div class="text-sm opacity-80"><span id="inbox-count">0</span> to process</div>
          </div>
        </button>

        <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>

        <!-- Stage 2: Review -->
        <button onclick="showStage('review')" id="stage-review"
          class="stage-btn flex items-center gap-3 px-5 py-3 rounded-xl transition-all bg-blue-100 text-blue-700 border border-blue-300">
          <span class="text-xl">🔍</span>
          <div class="text-left">
            <div class="font-medium">Review Matches</div>
            <div class="text-sm opacity-70"><span id="review-count">0</span> to review</div>
          </div>
        </button>

        <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>

        <!-- Stage 3: Done -->
        <button onclick="showStage('done')" id="stage-done"
          class="stage-btn flex items-center gap-3 px-5 py-3 rounded-xl transition-all bg-green-100 text-green-700 border border-green-300">
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
          <h2 class="text-xl font-semibold text-slate-800">New EDI Orders</h2>
          <p class="text-slate-500">Orders imported from SFTP, ready to match with Zoho</p>
        </div>
        <div class="flex gap-3">
          <button onclick="fetchFromSftp()" id="fetchSftpBtn" class="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-600">
            🔄 Fetch from SFTP
          </button>
          <button onclick="findMatchesForSelected()" id="findMatchesBtn"
            class="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2 font-medium">
            🔍 Find Matches (<span id="pendingCountBtn">0</span>)
          </button>
        </div>
      </div>

      <!-- Zoho Cache Status -->
      <div class="bg-slate-100 rounded-lg px-4 py-3 mb-4 flex items-center justify-between text-sm">
        <div class="flex items-center gap-2 text-slate-600">
          <span id="cacheIndicator">🟢</span>
          Zoho Drafts: <strong id="cacheDraftsCount">0</strong> cached • Last updated: <strong id="cacheLastRefresh">-</strong>
        </div>
        <button onclick="refreshZohoCache()" class="text-blue-600 hover:text-blue-800 font-medium">🔄 Refresh Zoho Data</button>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-4 mb-4">
        <input type="text" id="searchBox" placeholder="Search PO#..." onkeyup="filterOrders()"
          class="px-4 py-2 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500">
        <select id="customerFilter" onchange="filterOrders()" class="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Customers</option>
        </select>
        <label class="flex items-center gap-2 text-sm text-slate-600 ml-auto">
          <input type="checkbox" id="selectAll" onchange="toggleAll()" class="w-4 h-4 rounded border-slate-300">
          Select All
        </label>
      </div>

      <!-- Order Cards -->
      <div id="ordersContainer" class="space-y-3">
        <div class="text-center py-12 text-slate-500">Loading orders...</div>
      </div>
    </div>

    <!-- ==================== REVIEW STAGE ==================== -->
    <div id="content-review" class="stage-content hidden">

      <!-- Header with Title and Filters -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <h2 class="text-xl font-semibold text-slate-800">Review Matches</h2>

          <!-- Customer Filter -->
          <select id="reviewCustomerFilter" onchange="filterReviewMatches()" class="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Customers</option>
          </select>

          <!-- Confidence Filter Buttons -->
          <div id="confidenceFilters" class="flex items-center gap-1 ml-2 bg-slate-100 p-1 rounded-lg">
            <button onclick="setConfidenceFilter('')" data-filter="" class="conf-filter px-3 py-1.5 rounded-md text-sm font-medium bg-white shadow-sm text-slate-700">All (<span id="filter-count-all">0</span>)</button>
            <button onclick="setConfidenceFilter('perfect')" data-filter="perfect" class="conf-filter px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:text-slate-700">100% (<span id="filter-count-perfect">0</span>)</button>
            <button onclick="setConfidenceFilter('high')" data-filter="high" class="conf-filter px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:text-slate-700">80-99% (<span id="filter-count-high">0</span>)</button>
            <button onclick="setConfidenceFilter('medium')" data-filter="medium" class="conf-filter px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:text-slate-700">60-79% (<span id="filter-count-medium">0</span>)</button>
            <button onclick="setConfidenceFilter('nomatch')" data-filter="nomatch" class="conf-filter px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:text-slate-700">No Match (<span id="filter-count-nomatch">0</span>)</button>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-sm text-green-600 font-medium"><span id="selectedCountDisplay">0</span> selected</span>
          <button onclick="clearMatchResults()" class="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">Clear Results</button>
        </div>
      </div>

      <!-- Empty State -->
      <div id="reviewEmptyState" class="text-center py-16">
        <div class="text-6xl mb-4">🔍</div>
        <h3 class="text-xl font-semibold text-slate-700 mb-2">No matches to review</h3>
        <p class="text-slate-500">Go to <strong>New Orders</strong> and click <strong>Find Matches</strong> to search for matching Zoho drafts.</p>
      </div>

      <!-- List View Container -->
      <div id="listViewContainer" class="hidden">
        <!-- Progress indicator -->
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-slate-500">Match <strong class="text-slate-700" id="list-current-match">1</strong> of <strong class="text-slate-700" id="list-total-matches">0</strong></span>
        </div>
        <div class="h-1.5 bg-slate-200 rounded-full mb-4">
          <div id="list-progress-bar" class="h-full bg-blue-500 rounded-full transition-all" style="width: 0%"></div>
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
          <div class="text-green-800">
            <strong id="actionBarCount">0</strong> order(s) selected for Zoho
          </div>
          <button onclick="sendSelectedToZoho()" class="px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium">
            Finish & Send to Zoho →
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== DONE STAGE ==================== -->
    <div id="content-done" class="stage-content hidden">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-semibold text-slate-800">Sent to Zoho</h2>
          <p class="text-slate-500">Orders successfully processed and sent to Zoho</p>
        </div>
        <button onclick="exportSentToExcel()" class="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-600">
          📊 Export Report
        </button>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-4 mb-4">
        <input type="text" id="sentSearchBox" placeholder="Search PO#..." onkeyup="filterSentOrders()"
          class="px-4 py-2 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500">
        <select id="sentCustomerFilter" onchange="filterSentOrders()" class="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Customers</option>
        </select>
        <span id="sentOrderCount" class="text-sm text-slate-500 ml-auto"></span>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">PO Number</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Zoho SO#</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Value</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Sent At</th>
              <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody id="sentOrdersTable">
            <tr><td colspan="6" class="px-4 py-8 text-center text-slate-500">No orders sent yet</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ==================== HISTORY/ACTIVITY STAGE ==================== -->
    <div id="content-history" class="stage-content hidden">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-semibold text-slate-800">Zoho Audit Trail</h2>
          <p class="text-slate-500">Orders created and modified in Zoho</p>
        </div>
        <button onclick="loadActivityLog()" class="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-slate-600">
          🔄 Refresh
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="text-xs text-slate-500 uppercase mb-1">Total Orders Sent</div>
          <div class="text-2xl font-bold text-slate-800" id="statAllTimeSent">-</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="text-xs text-slate-500 uppercase mb-1">Total Value</div>
          <div class="text-2xl font-bold text-green-600" id="statAllTimeValue">-</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="text-xs text-slate-500 uppercase mb-1">New Orders Created</div>
          <div class="text-2xl font-bold text-blue-600" id="statNewOrders">-</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="text-xs text-slate-500 uppercase mb-1">Drafts Updated</div>
          <div class="text-2xl font-bold text-amber-600" id="statDraftsUpdated">-</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-4 mb-4">
        <select id="activityTypeFilter" onchange="filterActivityLog()" class="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Types</option>
          <option value="new">New Orders Created</option>
          <option value="updated">Drafts Updated</option>
        </select>
        <input type="text" id="activitySearchFilter" placeholder="Search PO# or Customer..." onkeyup="filterActivityLog()" class="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64">
        <span id="activityLogCount" class="text-sm text-slate-500 ml-auto"></span>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date/Time</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">PO #</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Zoho SO#</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Changes</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody id="activityLogBody">
            <tr><td colspan="7" class="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ==================== SETTINGS STAGE ==================== -->
    <div id="content-settings" class="stage-content hidden">
      <div class="max-w-3xl">
        <h2 class="text-xl font-semibold text-slate-800 mb-6">Settings</h2>

        <!-- Customer Mappings -->
        <div class="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 class="text-lg font-semibold text-slate-800 mb-4">Customer Mappings</h3>
          <p class="text-slate-500 mb-4">Map EDI customer names to Zoho accounts</p>
          <div id="mappingsContent">Loading...</div>
        </div>

        <!-- SFTP Browser -->
        <div class="bg-white rounded-xl border border-slate-200 p-6">
          <h3 class="text-lg font-semibold text-slate-800 mb-4">SFTP Browser</h3>
          <p class="text-slate-500 mb-4">Browse and manage files on the SFTP server</p>
          <button onclick="refreshSftpStatus()" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
            🔄 Refresh SFTP
          </button>
          <div id="sftpContent" class="mt-4"></div>
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
      btn.classList.remove('active', 'bg-amber-500', 'bg-blue-500', 'bg-green-500', 'text-white', 'shadow-lg', 'shadow-amber-200', 'shadow-blue-200', 'shadow-green-200');
      btn.classList.add('border');
    });

    // Show selected content
    const contentEl = document.getElementById('content-' + stage);
    if (contentEl) contentEl.classList.remove('hidden');

    // Highlight active stage button
    const stageBtn = document.getElementById('stage-' + stage);
    if (stageBtn) {
      stageBtn.classList.add('active');
      if (stage === 'inbox') {
        stageBtn.classList.add('bg-amber-500', 'text-white', 'shadow-lg', 'shadow-amber-200');
        stageBtn.classList.remove('bg-amber-100', 'text-amber-700', 'border', 'border-amber-300');
      } else if (stage === 'review') {
        stageBtn.classList.add('bg-blue-500', 'text-white', 'shadow-lg', 'shadow-blue-200');
        stageBtn.classList.remove('bg-blue-100', 'text-blue-700', 'border', 'border-blue-300');
      } else if (stage === 'done') {
        stageBtn.classList.add('bg-green-500', 'text-white', 'shadow-lg', 'shadow-green-200');
        stageBtn.classList.remove('bg-green-100', 'text-green-700', 'border', 'border-green-300');
      }
    }

    // Load data for specific stages
    if (stage === 'done') loadSentOrders();
    if (stage === 'history') { loadActivityLog(); loadAuditStats(); }
    if (stage === 'settings') loadMappings();
    if (stage === 'review') {
      // Always try to show list view when navigating to review
      // showListView will handle empty state if no matches
      updateFilterCounts();
      updateReviewCustomerFilter();
      showListView();
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
    if (!data || typeof data !== 'object') return '<div class="text-slate-400">No data</div>';

    let html = '';

    // Helper to format a value for display
    const formatValue = (val) => {
      if (val === null || val === undefined || val === '') return '<span class="text-slate-400 italic">—</span>';
      if (typeof val === 'boolean') return val ? '<span class="text-green-600">Yes</span>' : '<span class="text-red-600">No</span>';
      if (typeof val === 'number') return '<span class="text-blue-600 font-medium">' + val.toLocaleString() + '</span>';
      if (typeof val === 'string') {
        // Format dates
        if (/^\\d{4}-\\d{2}-\\d{2}/.test(val)) {
          return '<span class="text-purple-600">' + escapeHtml(val) + '</span>';
        }
        return '<span class="text-slate-700">' + escapeHtml(val) + '</span>';
      }
      return '<span class="text-slate-500">' + escapeHtml(String(val)) + '</span>';
    };

    // Recursive function to render any object/array structure
    const renderObject = (obj, depth = 0) => {
      if (!obj || typeof obj !== 'object') return formatValue(obj);

      if (Array.isArray(obj)) {
        if (obj.length === 0) return '<span class="text-slate-400 italic">empty array</span>';

        // For arrays of objects (like items), render as expandable sections
        let arrayHtml = '';
        obj.forEach((item, idx) => {
          if (typeof item === 'object' && item !== null) {
            arrayHtml += '<div class="border border-slate-200 rounded mb-2 overflow-hidden">';
            arrayHtml += '<div class="bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">Item ' + (idx + 1) + '</div>';
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
      if (entries.length === 0) return '<span class="text-slate-400 italic">empty</span>';

      let tableHtml = '<table class="w-full text-sm">';
      entries.forEach(([key, value], idx) => {
        const bgClass = idx % 2 === 0 ? 'bg-slate-50' : 'bg-white';
        // Format the key name nicely
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/_/g, ' ');

        tableHtml += '<tr class="' + bgClass + ' border-b border-slate-100">';
        tableHtml += '<td class="px-3 py-2 text-slate-500 font-medium align-top" style="width: 200px;">' + escapeHtml(formattedKey) + '</td>';

        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            tableHtml += '<td class="px-3 py-2">';
            if (value.length === 0) {
              tableHtml += '<span class="text-slate-400 italic">empty array</span>';
            } else if (typeof value[0] === 'object') {
              // Array of objects - show count and expandable
              tableHtml += '<details class="cursor-pointer"><summary class="text-blue-600 hover:text-blue-800">' + value.length + ' items (click to expand)</summary>';
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
                tableHtml += '<div class="flex gap-2"><span class="text-slate-400">' + subKeyFormatted + ':</span> ' + formatValue(subVal) + '</div>';
              });
              tableHtml += '</td>';
            } else {
              // Large object - make expandable
              tableHtml += '<td class="px-3 py-2">';
              tableHtml += '<details class="cursor-pointer"><summary class="text-blue-600 hover:text-blue-800">' + nestedEntries.length + ' fields (click to expand)</summary>';
              tableHtml += '<div class="mt-2 pl-2 border-l-2 border-slate-200">' + renderObject(value, depth + 1) + '</div></details>';
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
    html += '<div class="bg-white border border-slate-200 rounded-lg overflow-hidden">';
    html += renderObject(data);
    html += '</div>';

    return html || '<div class="text-slate-400">No data available</div>';
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

    let filtered = orders.filter(o => {
      if (o.status === 'processed' || o.zoho_so_number) return false; // Hide processed
      if (search && !(o.edi_order_number || '').toLowerCase().includes(search)) return false;
      if (customer && o.edi_customer_name !== customer) return false;
      return true;
    });

    const container = document.getElementById('ordersContainer');

    if (!filtered.length) {
      container.innerHTML = '<div class="text-center py-12 text-slate-500">No pending orders found.</div>';
      return;
    }

    container.innerHTML = filtered.map(o => {
      const items = o.parsed_data?.items || [];
      const amt = items.reduce((s, i) => s + (i.quantityOrdered || 0) * (i.unitPrice || 0), 0);
      const importDate = new Date(o.created_at);
      const daysSinceImport = Math.floor((new Date() - importDate) / (1000 * 60 * 60 * 24));
      const isOld = daysSinceImport >= 3;
      const importedStr = formatDateWithTime(importDate);
      const ediDate = o.parsed_data?.dates?.orderDate || o.parsed_data?.dates?.poDate || '';
      const ediDateStr = ediDate ? new Date(ediDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A';

      return \`
        <div class="bg-white rounded-xl border \${isOld ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'} p-4 hover:border-slate-300 transition">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <input type="checkbox" \${selectedIds.has(o.id) ? 'checked' : ''} onchange="toggleSelect(\${o.id})"
                class="w-5 h-5 rounded border-slate-300 text-blue-500 cursor-pointer">
              <div>
                <div class="font-semibold text-slate-800">\${o.edi_order_number || 'N/A'}</div>
                <div class="text-sm text-slate-500">\${o.edi_customer_name || 'Unknown'}</div>
              </div>
              \${isOld ? '<span class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">' + daysSinceImport + ' days old</span>' : ''}
            </div>
            <div class="flex items-center gap-8">
              <div class="text-right">
                <div class="text-sm text-slate-500">\${items.length} items</div>
                <div class="font-semibold text-slate-800">$\${amt.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-slate-400 uppercase">Imported</div>
                <div class="text-sm \${isOld ? 'text-amber-600 font-medium' : 'text-slate-600'}">\${importedStr}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-slate-400 uppercase">EDI Date</div>
                <div class="text-sm text-slate-600">\${ediDateStr}</div>
              </div>
              <button onclick="viewEdiDetails(\${o.id})" class="p-2 hover:bg-slate-100 rounded-lg transition" title="View Details">
                👁️
              </button>
            </div>
          </div>
        </div>
      \`;
    }).join('');
  }

  function filterOrders() { renderOrders(); }

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
    document.getElementById('pendingCountBtn').textContent = count;
  }

  function updateWorkflowCounts() {
    const pendingCount = orders.filter(o => o.status === 'pending' && !o.zoho_so_number).length;
    document.getElementById('inbox-count').textContent = pendingCount;

    const reviewCount = matchResults ? (matchResults.matches?.length || 0) + (matchResults.noMatches?.length || 0) : 0;
    document.getElementById('review-count').textContent = reviewCount;

    const sentCount = orders.filter(o => o.status === 'processed' || o.zoho_so_number).length;
    document.getElementById('done-count').textContent = sentCount;

    updatePendingCount();
    updateSelectedDisplay();
  }

  function updateSelectedDisplay() {
    const count = selectedMatchIds.size;
    document.getElementById('selectedCountDisplay').textContent = count;
    document.getElementById('actionBarCount').textContent = count;

    const actionBar = document.getElementById('reviewActionBar');
    if (count > 0) {
      actionBar.classList.remove('hidden');
    } else {
      actionBar.classList.add('hidden');
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
    btn.innerHTML = '<span class="spinner"></span> Finding...';

    try {
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
        currentReviewCustomerFilter = ''; // Reset customer filter for new results
        showStage('review');
        showListView();
        toast('Found ' + (data.matches?.length || 0) + ' matches');
      } else {
        toast('Error: ' + (data.error || 'Unknown'));
      }
    } catch (e) {
      toast('Error: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔍 Find Matches (<span id="pendingCountBtn">' + (selectedIds.size || orders.filter(o => o.status === 'pending' && !o.zoho_so_number).length) + '</span>)';
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
        btn.classList.add('bg-white', 'shadow-sm', 'text-slate-700');
        btn.classList.remove('text-slate-500');
      } else {
        btn.classList.remove('bg-white', 'shadow-sm', 'text-slate-700');
        btn.classList.add('text-slate-500');
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
      container.innerHTML = '<div class="text-center py-12 text-slate-500">No matches in this category.</div>';
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
        confBg = 'bg-green-100 text-green-700'; confBorder = 'border-green-500';
      } else if (conf >= 80) {
        confBg = 'bg-blue-100 text-blue-700'; confBorder = 'border-blue-500';
      } else if (conf >= 60) {
        confBg = 'bg-amber-100 text-amber-700'; confBorder = 'border-amber-500';
      } else {
        confBg = 'bg-red-100 text-red-700'; confBorder = 'border-red-500';
      }

      // Card border based on selection state
      let cardBorder = 'border-slate-200';
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
                class="w-5 h-5 rounded border-slate-300 text-green-500 cursor-pointer">
              <div>
                <div class="font-semibold text-slate-800">\${edi.customer}</div>
                <div class="text-sm text-slate-500">PO# \${edi.poNumber}\${zoho ? ' → Zoho Ref# ' + (zoho.reference || zoho.number) : ''}</div>
              </div>
              \${isFlagged ? '<span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">🚩 Flagged</span>' : ''}
              \${isSelected ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Selected</span>' : ''}
            </div>
            <div class="flex items-center gap-6">
              <div class="text-right">
                <div class="text-xs text-slate-400 uppercase">Units</div>
                <div class="text-sm font-medium">\${(edi.totalUnits || 0).toLocaleString()}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-slate-400 uppercase">Amount</div>
                <div class="text-sm font-medium">$\${(edi.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-slate-400 uppercase">Styles</div>
                <div class="text-sm">\${styles.length > 0 ? styles.slice(0, 2).join(', ') + (styles.length > 2 ? '...' : '') : '-'}</div>
              </div>
              <div class="px-3 py-1.5 rounded-lg \${confBg} font-bold text-lg border \${confBorder}">
                \${isNoMatch ? 'No Match' : conf + '%'}
              </div>
              <button onclick="event.stopPropagation(); openFocusMode(\${index})" class="ml-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition">
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
    let confBg = conf >= 100 ? 'bg-green-100 text-green-700 border-green-200' :
                 conf >= 80 ? 'bg-blue-100 text-blue-700 border-blue-200' :
                 conf >= 60 ? 'bg-amber-100 text-amber-700 border-amber-200' :
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
        <span class="text-sm text-slate-500">Match <strong class="text-slate-700">\${focusModeIndex + 1}</strong> of <strong class="text-slate-700">\${allMatches.length}</strong></span>
        <div class="flex items-center gap-4 text-sm">
          <span class="text-green-600"><strong>\${selectedCount}</strong> selected</span>
          \${flaggedCount > 0 ? '<span class="text-red-600"><strong>' + flaggedCount + '</strong> flagged</span>' : ''}
        </div>
      </div>
      <div class="h-1.5 bg-slate-200 rounded-full mb-6">
        <div class="h-full bg-blue-500 rounded-full transition-all" style="width: \${progressPercent}%"></div>
      </div>

      <!-- Focus Card -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        <!-- Status Banner -->
        <div class="px-5 py-3 flex items-center gap-3 \${statusBg} border-b-2">
          <span class="text-xl">\${statusIcon}</span>
          <div>
            <div class="font-semibold">\${statusTitle}</div>
            <div class="text-sm opacity-80">\${statusDesc}</div>
          </div>
        </div>

        <!-- Header -->
        <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div class="text-lg font-semibold text-slate-800">\${edi.customer}</div>
            <div class="text-sm text-slate-500 flex items-center gap-3">
              <span>PO# \${edi.poNumber}\${zoho ? ' → Zoho Ref# ' + (zoho.reference || zoho.number) : ''}</span>
              <button onclick="viewEdiDetails(\${edi.id})" class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition">
                📄 View EDI Details
              </button>
            </div>
          </div>
          <div class="px-4 py-2 rounded-lg \${confBg} border font-bold text-xl">
            \${isNoMatch ? 'N/A' : conf + '%'}
          </div>
        </div>

        \${!isNoMatch ? \`
        <!-- Comparison Table -->
        <div class="px-5 py-4">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200">
                <th class="text-left py-2 font-medium text-slate-500 w-28">Field</th>
                <th class="text-left py-2 font-medium text-blue-600 bg-blue-50/50 px-3 rounded-tl-lg">EDI Order</th>
                <th class="text-left py-2 font-medium text-green-600 bg-green-50/50 px-3">Zoho Draft</th>
                <th class="text-center py-2 font-medium text-slate-500 w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-slate-100">
                <td class="py-2.5 text-slate-500">PO / Ref</td>
                <td class="py-2.5 bg-blue-50/30 px-3">\${edi.poNumber}</td>
                <td class="py-2.5 bg-green-50/30 px-3">\${zoho?.reference || zoho?.number || '-'}</td>
                <td class="py-2.5 text-center">\${details.po ? '<span class="text-green-600">✓ match</span>' : '<span class="text-amber-500">⚠️ diff</span>'}</td>
              </tr>
              <tr class="border-b border-slate-100">
                <td class="py-2.5 text-slate-500">Customer</td>
                <td class="py-2.5 bg-blue-50/30 px-3">\${edi.customer}</td>
                <td class="py-2.5 bg-green-50/30 px-3">\${zoho?.customer || '-'}</td>
                <td class="py-2.5 text-center">\${details.customer ? '<span class="text-green-600">✓ match</span>' : '<span class="text-amber-500">⚠️ diff</span>'}</td>
              </tr>
              <tr class="border-b border-slate-100">
                <td class="py-2.5 text-slate-500">Ship Date</td>
                <td class="py-2.5 bg-blue-50/30 px-3">\${ediShipDate}</td>
                <td class="py-2.5 bg-green-50/30 px-3">\${zohoShipDate}</td>
                <td class="py-2.5 text-center">\${details.shipDate ? '<span class="text-green-600">✓ match</span>' : '<span class="text-amber-500">⚠️ diff</span>'}</td>
              </tr>
              <tr class="border-b border-slate-100">
                <td class="py-2.5 text-slate-500">Cancel Date</td>
                <td class="py-2.5 bg-blue-50/30 px-3">\${ediCancelDate}</td>
                <td class="py-2.5 bg-green-50/30 px-3">\${zohoCancelDate}</td>
                <td class="py-2.5 text-center">\${details.cancelDate ? '<span class="text-green-600">✓ match</span>' : !zoho?.cancelDate ? '<span class="text-amber-500">⚠️ missing</span>' : '<span class="text-amber-500">⚠️ diff</span>'}</td>
              </tr>
              <tr class="border-b border-slate-100">
                <td class="py-2.5 text-slate-500">Units</td>
                <td class="py-2.5 bg-blue-50/30 px-3 font-semibold">\${(edi.totalUnits || 0).toLocaleString()}</td>
                <td class="py-2.5 bg-green-50/30 px-3 font-semibold">\${(zoho?.totalUnits || 0).toLocaleString()}</td>
                <td class="py-2.5 text-center">\${details.totalUnits ? '<span class="text-green-600">✓ match</span>' : '<span class="text-amber-500">⚠️ diff</span>'}</td>
              </tr>
              <tr class="border-b border-slate-100">
                <td class="py-2.5 text-slate-500">Amount</td>
                <td class="py-2.5 bg-blue-50/30 px-3 font-semibold">$\${(edi.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td class="py-2.5 bg-green-50/30 px-3 font-semibold">$\${(zoho?.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td class="py-2.5 text-center">\${details.totalAmount ? '<span class="text-green-600">✓ match</span>' : '<span class="text-amber-500">⚠️ diff</span>'}</td>
              </tr>
              <tr class="border-b border-slate-100">
                <td class="py-2.5 text-slate-500">Base Style</td>
                <td class="py-2.5 bg-blue-50/30 px-3">
                  \${ediStyles.length > 0 ? ediStyles.map(s => '<span class="inline-block bg-slate-100 px-2 py-0.5 rounded text-xs mr-1">' + s + '</span>').join('') : '-'}
                </td>
                <td class="py-2.5 bg-green-50/30 px-3">
                  \${zohoStyles.length > 0 ? zohoStyles.map(s => '<span class="inline-block bg-slate-100 px-2 py-0.5 rounded text-xs mr-1">' + s + '</span>').join('') : '-'}
                </td>
                <td class="py-2.5 text-center">\${details.baseStyle ? '<span class="text-green-600">✓ match</span>' : '<span class="text-amber-500">⚠️ diff</span>'}</td>
              </tr>
              <tr class="border-b border-slate-100">
                <td class="py-2.5 text-slate-500">Suffix</td>
                <td class="py-2.5 bg-blue-50/30 px-3 text-xs text-slate-600">\${details.ediSuffixes || '-'}</td>
                <td class="py-2.5 bg-green-50/30 px-3 text-xs text-slate-600">\${details.zohoSuffixes || '-'}</td>
                <td class="py-2.5 text-center">\${details.styleSuffix ? '<span class="text-green-600">✓ match</span>' : details.baseStyle ? '<span class="text-amber-500">⚠️ diff</span>' : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Line Items Comparison (expanded by default) -->
        <div class="px-5 pb-4">
          <button onclick="toggleLineItems()" class="text-sm text-slate-600 hover:text-slate-800 flex items-center gap-2">
            <span id="lineItemsToggle">▼</span> View line items (\${ediItems.length} EDI → \${zohoItems.length} Zoho)
          </button>
          <div id="lineItemsContainer" class="mt-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- EDI Items -->
              <div>
                <div class="text-sm font-semibold text-blue-600 mb-2">EDI Order</div>
                <table class="w-full text-xs">
                  <thead class="bg-blue-50">
                    <tr>
                      <th class="text-left px-2 py-1">Style</th>
                      <th class="text-left px-2 py-1">Color</th>
                      <th class="text-center px-2 py-1">UOM</th>
                      <th class="text-right px-2 py-1">Qty</th>
                      <th class="text-right px-2 py-1">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${ediItems.slice(0, 10).map(item => {
                      const uom = item.unitOfMeasure || 'EA';
                      const isPrepack = item.isPrepack || uom === 'AS' || uom === 'ST';
                      const priceDisplay = isPrepack && item.packPrice ?
                        '$' + (item.packPrice || 0).toFixed(2) + '/' + uom + (item.packQty > 1 ? ' → $' + (item.unitPrice || 0).toFixed(2) + '/ea' : '') :
                        '$' + (item.unitPrice || 0).toFixed(2);
                      return \`
                      <tr class="border-t border-slate-100">
                        <td class="px-2 py-1">\${item.productIds?.sku || item.productIds?.vendorItemNumber || item.style || '-'}</td>
                        <td class="px-2 py-1">\${item.color || '-'}</td>
                        <td class="px-2 py-1 text-center"><span class="\${isPrepack ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'} px-1.5 py-0.5 rounded text-xs">\${uom}</span></td>
                        <td class="px-2 py-1 text-right">\${item.quantityOrdered || 0}\${isPrepack && item.packQty > 1 ? ' <span class="text-slate-400">(' + (item.totalUnits || item.quantityOrdered * item.packQty) + ' units)</span>' : ''}</td>
                        <td class="px-2 py-1 text-right">\${priceDisplay}</td>
                      </tr>
                    \`}).join('')}
                    \${ediItems.length > 10 ? '<tr><td colspan="5" class="px-2 py-1 text-center text-slate-400">... and ' + (ediItems.length - 10) + ' more</td></tr>' : ''}
                  </tbody>
                </table>
              </div>
              <!-- Zoho Items -->
              <div>
                <div class="text-sm font-semibold text-green-600 mb-2">Zoho Draft</div>
                <table class="w-full text-xs">
                  <thead class="bg-green-50">
                    <tr>
                      <th class="text-left px-2 py-1">Item</th>
                      <th class="text-right px-2 py-1">Qty</th>
                      <th class="text-right px-2 py-1">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    \${zohoItems.slice(0, 10).map(item => \`
                      <tr class="border-t border-slate-100">
                        <td class="px-2 py-1">\${item.name || item.sku || '-'}</td>
                        <td class="px-2 py-1 text-right">\${item.quantity || 0}</td>
                        <td class="px-2 py-1 text-right">$\${(item.rate || 0).toFixed(2)}</td>
                      </tr>
                    \`).join('')}
                    \${zohoItems.length > 10 ? '<tr><td colspan="3" class="px-2 py-1 text-center text-slate-400">... and ' + (zohoItems.length - 10) + ' more</td></tr>' : ''}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        \` : \`
        <!-- No Match Info -->
        <div class="px-5 py-8 text-center">
          <p class="text-slate-500 mb-4">No matching Zoho draft was found for this EDI order.</p>
          <button onclick="viewEdiDetails(\${edi.id})" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
            View Full EDI Details
          </button>
        </div>
        \`}

        \${!isNoMatch && match.alternativeMatches && match.alternativeMatches.length > 0 ? \`
        <!-- Alternative Matches -->
        <div class="px-5 py-3 bg-amber-50 border-t border-amber-200">
          <div class="text-sm font-medium text-amber-700 mb-2">
            🔄 Alternative Matches (\${match.alternativeMatches.length} other potential matches)
          </div>
          <div class="space-y-2">
            \${match.alternativeMatches.map((alt, idx) => \`
              <div class="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">
                <div class="flex items-center gap-3">
                  <span class="text-xs text-slate-400">#\${idx + 2}</span>
                  <div>
                    <div class="font-medium text-sm text-slate-700">\${alt.zohoDraft.customer}</div>
                    <div class="text-xs text-slate-500">
                      Ref# \${alt.zohoDraft.reference || alt.zohoDraft.number}
                      • \${alt.zohoDraft.itemCount} items
                      • $\${alt.zohoDraft.totalAmount.toLocaleString()}
                      \${alt.zohoDraft.shipDate ? '• Ship: ' + formatDate(alt.zohoDraft.shipDate) : ''}
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-1 rounded text-xs font-medium \${alt.confidence >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}">
                    \${alt.confidence}%
                  </span>
                  <button onclick="switchToAlternativeMatch(\${focusModeIndex}, \${idx})" class="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition">
                    Use This
                  </button>
                </div>
              </div>
            \`).join('')}
          </div>
        </div>
        \` : ''}

        <!-- Actions -->
        <div class="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button onclick="focusModeSkip()" class="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition text-slate-600 font-medium">
              Skip
            </button>
            <button onclick="focusModeFlag()" class="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition text-slate-600 font-medium \${flaggedMatchIds.has(edi.id) ? 'bg-red-100 border-red-300 text-red-700' : ''}">
              \${flaggedMatchIds.has(edi.id) ? '🚩 Flagged' : '🚩 Flag'}
            </button>
            \${zoho ? \`<button onclick="window.open('https://books.zoho.com/app/677681121#/salesorders/\${zoho.id}','_blank')" class="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition text-slate-600 font-medium">
              🔗 Zoho
            </button>\` : ''}
          </div>
          \${!isNoMatch ? \`
          <button onclick="focusModeApprove()" class="px-6 py-2.5 \${selectedMatchIds.has(edi.id) ? 'bg-green-600' : 'bg-green-500'} text-white rounded-lg hover:bg-green-600 transition font-medium flex items-center gap-2">
            \${selectedMatchIds.has(edi.id) ? '✓ Selected' : '✓ Select & Next →'}
          </button>
          \` : \`
          <button onclick="createZohoOrder(\${edi.id})" class="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium flex items-center gap-2">
            ➕ Create in Zoho
          </button>
          \`}
        </div>
      </div>

      <!-- Navigation Footer -->
      <div class="flex items-center justify-between mt-4 text-sm">
        <button onclick="focusModePrev()" class="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-600 \${focusModeIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}" \${focusModeIndex === 0 ? 'disabled' : ''}>
          ← Previous
        </button>
        <div class="text-slate-400">
          <kbd>A</kbd> select <kbd>S</kbd> skip <kbd>F</kbd> flag <kbd>←</kbd><kbd>→</kbd> navigate <kbd>Esc</kbd> exit
        </div>
        <button onclick="focusModeNext()" class="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-600 \${focusModeIndex >= allMatches.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}" \${focusModeIndex >= allMatches.length - 1 ? 'disabled' : ''}>
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
        <div class="bg-white border border-slate-200 rounded-lg p-4 mb-3 relative" id="send-order-\${index}">
          <button onclick="removeFromSendList(\${index})" class="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition" title="Remove from list">
            ✕
          </button>
          <div class="flex items-start gap-3 mb-3 pr-6">
            <div class="flex-1">
              <div class="font-semibold text-slate-800">\${edi.customer}</div>
              <div class="text-sm text-slate-500">PO# \${edi.poNumber} → Zoho Ref# \${zoho?.reference || zoho?.number || 'N/A'}</div>
            </div>
            <div class="text-right">
              <div class="font-semibold text-green-600">$\${(edi.totalAmount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
              <div class="text-xs text-slate-400">\${edi.totalUnits?.toLocaleString() || 0} units</div>
            </div>
          </div>
          \${changes.length > 0 ? \`
            <div class="bg-amber-50 border border-amber-200 rounded p-2">
              <div class="text-xs font-semibold text-amber-700 mb-1">Changes to apply:</div>
              <table class="w-full text-sm">
                <tbody>
                  \${changes.map(c => \`
                    <tr>
                      <td class="py-1 text-slate-600 w-24">\${c.field}</td>
                      <td class="py-1 text-red-400 line-through text-sm">\${c.from}</td>
                      <td class="py-1 text-green-600 font-medium">→ \${c.to}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          \` : '<div class="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-2">✓ No field changes - will sync order</div>'}
        </div>
      \`;
    });

    const modalHtml = \`
      <div class="modal-overlay" onclick="closeModal()">
        <div class="bg-white rounded-xl max-w-3xl w-full mx-4 overflow-hidden" onclick="event.stopPropagation()">
          <div class="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
            <h3 class="text-lg font-semibold">📋 Review & Confirm — \${selectedMatches.length} Order\${selectedMatches.length !== 1 ? 's' : ''}</h3>
            <button onclick="closeModal()" class="text-white hover:text-slate-300 text-xl">✕</button>
          </div>

          <!-- Summary Stats -->
          <div class="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <div class="grid grid-cols-4 gap-4 text-center">
              <div>
                <div class="text-2xl font-bold text-slate-800">\${selectedMatches.length}</div>
                <div class="text-xs text-slate-500 uppercase">Orders</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-green-600">$\${totalEdiAmount.toLocaleString('en-US', {minimumFractionDigits: 0})}</div>
                <div class="text-xs text-slate-500 uppercase">Total Value</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-blue-600">\${totalEdiUnits.toLocaleString()}</div>
                <div class="text-xs text-slate-500 uppercase">Total Units</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-amber-600">\${ordersWithChanges}</div>
                <div class="text-xs text-slate-500 uppercase">With Changes</div>
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
              <div id="sendProgressFill" class="h-full bg-blue-500 transition-all duration-300" style="width: 0%"></div>
            </div>
          </div>

          <!-- Orders List -->
          <div class="p-6 max-h-[50vh] overflow-y-auto" id="sendOrdersList">
            \${ordersHtml}
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 bg-slate-50 border-t flex justify-between items-center">
            <div class="text-sm text-slate-500">
              Click ✕ on any order to remove it from this batch
            </div>
            <div class="flex gap-3">
              <button onclick="closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-medium">
                Cancel
              </button>
              <button onclick="executeBulkUpdate()" id="confirmBulkBtn" class="px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold flex items-center gap-2">
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
        const res = await fetch('/update-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ediOrderId: ediOrderId, zohoDraftId: draftId })
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
            orderEl.innerHTML = '<div class="flex items-center gap-2 text-green-600 font-medium"><span class="text-xl">✓</span> PO# ' + match.ediOrder.poNumber + ' — Sent successfully</div>';
          }
        } else {
          failed++;
          results.push({ poNumber: match.ediOrder.poNumber, success: false, error: data.error });

          // Mark as failed in UI
          const orderEl = document.getElementById('send-order-' + i);
          if (orderEl) {
            orderEl.classList.remove('opacity-50');
            orderEl.classList.add('border-red-300', 'bg-red-50');
            orderEl.innerHTML = '<div class="flex items-center gap-2 text-red-600 font-medium"><span class="text-xl">✕</span> PO# ' + match.ediOrder.poNumber + ' — Failed: ' + (data.error || 'Unknown error') + '</div>';
          }
        }
      } catch (e) {
        failed++;
        results.push({ poNumber: match.ediOrder.poNumber, success: false, error: e.message });

        const orderEl = document.getElementById('send-order-' + i);
        if (orderEl) {
          orderEl.classList.remove('opacity-50');
          orderEl.classList.add('border-red-300', 'bg-red-50');
          orderEl.innerHTML = '<div class="flex items-center gap-2 text-red-600 font-medium"><span class="text-xl">✕</span> PO# ' + match.ediOrder.poNumber + ' — Error: ' + e.message + '</div>';
        }
      }
    }

    // Update progress to complete
    progressFill.style.width = '100%';
    progressText.textContent = \`Complete! \${success} sent\${failed > 0 ? ', ' + failed + ' failed' : ''}\`;
    progressBar.classList.remove('bg-blue-50', 'border-blue-200');
    progressBar.classList.add(failed > 0 ? 'bg-amber-50' : 'bg-green-50', failed > 0 ? 'border-amber-200' : 'border-green-200');
    progressText.classList.remove('text-blue-700');
    progressText.classList.add(failed > 0 ? 'text-amber-700' : 'text-green-700');

    // Update button to close
    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-green-500', 'hover:bg-green-600');
    btn.classList.add('bg-slate-700', 'hover:bg-slate-800');
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
            <div class="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 class="text-lg font-semibold">EDI Order Details</h3>
                <div class="text-sm text-slate-300">PO# \${order.edi_order_number} • \${order.edi_customer_name}</div>
              </div>
              <button onclick="closeModal()" class="text-white hover:text-slate-300 text-xl">✕</button>
            </div>

            <!-- Tabs -->
            <div class="border-b border-slate-200 px-6">
              <div class="flex gap-6">
                <button onclick="showEdiTab('summary')" class="tab-btn active py-3 text-sm font-medium" data-tab="summary">Summary</button>
                <button onclick="showEdiTab('lineitems')" class="tab-btn py-3 text-sm font-medium text-slate-500" data-tab="lineitems">📦 Line Items</button>
                <button onclick="showEdiTab('raw')" class="tab-btn py-3 text-sm font-medium text-slate-500" data-tab="raw">All Raw Data</button>
              </div>
            </div>

            <div class="p-6 overflow-y-auto flex-1">
              <!-- Summary Tab -->
              <div id="edi-tab-summary" class="edi-tab-content">
                <div class="grid grid-cols-4 gap-4 mb-6">
                  <div class="bg-slate-50 rounded-lg p-4 text-center">
                    <div class="text-xs text-slate-500 uppercase mb-1">PO Number</div>
                    <div class="text-lg font-semibold">\${order.edi_order_number || 'N/A'}</div>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-4 text-center">
                    <div class="text-xs text-slate-500 uppercase mb-1">Customer</div>
                    <div class="text-lg font-semibold">\${order.edi_customer_name || 'Unknown'}</div>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-4 text-center">
                    <div class="text-xs text-slate-500 uppercase mb-1">Order Date</div>
                    <div class="text-lg font-semibold">\${formatDate(dates.orderDate || dates.poDate)}</div>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-4 text-center">
                    <div class="text-xs text-slate-500 uppercase mb-1">Unit of Measure</div>
                    <div class="text-lg font-semibold"><span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm">EA</span> Each</div>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-4 mb-6">
                  <div class="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
                    <div class="text-3xl font-bold text-blue-700">\${items.length}</div>
                    <div class="text-sm text-blue-600">Line Items</div>
                  </div>
                  <div class="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
                    <div class="text-3xl font-bold text-blue-700">\${totalUnits.toLocaleString()}</div>
                    <div class="text-sm text-blue-600">Units Ordered</div>
                  </div>
                  <div class="bg-green-50 rounded-lg p-4 text-center border border-green-100">
                    <div class="text-3xl font-bold text-green-700">$\${amt.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                    <div class="text-sm text-green-600">Total Value</div>
                  </div>
                </div>

                <div class="bg-amber-50 rounded-lg p-4 border border-amber-100">
                  <div class="font-semibold text-amber-800 mb-2">📦 Pack & Pricing Details</div>
                  <div class="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div class="text-xs text-slate-500 uppercase">Unit Price (Per EA)</div>
                      <div class="font-semibold">$\${(items[0]?.unitPrice || pricing.unitPrice || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div class="text-xs text-slate-500 uppercase">Item Price (Per Each)</div>
                      <div class="font-semibold text-green-600">$\${(items[0]?.unitPrice || pricing.unitPrice || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div class="text-xs text-slate-500 uppercase">Line Amount</div>
                      <div class="font-semibold">$\${amt.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Line Items Tab -->
              <div id="edi-tab-lineitems" class="edi-tab-content hidden">
                <div class="border border-slate-200 rounded-lg overflow-hidden">
                  <table class="w-full text-sm">
                    <thead class="bg-slate-50">
                      <tr>
                        <th class="text-left px-3 py-2 text-slate-500">Style</th>
                        <th class="text-left px-3 py-2 text-slate-500">Color</th>
                        <th class="text-left px-3 py-2 text-slate-500">Size</th>
                        <th class="text-center px-3 py-2 text-slate-500">UOM</th>
                        <th class="text-right px-3 py-2 text-slate-500">Qty</th>
                        <th class="text-right px-3 py-2 text-slate-500">Pack Price</th>
                        <th class="text-right px-3 py-2 text-slate-500">Each Price</th>
                        <th class="text-right px-3 py-2 text-slate-500">Total</th>
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
                        return \`
                        <tr class="border-t border-slate-100">
                          <td class="px-3 py-2 font-medium">\${item.productIds?.sku || item.productIds?.vendorItemNumber || item.style || '-'}</td>
                          <td class="px-3 py-2">\${item.color || '-'}</td>
                          <td class="px-3 py-2">\${item.size || '-'}</td>
                          <td class="px-3 py-2 text-center">
                            <span class="\${isPrepack ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'} px-2 py-0.5 rounded text-xs font-medium">\${uom}</span>
                            \${isPrepack && packQty > 1 ? '<div class="text-xs text-slate-400 mt-0.5">' + packQty + ' per pack</div>' : ''}
                          </td>
                          <td class="px-3 py-2 text-right">
                            \${item.quantityOrdered || 0}
                            \${isPrepack && packQty > 1 ? '<div class="text-xs text-slate-400">(' + totalUnitsLine + ' units)</div>' : ''}
                          </td>
                          <td class="px-3 py-2 text-right \${isPrepack ? 'font-medium' : 'text-slate-400'}">$\${packPrice.toFixed(2)}</td>
                          <td class="px-3 py-2 text-right \${!isPrepack ? 'font-medium' : ''}\${item.unitPriceCalculated ? ' text-blue-600' : ''}">
                            $\${eachPrice.toFixed(2)}
                            \${item.unitPriceCalculated ? '<div class="text-xs text-blue-500">calculated</div>' : ''}
                          </td>
                          <td class="px-3 py-2 text-right font-medium">$\${lineTotal.toFixed(2)}</td>
                        </tr>
                      \`}).join('')}
                    </tbody>
                    <tfoot class="bg-slate-50 font-semibold">
                      <tr class="border-t border-slate-200">
                        <td colspan="4" class="px-3 py-2 text-right">Totals:</td>
                        <td class="px-3 py-2 text-right">\${totalUnits.toLocaleString()} units</td>
                        <td colspan="2" class="px-3 py-2"></td>
                        <td class="px-3 py-2 text-right">$\${amt.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <!-- Raw Data Tab -->
              <div id="edi-tab-raw" class="edi-tab-content hidden">
                <div class="bg-slate-50 rounded-lg border max-h-96 overflow-auto">
                  \${formatRawDataDisplay(order.parsed_data)}
                </div>
              </div>
            </div>

            <div class="px-6 py-4 bg-slate-50 border-t">
              <button onclick="closeModal()" class="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">Close</button>
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
      btn.classList.add('text-slate-500');
    });
    // Show selected tab
    document.getElementById('edi-tab-' + tabName)?.classList.remove('hidden');
    // Activate button
    document.querySelector('.tab-btn[data-tab="' + tabName + '"]')?.classList.add('active');
    document.querySelector('.tab-btn[data-tab="' + tabName + '"]')?.classList.remove('text-slate-500');
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
      tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-500">No orders found</td></tr>';
      document.getElementById('sentOrderCount').textContent = '';
      return;
    }

    tbody.innerHTML = filtered.map(o => {
      const items = o.parsed_data?.items || [];
      const amt = items.reduce((s, i) => s + (i.quantityOrdered || 0) * (i.unitPrice || 0), 0);
      const zohoId = o.zoho_so_id || o.matched_draft_id || '';
      const zohoNum = o.zoho_so_number || zohoId || 'N/A';
      const zohoLink = zohoId ?
        '<a href="https://books.zoho.com/app/677681121#/salesorders/' + zohoId + '" target="_blank" class="text-green-600 font-medium hover:underline">' + zohoNum + ' ↗</a>' :
        zohoNum;
      const sentAtHtml = o.processed_at ? formatDateWithTime(new Date(o.processed_at)) : '-';

      return \`
        <tr class="border-b border-slate-100 hover:bg-slate-50">
          <td class="px-4 py-3 font-medium text-slate-800">\${o.edi_order_number || 'N/A'}</td>
          <td class="px-4 py-3 text-slate-600">\${o.edi_customer_name || 'Unknown'}</td>
          <td class="px-4 py-3">\${zohoLink}</td>
          <td class="px-4 py-3 text-right text-slate-800">$\${amt.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
          <td class="px-4 py-3 text-right text-slate-500">\${sentAtHtml}</td>
          <td class="px-4 py-3 text-center">
            <button onclick="viewEdiDetails(\${o.id})" class="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded transition">View</button>
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
      tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-slate-500">No orders found</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(order => {
      const time = order.sent_at ? formatDateWithTime(new Date(order.sent_at)) : '-';
      const typeLabel = order.was_new_order ?
        '<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">➕ New</span>' :
        '<span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-medium">✏️ Updated</span>';

      // Format changes
      let changesHtml = '-';
      if (order.changes_applied) {
        const changes = typeof order.changes_applied === 'string' ? JSON.parse(order.changes_applied) : order.changes_applied;
        if (changes && changes.length > 0) {
          changesHtml = changes.map(c =>
            '<span class="inline-block bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs mr-1">' + c.field + '</span>'
          ).join('');
        } else {
          changesHtml = '<span class="text-slate-400 text-xs">No changes</span>';
        }
      } else if (order.was_new_order) {
        changesHtml = '<span class="text-blue-500 text-xs">Created new</span>';
      }

      const amount = order.order_amount ? '$' + parseFloat(order.order_amount).toLocaleString('en-US', {minimumFractionDigits: 2}) : '-';

      return \`
        <tr class="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onclick="showOrderDetail(\${order.id})">
          <td class="px-4 py-3 text-slate-500 text-sm">\${time}</td>
          <td class="px-4 py-3">\${typeLabel}</td>
          <td class="px-4 py-3 font-medium text-slate-800">\${order.edi_po_number || order.edi_order_number || '-'}</td>
          <td class="px-4 py-3 text-slate-600">\${order.customer_name || '-'}</td>
          <td class="px-4 py-3 text-slate-600">\${order.zoho_so_number || '-'}</td>
          <td class="px-4 py-3 text-sm">\${changesHtml}</td>
          <td class="px-4 py-3 text-right font-medium text-green-600">\${amount}</td>
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
          <div class="text-sm font-semibold text-slate-600 mb-2">Changes Made:</div>
          <table class="w-full text-sm border border-slate-200 rounded">
            <thead class="bg-slate-50">
              <tr>
                <th class="text-left px-3 py-2 text-slate-500">Field</th>
                <th class="text-left px-3 py-2 text-slate-500">Before (Zoho)</th>
                <th class="text-left px-3 py-2 text-slate-500">After (EDI)</th>
              </tr>
            </thead>
            <tbody>
              \${changes.map(c => \`
                <tr class="border-t border-slate-100">
                  <td class="px-3 py-2 font-medium">\${c.field}</td>
                  <td class="px-3 py-2 text-red-400 line-through">\${c.from || '—'}</td>
                  <td class="px-3 py-2 text-green-600 font-medium">\${c.to || '—'}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
      \`;
    } else if (order.was_new_order) {
      changesHtml = '<div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">This was a new order created in Zoho (no existing draft was updated).</div>';
    } else {
      changesHtml = '<div class="mt-4 p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 text-sm">No field changes were recorded for this update.</div>';
    }

    const modalHtml = \`
      <div class="modal-overlay" onclick="closeModal()">
        <div class="bg-white rounded-xl max-w-2xl w-full mx-4 overflow-hidden max-h-[80vh] overflow-y-auto" onclick="event.stopPropagation()">
          <div class="bg-slate-800 text-white px-6 py-4 flex justify-between items-center sticky top-0">
            <h3 class="text-lg font-semibold">📋 Order Audit Detail</h3>
            <button onclick="closeModal()" class="text-white hover:text-slate-300">✕</button>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-2 gap-4 text-sm mb-4">
              <div class="bg-slate-50 rounded p-3">
                <div class="text-xs text-slate-500 uppercase mb-1">Sent to Zoho</div>
                <div class="font-medium">\${time}</div>
              </div>
              <div class="bg-slate-50 rounded p-3">
                <div class="text-xs text-slate-500 uppercase mb-1">Type</div>
                <div class="font-medium">\${order.was_new_order ? '➕ New Order Created' : '✏️ Draft Updated'}</div>
              </div>
              <div class="bg-slate-50 rounded p-3">
                <div class="text-xs text-slate-500 uppercase mb-1">EDI PO #</div>
                <div class="font-medium">\${order.edi_po_number || order.edi_order_number || '-'}</div>
              </div>
              <div class="bg-slate-50 rounded p-3">
                <div class="text-xs text-slate-500 uppercase mb-1">Zoho SO #</div>
                <div class="font-medium">\${order.zoho_so_number || '-'}</div>
              </div>
              <div class="bg-slate-50 rounded p-3">
                <div class="text-xs text-slate-500 uppercase mb-1">Customer</div>
                <div class="font-medium">\${order.customer_name || '-'}</div>
              </div>
              <div class="bg-green-50 rounded p-3 border border-green-100">
                <div class="text-xs text-green-600 uppercase mb-1">Order Amount</div>
                <div class="font-bold text-green-700">$\${order.order_amount ? parseFloat(order.order_amount).toLocaleString('en-US', {minimumFractionDigits: 2}) : '0.00'}</div>
              </div>
              \${order.match_confidence ? \`
              <div class="bg-slate-50 rounded p-3">
                <div class="text-xs text-slate-500 uppercase mb-1">Match Confidence</div>
                <div class="font-medium">\${order.match_confidence}%</div>
              </div>\` : ''}
              \${order.matched_draft_number ? \`
              <div class="bg-slate-50 rounded p-3">
                <div class="text-xs text-slate-500 uppercase mb-1">Matched Draft</div>
                <div class="font-medium">\${order.matched_draft_number}</div>
              </div>\` : ''}
            </div>
            \${changesHtml}
          </div>
          <div class="px-6 py-4 bg-slate-50 border-t flex justify-between">
            <button onclick="closeModal()" class="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300">Close</button>
            \${order.zoho_so_id ? \`<a href="https://books.zoho.com/app/677681121#/salesorders/\${order.zoho_so_id}" target="_blank" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">View in Zoho →</a>\` : ''}
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
  async function loadMappings() {
    try {
      const res = await fetch('/customer-mappings');
      const data = await res.json();

      if (!data.mappings || data.mappings.length === 0) {
        document.getElementById('mappingsContent').innerHTML = '<p class="text-slate-500">No customer mappings configured.</p>';
        return;
      }

      document.getElementById('mappingsContent').innerHTML = \`
        <div class="border border-slate-200 rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="text-left px-3 py-2 text-slate-500">EDI Customer</th>
                <th class="text-left px-3 py-2 text-slate-500">Zoho Customer</th>
              </tr>
            </thead>
            <tbody>
              \${data.mappings.map(m => \`
                <tr class="border-t border-slate-100">
                  <td class="px-3 py-2">\${m.edi_customer_name}</td>
                  <td class="px-3 py-2">\${m.zoho_account_name || '-'}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
      \`;
    } catch (e) {
      document.getElementById('mappingsContent').innerHTML = '<p class="text-red-500">Failed to load mappings</p>';
    }
  }

  async function refreshSftpStatus() {
    document.getElementById('sftpContent').innerHTML = '<p class="text-slate-500">Loading...</p>';
    try {
      const res = await fetch('/sftp/status');
      const data = await res.json();
      document.getElementById('sftpContent').innerHTML = \`
        <div class="text-sm">
          <p><strong>Status:</strong> \${data.connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
          <p><strong>Host:</strong> \${data.host || 'N/A'}</p>
          <p><strong>Files in Inbox:</strong> \${data.inboxCount || 0}</p>
        </div>
      \`;
    } catch (e) {
      document.getElementById('sftpContent').innerHTML = '<p class="text-red-500">Failed to check SFTP status</p>';
    }
  }

</script>
</body>
</html>
`;

module.exports = dashboardHTML;
