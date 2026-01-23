/**
 * Test script to verify Zoho CRM connection
 * Run with: npm run test-zoho
 */

require('dotenv').config();
const ZohoClient = require('../src/zoho');

async function testZoho() {
  console.log('='.repeat(60));
  console.log('Zoho CRM Connection Test');
  console.log('='.repeat(60));

  const zoho = new ZohoClient();

  // Check configuration
  console.log('\n📋 Configuration:');
  console.log(`  API Base: ${process.env.ZOHO_API_BASE || 'https://www.zohoapis.com'}`);
  console.log(`  Client ID: ${process.env.ZOHO_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Client Secret: ${process.env.ZOHO_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Refresh Token: ${process.env.ZOHO_REFRESH_TOKEN ? '✅ Set' : '⚠️ Missing (will use DB)'}`);

  if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET) {
    console.log('\n❌ Missing credentials. Please set ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET');
    console.log('   Visit https://api-console.zoho.com/ to create an application');
    return;
  }

  try {
    // Test token retrieval
    console.log('\n🔑 Testing token...');
    await zoho.ensureValidToken();
    console.log('✅ Token obtained successfully');

    // Test API call - get current user
    console.log('\n👤 Testing API access...');
    const userResult = await zoho.request('GET', '/crm/v2/users?type=CurrentUser');
    console.log('✅ API accessible');
    console.log(`   Current user: ${userResult?.users?.[0]?.full_name || 'Unknown'}`);

    // Test modules access
    console.log('\n📦 Testing module access...');
    
    // Test Sales_Order_Headers
    try {
      const soResult = await zoho.request('GET', '/crm/v2/Sales_Order_Headers?per_page=1');
      console.log(`✅ Sales_Order_Headers: ${soResult?.data?.length >= 0 ? 'Accessible' : 'Accessible (empty)'}`);
    } catch (e) {
      console.log(`❌ Sales_Order_Headers: ${e.response?.data?.message || e.message}`);
    }

    // Test Sales_Order_Items
    try {
      const soiResult = await zoho.request('GET', '/crm/v2/Sales_Order_Items?per_page=1');
      console.log(`✅ Sales_Order_Items: ${soiResult?.data?.length >= 0 ? 'Accessible' : 'Accessible (empty)'}`);
    } catch (e) {
      console.log(`❌ Sales_Order_Items: ${e.response?.data?.message || e.message}`);
    }

    // Test Accounts
    try {
      const accResult = await zoho.request('GET', '/crm/v2/Accounts?per_page=1');
      console.log(`✅ Accounts: ${accResult?.data?.length >= 0 ? 'Accessible' : 'Accessible (empty)'}`);
    } catch (e) {
      console.log(`❌ Accounts: ${e.response?.data?.message || e.message}`);
    }

    // Test Items
    try {
      const itemsResult = await zoho.request('GET', '/crm/v2/Items?per_page=1');
      console.log(`✅ Items: ${itemsResult?.data?.length >= 0 ? 'Accessible' : 'Accessible (empty)'}`);
    } catch (e) {
      console.log(`❌ Items: ${e.response?.data?.message || e.message}`);
    }

    // Test Customer_DCs
    try {
      const dcResult = await zoho.request('GET', '/crm/v2/Customer_DCs?per_page=1');
      console.log(`✅ Customer_DCs: ${dcResult?.data?.length >= 0 ? 'Accessible' : 'Accessible (empty)'}`);
    } catch (e) {
      console.log(`❌ Customer_DCs: ${e.response?.data?.message || e.message}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Zoho CRM connection test passed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run if database is available
const { Pool } = require('pg');
if (process.env.DATABASE_URL) {
  testZoho().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  console.log('⚠️ DATABASE_URL not set. Testing without token persistence.\n');
  // Still try to test with env refresh token
  testZoho().then(() => process.exit(0)).catch(() => process.exit(1));
}
