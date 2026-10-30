// ============================================================
// Purchase Repository — CRUD for Purchases + PurchaseItems tabs
// ============================================================
import {
  readSheet,
  appendRows,
  updateRow,
  findRowIndexById,
  SHEET_NAMES,
} from '@/services/googleSheetsService';
import type { Purchase, PurchaseItem, SheetRow } from '@/lib/types';
import { generateId, generateInvoiceNumber, todayISO, derivePaymentStatus } from '@/lib/utils';

// ── Serialization ──────────────────────────────────────────────
// Purchases headers:
// ID, InvoiceNumber, WholesalerID, PurchaseDate,
// AdditionalCharges, Discount, GSTAmount, InvoiceTotal,
// AmountPaid, PaymentMethod, PaymentStatus, Notes,
// IsDeleted, CreatedAt, UpdatedAt

function rowToPurchase(row: SheetRow, items: PurchaseItem[]): Purchase {
  return {
    id: String(row[0] ?? ''),
    invoiceNumber: String(row[1] ?? ''),
    wholesalerId: String(row[2] ?? ''),
    purchaseDate: String(row[3] ?? ''),
    items,
    additionalCharges: Number(row[4] ?? 0),
    discount: Number(row[5] ?? 0),
    gstAmount: Number(row[6] ?? 0),
    invoiceTotal: Number(row[7] ?? 0),
    amountPaid: Number(row[8] ?? 0),
    paymentMethod: String(row[9] ?? 'cash') as Purchase['paymentMethod'],
    paymentStatus: String(row[10] ?? 'unpaid') as Purchase['paymentStatus'],
    notes: String(row[11] ?? '') || undefined,
    isDeleted: String(row[12] ?? 'false') === 'true',
    createdAt: String(row[13] ?? ''),
    updatedAt: String(row[14] ?? ''),
  };
}

function purchaseToRow(p: Purchase): SheetRow {
  return [
    p.id,
    p.invoiceNumber,
    p.wholesalerId,
    p.purchaseDate,
    p.additionalCharges,
    p.discount,
    p.gstAmount,
    p.invoiceTotal,
    p.amountPaid,
    p.paymentMethod,
    p.paymentStatus,
    p.notes ?? '',
    String(p.isDeleted),
    p.createdAt,
    p.updatedAt,
  ];
}

// PurchaseItems headers:
// ID, PurchaseID, Category, Description, Quantity, UnitPrice, ReturnedQuantity

function rowToItem(row: SheetRow): PurchaseItem {
  return {
    id: String(row[0] ?? ''),
    purchaseId: String(row[1] ?? ''),
    category: String(row[2] ?? ''),
    description: String(row[3] ?? ''),
    quantity: Number(row[4] ?? 0),
    unitPrice: Number(row[5] ?? 0),
    returnedQuantity: Number(row[6] ?? 0),
  };
}

function itemToRow(item: PurchaseItem): SheetRow {
  return [
    item.id,
    item.purchaseId,
    item.category,
    item.description,
    item.quantity,
    item.unitPrice,
    item.returnedQuantity,
  ];
}

// ── Internal helpers ─────────────────────────────────────────

async function getAllPurchaseRows(): Promise<SheetRow[]> {
  return readSheet(SHEET_NAMES.PURCHASES);
}

async function getAllItemRows(): Promise<SheetRow[]> {
  return readSheet(SHEET_NAMES.PURCHASE_ITEMS);
}

async function getItemsForPurchase(purchaseId: string): Promise<PurchaseItem[]> {
  const rows = await getAllItemRows();
  return rows
    .filter((r) => String(r[1] ?? '') === purchaseId)
    .map(rowToItem);
}

// ── Public API ────────────────────────────────────────────────

export async function getAllPurchases(includeDeleted = false): Promise<Purchase[]> {
  const [purchaseRows, itemRows] = await Promise.all([
    getAllPurchaseRows(),
    getAllItemRows(),
  ]);

  // Group items by purchaseId
  const itemsByPurchase: Record<string, PurchaseItem[]> = {};
  for (const row of itemRows) {
    const item = rowToItem(row);
    if (!itemsByPurchase[item.purchaseId]) itemsByPurchase[item.purchaseId] = [];
    itemsByPurchase[item.purchaseId].push(item);
  }

  return purchaseRows
    .filter((r) => r.length > 0 && r[0])
    .map((r) => rowToPurchase(r, itemsByPurchase[String(r[0])] ?? []))
    .filter((p) => includeDeleted || !p.isDeleted);
}

export async function getPurchasesByWholesaler(wholesalerId: string): Promise<Purchase[]> {
  const all = await getAllPurchases();
  return all.filter((p) => p.wholesalerId === wholesalerId);
}

export async function getPurchaseById(id: string): Promise<Purchase | null> {
  const purchaseRows = await getAllPurchaseRows();
  const row = purchaseRows.find((r) => String(r[0]) === id);
  if (!row) return null;
  const items = await getItemsForPurchase(id);
  return rowToPurchase(row, items);
}

export interface CreatePurchaseInput {
  invoiceNumber?: string;
  wholesalerId: string;
  purchaseDate: string;
  items: Array<{
    category: string;
    description: string;
    quantity: number;
    unitPrice: number; // paise
  }>;
  additionalCharges: number; // paise
  discount: number; // paise
  gstAmount: number; // paise
  invoiceTotal: number; // paise
  amountPaid: number; // paise
  paymentMethod: Purchase['paymentMethod'];
  notes?: string;
}

export async function createPurchase(data: CreatePurchaseInput): Promise<Purchase> {
  const now = new Date().toISOString();
  const purchaseId = generateId('PUR');

  const purchase: Purchase = {
    id: purchaseId,
    invoiceNumber: data.invoiceNumber || generateInvoiceNumber(),
    wholesalerId: data.wholesalerId,
    purchaseDate: data.purchaseDate || todayISO(),
    items: [],
    additionalCharges: data.additionalCharges,
    discount: data.discount,
    gstAmount: data.gstAmount,
    invoiceTotal: data.invoiceTotal,
    amountPaid: data.amountPaid,
    paymentMethod: data.paymentMethod,
    paymentStatus: derivePaymentStatus(data.invoiceTotal, data.amountPaid),
    notes: data.notes,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  // Create items
  const items: PurchaseItem[] = data.items.map((item) => ({
    id: generateId('ITM'),
    purchaseId,
    category: item.category,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    returnedQuantity: 0,
  }));

  purchase.items = items;

  // Write to sheets — purchase row first, then items
  await appendRows(SHEET_NAMES.PURCHASES, [purchaseToRow(purchase)]);
  if (items.length > 0) {
    await appendRows(SHEET_NAMES.PURCHASE_ITEMS, items.map(itemToRow));
  }

  return purchase;
}

export async function updatePurchase(
  id: string,
  data: Partial<Omit<Purchase, 'id' | 'createdAt' | 'items'>>,
): Promise<Purchase> {
  const existing = await getPurchaseById(id);
  if (!existing) throw new Error(`Purchase not found: ${id}`);

  const updated: Purchase = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  // Re-derive payment status if amounts changed
  updated.paymentStatus = derivePaymentStatus(updated.invoiceTotal, updated.amountPaid);

  const rowIndex = await findRowIndexById(SHEET_NAMES.PURCHASES, id);
  if (rowIndex < 0) throw new Error(`Row not found for purchase: ${id}`);

  await updateRow(SHEET_NAMES.PURCHASES, rowIndex, purchaseToRow(updated));
  return updated;
}

/** Soft-delete a purchase */
export async function deletePurchase(id: string): Promise<void> {
  await updatePurchase(id, { isDeleted: true });
}

/** Increment returnedQuantity on a purchase item */
export async function incrementReturnedQty(
  purchaseItemId: string,
  qty: number,
): Promise<void> {
  const rows = await getAllItemRows();
  const idx = rows.findIndex((r) => String(r[0]) === purchaseItemId);
  if (idx < 0) throw new Error(`Purchase item not found: ${purchaseItemId}`);

  const item = rowToItem(rows[idx]);
  item.returnedQuantity = (item.returnedQuantity || 0) + qty;

  const rowIndex = idx + 2; // +1 for header, +1 for 1-based
  await updateRow(SHEET_NAMES.PURCHASE_ITEMS, rowIndex, itemToRow(item));
}

/** Get total available-to-return quantity for an item */
export async function getAvailableReturnQty(purchaseItemId: string): Promise<number> {
  const rows = await getAllItemRows();
  const row = rows.find((r) => String(r[0]) === purchaseItemId);
  if (!row) return 0;
  const item = rowToItem(row);
  return Math.max(0, item.quantity - item.returnedQuantity);
}

/** Update payment allocation on a purchase (add to amountPaid) */
export async function addPaymentToPurchase(id: string, amount: number): Promise<void> {
  const purchase = await getPurchaseById(id);
  if (!purchase) throw new Error(`Purchase not found: ${id}`);
  const newPaid = purchase.amountPaid + amount;
  await updatePurchase(id, { amountPaid: newPaid });
}
