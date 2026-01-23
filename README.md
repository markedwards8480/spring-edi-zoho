# Spring EDI to Zoho CRM Integration

This service automatically picks up EDI 850 Purchase Orders from Spring Systems' SFTP server and creates corresponding Sales Orders in Zoho CRM.

## Flow

```
Spring SFTP → Download EDI → Parse 850 → Create Sales Order Header → Create Sales Order Items
                    ↓
              Archive File
```

## Features

- **SFTP Polling**: Checks for new EDI files every 15 minutes (configurable)
- **EDI 850 Parsing**: Handles standard X12 850 Purchase Order format
- **Zoho OAuth**: Built-in OAuth flow for easy authorization
- **Duplicate Detection**: Won't create duplicate orders
- **Customer Matching**: Matches EDI customers to Zoho Accounts
- **Item Lookup**: Matches EDI SKUs to Zoho Items
- **Error Handling**: Failed orders are logged and can be retried
- **PostgreSQL Tracking**: All processed files and orders are tracked

## Quick Start

### 1. Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. Create a new project on Railway
2. Add a PostgreSQL database
3. Deploy this code from GitHub
4. Add environment variables (see below)

### 2. Set Environment Variables

Required:
```
# Zoho OAuth (get from https://api-console.zoho.com/)
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REDIRECT_URI=https://your-app.railway.app/oauth/callback

# Database (Railway provides this)
DATABASE_URL=postgresql://...

# SFTP (Spring Systems)
SFTP_HOST=sftp.springsystems.com
SFTP_USERNAME=MarkEftp
SFTP_PASSWORD=$pringME001
```

Optional:
```
# Zoho region (default is .com for US)
ZOHO_API_BASE=https://www.zohoapis.com
ZOHO_ACCOUNTS_URL=https://accounts.zoho.com

# SFTP paths (defaults)
SFTP_ORDERS_PATH=/orders
SFTP_ARCHIVE_PATH=/archive

# Schedule (default: every 15 minutes)
CRON_SCHEDULE=*/15 * * * *

# Default order status
DEFAULT_ORDER_STATUS=EDI Received
```

### 3. Authorize Zoho

1. Visit your deployed app: `https://your-app.railway.app/oauth/start`
2. Login to Zoho and authorize the app
3. The refresh token will be saved automatically

### 4. Test the Connection

- **SFTP Test**: `npm run test-sftp`
- **Zoho Test**: `npm run test-zoho`
- **Manual Process**: `POST /process`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/health` | GET | Health status |
| `/oauth/start` | GET | Start Zoho authorization |
| `/oauth/callback` | GET | OAuth callback |
| `/oauth/status` | GET | Check token status |
| `/process` | POST | Manually trigger processing |
| `/status` | GET | Processing statistics |
| `/orders` | GET | List recent orders |

## Zoho CRM Field Mapping

### Sales Order Headers

| EDI Field | Zoho Field | API Name |
|-----------|------------|----------|
| PO Number | EDI Order Number | `EDI_Order_Number` |
| Order Date | Sales Order Date | `Sales_Order_Date` |
| Buyer ID | Client ID | `Client_ID` |
| Buyer | Customer Name | `Account` |
| Ship-To | Customer DC | `Customer_DC` |
| Cancel Date | Cancel Date | `Cancel_Date` |
| Ship Date | Start Ship Date | `Start_Ship_DATE_to_customer` |

### Sales Order Items

| EDI Field | Zoho Field | API Name |
|-----------|------------|----------|
| SKU | Customer SKU | `Customer_SKU` |
| Style | Style | `Style` |
| Color | Color | `Color` |
| Size | Size | `Size` |
| Quantity | Quantity | `Quantity` |
| Unit Price | Rate | `Rate` |
| Amount | Amount | `Amount` |

## Troubleshooting

### SFTP Connection Issues
- Verify credentials with `npm run test-sftp`
- Check if you need VPN access to Spring's SFTP
- Verify the SFTP port (default 22)

### Zoho API Errors
- Run `npm run test-zoho` to check module access
- Ensure OAuth scopes include `ZohoCRM.modules.ALL`
- Check if using correct Zoho region (.com, .eu, .in)

### Orders Not Creating
- Check `/orders` endpoint for error messages
- Verify customer exists in Zoho Accounts
- Check Status pick list has "EDI Received" option

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Test SFTP connection
npm run test-sftp

# Test Zoho connection
npm run test-zoho
```

## Architecture

```
src/
├── index.js        # Express server & cron scheduler
├── sftp.js         # SFTP client for Spring Systems
├── edi-parser.js   # EDI X12 850 parser
├── zoho.js         # Zoho CRM API client
├── processor.js    # Main processing logic
├── oauth.js        # Zoho OAuth routes
├── db.js           # PostgreSQL database
└── logger.js       # Winston logger

scripts/
├── test-sftp.js    # SFTP connection test
└── test-zoho.js    # Zoho API test
```

## License

ISC
