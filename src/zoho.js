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

    throw new Error('No Zoho tokens available. Please authorize via /oauth/start');
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
        `INSERT INTO zoho_tokens (access_token, refresh_token, expires_at, updated_at)
         VALUES ($1, $2, $3, NOW())`,
        [access_token, refreshToken, expiresAt]
      );

      this.accessToken = access_token;
      this.tokenExpiry = expiresAt;

      logger.info('Zoho token refreshed', { expiresAt });
      return access_token;
    } catch (error) {
      logger.error('Failed to refresh Zoho token', {
        error: error.response?.data || error.message
      });
      throw new Error('Zoho token refresh failed');
    }
  }

  // ==========================================
  // ZOHO BOOKS API FUNCTIONS
  // ==========================================

  // Find customer in Zoho Books by name
  async findBooksCustomerByName(name) {
    if (!name) return null;

    const token = await this.ensureValidToken();

    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/books/v3/contacts`,
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`
        },
        params: {
          organization_id: this.orgId,
          contact_name_contains: name,
          contact_type: 'customer'
        }
      });

      const contacts = response.data?.contacts || [];
      
      // First try exact match
      const exactMatch = contacts.find(c => 
        c.contact_name.toLowerCase() === name.toLowerCase()
      );
      if (exactMatch) return exactMatch;

      // Otherwise return first partial match
      if (contacts.length > 0) {
        return contacts[0];
      }

      return null;
    } catch (error) {
      logger.warn('Zoho Books customer search failed', { name, error: error.message });
      return null;
    }
  }

  // Search for Draft Sales Orders in Zoho Books
  async searchDraftSalesOrders(customerId = null, searchText = null) {
    const token = await this.ensureValidToken();

    try {
      const params = {
        organization_id: this.orgId,
        status: 'draft',
        per_page: 100
      };

      if (customerId) {
        params.customer_id = customerId;
      }

      if (searchText) {
        params.search_text = searchText;
      }

      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/books/v3/salesorders`,
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`
        },
        params
      });

      return response.data?.salesorders || [];
    } catch (error) {
      logger.warn('Failed to search draft sales orders', { error: error.message });
      return [];
    }
  }

  // Get full Sales Order details including line items
  async getSalesOrderDetails(salesorderId) {
    const token = await this.ensureValidToken();

    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/books/v3/salesorders/${salesorderId}`,
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`
        },
        params: {
          organization_id: this.orgId
        }
      });

      return response.data?.salesorder || null;
    } catch (error) {
      logger.warn('Failed to get sales order details', { salesorderId, error: error.message });
      return null;
    }
  }

  // Find potential matching drafts for an EDI order
  async findMatchingDrafts(customerName, ediItems, shipDate) {
    const token = await this.ensureValidToken();

    try {
      // First find the customer
      const customer = await this.findBooksCustomerByName(customerName);
      if (!customer) {
        logger.info('No customer found for draft matching', { customerName });
        return { customer: null, drafts: [] };
      }

      // Get all draft orders for this customer
      const drafts = await this.searchDraftSalesOrders(customer.contact_id);
      
      if (drafts.length === 0) {
        return { customer, drafts: [] };
      }

      // Get full details for each draft and calculate match scores
      const detailedDrafts = [];
      for (const draft of drafts) {
        const details = await this.getSalesOrderDetails(draft.salesorder_id);
        if (details) {
          const matchScore = this.calculateDraftMatchScore(details, ediItems, shipDate);
          detailedDrafts.push({
            ...details,
            match_score: matchScore.score,
            match_details: matchScore.details
          });
        }
      }

      // Sort by match score descending
      detailedDrafts.sort((a, b) => b.match_score - a.match_score);

      return { customer, drafts: detailedDrafts };
    } catch (error) {
      logger.error('Error finding matching drafts', { error: error.message });
      return { customer: null, drafts: [] };
    }
  }

  // Calculate how well a draft matches an EDI order
  calculateDraftMatchScore(draft, ediItems, ediShipDate) {
    let score = 0;
    const details = {
      hasEdiReference: false,
      dateMatch: false,
      styleMatches: 0,
      totalStyles: ediItems.length,
      quantityVariance: 0,
      amountVariance: 0
    };

    // Check if reference contains "EDI" (+20 points)
    const reference = (draft.reference_number || '').toLowerCase();
    if (reference.includes('edi')) {
      score += 20;
      details.hasEdiReference = true;
    }

    // Check ship date within 30 days (+15 points)
    if (ediShipDate && draft.shipment_date) {
      const ediDate = new Date(ediShipDate);
      const draftDate = new Date(draft.shipment_date);
      const daysDiff = Math.abs((ediDate - draftDate) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 30) {
        score += 15;
        details.dateMatch = true;
      }
    }

    // Check style/item matches (+5 points per matching style)
    const draftItems = draft.line_items || [];
    const ediStyleSet = new Set(ediItems.map(i => (i.style || i.name || '').toLowerCase()));
    const draftStyleSet = new Set(draftItems.map(i => (i.name || '').toLowerCase().split(' ')[0]));

    for (const style of ediStyleSet) {
      for (const draftStyle of draftStyleSet) {
        if (style && draftStyle && (style.includes(draftStyle) || draftStyle.includes(style))) {
          score += 5;
          details.styleMatches++;
          break;
        }
      }
    }

    // Calculate quantity and amount variance
    const ediTotal = ediItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const draftTotal = draftItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
    details.quantityVariance = ediTotal - draftTotal;

    const ediAmount = ediItems.reduce((sum, i) => sum + ((i.quantity || 0) * (i.unitPrice || 0)), 0);
    const draftAmount = parseFloat(draft.total) || 0;
    details.amountVariance = ediAmount - draftAmount;

    // Bonus for similar amounts (+10 points if within 20%)
    if (draftAmount > 0) {
      const variancePercent = Math.abs(details.amountVariance) / draftAmount;
      if (variancePercent <= 0.20) {
        score += 10;
      }
    }

    return { score, details };
  }

  // Compare EDI order with draft order in detail
  compareOrderWithDraft(ediItems, draftDetails) {
    const draftItems = draftDetails.line_items || [];
    const comparison = {
      matched: [],
      ediOnly: [],
      draftOnly: [],
      differences: [],
      summary: {
        ediTotalQty: 0,
        draftTotalQty: 0,
        ediTotalAmount: 0,
        draftTotalAmount: 0,
        qtyDifference: 0,
        amountDifference: 0
      }
    };

    // Create maps for easier comparison
    const ediMap = new Map();
    ediItems.forEach(item => {
      const key = `${(item.style || '').toLowerCase()}-${(item.color || '').toLowerCase()}-${(item.size || '').toLowerCase()}`;
      if (ediMap.has(key)) {
        const existing = ediMap.get(key);
        existing.quantity += item.quantity || 0;
        existing.amount += (item.quantity || 0) * (item.unitPrice || 0);
      } else {
        ediMap.set(key, {
          style: item.style,
          color: item.color,
          size: item.size,
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          amount: (item.quantity || 0) * (item.unitPrice || 0),
          description: item.description
        });
      }
    });

    const draftMap = new Map();
    draftItems.forEach(item => {
      // Try to extract style, color, size from draft item name/description
      const name = (item.name || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      
      // Simple extraction - may need refinement based on actual data format
      const colorMatch = desc.match(/color:\s*(\w+)/i);
      const sizeMatch = desc.match(/size:\s*([^\s|]+)/i);
      
      const style = name.split(' ')[0] || name;
      const color = colorMatch ? colorMatch[1] : '';
      const size = sizeMatch ? sizeMatch[1] : '';
      
      const key = `${style}-${color}-${size}`;
      
      draftMap.set(key, {
        style: style.toUpperCase(),
        color: color.toUpperCase(),
        size: size.toUpperCase(),
        quantity: item.quantity || 0,
        unitPrice: item.rate || 0,
        amount: item.item_total || 0,
        lineItemId: item.line_item_id,
        description: item.description
      });
    });

    // Compare items
    for (const [key, ediItem] of ediMap) {
      comparison.summary.ediTotalQty += ediItem.quantity;
      comparison.summary.ediTotalAmount += ediItem.amount;

      const draftItem = draftMap.get(key);
      if (draftItem) {
        draftMap.delete(key); // Mark as processed
        
        if (ediItem.quantity === draftItem.quantity && 
            Math.abs(ediItem.unitPrice - draftItem.unitPrice) < 0.01) {
          comparison.matched.push({
            ...ediItem,
            draftQty: draftItem.quantity,
            draftPrice: draftItem.unitPrice
          });
        } else {
          comparison.differences.push({
            ...ediItem,
            draftQty: draftItem.quantity,
            draftPrice: draftItem.unitPrice,
            qtyDiff: ediItem.quantity - draftItem.quantity,
            priceDiff: ediItem.unitPrice - draftItem.unitPrice
          });
        }
      } else {
        comparison.ediOnly.push(ediItem);
      }
    }

    // Remaining draft items not in EDI
    for (const [key, draftItem] of draftMap) {
      comparison.summary.draftTotalQty += draftItem.quantity;
      comparison.summary.draftTotalAmount += draftItem.amount;
      comparison.draftOnly.push(draftItem);
    }

    // Calculate summary
    comparison.summary.draftTotalQty = draftItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
    comparison.summary.draftTotalAmount = parseFloat(draftDetails.total) || 0;
    comparison.summary.qtyDifference = comparison.summary.ediTotalQty - comparison.summary.draftTotalQty;
    comparison.summary.amountDifference = comparison.summary.ediTotalAmount - comparison.summary.draftTotalAmount;

    return comparison;
  }

  // Create Sales Order in Zoho Books
  async createBooksSalesOrder(orderData) {
    const token = await this.ensureValidToken();

    // Build line items for Zoho Books format
    const lineItems = (orderData.items || []).map((item, idx) => ({
      name: item.style || item.description || `Item ${idx + 1}`,
      description: `${item.description || ''} | Color: ${item.color || 'N/A'} | Size: ${item.size || 'N/A'}`.trim(),
      quantity: item.quantity || 1,
      rate: item.unitPrice || 0,
    }));

    const salesOrderData = {
      customer_id: orderData.customerId,
      reference_number: orderData.poNumber || '',
      date: orderData.orderDate || new Date().toISOString().split('T')[0],
      shipment_date: orderData.shipDate || undefined,
      notes: orderData.notes || '',
      line_items: lineItems
    };

    // Remove undefined fields
    Object.keys(salesOrderData).forEach(key => {
      if (salesOrderData[key] === undefined) {
        delete salesOrderData[key];
      }
    });

    logger.info('Creating Zoho Books Sales Order', { 
      customerId: orderData.customerId, 
      poNumber: orderData.poNumber,
      itemCount: lineItems.length 
    });

    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/books/v3/salesorders`,
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          organization_id: this.orgId
        },
        data: salesOrderData
      });

      if (response.data?.code === 0) {
        const salesOrder = response.data.salesorder;
        logger.info('Created Zoho Books Sales Order', { 
          id: salesOrder.salesorder_id, 
          number: salesOrder.salesorder_number 
        });
        return salesOrder;
      } else {
        throw new Error(response.data?.message || 'Unknown error creating sales order');
      }
    } catch (error) {
      logger.error('Failed to create Zoho Books Sales Order', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw error;
    }
  }

  // Delete Sales Order in Zoho Books
  async deleteBooksSalesOrder(salesorderId) {
    const token = await this.ensureValidToken();

    try {
      const response = await axios({
        method: 'DELETE',
        url: `${this.baseUrl}/books/v3/salesorders/${salesorderId}`,
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`
        },
        params: {
          organization_id: this.orgId
        }
      });

      if (response.data?.code === 0) {
        logger.info('Deleted Zoho Books Sales Order', { salesorderId });
        return true;
      } else {
        throw new Error(response.data?.message || 'Unknown error deleting sales order');
      }
    } catch (error) {
      logger.error('Failed to delete Zoho Books Sales Order', {
        salesorderId,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  // Create a draft order with remaining quantities (for partial matches)
  async createRemainderDraft(originalDraft, remainingItems, originalSoNumber) {
    const token = await this.ensureValidToken();

    const lineItems = remainingItems.map((item, idx) => ({
      name: item.style || item.name || `Item ${idx + 1}`,
      description: item.description || `${item.color || ''} ${item.size || ''}`.trim(),
      quantity: item.quantity || 1,
      rate: item.unitPrice || item.rate || 0,
    }));

    const salesOrderData = {
      customer_id: originalDraft.customer_id,
      reference_number: `EDI - Remaining from ${originalSoNumber}`,
      date: new Date().toISOString().split('T')[0],
      shipment_date: originalDraft.shipment_date || undefined,
      notes: `Split from original draft ${originalSoNumber}. Awaiting additional EDI.`,
      line_items: lineItems
    };

    Object.keys(salesOrderData).forEach(key => {
      if (salesOrderData[key] === undefined) {
        delete salesOrderData[key];
      }
    });

    logger.info('Creating remainder draft', { 
      originalSo: originalSoNumber,
      itemCount: lineItems.length 
    });

    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/books/v3/salesorders`,
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          organization_id: this.orgId
        },
        data: salesOrderData
      });

      if (response.data?.code === 0) {
        const salesOrder = response.data.salesorder;
        logger.info('Created remainder draft', { 
          id: salesOrder.salesorder_id, 
          number: salesOrder.salesorder_number 
        });
        return salesOrder;
      } else {
        throw new Error(response.data?.message || 'Unknown error creating remainder draft');
      }
    } catch (error) {
      logger.error('Failed to create remainder draft', {
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  // Check if PO number already exists in Zoho Books
  async checkDuplicatePO(poNumber) {
    const token = await this.ensureValidToken();

    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/books/v3/salesorders`,
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`
        },
        params: {
          organization_id: this.orgId,
          reference_number: poNumber
        }
      });

      const orders = response.data?.salesorders || [];
      return orders.length > 0 ? orders[0] : null;
    } catch (error) {
      logger.warn('Duplicate PO check failed', { poNumber, error: error.message });
      return null;
    }
  }

  // Get all customers from Zoho Books
  async getBooksCustomers() {
    const token = await this.ensureValidToken();

    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/books/v3/contacts`,
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`
        },
        params: {
          organization_id: this.orgId,
          contact_type: 'customer',
          per_page: 200
        }
      });

      return response.data?.contacts || [];
    } catch (error) {
      logger.warn('Failed to get Zoho Books customers', { error: error.message });
      return [];
    }
  }
}

module.exports = ZohoClient;
