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

  // Generic request for CRM API
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

      logger.error('Zoho API error', {
        endpoint,
        status: error.response?.status,
        error: error.response?.data || error.message
      });
      throw error;
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

  // Create Sales Order in Zoho Books
  async createBooksSalesOrder(orderData) {
    const token = await this.ensureValidToken();

    // Build line items for Zoho Books format
    const lineItems = (orderData.items || []).map((item, idx) => ({
      name: item.style || item.description || `Item ${idx + 1}`,
      description: `${item.description || ''} | Color: ${item.color || 'N/A'} | Size: ${item.size || 'N/A'}`.trim(),
      quantity: item.quantity || 1,
      rate: item.unitPrice || 0,
      // If you have item_id from Zoho Books inventory, use it:
      // item_id: item.zohoItemId
    }));

    const salesOrderData = {
      customer_id: orderData.customerId,
      // Let Zoho auto-generate the SO number, put PO in reference field
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

  // ==========================================
  // ZOHO CRM API FUNCTIONS (existing)
  // ==========================================

  async findAccountByName(name) {
    if (!name) return null;

    try {
      const result = await this.request('POST', '/crm/v2/coql', {
        select_query: `select id, Account_Name, Client_ID from Accounts where Account_Name = '${name.replace(/'/g, "\\'")}'`
      });
      return result?.data?.[0] || null;
    } catch (error) {
      logger.warn('Account search failed', { name, error: error.message });
      return null;
    }
  }

  async fuzzySearchAccounts(searchTerm) {
    if (!searchTerm) return [];

    try {
      const result = await this.request('POST', '/crm/v2/coql', {
        select_query: `select id, Account_Name, Client_ID from Accounts where Account_Name contains '${searchTerm.replace(/'/g, "\\'").split(' ')[0]}' limit 20`
      });
      return result?.data || [];
    } catch (error) {
      logger.warn('Fuzzy account search failed', { searchTerm, error: error.message });
      return [];
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

  async findBestAccountMatch(ediCustomerName) {
    if (!ediCustomerName) return null;

    // First try exact match
    const exact = await this.findAccountByName(ediCustomerName);
    if (exact) {
      return { account: exact, score: 100, matchType: 'exact' };
    }

    // Try fuzzy search
    const searchTerms = ediCustomerName.split(' ').filter(t => t.length > 2);
    let bestMatch = null;
    let bestScore = 0;

    for (const term of searchTerms) {
      try {
        const results = await this.request('POST', '/crm/v2/coql', {
          select_query: `select id, Account_Name, Client_ID from Accounts where Account_Name contains '${term.replace(/'/g, "\\'")}' limit 10`
        });

        if (results?.data) {
          for (const account of results.data) {
            const score = calculateMatchScore(ediCustomerName, account.Account_Name);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = account;
            }
          }
        }
      } catch (e) {
        // Continue with other terms
      }
    }

    if (bestMatch && bestScore > 30) {
      return { account: bestMatch, score: bestScore, matchType: 'fuzzy' };
    }

    return null;
  }

  async findAccountByClientId(clientId) {
    if (!clientId) return null;

    try {
      const result = await this.request('POST', '/crm/v2/coql', {
        select_query: `select id, Account_Name, Client_ID from Accounts where Client_ID = '${clientId}'`
      });
      return result?.data?.[0] || null;
    } catch (error) {
      logger.warn('Account search by Client_ID failed', { clientId, error: error.message });
      return null;
    }
  }

  async findCustomerDC(accountId, dcCode) {
    if (!dcCode) return null;

    try {
      const result = await this.request('POST', '/crm/v2/coql', {
        select_query: `select id, Name from Customer_DCs where Name contains '${dcCode}'`
      });
      return result?.data?.[0] || null;
    } catch (error) {
      logger.warn('Customer DC search failed', { dcCode, error: error.message });
      return null;
    }
  }

  async findItemBySKU(sku) {
    if (!sku) return null;

    try {
      const result = await this.request('POST', '/crm/v2/coql', {
        select_query: `select id, Name from Items where Name = '${sku.replace(/'/g, "\\'")}'`
      });
      return result?.data?.[0] || null;
    } catch (error) {
      logger.warn('Item search failed', { sku, error: error.message });
      return null;
    }
  }

  async checkDuplicateOrder(poNumber) {
    if (!poNumber) return null;

    try {
      const result = await this.request('POST', '/crm/v2/coql', {
        select_query: `select id, Name, EDI_Order_Number from Sales_Order_Headers where EDI_Order_Number = '${poNumber.replace(/'/g, "\\'")}'`
      });
      return result?.data?.[0] || null;
    } catch (error) {
      logger.warn('Duplicate check failed, proceeding anyway', { poNumber, error: error.message });
      return null;
    }
  }

  async createSalesOrderHeader(orderData) {
    const payload = {
      data: [{
        Name: orderData.salesOrderNumber || `EDI-${orderData.poNumber}`,
        EDI_Order_Number: orderData.poNumber || '',
        Sales_Order_Date: orderData.orderDate || new Date().toISOString().split('T')[0],
        Status: orderData.status || process.env.DEFAULT_ORDER_STATUS || 'EDI Received',
        ...(orderData.accountId && { Account: orderData.accountId }),
        Client_ID: orderData.clientId || '',
        ...(orderData.customerDCId && { Customer_DC: orderData.customerDCId }),
        ...(orderData.cancelDate && { Cancel_Date: orderData.cancelDate }),
        ...(orderData.shipDate && { Start_Ship_DATE_to_customer: orderData.shipDate }),
        ...(orderData.shipCloseDate && { Expected_Shipment_Date: orderData.shipCloseDate }),
        Reference_Number: orderData.referenceNumber || '',
        Customer_Notes: orderData.notes || ''
      }],
      trigger: ['workflow']
    };

    logger.info('Creating Sales Order Header', { poNumber: orderData.poNumber });

    const result = await this.request('POST', '/crm/v2/Sales_Order_Headers', payload);

    if (result?.data?.[0]?.status === 'success') {
      const created = result.data[0].details;
      logger.info('Created Sales Order Header', { id: created.id, poNumber: orderData.poNumber });
      return created;
    } else {
      const errorMsg = result?.data?.[0]?.message || JSON.stringify(result);
      logger.error('Failed to create Sales Order Header', { error: errorMsg, poNumber: orderData.poNumber });
      throw new Error(`Failed to create Sales Order Header: ${errorMsg}`);
    }
  }

  async createSalesOrderItem(itemData) {
    const payload = {
      data: [{
        Sales_Order_Header: itemData.salesOrderHeaderId,
        ...(itemData.itemId && { Item: itemData.itemId }),
        Customer_SKU: itemData.customerSKU || '',
        Customer_Style: itemData.customerStyle || '',
        Style: itemData.style || '',
        Color: itemData.color || '',
        Size: itemData.size || '',
        Quantity: itemData.quantity || 0,
        Rate: itemData.unitPrice || 0,
        Amount: itemData.amount || (itemData.quantity * itemData.unitPrice) || 0,
        ...(itemData.shipDate && { Ship_Date: itemData.shipDate }),
        Description: itemData.description || '',
        Customer_PO: itemData.customerPO || '',
        Ordinal: parseInt(itemData.lineNumber) || 1
      }],
      trigger: ['workflow']
    };

    const result = await this.request('POST', '/crm/v2/Sales_Order_Items', payload);

    if (result?.data?.[0]?.status === 'success') {
      const created = result.data[0].details;
      logger.info('Created Sales Order Item', { id: created.id, sku: itemData.customerSKU });
      return created;
    } else {
      const errorMsg = result?.data?.[0]?.message || JSON.stringify(result);
      logger.error('Failed to create Sales Order Item', { error: errorMsg });
      throw new Error(`Failed to create Sales Order Item: ${errorMsg}`);
    }
  }

  async createSalesOrderWithItems(orderData, items) {
    const header = await this.createSalesOrderHeader(orderData);
    const createdItems = [];

    for (const item of items) {
      try {
        const createdItem = await this.createSalesOrderItem({
          ...item,
          salesOrderHeaderId: header.id,
          customerPO: orderData.poNumber
        });
        createdItems.push(createdItem);
      } catch (error) {
        logger.error('Failed to create line item', { item: item.customerSKU, error: error.message });
      }
    }

    return {
      header,
      items: createdItems,
      itemsCreated: createdItems.length,
      itemsFailed: items.length - createdItems.length
    };
  }
}

module.exports = ZohoClient;

// Fuzzy match score calculation
function calculateMatchScore(str1, str2) {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 80;

  // Calculate word overlap
  const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  let matches = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matches++;
        break;
      }
    }
  }

  const maxWords = Math.max(words1.length, words2.length);
  if (maxWords === 0) return 0;

  return Math.round((matches / maxWords) * 70);
}
