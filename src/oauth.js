const axios = require('axios');
const logger = require('./logger');
const { pool } = require('./db');

function setupOAuthRoutes(app) {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const redirectUri = process.env.ZOHO_REDIRECT_URI || 'http://localhost:3000/oauth/callback';
  const accountsUrl = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';

  // Step 1: Start OAuth flow
  app.get('/oauth/start', (req, res) => {
    if (!clientId) {
      return res.status(500).send(`
        <h1>Zoho OAuth Not Configured</h1>
        <p>Please set the following environment variables:</p>
        <ul>
          <li>ZOHO_CLIENT_ID</li>
          <li>ZOHO_CLIENT_SECRET</li>
          <li>ZOHO_REDIRECT_URI (optional, defaults to http://localhost:3000/oauth/callback)</li>
        </ul>
        <h2>How to get these:</h2>
        <ol>
          <li>Go to <a href="https://api-console.zoho.com/" target="_blank">Zoho API Console</a></li>
          <li>Create a new "Server-based Applications" client</li>
          <li>Set Redirect URI to: <code>${redirectUri}</code></li>
          <li>Copy the Client ID and Client Secret</li>
        </ol>
      `);
    }

    // Scopes needed for CRM and Books access
    const scopes = [
      'ZohoCRM.modules.ALL',
      'ZohoCRM.settings.ALL',
      'ZohoCRM.settings.modules.ALL',
      'ZohoCRM.users.READ',
      'ZohoCRM.coql.READ',
      'ZohoCRM.bulk.ALL',
      'ZohoCRM.org.READ',
      'ZohoBooks.fullaccess.all',
      'ZohoInventory.fullaccess.all'
    ].join(',');

    const authUrl = `${accountsUrl}/oauth/v2/auth?` +
      `scope=${scopes}` +
      `&client_id=${clientId}` +
      `&response_type=code` +
      `&access_type=offline` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&prompt=consent`;

    logger.info('Redirecting to Zoho OAuth', { url: authUrl });
    res.redirect(authUrl);
  });

  // Step 2: Handle OAuth callback
  app.get('/oauth/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
      logger.error('OAuth error', { error });
      return res.status(400).send(`
        <h1>Authorization Failed</h1>
        <p>Error: ${error}</p>
        <a href="/oauth/start">Try Again</a>
      `);
    }

    if (!code) {
      return res.status(400).send('No authorization code received');
    }

    try {
      // Exchange code for tokens
      const response = await axios.post(`${accountsUrl}/oauth/v2/token`, null, {
        params: {
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        }
      });

      const { access_token, refresh_token, expires_in } = response.data;

      if (!refresh_token) {
        throw new Error('No refresh token received. Make sure access_type=offline and prompt=consent');
      }

      const expiresAt = new Date(Date.now() + (expires_in * 1000));

      // Save tokens to database
      await pool.query(
        `INSERT INTO zoho_tokens (access_token, refresh_token, expires_at)
         VALUES ($1, $2, $3)`,
        [access_token, refresh_token, expiresAt]
      );

      logger.info('Zoho OAuth successful', { expiresAt });

      res.send(`
        <h1>✅ Authorization Successful!</h1>
        <p>Zoho CRM is now connected.</p>
        <p>Refresh Token has been saved securely.</p>
        <h2>Next Steps:</h2>
        <ol>
          <li>The integration is now ready to process EDI orders</li>
          <li>Orders will be checked every 15 minutes (configurable)</li>
          <li><a href="/status">View Status</a></li>
          <li><a href="/orders">View Recent Orders</a></li>
        </ol>
        <h2>Manual Trigger:</h2>
        <p>To process orders now: <code>POST /process</code></p>
        
        <h2>For Backup - Save This Refresh Token:</h2>
        <textarea readonly style="width:100%;height:60px;font-family:monospace">${refresh_token}</textarea>
        <p><small>Add this to your Railway environment as ZOHO_REFRESH_TOKEN for backup</small></p>
      `);

    } catch (error) {
      logger.error('Token exchange failed', { 
        error: error.response?.data || error.message 
      });
      res.status(500).send(`
        <h1>Token Exchange Failed</h1>
        <p>Error: ${error.response?.data?.error || error.message}</p>
        <a href="/oauth/start">Try Again</a>
      `);
    }
  });

  // Check token status
  app.get('/oauth/status', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT expires_at, created_at FROM zoho_tokens ORDER BY id DESC LIMIT 1'
      );

      if (result.rows.length === 0) {
        return res.json({ 
          status: 'not_authorized',
          message: 'No Zoho tokens found. Visit /oauth/start to authorize.'
        });
      }

      const token = result.rows[0];
      const expiresAt = new Date(token.expires_at);
      const isExpired = expiresAt < new Date();

      res.json({
        status: isExpired ? 'expired' : 'valid',
        expiresAt: expiresAt.toISOString(),
        createdAt: token.created_at,
        message: isExpired 
          ? 'Token expired but will auto-refresh on next API call'
          : 'Token is valid'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = { setupOAuthRoutes };
