// ============================================================
// Return Repository — CRUD for Returns sheet tab
// ============================================================
import {
  readSheet,
  appendRows,
  updateRow,
  findRowIndexById,
  SHEET_NAMES,
} from '@/services/googleSheetsService';
import type { Return, SheetRow } from '@/lib/types';
import { generateId, generateReturnRef, todayISO } from '@/lib/utils';
import { getAvailableReturnQty, incrementReturnedQty } from './purchaseRepository';

// ── Serialization ──────────────────────────────────────────────
// Headers:
// ID, ReferenceNumber, PurchaseID, WholesalerID, ReturnDate,
// PurchaseItemID, ItemDescription, Reason, Quantity,
// UnitPrice, ReturnAmount, Status, SettlementMethod,
// Notes, IsDeleted, CreatedAt, UpdatedAt

function rowToReturn(row: SheetRow): Return {
  return {
    id: String(row[0] ?? ''),
    referenceNumber: String(row[1] ?? ''),
    purchaseId: String(row[2] ?? ''),
    wholesalerId: String(row[3] ?? ''),
    returnDate: String(row[4] ?? ''),
    purchaseItemId: String(row[5] ?? ''),
    itemDescription: String(row[6] ?? ''),
    reason: String(row[7] ?? 'other') as Return['reason'],
    quantity: Number(row[8] ?? 0),
    unitPrice: Number(row[9] ?? 0),
    returnAmount: Number(row[10] ?? 0),
    status: String(row[11] ?? 'pending_approval') as Return['status'],
    settlementMethod: String(row[12] ?? 'credit_adjustment') as Return['settlementMethod'],
    notes: String(row[13] ?? '') || undefined,
    isDeleted: String(row[14] ?? 'false') === 'true',
    createdAt: String(row[15] ?? ''),
    updatedAt: String(row[16] ?? ''),
  };
}

function returnToRow(r: Return): SheetRow {
  return [
    r.id,
    r.referenceNumber,
    r.purchaseId,
    r.wholesalerId,
    r.returnDate,
    r.purchaseItemId,
    r.itemDescription,
    r.reason,
    r.quantity,
    r.unitPrice,
    r.returnAmount,
    r.status,
    r.settlementMethod,
    r.notes ?? '',
    String(r.isDeleted),
    r.createdAt,
    r.updatedAt,
  ];
}

// ── Public API ────────────────────────────────────────────────

export async function getAllReturns(includeDeleted = false): Promise<Return[]> {
  const rows = await readSheet(SHEET_NAMES.RETURNS);
  return rows
    .filter((r) => r.length > 0 && r[0])
    .map(rowToReturn)
    .filter((r) => includeDeleted || !r.isDeleted);
}

export async function getReturnsByWholesaler(wholesalerId: string): Promise<Return[]> {
  const all = await getAllReturns();
  return all.filter((r) => r.wholesalerId === wholesalerId);
}

export async function getReturnsByPurchase(purchaseId: string): Promise<Return[]> {
  const all = await getAllReturns();
  return all.filter((r) => r.purchaseId === purchaseId);
}

export async function getReturnById(id: string): Promise<Return | null> {
  const rows = await readSheet(SHEET_NAMES.RETURNS);
  const row = rows.find((r) => String(r[0]) === id);
  return row ? rowToReturn(row) : null;
}

export interface CreateReturnInput {
  purchaseId: string;
  wholesalerId: string;
  returnDate?: string;
  purchaseItemId: string;
  itemDescription: string;
  reason: Return['reason'];
  quantity: number;
  unitPrice: number; // paise
  returnAmount: number; // paise
  settlementMethod: Return['settlementMethod'];
  notes?: string;
  status?: string;
}

export async function createReturn(data: CreateReturnInput): Promise<Return> {
  // Validate quantity does not exceed available
  const available = await getAvailableReturnQty(data.purchaseItemId);
  if (data.quantity > available) {
    throw new Error(
      `Cannot return ${data.quantity} units — only ${available} units available for return.`,
    );
  }

  const now = new Date().toISOString();
  const ret: Return = {
    id: generateId('RTN'),
    referenceNumber: generateReturnRef(),
    purchaseId: data.purchaseId,
    wholesalerId: data.wholesalerId,
    returnDate: data.returnDate ?? todayISO(),
    purchaseItemId: data.purchaseItemId,
    itemDescription: data.itemDescription,
    reason: data.reason,
    quantity: data.quantity,
    unitPrice: data.unitPrice,
    returnAmount: data.returnAmount,
    // status: 'pending_approval',
    // status: data.status ?? 'approved',
    status: 'approved',
    settlementMethod: data.settlementMethod,
    notes: data.notes,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  await appendRows(SHEET_NAMES.RETURNS, [returnToRow(ret)]);
  return ret;
}

export async function updateReturn(
  id: string,
  data: Partial<Omit<Return, 'id' | 'createdAt'>>,
): Promise<Return> {
  const existing = await getReturnById(id);
  if (!existing) throw new Error(`Return not found: ${id}`);

  const wasApproved = existing.status === 'approved' ||
    existing.status === 'credit_note_received' ||
    existing.status === 'refund_received' ||
    existing.status === 'goods_exchanged';

  const updated: Return = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  const isNowApproved = updated.status === 'approved' ||
    updated.status === 'credit_note_received' ||
    updated.status === 'refund_received' ||
    updated.status === 'goods_exchanged';

  // When a return transitions to approved, lock returned qty on the purchase item
  if (!wasApproved && isNowApproved) {
    await incrementReturnedQty(updated.purchaseItemId, updated.quantity);
  }

  const rowIndex = await findRowIndexById(SHEET_NAMES.RETURNS, id);
  if (rowIndex < 0) throw new Error(`Row not found for return: ${id}`);

  await updateRow(SHEET_NAMES.RETURNS, rowIndex, returnToRow(updated));
  return updated;
}

export async function deleteReturn(id: string): Promise<void> {
  await updateReturn(id, { isDeleted: true });
}

/** Returns that are approved and affect financial calculations */
export async function getApprovedReturns(wholesalerId?: string): Promise<Return[]> {
  const all = await getAllReturns();
  const APPROVED_STATUSES = new Set([
    'approved',
    'credit_note_received',
    'refund_received',
    'goods_exchanged',
  ]);
  return all
    .filter((r) => APPROVED_STATUSES.has(r.status))
    .filter((r) => !wholesalerId || r.wholesalerId === wholesalerId);
}
