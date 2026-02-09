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

  // Get confirmed sales orders (for matching revised EDI 850s)
  async getConfirmedSalesOrders() {
    const token = await this.ensureValidToken();
    
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/books/v3/salesorders`,
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
        params: {
          organization_id: this.orgId,
          status: 'confirmed',
          per_page: 200
        }
      });

      return response.data?.salesorders || [];
    } catch (error) {
      logger.error('Failed to get confirmed sales orders', { error: error.message });
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
              cancelDate: parsed.dates?.cancelDate || parsed.dates?.shipNotAfter || '',
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
              cancelDate: draft.cf_cancel_date || draft.custom_field_hash?.cf_cancel_date || draft.custom_fields?.find(f => f.label?.toLowerCase().includes('cancel'))?.value || '',
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
   * Now supports customer-specific matching rules
   */
  async findMatchingDraftsFromCache(ediOrders, cachedDrafts, customerMappings = [], customerRules = []) {
    logger.info('Starting draft matching from cache', {
      ediOrderCount: ediOrders.length,
      cachedDraftsCount: cachedDrafts.length,
      customerMappingsCount: customerMappings.length,
      customerRulesCount: customerRules.length
    });

    // Build lookup map for customer mappings (EDI name -> Zoho customer ID)
    const customerMappingLookup = new Map();
    customerMappings.forEach(m => {
      if (m.edi_customer_name && m.zoho_customer_id) {
        customerMappingLookup.set(m.edi_customer_name.toLowerCase().trim(), m.zoho_customer_id);
      }
    });

    // Helper function to find the applicable rule for a customer
    const findRuleForCustomer = (customerName) => {
      if (!customerName) return customerRules.find(r => r.is_default) || null;
      const customerLower = customerName.toLowerCase().trim();
      // First try exact match
      const exactMatch = customerRules.find(r =>
        !r.is_default && r.customer_name?.toLowerCase().trim() === customerLower
      );
      if (exactMatch) return exactMatch;
      // Then try partial match (customer name contains rule's customer_name)
      const partialMatch = customerRules.find(r =>
        !r.is_default && customerLower.includes(r.customer_name?.toLowerCase().trim())
      );
      if (partialMatch) return partialMatch;
      // Fall back to default rule
      return customerRules.find(r => r.is_default) || null;
    };

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

      // Find the applicable matching rule for this customer
      const rule = findRuleForCustomer(ediCustomer);
      const ruleInfo = rule ? {
        id: rule.id,
        customerName: rule.customer_name,
        isDefault: rule.is_default,
        matchMethod: rule.match_by_customer_po ? 'customer_po' :
                     rule.match_by_contract_ref ? 'contract_ref' : 'style_customer',
        contractRefField: rule.contract_ref_field,
        actionOnMatch: rule.action_on_match,
        edi860Action: rule.edi_860_action,
        bulkOrderStatus: rule.bulk_order_status,
        bulkOrderCategory: rule.bulk_order_category
      } : null;

      // Collect ALL potential matches, not just the best one
      const potentialMatches = [];

      for (const draft of cachedDrafts) {
        // If rule specifies bulk order status filter, apply it
        if (rule && rule.bulk_order_status) {
          const draftStatus = (draft.status || '').toLowerCase();
          const ruleStatus = rule.bulk_order_status.toLowerCase();
          if (draftStatus !== ruleStatus) continue; // Skip drafts that don't match the expected status
        }

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
          line_items: draft.line_items || [],
          // Include contract reference field if needed for rule-based matching
          po_rel_num: draft.po_rel_num || draft.custom_field_hash?.cf_po_rel_num || ''
        };

        const score = this.scoreMatch(ediOrder, draftForScoring, customerMappingLookup, rule);

        // MATCHING RULES - Now based on customer-specific rules if available
        let shouldInclude = false;
        const meetsThreshold = score.total >= 25;

        if (rule && rule.match_by_customer_po) {
          // RULE: Match by Customer PO (e.g., Kohls)
          // EDI PO number should match Zoho reference_number
          shouldInclude = meetsThreshold && score.details.po;
        } else if (rule && rule.match_by_contract_ref) {
          // RULE: Match by Contract Reference field (e.g., JCP uses po_rel_num)
          // Check if contract ref field matches
          const contractRef = rule.contract_ref_field || 'po_rel_num';
          const ediContractRef = parsed[contractRef] || parsed.header?.[contractRef] || ediPoNumber;
          const zohoContractRef = draft[contractRef] || draft.custom_field_hash?.[`cf_${contractRef}`] || draft.reference_number || '';
          const contractRefMatches = ediContractRef && zohoContractRef &&
            ediContractRef.toLowerCase().trim() === zohoContractRef.toLowerCase().trim();
          shouldInclude = meetsThreshold && (contractRefMatches || score.details.po);
          if (contractRefMatches) score.details.contractRef = true;
        } else {
          // DEFAULT RULE: Match by Style + Customer (original behavior)
          const poMatches = score.details.po;
          const customerAndStyleMatch = score.details.customer && score.details.baseStyle;
          shouldInclude = meetsThreshold && (poMatches || customerAndStyleMatch);
        }

        if (shouldInclude) {
          potentialMatches.push({
            draft,
            score,
            zohoDraft: {
              id: draft.salesorder_id,
              number: draft.salesorder_number,
              reference: draft.reference_number || '',
              customer: draft.customer_name,
              shipDate: draft.shipment_date || '',
              cancelDate: draft.cf_cancel_date || draft.custom_field_hash?.cf_cancel_date || draft.custom_fields?.find(f => f.label?.toLowerCase().includes('cancel'))?.value || '',
              status: draft.status,
              itemCount: (draft.line_items || []).length,
              totalUnits: (draft.line_items || []).reduce((s, i) => s + (i.quantity || 0), 0),
              totalAmount: parseFloat(draft.total) || 0,
              items: draft.line_items || []
            }
          });
        }
      }

      // Sort by score descending and take top 5
      potentialMatches.sort((a, b) => b.score.total - a.score.total);
      const topMatches = potentialMatches.slice(0, 5);

      if (topMatches.length > 0) {
        const bestMatch = topMatches[0];
        const alternativeMatches = topMatches.slice(1).map(m => ({
          zohoDraft: m.zohoDraft,
          score: m.score,
          confidence: m.score.total,
          confidenceLevel: m.score.total >= 80 ? 'high' : m.score.total >= 60 ? 'medium' : 'low'
        }));

        matches.push({
          ediOrder: {
            id: ediOrder.id,
            poNumber: ediPoNumber,
            customer: ediCustomer,
            shipDate: ediShipDate,
            cancelDate: parsed.dates?.cancelDate || parsed.dates?.shipNotAfter || '',
            itemCount: ediItems.length,
            totalUnits: ediItems.reduce((s, i) => s + (i.quantityOrdered || 0), 0),
            totalAmount: ediTotal,
            items: ediItems
          },
          zohoDraft: bestMatch.zohoDraft,
          score: bestMatch.score,
          confidence: bestMatch.score.total,
          confidenceLevel: bestMatch.score.total >= 80 ? 'high' : bestMatch.score.total >= 60 ? 'medium' : 'low',
          // Include alternative matches
          alternativeMatches: alternativeMatches,
          // Include applicable matching rule info for this customer
          matchingRule: ruleInfo
        });
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
          },
          // Include rule info even for no-matches (to show what rule was applied)
          matchingRule: ruleInfo
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
   * - PO Number match (EDI PO = Zoho reference_number): 30 points (HIGH priority)
   * - Customer match: 15 points
   * - Base Style match: 20 points (at least one base style must match)
   * - Style Suffix match: 5 points (bonus if suffixes also match)
   * - Ship Date match: 10 points (within 7 days = 10, within 14 days = 5)
   * - Cancel Date match: 5 points
   * - Total Units match: 8 points (within 5% = 8, within 15% = 4)
   * - Total Amount match: 7 points (within 5% = 7, within 15% = 3)
   *
   * 100% = All criteria match perfectly
   *
   * Now supports customer-specific rules for customized scoring
   */
  scoreMatch(ediOrder, zohoDraft, customerMappingLookup = new Map(), rule = null) {
    const score = {
      total: 0,
      details: {
        po: false,
        customer: false,
        customerMapped: false,
        shipDate: false,
        cancelDate: false,
        totalAmount: false,
        totalUnits: false,
        baseStyle: false,
        styleSuffix: false,
        contractRef: false,
        shipDateDiffDays: null,
        cancelDateDiffDays: null,
        amountDiffPercent: null,
        unitsDiffPercent: null,
        matchMethod: rule ? (rule.match_by_customer_po ? 'customer_po' : rule.match_by_contract_ref ? 'contract_ref' : 'style_customer') : 'style_customer'
      }
    };

    const parsed = ediOrder.parsed_data || {};
    const ediItems = parsed.items || [];
    const ediPoNumber = (ediOrder.edi_order_number || '').toLowerCase().trim();
    const ediCustomer = (ediOrder.edi_customer_name || '').toLowerCase().trim();
    const ediTotalAmount = ediItems.reduce((sum, item) =>
      sum + ((item.quantityOrdered || 0) * (item.unitPrice || 0)), 0);
    const ediTotalUnits = ediItems.reduce((sum, item) => sum + (item.quantityOrdered || 0), 0);
    // Ship Open Date = Expected Shipment Date
    const ediShipDate = parsed.dates?.shipDate || parsed.dates?.shipNotBefore || '';
    // Ship Close Date = Cancel Date
    const ediCancelDate = parsed.dates?.cancelDate || parsed.dates?.shipNotAfter || '';

    const zohoRef = (zohoDraft.reference_number || '').toLowerCase().trim();
    const zohoCustomer = (zohoDraft.customer_name || '').toLowerCase().trim();
    const zohoTotalAmount = parseFloat(zohoDraft.total) || 0;
    const zohoItems = zohoDraft.line_items || [];
    const zohoTotalUnits = zohoItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const zohoShipDate = zohoDraft.shipment_date || '';
    // Zoho doesn't have a standard cancel date field, check custom fields
    const zohoCancelDate = zohoDraft.cf_cancel_date || zohoDraft.custom_field_hash?.cf_cancel_date || '';

    // ============================================================
    // PO NUMBER MATCH (30 points) - HIGH PRIORITY
    // EDI PO Number should match Zoho reference_number
    // ============================================================
    if (ediPoNumber && zohoRef) {
      if (ediPoNumber === zohoRef) {
        score.total += 30;
        score.details.po = true;
      } else if (zohoRef.includes(ediPoNumber) || ediPoNumber.includes(zohoRef)) {
        // Partial match (one contains the other)
        score.total += 20;
        score.details.po = true;
      }
    }

    // ============================================================
    // CUSTOMER MATCH (15 points)
    // Check customer mappings first, then fall back to fuzzy matching
    // ============================================================
    const zohoCustomerId = zohoDraft.customer_id || '';

    // First check: Does the EDI customer have a mapping to this Zoho customer?
    const mappedZohoId = customerMappingLookup.get(ediCustomer);
    if (mappedZohoId && mappedZohoId === zohoCustomerId) {
      // Perfect match via customer mapping - highest confidence
      score.total += 15;
      score.details.customer = true;
      score.details.customerMapped = true;
      logger.debug('Customer matched via mapping', { ediCustomer, zohoCustomerId, mappedZohoId });
    } else if (ediCustomer && zohoCustomer) {
      // Fallback: Fuzzy text matching
      const ediParts = ediCustomer.split(/[\s,]+/).filter(p => p.length > 2);
      const zohoParts = zohoCustomer.split(/[\s,]+/).filter(p => p.length > 2);
      const matchingParts = ediParts.filter(ep =>
        zohoParts.some(zp => zp.includes(ep) || ep.includes(zp))
      );
      if (matchingParts.length > 0 || ediCustomer.includes(zohoCustomer) || zohoCustomer.includes(ediCustomer)) {
        score.total += 15;
        score.details.customer = true;
      }
    }

    // ============================================================
    // STYLE/SKU MATCH (30 points) - REQUIRED
    // At least one BASE STYLE must match for this to be considered a match
    // 
    // MATCHING RULES:
    // - Base style (e.g., "77887X") MUST match - this is required
    // - Suffix (e.g., "-BB", "-BC") affects confidence but is NOT required
    //   - Same suffix = higher confidence
    //   - Different suffix = still a match, but lower confidence (customers often send wrong suffix)
    //
    // Examples:
    // EDI: "1234J-BB" vs Zoho: "1234J-BB" = HIGH confidence (base + suffix match)
    // EDI: "1234J-BB" vs Zoho: "1234J-BC" = MEDIUM confidence (base matches, suffix different)
    // EDI: "1234J-BB" vs Zoho: "5678K-BB" = NO MATCH (base doesn't match)
    // ============================================================
    
    // Helper function to extract base style (the core style number before suffix)
    const extractBaseStyle = (styleStr) => {
      if (!styleStr) return '';
      const s = styleStr.toLowerCase().trim();
      // Pattern: digits followed by optional letter(s), e.g., "77887X", "84968X"
      // This captures the style number which is usually 5-6 digits + optional letter
      const match = s.match(/^(\d{4,6}[a-z]?)/i);
      if (match) return match[1];
      // Fallback: take first part before dash if it looks like a style
      const firstPart = s.split('-')[0];
      if (firstPart && /\d{4,}/.test(firstPart)) return firstPart;
      return s;
    };
    
    // Helper function to extract suffix (the part after base style, e.g., "-BB", "-BC")
    const extractSuffix = (styleStr) => {
      if (!styleStr) return '';
      const s = styleStr.toLowerCase().trim();
      // Get everything after the base style number
      const match = s.match(/^\d{4,6}[a-z]?[-]?([a-z]{1,3})?/i);
      if (match && match[1]) return match[1];
      // Try splitting by dash
      const parts = s.split('-');
      if (parts.length >= 2 && parts[1].length <= 3) return parts[1];
      return '';
    };
    
    if (ediItems.length > 0 && zohoItems.length > 0) {
      // Extract EDI styles with base and suffix, AND UPCs
      const ediStyles = [];
      const ediUpcs = new Set();
      ediItems.forEach(i => {
        const sku = (i.productIds?.sku || i.productIds?.vendorItemNumber || '').trim();
        const upc = (i.productIds?.upc || i.productIds?.gtin || '').trim();

        // Collect UPCs for matching
        if (upc && upc.length >= 10) {
          ediUpcs.add(upc);
        }

        // Check if SKU looks like a UPC (12+ digits) - some retailers send UPC as style
        if (sku && /^\d{10,14}$/.test(sku)) {
          ediUpcs.add(sku);
        } else if (sku) {
          const baseStyle = extractBaseStyle(sku);
          const suffix = extractSuffix(sku);
          if (baseStyle && baseStyle.length >= 5) {
            ediStyles.push({ full: sku.toLowerCase(), base: baseStyle, suffix: suffix });
          }
        }
      });

      // Extract Zoho styles with base and suffix, AND UPCs
      const zohoStyles = [];
      const zohoUpcs = new Set();
      zohoItems.forEach(i => {
        const name = (i.name || '').trim();
        const desc = (i.description || '').trim();
        // UPC can be in cf_upc, upc, or item.upc depending on Zoho setup
        const upc = (i.cf_upc || i.upc || i.item?.upc || '').toString().trim();

        // Collect UPCs for matching
        if (upc && upc.length >= 10) {
          zohoUpcs.add(upc);
        }

        // Check item name (e.g., "77887X-BQ-GREY-1X")
        if (name) {
          const baseStyle = extractBaseStyle(name);
          const suffix = extractSuffix(name);
          if (baseStyle && baseStyle.length >= 5) {
            zohoStyles.push({ full: name.toLowerCase(), base: baseStyle, suffix: suffix });
          }
        }

        // Also check description for style patterns
        if (desc) {
          const styleMatch = desc.match(/(\d{4,6}[a-z]?)/i);
          if (styleMatch) {
            const baseStyle = styleMatch[1].toLowerCase();
            zohoStyles.push({ full: desc.toLowerCase(), base: baseStyle, suffix: '' });
          }
        }
      });

      // Check for UPC matches first (high confidence if UPCs match)
      let upcMatches = 0;
      ediUpcs.forEach(ediUpc => {
        if (zohoUpcs.has(ediUpc)) {
          upcMatches++;
        }
      });

      if (upcMatches > 0) {
        score.details.upcMatch = true;
        score.details.upcMatchCount = upcMatches;
        score.details.ediUpcCount = ediUpcs.size;
        score.details.zohoUpcCount = zohoUpcs.size;
        // UPC match is very strong - award full style points
        score.total += 30;
        score.details.baseStyle = true;
        logger.debug('UPC match found', {
          ediUpcs: [...ediUpcs].slice(0, 3),
          zohoUpcs: [...zohoUpcs].slice(0, 3),
          matches: upcMatches
        });
      }

      // If no UPC match, try style matching
      if (!score.details.upcMatch) {
        // Get unique base styles
        const ediBaseStyles = new Set(ediStyles.map(s => s.base));
        const zohoBaseStyles = new Set(zohoStyles.map(s => s.base));

        // Count base style matches (REQUIRED for any match)
        let baseStyleMatches = 0;
        let suffixMatches = 0;
        let suffixMismatches = 0;

        ediBaseStyles.forEach(ediBase => {
          if (zohoBaseStyles.has(ediBase)) {
            baseStyleMatches++;

            // Check suffix match for this base style
            const ediSuffixes = ediStyles.filter(s => s.base === ediBase).map(s => s.suffix).filter(s => s);
            const zohoSuffixes = zohoStyles.filter(s => s.base === ediBase).map(s => s.suffix).filter(s => s);

            if (ediSuffixes.length > 0 && zohoSuffixes.length > 0) {
              // Check if any suffixes match
              const hasMatchingSuffix = ediSuffixes.some(es => zohoSuffixes.includes(es));
              if (hasMatchingSuffix) {
                suffixMatches++;
              } else {
                suffixMismatches++;
              }
            }
          }
        });

        // Collect all unique suffixes for display
        const allEdiSuffixes = [...new Set(ediStyles.map(s => s.suffix).filter(s => s))];
        const allZohoSuffixes = [...new Set(zohoStyles.map(s => s.suffix).filter(s => s))];

        if (baseStyleMatches > 0) {
        score.details.baseStyle = true;
        score.details.styleMatchCount = baseStyleMatches;
        score.details.ediStyleCount = ediBaseStyles.size;
        score.details.zohoStyleCount = zohoBaseStyles.size;
        score.details.suffixMatches = suffixMatches;
        score.details.ediSuffixes = allEdiSuffixes.length > 0 ? allEdiSuffixes.map(s => '-' + s.toUpperCase()).join(', ') : '';
        score.details.zohoSuffixes = allZohoSuffixes.length > 0 ? allZohoSuffixes.map(s => '-' + s.toUpperCase()).join(', ') : '';
        score.details.suffixMismatches = suffixMismatches;

        // Score based on how many base styles matched (up to 20 points)
        const matchRatio = baseStyleMatches / Math.max(ediBaseStyles.size, 1);

        // Base style points (20 max)
        let baseStylePoints = 10; // At least one base style matches
        if (matchRatio >= 0.8) {
          baseStylePoints = 20; // Almost all base styles match
        } else if (matchRatio >= 0.5) {
          baseStylePoints = 16; // Most base styles match
        } else if (matchRatio >= 0.25) {
          baseStylePoints = 12; // Some base styles match
        }
        score.total += baseStylePoints;

        // Suffix points (5 max - bonus for suffix matching)
        if (suffixMatches > 0 && suffixMismatches === 0) {
          score.total += 5; // All suffixes match
          score.details.styleSuffix = true;
        } else if (suffixMatches > suffixMismatches) {
          score.total += 3; // Most suffixes match
          score.details.styleSuffix = true;
        } else if (suffixMismatches > 0) {
          // Suffix mismatch - note it for display
          score.details.suffixWarning = true;
        }

        logger.debug('Style match found', {
          ediBaseStyles: Array.from(ediBaseStyles),
          zohoBaseStyles: Array.from(zohoBaseStyles),
          baseStyleMatches,
          suffixMatches,
          suffixMismatches,
          baseStylePoints
        });
        } else {
          logger.debug('No style match - base styles do not overlap', {
            ediBaseStyles: Array.from(ediBaseStyles),
            zohoBaseStyles: Array.from(zohoBaseStyles)
          });
        }
      } // end if (!score.details.upcMatch)
    }

    // ============================================================
    // SHIP DATE (10 points)
    // ============================================================
    if (ediShipDate && zohoShipDate) {
      const ediDate = new Date(ediShipDate);
      const zohoDate = new Date(zohoShipDate);
      const diffDays = Math.abs((ediDate - zohoDate) / (1000 * 60 * 60 * 24));
      score.details.shipDateDiffDays = Math.round(diffDays);

      if (diffDays <= 1) {
        score.total += 10;
        score.details.shipDate = true;
      } else if (diffDays <= 7) {
        score.total += 7;
        score.details.shipDate = true;
      } else if (diffDays <= 14) {
        score.total += 4;
      }
      // >14 days = 0 points
    }

    // ============================================================
    // CANCEL DATE (5 points)
    // ============================================================
    if (ediCancelDate && zohoCancelDate) {
      const ediDate = new Date(ediCancelDate);
      const zohoDate = new Date(zohoCancelDate);
      const diffDays = Math.abs((ediDate - zohoDate) / (1000 * 60 * 60 * 24));
      score.details.cancelDateDiffDays = Math.round(diffDays);

      if (diffDays <= 1) {
        score.total += 5;
        score.details.cancelDate = true;
      } else if (diffDays <= 7) {
        score.total += 3;
        score.details.cancelDate = true;
      }
    }

    // ============================================================
    // TOTAL UNITS (8 points)
    // ============================================================
    if (ediTotalUnits > 0 && zohoTotalUnits > 0) {
      const diff = Math.abs(ediTotalUnits - zohoTotalUnits);
      const percentDiff = diff / Math.max(ediTotalUnits, zohoTotalUnits);
      score.details.unitsDiffPercent = Math.round(percentDiff * 100);

      if (percentDiff <= 0.02) {
        score.total += 8;
        score.details.totalUnits = true;
      } else if (percentDiff <= 0.05) {
        score.total += 6;
        score.details.totalUnits = true;
      } else if (percentDiff <= 0.15) {
        score.total += 3;
      }
      // >15% difference = 0 points
    }

    // ============================================================
    // TOTAL AMOUNT (7 points)
    // ============================================================
    if (ediTotalAmount > 0 && zohoTotalAmount > 0) {
      const diff = Math.abs(ediTotalAmount - zohoTotalAmount);
      const percentDiff = diff / Math.max(ediTotalAmount, zohoTotalAmount);
      score.details.amountDiffPercent = Math.round(percentDiff * 100);

      if (percentDiff <= 0.02) {
        score.total += 7;
        score.details.totalAmount = true;
      } else if (percentDiff <= 0.05) {
        score.total += 5;
        score.details.totalAmount = true;
      } else if (percentDiff <= 0.15) {
        score.total += 2;
      }
      // >15% difference = 0 points
    }

    // PO number matching is now handled at the top with 30 points

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
          cancelDate: parsed.dates?.cancelDate || parsed.dates?.shipNotAfter || '',
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
   * @param {string} salesorderId - Zoho sales order ID
   * @param {object} ediOrder - EDI order data
   * @param {object} options - Optional: { selectedFields, overrides, selectedItems }
   */
  async updateDraftWithEdiData(salesorderId, ediOrder, options = {}) {
    const parsed = ediOrder.parsed_data || {};
    const { selectedFields = {}, overrides = {}, selectedItems, preserveZohoItems = true } = options;

    // Use selectedItems if provided, otherwise use all items
    const ediItems = selectedItems || parsed.items || [];

    const updateData = {
      reference_number: ediOrder.edi_order_number,
      notes: `Updated from EDI ${ediOrder.edi_order_number} on ${new Date().toISOString()}`
    };

    // Apply selected fields (only include if selected or not specified = default to include)
    if (selectedFields.shipDate !== false) {
      updateData.shipment_date = overrides.shipDate || parsed.dates?.shipNotBefore || undefined;
    }

    // Cancel date goes to custom field (if your Zoho has one) - check if selected
    if (selectedFields.cancelDate !== false && (overrides.cancelDate || parsed.dates?.cancelDate)) {
      // Note: Zoho Books doesn't have a native cancel date field
      // You may need to use a custom field - adjust field name as needed
      // updateData.cf_cancel_date = overrides.cancelDate || parsed.dates?.cancelDate;
    }

    // Handle line items - preserve Zoho items by default
    if (ediItems.length > 0 && preserveZohoItems) {
      // Fetch current Zoho draft to get existing line items
      const currentDraft = await this.getSalesOrderDetails(salesorderId);
      const zohoLineItems = currentDraft?.line_items || [];

      if (zohoLineItems.length > 0) {
        // Build a map of EDI items by UPC for matching
        const ediByUpc = new Map();
        ediItems.forEach(item => {
          const upc = item.productIds?.upc;
          if (upc) ediByUpc.set(upc, item);
        });

        // Update existing Zoho line items with EDI qty/price where we can match
        const updatedLineItems = zohoLineItems.map(zohoItem => {
          const zohoUpc = zohoItem.cf_upc || zohoItem.upc || '';
          const matchedEdi = ediByUpc.get(zohoUpc);

          // Preserve the existing Zoho item, only update qty and rate if matched
          const updatedItem = {
            line_item_id: zohoItem.line_item_id, // CRITICAL: Keep the existing line item ID
            item_id: zohoItem.item_id,           // Keep the Zoho item reference
            quantity: matchedEdi ? (matchedEdi.quantityOrdered || zohoItem.quantity) : zohoItem.quantity,
            rate: matchedEdi ? (matchedEdi.unitPrice || zohoItem.rate) : zohoItem.rate
          };

          // Remove the matched EDI item so we can track unmatched ones
          if (matchedEdi) {
            ediByUpc.delete(zohoUpc);
          }

          return updatedItem;
        });

        // Log matching results
        const matchedCount = ediItems.length - ediByUpc.size;
        logger.info('Line item matching results', {
          salesorderId,
          ediItemCount: ediItems.length,
          zohoItemCount: zohoLineItems.length,
          matchedByUpc: matchedCount,
          unmatchedEdi: ediByUpc.size
        });

        updateData.line_items = updatedLineItems;
      } else {
        // No existing Zoho items - fall back to creating new ones
        logger.info('No existing Zoho line items, creating new ones', { salesorderId });
        updateData.line_items = ediItems.map(item => ({
          name: item.productIds?.sku || item.productIds?.vendorItemNumber || 'Item',
          description: `${item.productIds?.sku || ''} ${item.description || ''} ${item.color || ''} ${item.size || ''}`.trim(),
          quantity: item.quantityOrdered || 0,
          rate: item.unitPrice || 0
        }));
      }
    } else if (ediItems.length > 0 && !preserveZohoItems) {
      // Legacy behavior - replace all line items (use with caution)
      updateData.line_items = ediItems.map(item => ({
        name: item.productIds?.sku || item.productIds?.vendorItemNumber || 'Item',
        description: `${item.productIds?.sku || ''} ${item.description || ''} ${item.color || ''} ${item.size || ''}`.trim(),
        quantity: item.quantityOrdered || 0,
        rate: item.unitPrice || 0
      }));
    }

    // Log what we're sending
    logger.info('Updating Zoho draft with selective fields', {
      salesorderId,
      fieldsIncluded: Object.keys(updateData),
      lineItemCount: updateData.line_items?.length || 0,
      preserveZohoItems,
      hasOverrides: Object.keys(overrides).length > 0
    });

    return await this.updateSalesOrder(salesorderId, updateData);
  }
}

module.exports = ZohoClient;
