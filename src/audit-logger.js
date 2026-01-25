// Audit Logger Module - Bulletproof Activity Tracking
// This module handles all audit logging for the EDI-to-Zoho integration

const { Pool } = require('pg');

// Action types - all possible actions we track
const ACTIONS = {
  // Order lifecycle
  ORDER_IMPORTED: 'order_imported',
  ORDER_DUPLICATE_SKIPPED: 'order_duplicate_skipped',
  
  // Matching
  MATCH_SEARCH_STARTED: 'match_search_started',
  MATCH_SEARCH_COMPLETED: 'match_search_completed',
  MATCH_FOUND: 'match_found',
  NO_MATCH_FOUND: 'no_match_found',
  
  // Zoho operations
  SENT_TO_ZOHO: 'sent_to_zoho',
  DRAFT_UPDATED: 'draft_updated',
  NEW_ORDER_CREATED: 'new_order_created',
  ZOHO_ERROR: 'zoho_error',
  
  // Amendments
  AMENDMENT_DETECTED: 'amendment_detected',
  AMENDMENT_PROCESSED: 'amendment_processed',
  
  // System
  SFTP_FETCH_STARTED: 'sftp_fetch_started',
  SFTP_FETCH_COMPLETED: 'sftp_fetch_completed',
  SFTP_ERROR: 'sftp_error',
  
  // User actions
  USER_CONFIRMED_MATCH: 'user_confirmed_match',
  USER_REJECTED_MATCH: 'user_rejected_match',
  USER_MANUAL_SEND: 'user_manual_send',
};

// Severity levels
const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
};

class AuditLogger {
  constructor(pool) {
    this.pool = pool;
  }

  // Initialize the audit tables
  async initialize() {
    const client = await this.pool.connect();
    try {
      // Main audit log table
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id SERIAL PRIMARY KEY,
          
          -- Action info
          action VARCHAR(50) NOT NULL,
          severity VARCHAR(20) DEFAULT 'info',
          
          -- Order identifiers (multiple ways to find records)
          edi_order_id INTEGER,
          edi_order_number VARCHAR(100),
          edi_po_number VARCHAR(100),
          
          -- Customer info
          customer_name VARCHAR(255),
          customer_id VARCHAR(100),
          
          -- Zoho info
          zoho_so_id VARCHAR(100),
          zoho_so_number VARCHAR(100),
          zoho_draft_id VARCHAR(100),
          zoho_draft_number VARCHAR(100),
          
          -- Financial
          order_amount DECIMAL(12,2),
          item_count INTEGER,
          unit_count INTEGER,
          
          -- Match info
          match_confidence INTEGER,
          match_criteria JSONB,
          
          -- Details and context
          details JSONB,
          error_message TEXT,
          
          -- Timestamps and tracking
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_by VARCHAR(100) DEFAULT 'system',
          session_id VARCHAR(100),
          
          -- Source tracking
          source_file VARCHAR(255),
          source_system VARCHAR(50) DEFAULT 'spring_edi'
        );

        -- Indexes for fast lookups
        CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
        CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_log_edi_order_number ON audit_log(edi_order_number);
        CREATE INDEX IF NOT EXISTS idx_audit_log_edi_po_number ON audit_log(edi_po_number);
        CREATE INDEX IF NOT EXISTS idx_audit_log_zoho_so_id ON audit_log(zoho_so_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_zoho_so_number ON audit_log(zoho_so_number);
        CREATE INDEX IF NOT EXISTS idx_audit_log_customer_name ON audit_log(customer_name);
        CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON audit_log(severity);
      `);

      // Summary table for quick stats
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_summary (
          id SERIAL PRIMARY KEY,
          date DATE NOT NULL UNIQUE,
          orders_imported INTEGER DEFAULT 0,
          orders_matched INTEGER DEFAULT 0,
          orders_sent_to_zoho INTEGER DEFAULT 0,
          orders_failed INTEGER DEFAULT 0,
          total_order_value DECIMAL(14,2) DEFAULT 0,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // Zoho orders sent - permanent record that survives resets
      await client.query(`
        CREATE TABLE IF NOT EXISTS zoho_orders_sent (
          id SERIAL PRIMARY KEY,
          
          -- EDI Order info (snapshot at time of send)
          edi_order_number VARCHAR(100),
          edi_po_number VARCHAR(100),
          customer_name VARCHAR(255),
          order_amount DECIMAL(12,2),
          item_count INTEGER,
          unit_count INTEGER,
          ship_date DATE,
          
          -- Zoho info
          zoho_so_id VARCHAR(100) NOT NULL,
          zoho_so_number VARCHAR(100),
          zoho_customer_id VARCHAR(100),
          zoho_customer_name VARCHAR(255),
          
          -- Match info
          matched_draft_id VARCHAR(100),
          matched_draft_number VARCHAR(100),
          match_confidence INTEGER,
          was_new_order BOOLEAN DEFAULT false,
          
          -- Timestamps
          sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          sent_by VARCHAR(100) DEFAULT 'system',
          
          -- Raw data backup
          edi_raw_data JSONB,
          zoho_response JSONB,
          
          -- Prevent duplicates
          UNIQUE(zoho_so_id)
        );

        CREATE INDEX IF NOT EXISTS idx_zoho_orders_sent_edi_order ON zoho_orders_sent(edi_order_number);
        CREATE INDEX IF NOT EXISTS idx_zoho_orders_sent_po ON zoho_orders_sent(edi_po_number);
        CREATE INDEX IF NOT EXISTS idx_zoho_orders_sent_zoho_so ON zoho_orders_sent(zoho_so_number);
        CREATE INDEX IF NOT EXISTS idx_zoho_orders_sent_customer ON zoho_orders_sent(customer_name);
        CREATE INDEX IF NOT EXISTS idx_zoho_orders_sent_date ON zoho_orders_sent(sent_at DESC);
      `);

      console.log('Audit tables initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize audit tables:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Log an action
  async log(action, data = {}) {
    try {
      const result = await this.pool.query(`
        INSERT INTO audit_log (
          action, severity,
          edi_order_id, edi_order_number, edi_po_number,
          customer_name, customer_id,
          zoho_so_id, zoho_so_number, zoho_draft_id, zoho_draft_number,
          order_amount, item_count, unit_count,
          match_confidence, match_criteria,
          details, error_message,
          created_by, session_id, source_file
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING id, created_at
      `, [
        action,
        data.severity || SEVERITY.INFO,
        data.ediOrderId || null,
        data.ediOrderNumber || null,
        data.poNumber || data.ediOrderNumber || null,
        data.customerName || null,
        data.customerId || null,
        data.zohoSoId || null,
        data.zohoSoNumber || null,
        data.zohoDraftId || null,
        data.zohoDraftNumber || null,
        data.orderAmount || null,
        data.itemCount || null,
        data.unitCount || null,
        data.matchConfidence || null,
        data.matchCriteria ? JSON.stringify(data.matchCriteria) : null,
        data.details ? JSON.stringify(data.details) : null,
        data.errorMessage || null,
        data.createdBy || 'system',
        data.sessionId || null,
        data.sourceFile || null,
      ]);

      return result.rows[0];
    } catch (error) {
      // Don't let logging failures break the main flow
      console.error('Audit log error:', error);
      return null;
    }
  }

  // Record a successful send to Zoho (permanent record)
  async recordZohoSend(data) {
    try {
      // Insert into permanent record
      await this.pool.query(`
        INSERT INTO zoho_orders_sent (
          edi_order_number, edi_po_number, customer_name,
          order_amount, item_count, unit_count, ship_date,
          zoho_so_id, zoho_so_number, zoho_customer_id, zoho_customer_name,
          matched_draft_id, matched_draft_number, match_confidence, was_new_order,
          sent_by, edi_raw_data, zoho_response
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (zoho_so_id) DO UPDATE SET
          zoho_so_number = EXCLUDED.zoho_so_number,
          zoho_response = EXCLUDED.zoho_response
      `, [
        data.ediOrderNumber,
        data.poNumber || data.ediOrderNumber,
        data.customerName,
        data.orderAmount,
        data.itemCount,
        data.unitCount,
        data.shipDate || null,
        data.zohoSoId,
        data.zohoSoNumber,
        data.zohoCustomerId,
        data.zohoCustomerName,
        data.matchedDraftId || null,
        data.matchedDraftNumber || null,
        data.matchConfidence || null,
        data.wasNewOrder || false,
        data.sentBy || 'system',
        data.ediRawData ? JSON.stringify(data.ediRawData) : null,
        data.zohoResponse ? JSON.stringify(data.zohoResponse) : null,
      ]);

      // Also log to audit trail
      await this.log(ACTIONS.SENT_TO_ZOHO, {
        ...data,
        severity: SEVERITY.SUCCESS,
      });

      // Update daily summary
      await this.updateDailySummary('orders_sent_to_zoho', data.orderAmount);

      return true;
    } catch (error) {
      console.error('Failed to record Zoho send:', error);
      // Still try to log the error
      await this.log(ACTIONS.ZOHO_ERROR, {
        ...data,
        severity: SEVERITY.ERROR,
        errorMessage: error.message,
      });
      return false;
    }
  }

  // Update daily summary stats
  async updateDailySummary(field, amount = 0) {
    try {
      const today = new Date().toISOString().split('T')[0];
      await this.pool.query(`
        INSERT INTO audit_summary (date, ${field}, total_order_value, updated_at)
        VALUES ($1, 1, $2, NOW())
        ON CONFLICT (date) DO UPDATE SET
          ${field} = audit_summary.${field} + 1,
          total_order_value = audit_summary.total_order_value + $2,
          updated_at = NOW()
      `, [today, amount || 0]);
    } catch (error) {
      console.error('Failed to update daily summary:', error);
    }
  }

  // Get recent activity
  async getRecentActivity(limit = 100, filters = {}) {
    try {
      let query = `
        SELECT * FROM audit_log 
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (filters.action) {
        query += ` AND action = $${paramIndex++}`;
        params.push(filters.action);
      }
      if (filters.severity) {
        query += ` AND severity = $${paramIndex++}`;
        params.push(filters.severity);
      }
      if (filters.customerName) {
        query += ` AND customer_name ILIKE $${paramIndex++}`;
        params.push(`%${filters.customerName}%`);
      }
      if (filters.poNumber) {
        query += ` AND (edi_order_number ILIKE $${paramIndex} OR edi_po_number ILIKE $${paramIndex++})`;
        params.push(`%${filters.poNumber}%`);
      }
      if (filters.fromDate) {
        query += ` AND created_at >= $${paramIndex++}`;
        params.push(filters.fromDate);
      }
      if (filters.toDate) {
        query += ` AND created_at <= $${paramIndex++}`;
        params.push(filters.toDate);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Failed to get recent activity:', error);
      return [];
    }
  }

  // Get all orders sent to Zoho (permanent record)
  async getZohoOrdersSent(limit = 100, filters = {}) {
    try {
      let query = `SELECT * FROM zoho_orders_sent WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (filters.customerName) {
        query += ` AND customer_name ILIKE $${paramIndex++}`;
        params.push(`%${filters.customerName}%`);
      }
      if (filters.poNumber) {
        query += ` AND (edi_order_number ILIKE $${paramIndex} OR edi_po_number ILIKE $${paramIndex++})`;
        params.push(`%${filters.poNumber}%`);
      }
      if (filters.zohoSoNumber) {
        query += ` AND zoho_so_number ILIKE $${paramIndex++}`;
        params.push(`%${filters.zohoSoNumber}%`);
      }
      if (filters.fromDate) {
        query += ` AND sent_at >= $${paramIndex++}`;
        params.push(filters.fromDate);
      }
      if (filters.toDate) {
        query += ` AND sent_at <= $${paramIndex++}`;
        params.push(filters.toDate);
      }

      query += ` ORDER BY sent_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Failed to get Zoho orders sent:', error);
      return [];
    }
  }

  // Get summary stats
  async getSummaryStats(days = 30) {
    try {
      const result = await this.pool.query(`
        SELECT 
          COALESCE(SUM(orders_imported), 0) as total_imported,
          COALESCE(SUM(orders_matched), 0) as total_matched,
          COALESCE(SUM(orders_sent_to_zoho), 0) as total_sent,
          COALESCE(SUM(orders_failed), 0) as total_failed,
          COALESCE(SUM(total_order_value), 0) as total_value
        FROM audit_summary
        WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
      `);

      const zohoCount = await this.pool.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(order_amount), 0) as total
        FROM zoho_orders_sent
      `);

      return {
        ...result.rows[0],
        all_time_zoho_orders: parseInt(zohoCount.rows[0].count),
        all_time_zoho_value: parseFloat(zohoCount.rows[0].total),
      };
    } catch (error) {
      console.error('Failed to get summary stats:', error);
      return {};
    }
  }

  // Check if an order was already sent to Zoho
  async wasOrderSentToZoho(ediOrderNumber) {
    try {
      const result = await this.pool.query(`
        SELECT zoho_so_id, zoho_so_number, sent_at 
        FROM zoho_orders_sent 
        WHERE edi_order_number = $1 OR edi_po_number = $1
        LIMIT 1
      `, [ediOrderNumber]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to check order status:', error);
      return null;
    }
  }
}

module.exports = {
  AuditLogger,
  ACTIONS,
  SEVERITY,
};
