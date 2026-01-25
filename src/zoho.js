const axios = require('axios');
const logger = require('./logger');
const { pool } = require('./db');

class ZohoClient {
  constructor() {
    this.baseUrl = process.env.ZOHO_API_BASE || 'https://www.zohoapis.com';
    this.accountsUrl = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';
    this.clientId = process.env.ZOHO_CLIENT_ID;
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET;
    this.orgId = process.env.ZOHO_ORG_ID;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async ensureValidToken() {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const result = await pool.query(
        'SELECT access_token, refresh_token, expires_at FROM zoho_tokens ORDER BY id DESC LIMIT 1'
      );

      if (result.rows.length > 0) {
        const token = result.rows[0];
        const expiresAt = new Date(token.expires_at);
        
        if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
          this.accessToken = token.access_token;
          this.tokenExpiry = expiresAt;
          return this.accessToken;
        }

        return await this.refreshAccessToken(token.refresh_token);
      }
    } catch (error) {
      logger.error('Error getting token from database', { error: error.message });
    }

    if (process.env.ZOHO_REFRESH_TOKEN) {
      return await this.refreshAccessToken(process.env.ZOHO_REFRESH_TOKEN);
    }

    throw new Error('No Zoho tokens available. Please authorize at /oauth/start');
  }

  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(`${this.accountsUrl}/oauth/v2/token`, null, {
        params: {
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token'
        }
      });

      const { access_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + (expires_in * 1000));

      await pool.query(
        `INSERT INTO zoho_tokens (access_token, refresh_token, expires_at) 
         VALUES ($1, $2, $3)`,
        [access_token, refreshToken, expiresAt]
      );

      this.accessToken = access_token;
      this.tokenExpiry = expiresAt;

      logger.info('Zoho token refreshed successfully');
      return access_token;
    } catch (error) {
      logger.error('Failed to refresh Zoho token', { error: error.message });
      throw error;
    }
  }

  // ============================================================
  // CUSTOMER SEARCH
  // ============================================================

  async searchCustomer(searchTerm) {
    const token = await this.ensureValidToken();
    
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/books/v3/contacts`,
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
        params: {
          organization_id: this.orgId,
          search_text: searchTerm,
          contact_type: 'customer'
        }
      });

      return response.data?.contacts || [];
    } catch (error) {
      logger.error('Customer search failed', { error: error.message, searchTerm });
      throw error;
    }
  }

  async getCustomerById(customerId) {
    const token = await this.ensureValidToken();
    
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/books/v3/contacts/${customerId}`,
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
        params: { organization_id: this.orgId }
      });

      return response.data?.contact;
    } catch (error) {
      logger.error('Get customer failed', { error: error.message, customerId });
      throw error;
    }
  }

  // ============================================================
  // SALES ORDER OPERATIONS
  // ============================================================

  async getDraftSalesOrders() {
    const token = await this.ensureValidToken();
    
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/books/v3/salesorders`,
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
        params: {
          organization_id: this.orgId,
          status: 'draft',
          per_page: 200
        }
      });

      return response.data?.salesorders || [];
    } catch (error) {
      logger.error('Failed to get draft sales orders', { error: error.message });
      throw error;
    }
  }

  async getSalesOrderDetails(salesorderId) {
    const token = await this.ensureValidToken();
    
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/books/v3/salesorders/${salesorderId}`,
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
        params: { organization_id: this.orgId }
      });

      return response.data?.salesorder;
    } catch (error) {
      logger.error('Failed to get sales order details', { error: error.message, salesorderId });
      throw error;
    }
  }

  async createBooksSalesOrder(orderData) {
    const token = await this.ensureValidToken();
    
    const lineItems = (orderData.items || []).map(item => ({
      name: item.style || item.description || 'Item',
      description: `${item.style || ''} ${item.description || ''} ${item.color || ''} ${item.size || ''}`.trim(),
      quantity: item.quantity || item.quantityOrdered || 0,
      rate: item.unitPrice || item.rate || 0
    }));

    const payload = {
      customer_id: orderData.customerId,
      reference_number: orderData.poNumber,
      date: orderData.orderDate || new Date().toISOString().split('T')[0],
      shipment_date: orderData.shipDate || null,
      notes: orderData.notes || '',
      line_items: lineItems
    };

    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/books/v3/salesorders`,
        headers: { 
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        params: { organization_id: this.orgId },
        data: payload
      });

      logger.info('Sales order created', { 
        soId: response.data?.salesorder?.salesorder_id,
        soNumber: response.data?.salesorder?.salesorder_number
      });

      return response.data?.salesorder;
    } catch (error) {
      logger.error('Failed to create sales order', { 
        error: error.response?.data || error.message,
        payload 
      });
      throw error;
    }
  }

  async updateSalesOrder(salesorderId, updateData) {
    const token = await this.ensureValidToken();
    
    try {
      const response = await axios({
        method: 'PUT',
        url: `${this.baseUrl}/books/v3/salesorders/${salesorderId}`,
        headers: { 
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        params: { organization_id: this.orgId },
        data: updateData
      });

      logger.info('Sales order updated', { salesorderId });
      return response.data?.salesorder;
    } catch (error) {
      logger.error('Failed to update sales order', { error: error.message, salesorderId });
      throw error;
    }
  }

  async deleteSalesOrder(salesorderId) {
    const token = await this.ensureValidToken();
    
    try {
      await axios({
        method: 'DELETE',
        url: `${this.baseUrl}/books/v3/salesorders/${salesorderId}`,
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
        params: { organization_id: this.orgId }
      });

      logger.info('Sales order deleted', { salesorderId });
      return true;
    } catch (error) {
      logger.error('Failed to delete sales order', { error: error.message, salesorderId });
      throw error;
    }
  }

  // ============================================================
  // MATCHING SYSTEM - STRICT MATCHING
  // ============================================================

  /**
   * Find potential matching draft orders for EDI orders
   * RULES:
   * - Customer MUST match (required)
   * - At least one Style MUST match (required)
   * - Ship date and amount affect confidence but don't disqualify
   */
  async findMatchingDrafts(ediOrders) {
    logger.info('Starting draft matching process', { ediOrderCount: ediOrders.length });
    
    // Get all draft orders from Zoho
    const drafts = await this.getDraftSalesOrders();
    logger.info('Fetched draft orders from Zoho', { draftCount: drafts.length });

    // Get details for each draft (includes line items)
    const draftDetails = [];
    for (const draft of drafts) {
      try {
        const details = await this.getSalesOrderDetails(draft.salesorder_id);
        draftDetails.push(details);
      } catch (error) {
        logger.warn('Failed to get draft details', { draftId: draft.salesorder_id });
      }
    }

    const matches = [];
    const noMatches = [];

    for (const ediOrder of ediOrders) {
      const parsed = ediOrder.parsed_data || {};
      const ediItems = parsed.items || [];
      const ediPoNumber = ediOrder.edi_order_number || '';
      const ediCustomer = ediOrder.edi_customer_name || '';
      const ediTotal = ediItems.reduce((sum, item) => 
        sum + ((item.quantityOrdered || 0) * (item.unitPrice || 0)), 0);
      const ediShipDate = parsed.dates?.shipNotBefore || '';

      let bestMatch = null;
      let bestScore = 0;

      for (const draft of draftDetails) {
        const score = this.scoreMatch(ediOrder, draft);
        
        // STRICT RULES: Customer AND Style MUST match
        // Only consider it a match if both required criteria are met
        if (score.details.customer && score.details.styles && score.total > bestScore) {
          bestScore = score.total;
          bestMatch = {
            ediOrder: {
              id: ediOrder.id,
              poNumber: ediPoNumber,
              customer: ediCustomer,
              shipDate: ediShipDate,
              cancelDate: parsed.dates?.cancelAfter || '',
              itemCount: ediItems.length,
              totalUnits: ediItems.reduce((s, i) => s + (i.quantityOrdered || 0), 0),
              totalAmount: ediTotal,
              items: ediItems
            },
            zohoDraft: {
              id: draft.salesorder_id,
              number: draft.salesorder_number,
              reference: draft.reference_number || '',
              customer: draft.customer_name,
              shipDate: draft.shipment_date || '',
              status: draft.status,
              itemCount: (draft.line_items || []).length,
              totalUnits: (draft.line_items || []).reduce((s, i) => s + (i.quantity || 0), 0),
              totalAmount: parseFloat(draft.total) || 0,
              items: draft.line_items || []
            },
            score: score,
            confidence: score.total,
            confidenceLevel: score.total >= 80 ? 'high' : score.total >= 60 ? 'medium' : 'low'
          };
        }
      }

      if (bestMatch) {
        matches.push(bestMatch);
      } else {
        noMatches.push({
          ediOrder: {
            id: ediOrder.id,
            poNumber: ediPoNumber,
            customer: ediCustomer,
            shipDate: ediShipDate,
            itemCount: ediItems.length,
            totalUnits: ediItems.reduce((s, i) => s + (i.quantityOrdered || 0), 0),
            totalAmount: ediTotal,
            items: ediItems
          }
        });
      }
    }

    logger.info('Matching complete', { 
      matches: matches.length, 
      noMatches: noMatches.length 
    });

    return { matches, noMatches };
  }

  /**
   * Find matches using pre-cached draft data (no API calls)
   * This is the optimized version that uses cached Zoho drafts
   */
  async findMatchingDraftsFromCache(ediOrders, cachedDrafts) {
    logger.info('Starting draft matching from cache', { 
      ediOrderCount: ediOrders.length,
      cachedDraftsCount: cachedDrafts.length 
    });

    const matches = [];
    const noMatches = [];

    for (const ediOrder of ediOrders) {
      const parsed = ediOrder.parsed_data || {};
      const ediItems = parsed.items || [];
      const ediPoNumber = ediOrder.edi_order_number || '';
      const ediCustomer = ediOrder.edi_customer_name || '';
      const ediTotal = ediItems.reduce((sum, item) => 
        sum + ((item.quantityOrdered || 0) * (item.unitPrice || 0)), 0);
      const ediShipDate = parsed.dates?.shipNotBefore || '';

      let bestMatch = null;
      let bestScore = 0;

      for (const draft of cachedDrafts) {
        // Convert cached draft format to match expected format
        const draftForScoring = {
          salesorder_id: draft.salesorder_id,
          salesorder_number: draft.salesorder_number,
          customer_id: draft.customer_id,
          customer_name: draft.customer_name,
          reference_number: draft.reference_number,
          status: draft.status,
          total: draft.total,
          shipment_date: draft.shipment_date,
          line_items: draft.line_items || []
        };

        const score = this.scoreMatch(ediOrder, draftForScoring);
        
        // STRICT RULES: Customer AND Style MUST match
        if (score.details.customer && score.details.styles && score.total > bestScore) {
          bestScore = score.total;
          bestMatch = {
            ediOrder: {
              id: ediOrder.id,
              poNumber: ediPoNumber,
              customer: ediCustomer,
              shipDate: ediShipDate,
              cancelDate: parsed.dates?.cancelAfter || '',
              itemCount: ediItems.length,
              totalUnits: ediItems.reduce((s, i) => s + (i.quantityOrdered || 0), 0),
              totalAmount: ediTotal,
              items: ediItems
            },
            zohoDraft: {
              id: draft.salesorder_id,
              number: draft.salesorder_number,
              reference: draft.reference_number || '',
              customer: draft.customer_name,
              shipDate: draft.shipment_date || '',
              status: draft.status,
              itemCount: (draft.line_items || []).length,
              totalUnits: (draft.line_items || []).reduce((s, i) => s + (i.quantity || 0), 0),
              totalAmount: parseFloat(draft.total) || 0,
              items: draft.line_items || []
            },
            score: score,
            confidence: score.total,
            confidenceLevel: score.total >= 80 ? 'high' : score.total >= 60 ? 'medium' : 'low'
          };
        }
      }

      if (bestMatch) {
        matches.push(bestMatch);
      } else {
        noMatches.push({
          ediOrder: {
            id: ediOrder.id,
            poNumber: ediPoNumber,
            customer: ediCustomer,
            shipDate: ediShipDate,
            itemCount: ediItems.length,
            totalUnits: ediItems.reduce((s, i) => s + (i.quantityOrdered || 0), 0),
            totalAmount: ediTotal,
            items: ediItems
          }
        });
      }
    }

    logger.info('Matching from cache complete', { 
      matches: matches.length, 
      noMatches: noMatches.length 
    });

    return { matches, noMatches };
  }

  /**
   * Score how well an EDI order matches a Zoho draft
   * 
   * SCORING (out of 100):
   * - Customer match: 25 points (REQUIRED)
   * - Style match: 30 points (REQUIRED - at least one style must match)
   * - Ship date: 25 points (within 7 days = 25, within 30 days = 15, >30 days = 0)
   * - Total amount: 20 points (within 5% = 20, within 15% = 10, >15% = 0)
   * 
   * Bonus:
   * - PO Number exact match: +10 points (can exceed 100)
   */
  scoreMatch(ediOrder, zohoDraft) {
    const score = {
      total: 0,
      details: {
        poNumber: false,
        customer: false,
        shipDate: false,
        totalAmount: false,
        styles: false,
        shipDateDiffDays: null,
        amountDiffPercent: null
      }
    };

    const parsed = ediOrder.parsed_data || {};
    const ediItems = parsed.items || [];
    const ediPoNumber = (ediOrder.edi_order_number || '').toLowerCase().trim();
    const ediCustomer = (ediOrder.edi_customer_name || '').toLowerCase().trim();
    const ediTotal = ediItems.reduce((sum, item) => 
      sum + ((item.quantityOrdered || 0) * (item.unitPrice || 0)), 0);
    const ediShipDate = parsed.dates?.shipNotBefore || '';

    const zohoRef = (zohoDraft.reference_number || '').toLowerCase().trim();
    const zohoCustomer = (zohoDraft.customer_name || '').toLowerCase().trim();
    const zohoTotal = parseFloat(zohoDraft.total) || 0;
    const zohoShipDate = zohoDraft.shipment_date || '';
    const zohoItems = zohoDraft.line_items || [];

    // ============================================================
    // CUSTOMER MATCH (25 points) - REQUIRED
    // ============================================================
    if (ediCustomer && zohoCustomer) {
      const ediParts = ediCustomer.split(/[\s,]+/).filter(p => p.length > 2);
      const zohoParts = zohoCustomer.split(/[\s,]+/).filter(p => p.length > 2);
      const matchingParts = ediParts.filter(ep => 
        zohoParts.some(zp => zp.includes(ep) || ep.includes(zp))
      );
      if (matchingParts.length > 0 || ediCustomer.includes(zohoCustomer) || zohoCustomer.includes(ediCustomer)) {
        score.total += 25;
        score.details.customer = true;
      }
    }

    // ============================================================
    // STYLE/SKU MATCH (30 points) - REQUIRED
    // At least one style must match for this to be considered a match
    // ============================================================
    if (ediItems.length > 0 && zohoItems.length > 0) {
      // Extract EDI styles
      const ediStyles = new Set();
      ediItems.forEach(i => {
        const sku = (i.productIds?.sku || i.productIds?.vendorItemNumber || '').toLowerCase().trim();
        if (sku) {
          ediStyles.add(sku);
          // Also add the base style (before any color/size suffix)
          const baseStyle = sku.split('-')[0];
          if (baseStyle) ediStyles.add(baseStyle);
        }
      });
      
      // Extract Zoho styles
      const zohoStyles = new Set();
      zohoItems.forEach(i => {
        const name = (i.name || '').toLowerCase().trim();
        const desc = (i.description || '').toLowerCase().trim();
        
        // Try to extract style from name (usually first part)
        if (name) {
          zohoStyles.add(name.split(' ')[0]);
          zohoStyles.add(name.split('-')[0]);
          // Also try full name
          const fullStyle = name.match(/^([a-z0-9]+-?[a-z0-9]*)/i);
          if (fullStyle) zohoStyles.add(fullStyle[1]);
        }
        
        // Also check description
        if (desc) {
          const descStyle = desc.match(/^([a-z0-9]+-?[a-z0-9]*)/i);
          if (descStyle) zohoStyles.add(descStyle[1]);
        }
      });

      // Check for ANY overlap
      let matchCount = 0;
      ediStyles.forEach(es => {
        if (!es || es.length < 3) return; // Skip very short codes
        zohoStyles.forEach(zs => {
          if (!zs || zs.length < 3) return;
          // Exact match or one contains the other
          if (es === zs || (es.length >= 5 && zs.includes(es)) || (zs.length >= 5 && es.includes(zs))) {
            matchCount++;
          }
        });
      });

      if (matchCount > 0) {
        score.details.styles = true;
        // More matches = higher score
        const matchRatio = matchCount / Math.max(ediStyles.size, 1);
        if (matchRatio >= 0.5) {
          score.total += 30;
        } else if (matchRatio >= 0.25) {
          score.total += 20;
        } else {
          score.total += 15; // At least some match
        }
      }
      // If no styles match at all, score.details.styles stays false
      // This will disqualify the match in findMatchingDrafts
    }

    // ============================================================
    // SHIP DATE (25 points) - Not required, affects confidence
    // ============================================================
    if (ediShipDate && zohoShipDate) {
      const ediDate = new Date(ediShipDate);
      const zohoDate = new Date(zohoShipDate);
      const diffDays = Math.abs((ediDate - zohoDate) / (1000 * 60 * 60 * 24));
      score.details.shipDateDiffDays = Math.round(diffDays);
      
      if (diffDays <= 7) {
        score.total += 25;
        score.details.shipDate = true;
      } else if (diffDays <= 30) {
        score.total += 15;
        score.details.shipDate = true; // Still considered a match, just not perfect
      } else if (diffDays <= 60) {
        score.total += 5;
        // shipDate stays false for display purposes (warning)
      }
      // >60 days = 0 points, shipDate = false (will show warning)
    } else if (!ediShipDate || !zohoShipDate) {
      // If either is missing, give partial credit
      score.total += 10;
    }

    // ============================================================
    // TOTAL AMOUNT (20 points) - Not required, affects confidence
    // ============================================================
    if (ediTotal > 0 && zohoTotal > 0) {
      const diff = Math.abs(ediTotal - zohoTotal);
      const percentDiff = diff / Math.max(ediTotal, zohoTotal);
      score.details.amountDiffPercent = Math.round(percentDiff * 100);
      
      if (percentDiff <= 0.05) {
        score.total += 20;
        score.details.totalAmount = true;
      } else if (percentDiff <= 0.15) {
        score.total += 10;
        score.details.totalAmount = true;
      } else if (percentDiff <= 0.25) {
        score.total += 5;
        // totalAmount stays false (will show warning)
      }
      // >25% difference = 0 points
    }

    // ============================================================
    // PO NUMBER BONUS (+10 points)
    // ============================================================
    if (ediPoNumber && zohoRef && (ediPoNumber === zohoRef || zohoRef.includes(ediPoNumber) || ediPoNumber.includes(zohoRef))) {
      score.total += 10;
      score.details.poNumber = true;
    }

    return score;
  }

  /**
   * Compare EDI order with Zoho draft in detail for side-by-side view
   */
  compareOrderWithDraft(ediOrder, zohoDraft) {
    const parsed = ediOrder.parsed_data || {};
    const ediItems = parsed.items || [];
    const zohoItems = zohoDraft.line_items || [];

    const comparison = {
      header: {
        edi: {
          poNumber: ediOrder.edi_order_number,
          customer: ediOrder.edi_customer_name,
          shipDate: parsed.dates?.shipNotBefore || '',
          cancelDate: parsed.dates?.cancelAfter || '',
          itemCount: ediItems.length,
          totalUnits: ediItems.reduce((s, i) => s + (i.quantityOrdered || 0), 0),
          totalAmount: ediItems.reduce((s, i) => s + ((i.quantityOrdered || 0) * (i.unitPrice || 0)), 0)
        },
        zoho: {
          soNumber: zohoDraft.salesorder_number,
          reference: zohoDraft.reference_number || '',
          customer: zohoDraft.customer_name,
          shipDate: zohoDraft.shipment_date || '',
          status: zohoDraft.status,
          itemCount: zohoItems.length,
          totalUnits: zohoItems.reduce((s, i) => s + (i.quantity || 0), 0),
          totalAmount: parseFloat(zohoDraft.total) || 0
        }
      },
      lineItems: {
        matched: [],
        ediOnly: [],
        zohoOnly: [],
        differences: []
      },
      summary: {
        qtyDifference: 0,
        amountDifference: 0,
        changesRequired: 0
      }
    };

    // Build maps for comparison
    const ediMap = new Map();
    ediItems.forEach(item => {
      const sku = item.productIds?.sku || item.productIds?.vendorItemNumber || '';
      const key = `${sku}-${item.color || ''}-${item.size || ''}`.toLowerCase();
      ediMap.set(key, {
        sku,
        color: item.color || '',
        size: item.size || '',
        qty: item.quantityOrdered || 0,
        price: item.unitPrice || 0,
        amount: (item.quantityOrdered || 0) * (item.unitPrice || 0),
        description: item.description || ''
      });
    });

    const zohoMap = new Map();
    zohoItems.forEach(item => {
      const name = item.name || '';
      const desc = item.description || '';
      const parts = desc.split(/[\s|]+/);
      const sku = name.split(' ')[0] || parts[0] || '';
      const colorMatch = desc.match(/color[:\s]*(\w+)/i);
      const sizeMatch = desc.match(/size[:\s]*([^\s|]+)/i);
      const color = colorMatch ? colorMatch[1] : '';
      const size = sizeMatch ? sizeMatch[1] : '';
      
      const key = `${sku}-${color}-${size}`.toLowerCase();
      zohoMap.set(key, {
        sku,
        color,
        size,
        qty: item.quantity || 0,
        price: item.rate || 0,
        amount: item.item_total || 0,
        description: desc,
        itemId: item.line_item_id
      });
    });

    // Compare
    ediMap.forEach((ediItem, key) => {
      if (zohoMap.has(key)) {
        const zohoItem = zohoMap.get(key);
        const qtyDiff = ediItem.qty - zohoItem.qty;
        const priceDiff = ediItem.price - zohoItem.price;
        
        if (qtyDiff === 0 && Math.abs(priceDiff) < 0.01) {
          comparison.lineItems.matched.push({ edi: ediItem, zoho: zohoItem });
        } else {
          comparison.lineItems.differences.push({ 
            edi: ediItem, 
            zoho: zohoItem,
            qtyDiff,
            priceDiff
          });
          comparison.summary.changesRequired++;
        }
        zohoMap.delete(key);
      } else {
        comparison.lineItems.ediOnly.push(ediItem);
        comparison.summary.changesRequired++;
      }
    });

    zohoMap.forEach(zohoItem => {
      comparison.lineItems.zohoOnly.push(zohoItem);
      comparison.summary.changesRequired++;
    });

    comparison.summary.qtyDifference = comparison.header.edi.totalUnits - comparison.header.zoho.totalUnits;
    comparison.summary.amountDifference = comparison.header.edi.totalAmount - comparison.header.zoho.totalAmount;

    return comparison;
  }

  /**
   * Update a Zoho draft with EDI data
   */
  async updateDraftWithEdiData(salesorderId, ediOrder) {
    const parsed = ediOrder.parsed_data || {};
    const ediItems = parsed.items || [];

    const lineItems = ediItems.map(item => ({
      name: item.productIds?.sku || item.productIds?.vendorItemNumber || 'Item',
      description: `${item.productIds?.sku || ''} ${item.description || ''} ${item.color || ''} ${item.size || ''}`.trim(),
      quantity: item.quantityOrdered || 0,
      rate: item.unitPrice || 0
    }));

    const updateData = {
      reference_number: ediOrder.edi_order_number,
      shipment_date: parsed.dates?.shipNotBefore || undefined,
      notes: `Updated from EDI ${ediOrder.edi_order_number} on ${new Date().toISOString()}`,
      line_items: lineItems
    };

    return await this.updateSalesOrder(salesorderId, updateData);
  }
}

module.exports = ZohoClient;
