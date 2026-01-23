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
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a7f 100%); color: white; padding: 1.5rem 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 1.5rem; font-weight: 600; display: flex; align-items: center; gap: 0.75rem; }
    .header-logo { width: 36px; height: 36px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #1e3a5f; font-size: 0.875rem; }
    .header-status { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; opacity: 0.9; }
    .status-dot { width: 8px; height: 8px; background: #34c759; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: white; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); transition: transform 0.2s, box-shadow 0.2s; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
    .stat-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; margin-bottom: 0.25rem; }
    .stat-value { font-size: 1.75rem; font-weight: 700; color: #1e3a5f; }
    .stat-card.success .stat-value { color: #34c759; }
    .stat-card.error .stat-value { color: #ff3b30; }
    .stat-card.pending .stat-value { color: #ff9500; }
    .section { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 1.5rem; overflow: hidden; }
    .section-header { padding: 1rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; }
    .section-title { font-size: 1rem; font-weight: 600; }
    .section-body { padding: 1.5rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.15s; border: none; }
    .btn-primary { background: #1e3a5f; color: white; }
    .btn-primary:hover { background: #2d5a7f; }
    .btn-primary:disabled { background: #86868b; cursor: not-allowed; }
    .btn-secondary { background: white; color: #1e3a5f; border: 1px solid #d2d2d7; }
    .btn-secondary:hover { background: #f5f5f7; }
    .btn-success { background: #34c759; color: white; }
    .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.7rem; }
    .actions-bar { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    .orders-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    .orders-table th { text-align: left; padding: 0.5rem; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; font-weight: 600; border-bottom: 1px solid rgba(0,0,0,0.06); white-space: nowrap; }
    .orders-table td { padding: 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.06); vertical-align: middle; }
    .orders-table tr:last-child td { border-bottom: none; }
    .orders-table tr:hover { background: #f5f5f7; }
    .badge { display: inline-flex; align-items: center; padding: 0.2rem 0.5rem; border-radius: 980px; font-size: 0.65rem; font-weight: 500; }
    .badge-success { background: rgba(52, 199, 89, 0.1); color: #34c759; }
    .badge-error { background: rgba(255, 59, 48, 0.1); color: #ff3b30; }
    .badge-pending { background: rgba(255, 149, 0, 0.1); color: #ff9500; }
    .badge-info { background: rgba(0, 136, 194, 0.1); color: #0088c2; }
    .empty-state { text-align: center; padding: 3rem 1.5rem; color: #86868b; }
    .empty-state-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; }
    .empty-state-text { font-size: 0.875rem; }
    .connection-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .connection-item { background: #f5f5f7; border-radius: 8px; padding: 0.75rem; }
    .connection-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; margin-bottom: 0.25rem; }
    .connection-value { font-size: 0.8rem; font-weight: 500; display: flex; align-items: center; gap: 0.5rem; }
    .connection-value .check { color: #34c759; }
    .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .toast { position: fixed; bottom: 2rem; right: 2rem; background: #1e3a5f; color: white; padding: 1rem 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: none; align-items: center; gap: 0.75rem; font-size: 0.875rem; z-index: 1000; }
    .toast.show { display: flex; animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .customer-cell { display: flex; flex-direction: column; gap: 0.25rem; }
    .edi-customer { font-weight: 500; color: #1e3a5f; }
    .zoho-customer { font-size: 0.7rem; color: #86868b; display: flex; align-items: center; gap: 0.25rem; }
    .zoho-customer.confirmed { color: #34c759; }
    .zoho-customer.suggested { color: #ff9500; }
    .match-score { font-size: 0.6rem; background: #f5f5f7; padding: 0.1rem 0.3rem; border-radius: 4px; }
    select.customer-select { font-size: 0.7rem; padding: 0.25rem; border: 1px solid #d2d2d7; border-radius: 4px; max-width: 150px; }
    .tabs { display: flex; gap: 0; border-bottom: 1px solid rgba(0,0,0,0.06); margin-bottom: 1rem; }
    .tab { padding: 0.75rem 1.5rem; cursor: pointer; font-size: 0.875rem; font-weight: 500; color: #86868b; border-bottom: 2px solid transparent; margin-bottom: -1px; }
    .tab.active { color: #1e3a5f; border-bottom-color: #1e3a5f; }
    .tab:hover { color: #1e3a5f; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .mapping-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f5f5f7; border-radius: 8px; margin-bottom: 0.5rem; }
    .mapping-info { display: flex; align-items: center; gap: 1rem; }
    .mapping-arrow { color: #86868b; }
    @media (max-width: 768px) {
      .header-content { flex-direction: column; gap: 1rem; text-align: center; }
      .container { padding: 1rem; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .orders-table { font-size: 0.7rem; }
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
      <div class="section-header"><h2 class="section-title">Actions</h2></div>
      <div class="section-body">
        <div class="actions-bar">
          <button class="btn btn-primary" id="btn-process" onclick="triggerProcessLimit()">Process Orders</button>
          <select id="process-limit" class="btn btn-secondary" style="padding: 0.4rem 0.75rem;">
            <option value="1">1</option>
            <option value="5">5</option>
            <option value="10" selected>10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="9999">All</option>
          </select>
          <button class="btn btn-primary" id="btn-process-selected" onclick="processSelected()">Process Selected</button>
          <button class="btn btn-secondary" onclick="retryFailed()">Retry Failed</button>
          <button class="btn btn-secondary" onclick="refreshData()">Refresh</button>
          <button class="btn btn-secondary" onclick="suggestAllMappings()">Auto-Match Customers</button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header"><h2 class="section-title">Connection Status</h2></div>
      <div class="section-body">
        <div class="connection-grid">
          <div class="connection-item"><div class="connection-label">SFTP Server</div><div class="connection-value"><span class="check">✓</span>sftp.springsystems.com</div></div>
          <div class="connection-item"><div class="connection-label">Zoho CRM</div><div class="connection-value"><span class="check">✓</span>Connected</div></div>
          <div class="connection-item"><div class="connection-label">Schedule</div><div class="connection-value">Every 15 minutes</div></div>
          <div class="connection-item"><div class="connection-label">Last Check</div><div class="connection-value" id="last-check">-</div></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="tabs">
        <div class="tab active" onclick="switchTab('orders')">Orders</div>
        <div class="tab" onclick="switchTab('mappings')">Customer Mappings</div>
      </div>
      
      <div id="tab-orders" class="tab-content active">
        <div id="orders-container">
          <div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">No orders yet.</div></div>
        </div>
      </div>
      
      <div id="tab-mappings" class="tab-content">
        <div class="section-body">
          <div id="mappings-container">
            <div class="empty-state"><div class="empty-state-text">No customer mappings saved yet.</div></div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <div class="toast" id="toast"><span id="toast-message">Processing...</span></div>

  <script>
    let zohoAccounts = [];
    
    document.addEventListener('DOMContentLoaded', () => {
      refreshData();
      loadZohoAccounts();
    });

    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.querySelector(\`.tab[onclick="switchTab('\${tab}')"]\`).classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
      
      if (tab === 'mappings') loadMappings();
    }

    async function loadZohoAccounts() {
      try {
        const res = await fetch('/zoho-accounts');
        zohoAccounts = await res.json();
      } catch (e) {
        console.error('Failed to load Zoho accounts', e);
      }
    }

    async function refreshData() {
      try {
        const statusRes = await fetch('/status');
        const status = await statusRes.json();
        document.getElementById('stat-total').textContent = status.last24Hours?.total || '0';
        document.getElementById('stat-processed').textContent = status.last24Hours?.processed || '0';
        document.getElementById('stat-pending').textContent = status.last24Hours?.pending || '0';
        document.getElementById('stat-failed').textContent = status.last24Hours?.failed || '0';
        document.getElementById('last-check').textContent = new Date(status.timestamp).toLocaleString();

        const ordersRes = await fetch('/orders');
        const orders = await ordersRes.json();
        renderOrders(orders);
      } catch (error) {
        console.error('Error:', error);
        showToast('Error loading data');
      }
    }

    function renderOrders(orders) {
      const container = document.getElementById('orders-container');
      if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">No orders yet.</div></div>';
        return;
      }

      const accountOptions = zohoAccounts.map(a => '<option value="' + a.id + '">' + (a.Account_Name || '').substring(0, 30) + '</option>').join('');

      container.innerHTML = \`
        <table class="orders-table">
          <thead>
            <tr>
              <th><input type="checkbox" id="select-all" onclick="toggleSelectAll(this)"></th>
              <th>PO #</th>
              <th>EDI Customer → Zoho Account</th>
              <th>Status</th>
              <th>Zoho SO</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            \${orders.map(order => {
              const canSelect = order.status === 'pending' || order.status === 'failed';
              const ediCustomer = order.edi_customer_name || order.parsed_data?.parties?.buyer?.name || order.parsed_data?.header?.retailerName || '-';
              const suggestedAccount = order.suggested_zoho_account_name || '';
              const isConfirmed = order.mapping_confirmed;
              
              return \`
              <tr data-id="\${order.id}" data-edi-customer="\${ediCustomer}">
                <td><input type="checkbox" class="order-checkbox" value="\${order.id}" \${!canSelect ? 'disabled' : ''}></td>
                <td><strong>\${order.edi_order_number || '-'}</strong></td>
                <td class="customer-cell">
                  <span class="edi-customer">\${ediCustomer}</span>
                  <span class="zoho-customer \${isConfirmed ? 'confirmed' : 'suggested'}">
                    → \${suggestedAccount || '<em>Not matched</em>'}
                    \${isConfirmed ? ' ✓' : ''}
                  </span>
                </td>
                <td><span class="badge badge-\${order.status === 'processed' ? 'success' : order.status === 'failed' ? 'error' : 'pending'}">\${order.status}</span></td>
                <td>\${order.zoho_so_id || '-'}</td>
                <td>\${order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}</td>
                <td>
                  \${canSelect ? \`
                    <select class="customer-select" onchange="updateMapping(\${order.id}, this.value, this.options[this.selectedIndex].text)">
                      <option value="">Select account...</option>
                      \${accountOptions}
                    </select>
                  \` : ''}
                </td>
              </tr>\`;
            }).join('')}
          </tbody>
        </table>
      \`;
    }

    async function loadMappings() {
      try {
        const res = await fetch('/customer-mappings');
        const mappings = await res.json();
        renderMappings(mappings);
      } catch (e) {
        console.error('Failed to load mappings', e);
      }
    }

    function renderMappings(mappings) {
      const container = document.getElementById('mappings-container');
      if (!mappings || mappings.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-text">No customer mappings saved yet. Match customers in the Orders tab and they will appear here.</div></div>';
        return;
      }

      container.innerHTML = mappings.map(m => \`
        <div class="mapping-row">
          <div class="mapping-info">
            <strong>\${m.edi_customer_name}</strong>
            <span class="mapping-arrow">→</span>
            <span>\${m.zoho_account_name}</span>
            \${m.confirmed ? '<span class="badge badge-success">Confirmed</span>' : '<span class="badge badge-info">Auto</span>'}
          </div>
          <button class="btn btn-sm btn-secondary" onclick="deleteMapping(\${m.id})">Delete</button>
        </div>
      \`).join('');
    }

    async function updateMapping(orderId, zohoAccountId, zohoAccountName) {
      if (!zohoAccountId) return;
      
      showToast('Saving mapping...');
      try {
        const res = await fetch('/update-order-mapping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, zohoAccountId, zohoAccountName, saveForFuture: true })
        });
        const result = await res.json();
        if (result.success) {
          showToast('Mapping saved!');
          refreshData();
        }
      } catch (e) {
        showToast('Error: ' + e.message);
      }
    }

    async function deleteMapping(id) {
      if (!confirm('Delete this mapping?')) return;
      try {
        await fetch('/customer-mappings/' + id, { method: 'DELETE' });
        loadMappings();
        showToast('Mapping deleted');
      } catch (e) {
        showToast('Error: ' + e.message);
      }
    }

    async function suggestAllMappings() {
      showToast('Auto-matching customers...');
      try {
        const ordersRes = await fetch('/orders');
        const orders = await ordersRes.json();
        
        const unmapped = orders.filter(o => !o.mapping_confirmed && o.status !== 'processed');
        let matched = 0;
        
        for (const order of unmapped.slice(0, 20)) {
          const ediCustomer = order.edi_customer_name || order.parsed_data?.parties?.buyer?.name;
          if (!ediCustomer) continue;
          
          const res = await fetch('/suggest-mapping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ediCustomerName: ediCustomer })
          });
          const result = await res.json();
          
          if (result.mapping && result.mapping.zoho_account_id) {
            await fetch('/update-order-mapping', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: order.id,
                zohoAccountId: result.mapping.zoho_account_id,
                zohoAccountName: result.mapping.zoho_account_name,
                saveForFuture: result.source === 'saved'
              })
            });
            matched++;
          }
        }
        
        showToast(\`Matched \${matched} customers\`);
        refreshData();
      } catch (e) {
        showToast('Error: ' + e.message);
      }
    }

    function toggleSelectAll(checkbox) {
      document.querySelectorAll('.order-checkbox:not(:disabled)').forEach(cb => cb.checked = checkbox.checked);
    }

    function getSelectedOrderIds() {
      return Array.from(document.querySelectorAll('.order-checkbox:checked')).map(cb => parseInt(cb.value));
    }

    async function triggerProcessLimit() {
      const btn = document.getElementById('btn-process');
      const limit = document.getElementById('process-limit').value;
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner"></div>';
      showToast('Processing...');

      try {
        const res = await fetch('/process-limit', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: parseInt(limit) })
        });
        const result = await res.json();
        showToast(\`Done! Processed: \${result.processed}, Failed: \${result.failed}\`);
        setTimeout(refreshData, 1000);
      } catch (error) {
        showToast('Error: ' + error.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Process Orders';
      }
    }

    async function processSelected() {
      const selectedIds = getSelectedOrderIds();
      if (selectedIds.length === 0) { showToast('Select at least one order'); return; }
      
      const btn = document.getElementById('btn-process-selected');
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner"></div>';
      showToast(\`Processing \${selectedIds.length} orders...\`);

      try {
        const res = await fetch('/process-selected', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: selectedIds })
        });
        const result = await res.json();
        showToast(\`Done! Processed: \${result.processed}, Failed: \${result.failed}\`);
        setTimeout(refreshData, 1000);
      } catch (error) {
        showToast('Error: ' + error.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Process Selected';
      }
    }

    async function retryFailed() {
      showToast('Resetting failed orders...');
      try {
        const res = await fetch('/retry-failed', { method: 'POST' });
        const result = await res.json();
        showToast(\`Reset \${result.count} orders to pending\`);
        setTimeout(refreshData, 500);
      } catch (error) {
        showToast('Error: ' + error.message);
      }
    }

    function showToast(message) {
      const toast = document.getElementById('toast');
      document.getElementById('toast-message').textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 4000);
    }
  </script>
</body>
</html>
`;

module.exports = dashboardHTML;
