require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const { initDatabase } = require('./db');
const { processEDIOrders } = require('./processor');
const { setupOAuthRoutes } = require('./oauth');
const logger = require('./logger');
const dashboardHTML = require('./dashboard');

const app = express();
app.use(express.json());

// Serve dashboard
app.get('/', (req, res) => {
  res.send(dashboardHTML);
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// OAuth routes for Zoho authorization
setupOAuthRoutes(app);

// Manual trigger endpoint
app.post('/process', async (req, res) => {
  try {
    logger.info('Manual processing triggered');
    const result = await processEDIOrders();
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Manual processing failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Status endpoint
app.get('/status', async (req, res) => {
  const { pool } = require('./db');
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'processed') as processed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
      FROM edi_orders
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    res.json({ 
      last24Hours: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recent orders endpoint
app.get('/orders', async (req, res) => {
  const { pool } = require('./db');
  try {
    const result = await pool.query(`
      SELECT id, filename, edi_order_number, status, zoho_so_id, error_message, created_at
      FROM edi_orders
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retry failed orders endpoint
app.post('/retry-failed', async (req, res) => {
  const { pool } = require('./db');
  try {
    const result = await pool.query(`
      UPDATE edi_orders 
      SET status = 'pending', error_message = NULL 
      WHERE status = 'failed'
      RETURNING id
    `);
    logger.info('Reset failed orders to pending', { count: result.rowCount });
    res.json({ success: true, count: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    logger.info('Database initialized');

    // Start the scheduled job
    const schedule = process.env.CRON_SCHEDULE || '*/15 * * * *';
    cron.schedule(schedule, async () => {
      logger.info('Scheduled job triggered');
      try {
        await processEDIOrders();
      } catch (error) {
        logger.error('Scheduled processing failed', { error: error.message });
      }
    });
    logger.info(`Cron job scheduled: ${schedule}`);

    // Start Express server
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info('OAuth setup: Visit /oauth/start to authorize with Zoho');
    });

  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();
