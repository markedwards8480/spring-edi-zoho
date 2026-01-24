const axios = require('axios');
const logger = require('./logger');
const { pool, getCustomerMapping } = require('./db');

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

  // ============================================
  // ZOHO BOOKS API FUNCTIONS
  // ============================================

  async findBooksCustomerByName(name) {
    if (!name) return null;
    
    // First check our customer mappings table
    try {
      const mapping = await getCustomerMapping(name);
      if (mapping && mapping.zoho_account_name) {
        // Search for the mapped name in Zoho
        name = mapping.zoho_account_name;
      }
    } catch (e) {
      // Continue with original name
    }

    const token = await this.ensureValidToken();

    try {
      // Search for contact by name in Zoho Books
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
      
      // Find exact or best match
      for (const contact of contacts) {
        if (contact.contact_name.toLowerCase() === name.toLowerCase()) {
          return contact;
        }
      }
      
      // Return first match if no exact match
      return contacts[0] || null;
    } catch (error) {
      logger.warn('Zoho Books customer search failed', { name, error: error.message });
      return null;
    }
  }

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
      logger.error('Failed to get Zoho Books customers', { error: error.message });
      return [];
    }
  }

  async createBooksSalesOrder(orderData) {
    const token = await this.ensureValidToken();

    // Build line items array for Zoho Books
    const lineItems = (orderData.items || []).map((item, idx) => ({
      name: item.style || item.description || `Line ${idx + 1}`,
      description: item.description || `${item.style} ${item.color} ${item.size}`.trim(),
      quantity: item.quantity || 0,
      rate: item.unitPrice || 0
    }));

    // Build notes with ship-to and other details
    let notes = orderData.notes || '';
    if (orderData.shipDate) notes += `\nShip Not Before: ${orderData.shipDate}`;
    if (orderData.shipNotAfter) notes += `\nShip Not After: ${orderData.shipNotAfter}`;
    if (orderData.cancelDate) notes += `\nCancel Date: ${orderData.cancelDate}`;

    const payload = {
      customer_id: orderData.customerId,
      reference_number: orderData.poNumber,  // Customer PO goes in reference field
      date: orderData.orderDate || new Date().toISOString().split('T')[0],
      shipment_date: orderData.shipDate || null,
      notes: notes,
      terms: orderData.paymentTerms || '',
      line_items: lineItems,
      status: 'draft'  // Create as draft so it can be reviewed
    };

    logger.info('Creating Zoho Books Sales Order', { 
      customerId: orderData.customerId, 
      poNumber: orderData.poNumber,
      lineItemCount: lineItems.length 
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
        data: payload
      });

      // Zoho Books response: { code: 0, message: "...", salesorder: { salesorder_id, salesorder_number, ... } }
      if (response.data?.code === 0 && response.data?.salesorder) {
        const so = response.data.salesorder;
        logger.info('Zoho Books Sales Order created successfully', {
          salesorder_id: so.salesorder_id,
          salesorder_number: so.salesorder_number,
          reference_number: so.reference_number,
          total: so.total
        });
        
        // Return the salesorder object with ID and number at top level for easy access
        return {
          salesorder_id: so.salesorder_id,
          salesorder_number: so.salesorder_number,
          reference_number: so.reference_number,
          customer_name: so.customer_name,
          total: so.total,
          status: so.status,
          ...so  // Include all other fields too
        };
      } else {
        const errorMsg = response.data?.message || 'Unknown error creating sales order';
        logger.error('Zoho Books API error', { response: response.data });
        throw new Error(errorMsg);
      }
    } catch (error) {
      logger.error('Zoho Books createSalesOrder failed', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw error;
    }
  }

  // Check if PO already exists in Zoho Books
  async checkDuplicatePO(poNumber) {
    if (!poNumber) return null;
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

  // Get draft sales orders for a customer (for draft matching)
  async searchDraftSalesOrders(customerId, searchText = '') {
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
          customer_id: customerId,
          status: 'draft'
        }
      });

      return response.data?.salesorders || [];
    } catch (error) {
      logger.warn('Draft sales order search failed', { customerId, error: error.message });
      return [];
    }
  }

  // Get full sales order details including line items
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
      logger.warn('Get sales order details failed', { salesorderId, error: error.message });
      return null;
    }
  }

  // Delete a sales order (for draft replacement)
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

      return response.data?.code === 0;
    } catch (error) {
      logger.error('Delete sales order failed', { salesorderId, error: error.message });
      throw error;
    }
  }

  // ============================================
  // LEGACY ZOHO CRM FUNCTIONS (kept for compatibility)
  // ============================================

  async request(method, endpoint, data = null) {
    const token = await this.ensureValidToken();
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        data
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        logger.warn('Token expired, clearing and retrying');
        this.accessToken = null;
        const newToken = await this.ensureValidToken();
        const retryResponse = await axios({
          method,
          url: `${this.baseUrl}${endpoint}`,
          headers: {
            'Authorization': `Zoho-oauthtoken ${newToken}`,
            'Content-Type': 'application/json'
          },
          data
        });
        return retryResponse.data;
      }
      throw error;
    }
  }

  async getAllAccounts() {
    try {
      const result = await this.request('GET', '/crm/v2/Accounts?per_page=200');
      return result?.data || [];
    } catch (error) {
      logger.warn('Get all accounts failed', { error: error.message });
      return [];
    }
  }
}

module.exports = ZohoClient;
