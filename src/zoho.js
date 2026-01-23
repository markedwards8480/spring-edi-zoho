const axios = require('axios');
const logger = require('./logger');
const { pool } = require('./db');

class ZohoClient {
  constructor() {
    this.baseUrl = process.env.ZOHO_API_BASE || 'https://www.zohoapis.com';
    this.accountsUrl = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';
    this.clientId = process.env.ZOHO_CLIENT_ID;
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET;
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
        logger.error('Failed to create line item', { 
          item: item.customerSKU,
          error: error.message 
        });
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
