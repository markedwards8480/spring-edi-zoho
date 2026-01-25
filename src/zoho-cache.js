// Zoho Drafts Cache Module
// Caches Zoho draft sales orders to reduce API calls

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
  async refreshCache(zohoClient) {
    const startTime = Date.now();
    logger.info('Starting Zoho drafts cache refresh');

    try {
      // Get all draft orders from Zoho
      const drafts = await zohoClient.getDraftSalesOrders();
      logger.info('Fetched draft list from Zoho', { count: drafts.length });

      // Get details for each draft (includes line items)
      const draftDetails = [];
      for (const draft of drafts) {
        try {
          const details = await zohoClient.getSalesOrderDetails(draft.salesorder_id);
          draftDetails.push(details);
        } catch (error) {
          logger.warn('Failed to get draft details', { 
            draftId: draft.salesorder_id, 
            error: error.message 
          });
        }
      }

      // Clear old cache and insert new data
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        // Delete all existing cached drafts
        await client.query('DELETE FROM zoho_drafts_cache');

        // Insert new drafts
        for (const draft of draftDetails) {
          const lineItems = draft.line_items || [];
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
            draft.salesorder_id,
            draft.salesorder_number,
            draft.customer_id,
            draft.customer_name,
            draft.reference_number || null,
            draft.status,
            parseFloat(draft.total) || 0,
            draft.shipment_date || null,
            draft.date || null,
            JSON.stringify(lineItems),
            lineItems.length,
            totalUnits,
            JSON.stringify(draft)
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
        `, [draftDetails.length, duration]);

        await client.query('COMMIT');

        logger.info('Zoho drafts cache refreshed', { 
          draftsCount: draftDetails.length,
          durationMs: duration 
        });

        return {
          success: true,
          draftsCount: draftDetails.length,
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

      logger.error('Failed to refresh Zoho drafts cache', { error: error.message });
      throw error;
    }
  }

  // Get all cached drafts
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
          total_units
        FROM zoho_drafts_cache
        ORDER BY salesorder_number DESC
      `);

      // Parse line_items JSON
      return result.rows.map(row => ({
        ...row,
        line_items: row.line_items || []
      }));

    } catch (error) {
      logger.error('Failed to get cached drafts', { error: error.message });
      return [];
    }
  }

  // Get a single cached draft by ID
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
      logger.error('Failed to get cached draft', { error: error.message, salesorderId });
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
        isStale: !row.last_refresh || secondsSinceRefresh > 1800, // Stale if > 30 min
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

  // Remove a draft from cache (after it's been processed)
  async removeDraft(salesorderId) {
    try {
      await this.pool.query(`
        DELETE FROM zoho_drafts_cache 
        WHERE zoho_salesorder_id = $1
      `, [salesorderId]);
      return true;
    } catch (error) {
      logger.error('Failed to remove draft from cache', { error: error.message, salesorderId });
      return false;
    }
  }

  // Update drafts_count in metadata (for after removing drafts)
  async updateDraftsCount() {
    try {
      const countResult = await this.pool.query('SELECT COUNT(*) as count FROM zoho_drafts_cache');
      await this.pool.query(`
        UPDATE zoho_cache_metadata 
        SET drafts_count = $1, updated_at = NOW()
        WHERE cache_type = 'drafts'
      `, [parseInt(countResult.rows[0].count)]);
    } catch (error) {
      logger.error('Failed to update drafts count', { error: error.message });
    }
  }
}

module.exports = ZohoDraftsCache;
