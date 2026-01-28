// Zoho Drafts Cache Module
// Caches Zoho draft AND confirmed sales orders to reduce API calls
// Updated: Now includes confirmed orders for matching revised EDI 850s

const logger = require('./logger');

class ZohoDraftsCache {
  constructor(pool) {
    this.pool = pool;
  }

  // Initialize the cache table
  async initialize() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS zoho_drafts_cache (
          id SERIAL PRIMARY KEY,
          
          -- Zoho identifiers
          zoho_salesorder_id VARCHAR(100) UNIQUE NOT NULL,
          salesorder_number VARCHAR(100),
          
          -- Customer info
          customer_id VARCHAR(100),
          customer_name VARCHAR(255),
          
          -- Order info
          reference_number VARCHAR(100),
          status VARCHAR(50),
          total DECIMAL(12,2),
          shipment_date DATE,
          order_date DATE,
          
          -- Line items (stored as JSON for flexibility)
          line_items JSONB,
          item_count INTEGER DEFAULT 0,
          total_units INTEGER DEFAULT 0,
          
          -- Full raw data from Zoho
          raw_data JSONB,
          
          -- Timestamps
          fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Indexes for fast lookups
        CREATE INDEX IF NOT EXISTS idx_zoho_cache_salesorder_id ON zoho_drafts_cache(zoho_salesorder_id);
        CREATE INDEX IF NOT EXISTS idx_zoho_cache_customer_name ON zoho_drafts_cache(customer_name);
        CREATE INDEX IF NOT EXISTS idx_zoho_cache_reference ON zoho_drafts_cache(reference_number);
        CREATE INDEX IF NOT EXISTS idx_zoho_cache_status ON zoho_drafts_cache(status);
        CREATE INDEX IF NOT EXISTS idx_zoho_cache_fetched ON zoho_drafts_cache(fetched_at);
      `);

      // Cache metadata table
      await client.query(`
        CREATE TABLE IF NOT EXISTS zoho_cache_metadata (
          id SERIAL PRIMARY KEY,
          cache_type VARCHAR(50) UNIQUE NOT NULL,
          last_refresh TIMESTAMP WITH TIME ZONE,
          refresh_count INTEGER DEFAULT 0,
          last_error TEXT,
          drafts_count INTEGER DEFAULT 0,
          refresh_duration_ms INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Initialize metadata row for drafts
        INSERT INTO zoho_cache_metadata (cache_type, last_refresh, drafts_count)
        VALUES ('drafts', NULL, 0)
        ON CONFLICT (cache_type) DO NOTHING;
      `);

      logger.info('Zoho drafts cache tables initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Zoho cache tables', { error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }

  // Refresh the cache from Zoho
  // Now fetches BOTH draft AND confirmed orders for matching revised EDI 850s
  async refreshCache(zohoClient) {
    const startTime = Date.now();
    logger.info('Starting Zoho orders cache refresh (drafts + confirmed)');

    try {
      // Get draft orders from Zoho
      const drafts = await zohoClient.getDraftSalesOrders();
      logger.info('Fetched draft orders from Zoho', { count: drafts.length });

      // Get confirmed orders from Zoho (for matching revised 850s)
      const confirmed = await zohoClient.getConfirmedSalesOrders();
      logger.info('Fetched confirmed orders from Zoho', { count: confirmed.length });

      // Combine both lists
      const allOrders = [...drafts, ...confirmed];
      logger.info('Total orders to cache', { 
        drafts: drafts.length, 
        confirmed: confirmed.length, 
        total: allOrders.length 
      });

      // Get details for each order (includes line items)
      const orderDetails = [];
      for (const order of allOrders) {
        try {
          const details = await zohoClient.getSalesOrderDetails(order.salesorder_id);
          orderDetails.push(details);
        } catch (error) {
          logger.warn('Failed to get order details', { 
            orderId: order.salesorder_id, 
            status: order.status,
            error: error.message 
          });
        }
      }

      // Log custom fields from first order to help debug cancel date field name
      if (orderDetails.length > 0) {
        const sampleOrder = orderDetails[0];
        const customFieldKeys = Object.keys(sampleOrder).filter(k => k.startsWith('cf_') || k.includes('custom'));
        logger.info('Zoho order custom field keys found', {
          sampleOrderId: sampleOrder.salesorder_id,
          customFieldKeys,
          cf_cancel_date: sampleOrder.cf_cancel_date,
          custom_field_hash: sampleOrder.custom_field_hash,
          custom_fields: sampleOrder.custom_fields
        });
      }

      // Clear old cache and insert new data
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        // Delete all existing cached orders
        await client.query('DELETE FROM zoho_drafts_cache');

        // Insert all orders (drafts + confirmed)
        for (const order of orderDetails) {
          const lineItems = order.line_items || [];
          const totalUnits = lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

          await client.query(`
            INSERT INTO zoho_drafts_cache (
              zoho_salesorder_id, salesorder_number,
              customer_id, customer_name,
              reference_number, status, total, shipment_date, order_date,
              line_items, item_count, total_units,
              raw_data, fetched_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          `, [
            order.salesorder_id,
            order.salesorder_number,
            order.customer_id,
            order.customer_name,
            order.reference_number || null,
            order.status,
            parseFloat(order.total) || 0,
            order.shipment_date || null,
            order.date || null,
            JSON.stringify(lineItems),
            lineItems.length,
            totalUnits,
            JSON.stringify(order)
          ]);
        }

        // Update metadata
        const duration = Date.now() - startTime;
        await client.query(`
          UPDATE zoho_cache_metadata 
          SET last_refresh = NOW(), 
              refresh_count = refresh_count + 1,
              drafts_count = $1,
              refresh_duration_ms = $2,
              last_error = NULL,
              updated_at = NOW()
          WHERE cache_type = 'drafts'
        `, [orderDetails.length, duration]);

        await client.query('COMMIT');

        logger.info('Zoho orders cache refreshed', { 
          totalCount: orderDetails.length,
          draftsCount: drafts.length,
          confirmedCount: confirmed.length,
          durationMs: duration 
        });

        return {
          success: true,
          draftsCount: orderDetails.length,
          durationMs: duration
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      // Log the error in metadata
      try {
        await this.pool.query(`
          UPDATE zoho_cache_metadata 
          SET last_error = $1, updated_at = NOW()
          WHERE cache_type = 'drafts'
        `, [error.message]);
      } catch (e) { /* ignore */ }

      logger.error('Failed to refresh Zoho orders cache', { error: error.message });
      throw error;
    }
  }

  // Get all cached orders (drafts + confirmed)
  async getCachedDrafts() {
    try {
      const result = await this.pool.query(`
        SELECT
          zoho_salesorder_id as salesorder_id,
          salesorder_number,
          customer_id,
          customer_name,
          reference_number,
          status,
          total,
          shipment_date,
          order_date as date,
          line_items,
          item_count,
          total_units,
          raw_data
        FROM zoho_drafts_cache
        ORDER BY salesorder_number DESC
      `);

      // Parse line_items JSON and merge with raw_data for custom fields
      return result.rows.map(row => {
        const rawData = row.raw_data || {};
        return {
          ...row,
          line_items: row.line_items || [],
          // Include custom fields from raw_data for cancel date etc.
          cf_cancel_date: rawData.cf_cancel_date,
          custom_field_hash: rawData.custom_field_hash,
          custom_fields: rawData.custom_fields
        };
      });

    } catch (error) {
      logger.error('Failed to get cached orders', { error: error.message });
      return [];
    }
  }

  // Get a single cached order by ID
  async getCachedDraft(salesorderId) {
    try {
      const result = await this.pool.query(`
        SELECT raw_data FROM zoho_drafts_cache 
        WHERE zoho_salesorder_id = $1
      `, [salesorderId]);

      if (result.rows.length > 0) {
        return result.rows[0].raw_data;
      }
      return null;
    } catch (error) {
      logger.error('Failed to get cached order', { error: error.message, salesorderId });
      return null;
    }
  }

  // Get cache status/metadata
  async getCacheStatus() {
    try {
      const result = await this.pool.query(`
        SELECT 
          last_refresh,
          refresh_count,
          drafts_count,
          refresh_duration_ms,
          last_error,
          EXTRACT(EPOCH FROM (NOW() - last_refresh)) as seconds_since_refresh
        FROM zoho_cache_metadata
        WHERE cache_type = 'drafts'
      `);

      if (result.rows.length === 0) {
        return {
          lastRefresh: null,
          refreshCount: 0,
          draftsCount: 0,
          isStale: true,
          secondsSinceRefresh: null,
          lastError: null
        };
      }

      const row = result.rows[0];
      const secondsSinceRefresh = row.seconds_since_refresh ? Math.round(row.seconds_since_refresh) : null;
      
      return {
        lastRefresh: row.last_refresh,
        refreshCount: row.refresh_count,
        draftsCount: row.drafts_count,
        refreshDurationMs: row.refresh_duration_ms,
        lastError: row.last_error,
        secondsSinceRefresh: secondsSinceRefresh,
        isStale: !row.last_refresh || secondsSinceRefresh > 900, // Stale if > 15 min
        minutesSinceRefresh: secondsSinceRefresh ? Math.round(secondsSinceRefresh / 60) : null
      };

    } catch (error) {
      logger.error('Failed to get cache status', { error: error.message });
      return {
        lastRefresh: null,
        refreshCount: 0,
        draftsCount: 0,
        isStale: true,
        error: error.message
      };
    }
  }

  // Check if cache needs refresh (older than X minutes)
  async needsRefresh(maxAgeMinutes = 30) {
    const status = await this.getCacheStatus();
    if (!status.lastRefresh) return true;
    return status.minutesSinceRefresh > maxAgeMinutes;
  }

  // Remove an order from cache (after it's been processed)
  async removeDraft(salesorderId) {
    try {
      await this.pool.query(`
        DELETE FROM zoho_drafts_cache 
        WHERE zoho_salesorder_id = $1
      `, [salesorderId]);
      return true;
    } catch (error) {
      logger.error('Failed to remove order from cache', { error: error.message, salesorderId });
      return false;
    }
  }

  // Update drafts_count in metadata (for after removing orders)
  async updateDraftsCount() {
    try {
      const countResult = await this.pool.query('SELECT COUNT(*) as count FROM zoho_drafts_cache');
      await this.pool.query(`
        UPDATE zoho_cache_metadata 
        SET drafts_count = $1, updated_at = NOW()
        WHERE cache_type = 'drafts'
      `, [parseInt(countResult.rows[0].count)]);
    } catch (error) {
      logger.error('Failed to update orders count', { error: error.message });
    }
  }
}

module.exports = ZohoDraftsCache;
