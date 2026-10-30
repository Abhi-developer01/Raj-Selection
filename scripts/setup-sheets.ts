// ============================================================
// Google Sheets Setup Script
// Run this to initialize your spreadsheet with all required tabs and headers
// Usage: npx tsx scripts/setup-sheets.ts
// ============================================================

import { config } from 'dotenv';
import { google, sheets_v4 } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
config({ path: '.env.local' });

const SHEET_NAMES = {
  WHOLESALERS: 'Wholesalers',
  PURCHASES: 'Purchases',
  PURCHASE_ITEMS: 'PurchaseItems',
  RETURNS: 'Returns',
  PAYMENTS: 'Payments',
  PAYMENT_ALLOCATIONS: 'PaymentAllocations',
  SUPPLIER_CREDITS: 'SupplierCredits',
  REFUNDS: 'Refunds',
  AUDIT_LOGS: 'AuditLogs',
} as const;

const SHEET_HEADERS: Record<string, string[]> = {
  [SHEET_NAMES.WHOLESALERS]: [
    'ID', 'Name', 'ContactPerson', 'Mobile', 'Address', 'GSTIN',
    'OpeningBalance', 'Notes', 'Status', 'CreatedAt',
  ],
  [SHEET_NAMES.PURCHASES]: [
    'ID', 'InvoiceNumber', 'WholesalerID', 'PurchaseDate',
    'AdditionalCharges', 'Discount', 'GSTAmount', 'InvoiceTotal',
    'AmountPaid', 'PaymentMethod', 'PaymentStatus', 'Notes',
    'IsDeleted', 'CreatedAt', 'UpdatedAt',
  ],
  [SHEET_NAMES.PURCHASE_ITEMS]: [
    'ID', 'PurchaseID', 'Category', 'Description',
    'Quantity', 'UnitPrice', 'ReturnedQuantity',
  ],
  [SHEET_NAMES.RETURNS]: [
    'ID', 'ReferenceNumber', 'PurchaseID', 'WholesalerID', 'ReturnDate',
    'PurchaseItemID', 'ItemDescription', 'Reason', 'Quantity',
    'UnitPrice', 'ReturnAmount', 'Status', 'SettlementMethod',
    'Notes', 'IsDeleted', 'CreatedAt', 'UpdatedAt',
  ],
  [SHEET_NAMES.PAYMENTS]: [
    'ID', 'WholesalerID', 'PaymentDate', 'Amount',
    'PaymentMethod', 'TransactionRef', 'Notes', 'IsDeleted', 'CreatedAt', 'UpdatedAt',
  ],
  [SHEET_NAMES.PAYMENT_ALLOCATIONS]: [
    'ID', 'PaymentID', 'PurchaseID', 'AllocatedAmount',
  ],
  [SHEET_NAMES.SUPPLIER_CREDITS]: [
    'ID', 'WholesalerID', 'ReturnID', 'CreditDate',
    'TotalCredit', 'UsedCredit', 'Notes', 'IsDeleted', 'CreatedAt',
  ],
  [SHEET_NAMES.REFUNDS]: [
    'ID', 'WholesalerID', 'ReturnID', 'RefundDate',
    'Amount', 'Method', 'TransactionRef', 'Notes', 'IsDeleted', 'CreatedAt',
  ],
  [SHEET_NAMES.AUDIT_LOGS]: [
    'ID', 'Action', 'Entity', 'EntityID', 'ChangedBy', 'ChangedAt', 'Details',
  ],
};

async function setupSheets() {
  console.log('🔧 Setting up Google Sheets...\n');

  // Load credentials
  const keyFilePath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;

  let credentials;

  if (keyJson) {
    // Use JSON string from environment
    try {
      credentials = JSON.parse(keyJson);
    } catch {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_JSON is not valid JSON.');
    }
  } else if (keyFilePath) {
    // Use file path
    const resolvedPath = path.resolve(process.cwd(), keyFilePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Service account key file not found: ${resolvedPath}`);
    }
    credentials = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
  } else {
    throw new Error('Set GOOGLE_SERVICE_ACCOUNT_KEY_FILE or GOOGLE_SERVICE_ACCOUNT_KEY_JSON in .env.local');
  }

  // Load spreadsheet ID
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID not set in .env.local');
  }

  console.log(`📊 Spreadsheet ID: ${spreadsheetId}`);
  console.log(`🔑 Service Account: ${credentials.client_email}\n`);

  // Authenticate
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get existing sheets
  const { data: spreadsheet } = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const existingSheets = new Set(
    spreadsheet.sheets?.map((s) => s.properties?.title).filter(Boolean) || []
  );

  console.log(`📋 Existing tabs: ${Array.from(existingSheets).join(', ') || 'none'}\n`);

  // Create missing sheets
  const requests: sheets_v4.Schema$Request[] = [];

  for (const [key, sheetName] of Object.entries(SHEET_NAMES)) {
    if (!existingSheets.has(sheetName)) {
      console.log(`➕ Creating tab: ${sheetName}`);
      requests.push({
        addSheet: {
          properties: {
            title: sheetName,
          },
        },
      });
    } else {
      console.log(`✓ Tab already exists: ${sheetName}`);
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests,
      },
    });
    console.log('\n✅ Created missing tabs\n');
  } else {
    console.log('\n✅ All tabs already exist\n');
  }

  // Add headers to each sheet
  console.log('📝 Adding headers to each tab...\n');

  for (const [key, sheetName] of Object.entries(SHEET_NAMES)) {
    const headers = SHEET_HEADERS[sheetName];
    if (!headers) continue;

    console.log(`📌 ${sheetName}: ${headers.join(' | ')}`);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });
  }

  console.log('\n✨ Setup complete! Your Google Sheet is now ready.');
  console.log('\n📌 Make sure you have shared the sheet with:');
  console.log(`   ${credentials.client_email}`);
  console.log('   with Editor access permissions.\n');
}

setupSheets().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
