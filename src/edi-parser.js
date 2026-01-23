const logger = require('./logger');

/**
 * EDI X12 850 Purchase Order Parser
 * 
 * Standard EDI 850 structure:
 * ISA - Interchange Control Header
 * GS - Functional Group Header
 * ST - Transaction Set Header (850)
 * BEG - Beginning Segment for Purchase Order
 * DTM - Date/Time Reference
 * N1 - Name (buyer, seller, ship-to, etc.)
 * PO1 - Baseline Item Data
 * CTT - Transaction Totals
 * SE - Transaction Set Trailer
 * GE - Functional Group Trailer
 * IEA - Interchange Control Trailer
 */

class EDI850Parser {
  constructor(rawEDI) {
    this.rawEDI = rawEDI;
    this.segmentDelimiter = this.detectSegmentDelimiter(rawEDI);
    this.elementDelimiter = this.detectElementDelimiter(rawEDI);
    this.segments = this.parseSegments(rawEDI);
  }

  detectSegmentDelimiter(edi) {
    // Common delimiters: ~, \n, or segment terminator in ISA
    if (edi.includes('~')) return '~';
    if (edi.includes('\n')) return '\n';
    // Check ISA segment (positions 105-106 typically have segment terminator)
    if (edi.startsWith('ISA') && edi.length > 106) {
      return edi.charAt(105);
    }
    return '~'; // default
  }

  detectElementDelimiter(edi) {
    // Usually * but can be found in ISA at position 3
    if (edi.startsWith('ISA') && edi.length > 3) {
      return edi.charAt(3);
    }
    return '*'; // default
  }

  parseSegments(edi) {
    return edi
      .split(this.segmentDelimiter)
      .map(seg => seg.trim())
      .filter(seg => seg.length > 0)
      .map(seg => seg.split(this.elementDelimiter));
  }

  getSegment(name) {
    return this.segments.find(seg => seg[0] === name);
  }

  getSegments(name) {
    return this.segments.filter(seg => seg[0] === name);
  }

  parse() {
    try {
      const order = {
        header: this.parseHeader(),
        dates: this.parseDates(),
        parties: this.parseParties(),
        items: this.parseLineItems(),
        totals: this.parseTotals(),
        raw: this.rawEDI
      };

      logger.info('Parsed EDI 850', { 
        poNumber: order.header.poNumber,
        itemCount: order.items.length 
      });

      return order;
    } catch (error) {
      logger.error('EDI parse error', { error: error.message });
      throw new Error(`Failed to parse EDI: ${error.message}`);
    }
  }

  parseHeader() {
    const beg = this.getSegment('BEG');
    const isa = this.getSegment('ISA');
    const gs = this.getSegment('GS');
    const st = this.getSegment('ST');

    return {
      // BEG01: Transaction Set Purpose Code (00=Original, 05=Replace)
      // BEG02: Purchase Order Type Code
      // BEG03: Purchase Order Number
      // BEG05: Date (YYYYMMDD or YYMMDD)
      poNumber: beg ? beg[3] : null,
      poDate: beg ? this.parseDate(beg[5]) : null,
      poType: beg ? beg[2] : null,
      purposeCode: beg ? beg[1] : null,
      
      // ISA sender/receiver
      senderId: isa ? (isa[6] || '').trim() : null,
      receiverId: isa ? (isa[8] || '').trim() : null,
      
      // Control numbers
      interchangeControlNumber: isa ? isa[13] : null,
      groupControlNumber: gs ? gs[6] : null,
      transactionControlNumber: st ? st[2] : null
    };
  }

  parseDates() {
    const dates = {};
    const dtmSegments = this.getSegments('DTM');

    for (const dtm of dtmSegments) {
      const qualifier = dtm[1];
      const date = this.parseDate(dtm[2]);
      
      switch (qualifier) {
        case '002': dates.deliveryRequested = date; break;
        case '010': dates.requestedShip = date; break;
        case '037': dates.shipNotBefore = date; break;
        case '038': dates.shipNotAfter = date; break;
        case '063': dates.doNotDeliverAfter = date; break;
        case '064': dates.doNotShipBefore = date; break;
        case '001': dates.cancelAfter = date; break;
        default: dates[`dtm_${qualifier}`] = date;
      }
    }

    return dates;
  }

  parseParties() {
    const parties = {};
    const n1Segments = this.getSegments('N1');
    
    let currentParty = null;
    
    for (const segment of this.segments) {
      if (segment[0] === 'N1') {
        // N1: Entity Identifier Code, Name, ID Code Qualifier, ID Code
        const qualifier = segment[1];
        currentParty = {
          name: segment[2],
          idQualifier: segment[3],
          id: segment[4]
        };
        
        switch (qualifier) {
          case 'BY': parties.buyer = currentParty; break;
          case 'SE': parties.seller = currentParty; break;
          case 'ST': parties.shipTo = currentParty; break;
          case 'BT': parties.billTo = currentParty; break;
          case 'VN': parties.vendor = currentParty; break;
          default: parties[`party_${qualifier}`] = currentParty;
        }
      } else if (segment[0] === 'N2' && currentParty) {
        // Additional name info
        currentParty.additionalName = segment[1];
      } else if (segment[0] === 'N3' && currentParty) {
        // Address
        currentParty.address1 = segment[1];
        currentParty.address2 = segment[2];
      } else if (segment[0] === 'N4' && currentParty) {
        // City, State, Zip, Country
        currentParty.city = segment[1];
        currentParty.state = segment[2];
        currentParty.zip = segment[3];
        currentParty.country = segment[4];
      }
    }

    return parties;
  }

  parseLineItems() {
    const items = [];
    let currentItem = null;

    for (const segment of this.segments) {
      if (segment[0] === 'PO1') {
        // Save previous item
        if (currentItem) items.push(currentItem);
        
        // PO1: Line Number, Qty Ordered, Unit, Unit Price, Price Basis, 
        //      Product ID Qualifier, Product ID, ...
        currentItem = {
          lineNumber: segment[1],
          quantityOrdered: parseFloat(segment[2]) || 0,
          unitOfMeasure: segment[3],
          unitPrice: parseFloat(segment[4]) || 0,
          priceBasis: segment[5],
          productIds: this.parseProductIds(segment)
        };
      } else if (segment[0] === 'PID' && currentItem) {
        // Product Description
        // PID01: Item Description Type
        // PID05: Description
        currentItem.description = segment[5] || segment[4];
      } else if (segment[0] === 'DTM' && currentItem) {
        // Line-level dates
        const qualifier = segment[1];
        const date = this.parseDate(segment[2]);
        if (qualifier === '002') currentItem.requestedDelivery = date;
        if (qualifier === '010') currentItem.requestedShip = date;
      } else if (segment[0] === 'SDQ' && currentItem) {
        // Destination/Quantity Data (for ship-to breakdown)
        if (!currentItem.destinations) currentItem.destinations = [];
        currentItem.destinations.push({
          qualifier: segment[1],
          id: segment[2],
          quantity: parseFloat(segment[3]) || 0
        });
      } else if (segment[0] === 'SLN' && currentItem) {
        // Subline Item Detail (for size/color breakdown)
        if (!currentItem.sublines) currentItem.sublines = [];
        currentItem.sublines.push({
          lineNumber: segment[1],
          relationship: segment[2],
          quantity: parseFloat(segment[4]) || 0,
          unit: segment[5],
          unitPrice: parseFloat(segment[6]) || 0,
          productIds: this.parseProductIds(segment, 9)
        });
      }
    }

    // Don't forget the last item
    if (currentItem) items.push(currentItem);

    return items;
  }

  parseProductIds(segment, startIndex = 6) {
    const ids = {};
    
    // Product IDs come in pairs: Qualifier, ID
    for (let i = startIndex; i < segment.length - 1; i += 2) {
      const qualifier = segment[i];
      const id = segment[i + 1];
      
      if (!qualifier || !id) continue;
      
      switch (qualifier) {
        case 'UP': ids.upc = id; break;
        case 'SK': ids.sku = id; break;
        case 'BP': ids.buyerPartNumber = id; break;
        case 'VP': ids.vendorPartNumber = id; break;
        case 'IN': ids.buyerItemNumber = id; break;
        case 'VN': ids.vendorItemNumber = id; break;
        case 'MG': ids.manufacturerPartNumber = id; break;
        case 'UA': ids.upcCaseCode = id; break;
        case 'UK': ids.gtin = id; break;
        case 'EN': ids.ean = id; break;
        case 'IZ': ids.buyerSize = id; break;
        case 'CB': ids.buyerColor = id; break;
        case 'CL': ids.color = id; break;
        case 'SZ': ids.size = id; break;
        case 'ST': ids.style = id; break;
        default: ids[qualifier] = id;
      }
    }

    return ids;
  }

  parseTotals() {
    const ctt = this.getSegment('CTT');
    const amt = this.getSegment('AMT');

    return {
      lineItemCount: ctt ? parseInt(ctt[1]) || 0 : null,
      hashTotal: ctt ? ctt[2] : null,
      totalAmount: amt ? parseFloat(amt[2]) || 0 : null
    };
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Handle YYYYMMDD
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    // Handle YYMMDD
    if (dateStr.length === 6) {
      const year = parseInt(dateStr.slice(0, 2));
      const fullYear = year > 50 ? 1900 + year : 2000 + year;
      return `${fullYear}-${dateStr.slice(2, 4)}-${dateStr.slice(4, 6)}`;
    }
    return dateStr;
  }
}

/**
 * Alternative: Simple line-based parser for non-standard EDI formats
 * Some trading partners send simplified formats
 */
function parseSimpleEDI(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  const order = {
    header: {},
    items: [],
    raw: content
  };

  for (const line of lines) {
    const parts = line.split(/[|,\t]/);
    
    // Try to identify header vs line items based on content
    if (parts[0]?.toUpperCase().includes('PO') || parts[0]?.toUpperCase().includes('ORDER')) {
      order.header.poNumber = parts[1] || parts[0];
    } else if (parts.length >= 3 && !isNaN(parseFloat(parts[parts.length - 1]))) {
      // Likely a line item if it has a number at the end
      order.items.push({
        lineNumber: order.items.length + 1,
        sku: parts[0],
        description: parts[1],
        quantityOrdered: parseFloat(parts[2]) || 0,
        unitPrice: parseFloat(parts[3]) || 0,
        productIds: { sku: parts[0] }
      });
    }
  }

  return order;
}

function parseEDIContent(content, filename) {
  // Detect format and parse accordingly
  if (content.includes('ISA') || content.includes('BEG') || content.includes('PO1')) {
    // Standard X12 EDI format
    const parser = new EDI850Parser(content);
    return parser.parse();
  } else {
    // Try simple format
    logger.warn('Non-standard EDI format, attempting simple parse', { filename });
    return parseSimpleEDI(content);
  }
}

module.exports = {
  EDI850Parser,
  parseEDIContent,
  parseSimpleEDI
};
