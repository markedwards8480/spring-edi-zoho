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
    // Check if we have a valid token in memory
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Try to get from database
    const result = await pool.query(
      'SELECT access_token, refresh_token, expires_at FROM zoho_tokens ORDER BY id DESC LIMIT 1'
    );

    if (result.rows.length > 0) {
      const token = result.rows[0];
      const expiresAt = new Date(token.expires_at);
      
      // If token is still valid (with 5 min buffer)
      if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
        this.accessToken = token.access_token;
        this.tokenExpiry = expiresAt;
        return this.accessToken;
      }

      // Token expired, refresh it
      return await this.refreshAccessToken(token.refresh_token);
    }

    // No token in database - check environment
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

      // Save to database
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
      // Handle token expiry
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

  // ============ Account/Customer Lookup ============
  
  async findAccountByClientId(clientId) {
    const result = await this.request('GET', 
      `/crm/v2/Accounts/search?criteria=(Client_ID:equals:${encodeURIComponent(clientId)})`
    );
    return result?.data?.[0] || null;
  }

  async findAccountByName(name) {
    const result = await this.request('GET',
      `/crm/v2/Accounts/search?criteria=(Account_Name:equals:${encodeURIComponent(name)})`
    );
    return result?.data?.[0] || null;
  }

  // ============ Customer DC Lookup ============
  
  async findCustomerDC(accountId, dcCode) {
    // Try to find by DC code
    const result = await this.request('GET',
      `/crm/v2/Customer_DCs/search?criteria=((Account:equals:${accountId})and(Name:contains:${encodeURIComponent(dcCode)}))`
    );
    return result?.data?.[0] || null;
  }

  // ============ Item/Product Lookup ============
  
  async findItemBySKU(sku) {
    const result = await this.request('GET',
      `/crm/v2/Items/search?criteria=(Name:equals:${encodeURIComponent(sku)})`
    );
    return result?.data?.[0] || null;
  }

  async findItemByStyle(style) {
    const result = await this.request('GET',
      `/crm/v2/Items/search?criteria=(Style:equals:${encodeURIComponent(style)})`
    );
    return result?.data?.[0] || null;
  }

  // ============ Sales Order Creation ============

  async createSalesOrderHeader(orderData) {
    const payload = {
      data: [{
        // Required fields
        Name: orderData.salesOrderNumber || `EDI-${orderData.poNumber}`,
        EDI_Order_Number: orderData.poNumber,
        Sales_Order_Date: orderData.orderDate,
        Status: process.env.DEFAULT_ORDER_STATUS || 'EDI Received',
        
        // Customer linkage
        Account: orderData.accountId,
        Client_ID: orderData.clientId,
        
        // Ship-to
        Customer_DC: orderData.customerDCId,
        Customer_Ship_To: orderData.shipToId,
        
        // Dates
        Cancel_Date: orderData.cancelDate,
        Start_Ship_DATE_to_customer: orderData.shipDate,
        Expected_Shipment_Date: orderData.expectedShipDate,
        
        // Reference
        Reference_Number: orderData.referenceNumber,
        Customer_Notes: orderData.notes,
        
        // Other fields as needed
        Import_Purchase_Order: orderData.poNumber
      }],
      trigger: ['workflow'] // Trigger any Zoho workflows
    };

    const result = await this.request('POST', '/crm/v2/Sales_Order_Headers', payload);
    
    if (result?.data?.[0]?.status === 'success') {
      const created = result.data[0].details;
      logger.info('Created Sales Order Header', { id: created.id, poNumber: orderData.poNumber });
      return created;
    } else {
      const error = result?.data?.[0]?.message || 'Unknown error';
      throw new Error(`Failed to create Sales Order Header: ${error}`);
    }
  }

  async createSalesOrderItem(itemData) {
    const payload = {
      data: [{
        // Link to header
        Sales_Order_Header: itemData.salesOrderHeaderId,
        
        // Product identification
        Item: itemData.itemId, // Lookup to Items module
        Customer_SKU: itemData.customerSKU,
        Customer_Style: itemData.customerStyle,
        Style: itemData.style,
        Color: itemData.color,
        Size: itemData.size,
        
        // Quantities and pricing
        Quantity: itemData.quantity,
        Rate: itemData.unitPrice,
        Amount: itemData.amount || (itemData.quantity * itemData.unitPrice),
        
        // Dates
        Ship_Date: itemData.shipDate,
        
        // Additional fields
        Description: itemData.description,
        Customer_PO: itemData.customerPO,
        Ordinal: itemData.lineNumber
      }],
      trigger: ['workflow']
    };

    const result = await this.request('POST', '/crm/v2/Sales_Order_Items', payload);
    
    if (result?.data?.[0]?.status === 'success') {
      const created = result.data[0].details;
      logger.info('Created Sales Order Item', { id: created.id, sku: itemData.customerSKU });
      return created;
    } else {
      const error = result?.data?.[0]?.message || 'Unknown error';
      throw new Error(`Failed to create Sales Order Item: ${error}`);
    }
  }

  async createSalesOrderWithItems(orderData, items) {
    // First create the header
    const header = await this.createSalesOrderHeader(orderData);
    
    // Then create all line items
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
        // Continue with other items
      }
    }

    return {
      header,
      items: createdItems,
      itemsCreated: createdItems.length,
      itemsFailed: items.length - createdItems.length
    };
  }

  // ============ Check for Duplicate ============
  
  async checkDuplicateOrder(poNumber) {
    const result = await this.request('GET',
      `/crm/v2/Sales_Order_Headers/search?criteria=(EDI_Order_Number:equals:${encodeURIComponent(poNumber)})`
    );
    return result?.data?.[0] || null;
  }
}

module.exports = ZohoClient;
