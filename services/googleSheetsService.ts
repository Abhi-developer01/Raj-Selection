// ============================================================
// Google Sheets Service
// Central service for all Sheets API read/write operations.
// Uses a service account — credentials never exposed to the client.
// ============================================================

import { google, sheets_v4 } from 'googleapis';
import type { SheetRow } from '@/lib/types';
import path from 'path';
import fs from 'fs';

// ── Sheet tab names (must match your spreadsheet exactly) ────
export const SHEET_NAMES = {
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

// Expected headers for each sheet
export const SHEET_HEADERS: Record<string, string[]> = {
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

let _sheets: sheets_v4.Sheets | null = null;
let _spreadsheetId: string | null = null;

// ── Authentication ────────────────────────────────────────────

function getCredentials() {
  // Option 1: JSON string in env (hosted environments)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON);
    } catch {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_JSON is not valid JSON.');
    }
  }

  // Option 2: Key file path
  const keyFilePath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (keyFilePath) {
    const resolved = path.resolve(process.cwd(), keyFilePath);
    if (fs.existsSync(resolved)) {
      const raw = fs.readFileSync(resolved, 'utf-8');
      return JSON.parse(raw);
    }
  }

  throw new Error(
    'Google Sheets credentials not configured. ' +
    'Set GOOGLE_SERVICE_ACCOUNT_KEY_JSON or GOOGLE_SERVICE_ACCOUNT_KEY_FILE in your .env.local',
  );
}

async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (_sheets) return _sheets;

  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  _sheets = google.sheets({ version: 'v4', auth });
  _spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID ?? '';

  if (!_spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID is not set in environment variables.');
  }

  return _sheets;
}

function getSpreadsheetId(): string {
  const id = _spreadsheetId ?? process.env.GOOGLE_SPREADSHEET_ID ?? '';
  if (!id) throw new Error('GOOGLE_SPREADSHEET_ID is not configured.');
  return id;
}

// ── Core read/write helpers ───────────────────────────────────

/**
 * Read all rows (excluding header row) from a sheet tab.
 * Returns an array of string arrays.
 */
export async function readSheet(sheetName: string): Promise<SheetRow[]> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A:ZZ`,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) return []; // only header or empty
  return rows.slice(1); // skip header
}

/**
 * Append one or more rows to a sheet tab.
 */
export async function appendRows(sheetName: string, rows: SheetRow[]): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}

/**
 * Update a specific row by its 1-based row index (including header).
 * rowIndex 2 = first data row.
 */
export async function updateRow(
  sheetName: string,
  rowIndex: number,
  rowData: SheetRow,
): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [rowData] },
  });
}

/**
 * Batch update multiple ranges in a single API call.
 */
export async function batchUpdate(
  updates: Array<{ range: string; values: SheetRow[] }>,
): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      valueInputOption: 'RAW',
      data: updates.map((u) => ({ range: u.range, values: u.values })),
    },
  });
}

/**
 * Find the 1-based row index (including header row) of a record by ID in column A.
 * Returns -1 if not found.
 */
export async function findRowIndexById(sheetName: string, id: string): Promise<number> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A:A`,
  });

  const col = res.data.values ?? [];
  for (let i = 1; i < col.length; i++) {
    if (col[i]?.[0] === id) return i + 1; // 1-based
  }
  return -1;
}

// ── Setup / Health check ──────────────────────────────────────

/**
 * Verify connectivity and ensure all required sheets and headers exist.
 * Creates missing sheets and writes headers if needed.
 */
export async function ensureSheetsSetup(): Promise<{
  connected: boolean;
  sheets: Record<string, boolean>;
  error?: string;
}> {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    // Get existing sheet names
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(
      meta.data.sheets?.map((s) => s.properties?.title ?? '') ?? [],
    );

    const status: Record<string, boolean> = {};
    const sheetsToCreate: string[] = [];

    for (const [, sheetName] of Object.entries(SHEET_NAMES)) {
      if (existingTabs.has(sheetName)) {
        status[sheetName] = true;
      } else {
        status[sheetName] = false;
        sheetsToCreate.push(sheetName);
      }
    }

    // Create missing sheets
    if (sheetsToCreate.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: sheetsToCreate.map((title) => ({
            addSheet: { properties: { title } },
          })),
        },
      });

      // Write headers to each new sheet
      const headerUpdates = sheetsToCreate.map((name) => ({
        range: `${name}!A1`,
        values: [SHEET_HEADERS[name] ?? []],
      }));

      if (headerUpdates.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: 'RAW',
            data: headerUpdates,
          },
        });
      }

      sheetsToCreate.forEach((n) => (status[n] = true));
    }

    return { connected: true, sheets: status };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      sheets: {},
      error,
    };
  }
}

// ── Seed demo data ────────────────────────────────────────────

/**
 * Returns true if Wholesalers sheet already has data (to avoid re-seeding).
 */
export async function hasExistingData(): Promise<boolean> {
  try {
    const rows = await readSheet(SHEET_NAMES.WHOLESALERS);
    return rows.length > 0;
  } catch {
    return false;
  }
}
