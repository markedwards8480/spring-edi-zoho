const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spring EDI Integration - Mark Edwards Apparel</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f7;
      color: #1e3a5f;
      min-height: 100vh;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a7f 100%);
      color: white;
      padding: 1.5rem 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .header-logo {
      width: 36px;
      height: 36px;
      background: white;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #1e3a5f;
      font-size: 0.875rem;
    }

    .header-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      opacity: 0.9;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      background: #34c759;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Main Container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }

    .stat-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #86868b;
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #1e3a5f;
    }

    .stat-card.success .stat-value { color: #34c759; }
    .stat-card.error .stat-value { color: #ff3b30; }
    .stat-card.pending .stat-value { color: #ff9500; }

    /* Section */
    .section {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      margin-bottom: 1.5rem;
      overflow: hidden;
    }

    .section-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(0,0,0,0.06);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-title {
      font-size: 1rem;
      font-weight: 600;
    }

    .section-body {
      padding: 1.5rem;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      border: none;
    }

    .btn-primary {
      background: #1e3a5f;
      color: white;
    }

    .btn-primary:hover {
      background: #2d5a7f;
    }

    .btn-primary:disabled {
      background: #86868b;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: white;
      color: #1e3a5f;
      border: 1px solid #d2d2d7;
    }

    .btn-secondary:hover {
      background: #f5f5f7;
    }

    /* Orders Table */
    .orders-table {
      width: 100%;
      border-collapse: collapse;
    }

    .orders-table th {
      text-align: left;
      padding: 0.75rem 1rem;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #86868b;
      font-weight: 600;
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }

    .orders-table td {
      padding: 1rem;
      font-size: 0.875rem;
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }

    .orders-table tr:last-child td {
      border-bottom: none;
    }

    .orders-table tr:hover {
      background: #f5f5f7;
    }

    /* Status Badge */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 980px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .badge-success {
      background: rgba(52, 199, 89, 0.1);
      color: #34c759;
    }

    .badge-error {
      background: rgba(255, 59, 48, 0.1);
      color: #ff3b30;
    }

    .badge-pending {
      background: rgba(255, 149, 0, 0.1);
      color: #ff9500;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 3rem 1.5rem;
      color: #86868b;
    }

    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state-text {
      font-size: 0.875rem;
    }

    /* Actions Bar */
    .actions-bar {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    /* Connection Info */
    .connection-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }

    .connection-item {
      background: #f5f5f7;
      border-radius: 8px;
      padding: 1rem;
    }

    .connection-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #86868b;
      margin-bottom: 0.25rem;
    }

    .connection-value {
      font-size: 0.875rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .connection-value .check {
      color: #34c759;
    }

    /* Loading Spinner */
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #1e3a5f;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: none;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
      z-index: 1000;
    }

    .toast.show {
      display: flex;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .container {
        padding: 1rem;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .orders-table {
        font-size: 0.8rem;
      }

      .orders-table th, .orders-table td {
        padding: 0.5rem;
      }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-content">
      <h1>
        <div class="header-logo">ME</div>
        Spring EDI Integration
      </h1>
      <div class="header-status">
        <span class="status-dot"></span>
        System Online
      </div>
    </div>
  </header>

  <main class="container">
    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Orders (24h)</div>
        <div class="stat-value" id="stat-total">-</div>
      </div>
      <div class="stat-card success">
        <div class="stat-label">Processed</div>
        <div class="stat-value" id="stat-processed">-</div>
      </div>
      <div class="stat-card pending">
        <div class="stat-label">Pending</div>
        <div class="stat-value" id="stat-pending">-</div>
      </div>
      <div class="stat-card error">
        <div class="stat-label">Failed</div>
        <div class="stat-value" id="stat-failed">-</div>
      </div>
    </div>

    <!-- Actions Section -->
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Actions</h2>
      </div>
      <div class="section-body">
        <div class="actions-bar">
          <button class="btn btn-primary" id="btn-process" onclick="triggerProcessLimit()">
            Process Orders
          </button>
          <select id="process-limit" class="btn btn-secondary" style="padding: 0.5rem 1rem;">
            <option value="1">1 Order</option>
            <option value="5">5 Orders</option>
            <option value="10" selected>10 Orders</option>
            <option value="25">25 Orders</option>
            <option value="50">50 Orders</option>
            <option value="100">100 Orders</option>
            <option value="9999">All Orders</option>
          </select>
          <button class="btn btn-primary" id="btn-process-selected" onclick="processSelected()">
            Process Selected
          </button>
          <button class="btn btn-secondary" id="btn-retry" onclick="retryFailed()">
            Retry Failed
          </button>
          <button class="btn btn-secondary" onclick="refreshData()">
            Refresh
          </button>
        </div>
      </div>
    </div>

    <!-- Connection Status -->
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Connection Status</h2>
      </div>
      <div class="section-body">
        <div class="connection-grid">
          <div class="connection-item">
            <div class="connection-label">SFTP Server</div>
            <div class="connection-value">
              <span class="check">✓</span>
              sftp.springsystems.com
            </div>
          </div>
          <div class="connection-item">
            <div class="connection-label">Zoho CRM</div>
            <div class="connection-value" id="zoho-status">
              <span class="check">✓</span>
              Connected
            </div>
          </div>
          <div class="connection-item">
            <div class="connection-label">Schedule</div>
            <div class="connection-value">
              Every 15 minutes
            </div>
          </div>
          <div class="connection-item">
            <div class="connection-label">Last Check</div>
            <div class="connection-value" id="last-check">
              -
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Orders -->
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Recent Orders</h2>
      </div>
      <div id="orders-container">
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <div class="empty-state-text">No orders processed yet.<br>Orders will appear here once EDI files are received.</div>
        </div>
      </div>
    </div>
  </main>

  <!-- Toast Notification -->
  <div class="toast" id="toast">
    <span id="toast-message">Processing...</span>
  </div>

  <script>
    // Load initial data
    document.addEventListener('DOMContentLoaded', () => {
      refreshData();
    });

    async function refreshData() {
      try {
        // Get status
        const statusRes = await fetch('/status');
        const status = await statusRes.json();
        
        document.getElementById('stat-total').textContent = status.last24Hours?.total || '0';
        document.getElementById('stat-processed').textContent = status.last24Hours?.processed || '0';
        document.getElementById('stat-pending').textContent = status.last24Hours?.pending || '0';
        document.getElementById('stat-failed').textContent = status.last24Hours?.failed || '0';
        document.getElementById('last-check').textContent = new Date(status.timestamp).toLocaleString();

        // Get orders
        const ordersRes = await fetch('/orders');
        const orders = await ordersRes.json();
        
        renderOrders(orders);
      } catch (error) {
        console.error('Error fetching data:', error);
        showToast('Error loading data');
      }
    }

    function renderOrders(orders) {
      const container = document.getElementById('orders-container');
      
      if (!orders || orders.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <div class="empty-state-text">No orders processed yet.<br>Orders will appear here once EDI files are received.</div>
          </div>
        \`;
        return;
      }

      container.innerHTML = \`
        <table class="orders-table">
          <thead>
            <tr>
              <th><input type="checkbox" id="select-all" onclick="toggleSelectAll(this)"></th>
              <th>EDI Order #</th>
              <th>Filename</th>
              <th>Status</th>
              <th>Zoho SO</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            \${orders.map(order => \`
              <tr>
                <td><input type="checkbox" class="order-checkbox" value="\${order.id}" \${order.status !== 'pending' && order.status !== 'failed' ? 'disabled' : ''}></td>
                <td><strong>\${order.edi_order_number || '-'}</strong></td>
                <td>\${order.filename || '-'}</td>
                <td>
                  <span class="badge badge-\${order.status === 'processed' ? 'success' : order.status === 'failed' ? 'error' : 'pending'}">
                    \${order.status}
                  </span>
                </td>
                <td>\${order.zoho_so_id || '-'}</td>
                <td>\${order.created_at ? new Date(order.created_at).toLocaleString() : '-'}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      \`;
    }

    function toggleSelectAll(checkbox) {
      const checkboxes = document.querySelectorAll('.order-checkbox:not(:disabled)');
      checkboxes.forEach(cb => cb.checked = checkbox.checked);
    }

    function getSelectedOrderIds() {
      const checkboxes = document.querySelectorAll('.order-checkbox:checked');
      return Array.from(checkboxes).map(cb => parseInt(cb.value));
    }

    async function processSelected() {
      const selectedIds = getSelectedOrderIds();
      
      if (selectedIds.length === 0) {
        showToast('Please select at least one order');
        return;
      }
      
      const btn = document.getElementById('btn-process-selected');
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner"></div> Processing...';
      
      showToast(\`Processing \${selectedIds.length} selected orders...\`);

      try {
        const res = await fetch('/process-selected', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: selectedIds })
        });
        const result = await res.json();
        
        if (result.success) {
          showToast(\`Done! Processed: \${result.processed}, Failed: \${result.failed}\`);
        } else {
          showToast('Error: ' + (result.error || 'Unknown error'));
        }
        
        setTimeout(refreshData, 1000);
      } catch (error) {
        showToast('Error: ' + error.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Process Selected';
      }
    }

    async function triggerProcessLimit() {
      const btn = document.getElementById('btn-process');
      const limit = document.getElementById('process-limit').value;
      
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner"></div> Processing...';
      
      showToast(\`Processing up to \${limit} orders...\`);

      try {
        const res = await fetch('/process-limit', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: parseInt(limit) })
        });
        const result = await res.json();
        
        if (result.success) {
          showToast(\`Done! Processed: \${result.processed}, Failed: \${result.failed}\`);
        } else {
          showToast('Error: ' + (result.error || 'Unknown error'));
        }
        
        setTimeout(refreshData, 1000);
      } catch (error) {
        showToast('Error: ' + error.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Process Orders';
      }
    }

    async function triggerProcess() {
      const btn = document.getElementById('btn-process');
      const originalContent = btn.innerHTML;
      
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner"></div> Processing...';
      
      showToast('Processing EDI orders...');

      try {
        const res = await fetch('/process', { method: 'POST' });
        const result = await res.json();
        
        if (result.success) {
          showToast(\`Done! Files: \${result.result?.filesProcessed || 0}, Orders: \${result.result?.ordersCreated || 0}\`);
        } else {
          showToast('Error: ' + (result.error || 'Unknown error'));
        }
        
        // Refresh data
        setTimeout(refreshData, 1000);
      } catch (error) {
        showToast('Error: ' + error.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
      }
    }

    async function retryFailed() {
      showToast('Resetting failed orders...');
      try {
        const res = await fetch('/retry-failed', { method: 'POST' });
        const result = await res.json();
        
        if (result.success) {
          showToast(\`Reset \${result.count} failed orders to pending\`);
          setTimeout(refreshData, 500);
        } else {
          showToast('Error: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        showToast('Error: ' + error.message);
      }
    }

    function showToast(message) {
      const toast = document.getElementById('toast');
      const toastMessage = document.getElementById('toast-message');
      
      toastMessage.textContent = message;
      toast.classList.add('show');
      
      setTimeout(() => {
        toast.classList.remove('show');
      }, 4000);
    }
  </script>
</body>
</html>
`;

module.exports = dashboardHTML;
