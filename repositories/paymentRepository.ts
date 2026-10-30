// ============================================================
// Payment Repository — Payments + PaymentAllocations + SupplierCredits + Refunds
// ============================================================
import {
  readSheet,
  appendRows,
  updateRow,
  findRowIndexById,
  SHEET_NAMES,
} from '@/services/googleSheetsService';
import type { Payment, PaymentAllocation, SupplierCredit, Refund, SheetRow } from '@/lib/types';
import { generateId, todayISO } from '@/lib/utils';
import { addPaymentToPurchase } from './purchaseRepository';

// ── Payments serialization ────────────────────────────────────
// Headers: ID, WholesalerID, PaymentDate, Amount,
//          PaymentMethod, TransactionRef, Notes, IsDeleted, CreatedAt, UpdatedAt

function rowToPayment(row: SheetRow): Payment {
  return {
    id: String(row[0] ?? ''),
    wholesalerId: String(row[1] ?? ''),
    paymentDate: String(row[2] ?? ''),
    amount: Number(row[3] ?? 0),
    paymentMethod: String(row[4] ?? 'cash') as Payment['paymentMethod'],
    transactionRef: String(row[5] ?? '') || undefined,
    notes: String(row[6] ?? '') || undefined,
    isDeleted: String(row[7] ?? 'false') === 'true',
    createdAt: String(row[8] ?? ''),
    updatedAt: String(row[9] ?? ''),
  };
}

function paymentToRow(p: Payment): SheetRow {
  return [
    p.id,
    p.wholesalerId,
    p.paymentDate,
    p.amount,
    p.paymentMethod,
    p.transactionRef ?? '',
    p.notes ?? '',
    String(p.isDeleted),
    p.createdAt,
    p.updatedAt,
  ];
}

// ── PaymentAllocations serialization ─────────────────────────
// Headers: ID, PaymentID, PurchaseID, AllocatedAmount

function rowToAllocation(row: SheetRow): PaymentAllocation {
  return {
    id: String(row[0] ?? ''),
    paymentId: String(row[1] ?? ''),
    purchaseId: String(row[2] ?? ''),
    allocatedAmount: Number(row[3] ?? 0),
  };
}

function allocationToRow(a: PaymentAllocation): SheetRow {
  return [a.id, a.paymentId, a.purchaseId, a.allocatedAmount];
}

// ── SupplierCredits serialization ─────────────────────────────
// Headers: ID, WholesalerID, ReturnID, CreditDate,
//          TotalCredit, UsedCredit, Notes, IsDeleted, CreatedAt

function rowToCredit(row: SheetRow): SupplierCredit {
  const total = Number(row[4] ?? 0);
  const used = Number(row[5] ?? 0);
  return {
    id: String(row[0] ?? ''),
    wholesalerId: String(row[1] ?? ''),
    returnId: String(row[2] ?? '') || undefined,
    creditDate: String(row[3] ?? ''),
    totalCredit: total,
    usedCredit: used,
    remainingCredit: total - used,
    notes: String(row[6] ?? '') || undefined,
    isDeleted: String(row[7] ?? 'false') === 'true',
    createdAt: String(row[8] ?? ''),
  };
}

function creditToRow(c: SupplierCredit): SheetRow {
  return [
    c.id,
    c.wholesalerId,
    c.returnId ?? '',
    c.creditDate,
    c.totalCredit,
    c.usedCredit,
    c.notes ?? '',
    String(c.isDeleted),
    c.createdAt,
  ];
}

// ── Refunds serialization ─────────────────────────────────────
// Headers: ID, WholesalerID, ReturnID, RefundDate,
//          Amount, Method, TransactionRef, Notes, IsDeleted, CreatedAt

function rowToRefund(row: SheetRow): Refund {
  return {
    id: String(row[0] ?? ''),
    wholesalerId: String(row[1] ?? ''),
    returnId: String(row[2] ?? ''),
    refundDate: String(row[3] ?? ''),
    amount: Number(row[4] ?? 0),
    method: String(row[5] ?? 'cash') as Refund['method'],
    transactionRef: String(row[6] ?? '') || undefined,
    notes: String(row[7] ?? '') || undefined,
    isDeleted: String(row[8] ?? 'false') === 'true',
    createdAt: String(row[9] ?? ''),
  };
}

function refundToRow(r: Refund): SheetRow {
  return [
    r.id,
    r.wholesalerId,
    r.returnId,
    r.refundDate,
    r.amount,
    r.method,
    r.transactionRef ?? '',
    r.notes ?? '',
    String(r.isDeleted),
    r.createdAt,
  ];
}

// ── Payments Public API ───────────────────────────────────────

export async function getAllPayments(includeDeleted = false): Promise<Payment[]> {
  const rows = await readSheet(SHEET_NAMES.PAYMENTS);
  return rows
    .filter((r) => r.length > 0 && r[0])
    .map(rowToPayment)
    .filter((p) => includeDeleted || !p.isDeleted);
}

export async function getPaymentsByWholesaler(wholesalerId: string): Promise<Payment[]> {
  const all = await getAllPayments();
  return all.filter((p) => p.wholesalerId === wholesalerId);
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const rows = await readSheet(SHEET_NAMES.PAYMENTS);
  const row = rows.find((r) => String(r[0]) === id);
  return row ? rowToPayment(row) : null;
}

export interface CreatePaymentInput {
  wholesalerId: string;
  paymentDate?: string;
  amount: number; // paise
  paymentMethod: Payment['paymentMethod'];
  transactionRef?: string;
  notes?: string;
  /** Invoice IDs and amounts to allocate this payment against */
  allocations?: Array<{ purchaseId: string; amount: number }>;
}

export async function createPayment(data: CreatePaymentInput): Promise<Payment> {
  const now = new Date().toISOString();
  const payment: Payment = {
    id: generateId('PAY'),
    wholesalerId: data.wholesalerId,
    paymentDate: data.paymentDate ?? todayISO(),
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    transactionRef: data.transactionRef,
    notes: data.notes,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  await appendRows(SHEET_NAMES.PAYMENTS, [paymentToRow(payment)]);

  // Write allocations and update purchase paid amounts
  if (data.allocations && data.allocations.length > 0) {
    const allocationRows: SheetRow[] = [];
    for (const alloc of data.allocations) {
      const allocation: PaymentAllocation = {
        id: generateId('ALC'),
        paymentId: payment.id,
        purchaseId: alloc.purchaseId,
        allocatedAmount: alloc.amount,
      };
      allocationRows.push(allocationToRow(allocation));
      // Update purchase's amountPaid
      await addPaymentToPurchase(alloc.purchaseId, alloc.amount);
    }
    await appendRows(SHEET_NAMES.PAYMENT_ALLOCATIONS, allocationRows);
  }

  return payment;
}

export async function updatePayment(
  id: string,
  data: Partial<Omit<Payment, 'id' | 'createdAt'>>,
): Promise<Payment> {
  const existing = await getPaymentById(id);
  if (!existing) throw new Error(`Payment not found: ${id}`);

  const updated: Payment = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  const rowIndex = await findRowIndexById(SHEET_NAMES.PAYMENTS, id);
  if (rowIndex < 0) throw new Error(`Row not found for payment: ${id}`);

  await updateRow(SHEET_NAMES.PAYMENTS, rowIndex, paymentToRow(updated));
  return updated;
}

export async function deletePayment(id: string): Promise<void> {
  await updatePayment(id, { isDeleted: true });
}

// ── Allocations Public API ────────────────────────────────────

export async function getAllocationsByPayment(paymentId: string): Promise<PaymentAllocation[]> {
  const rows = await readSheet(SHEET_NAMES.PAYMENT_ALLOCATIONS);
  return rows
    .filter((r) => String(r[1] ?? '') === paymentId)
    .map(rowToAllocation);
}

export async function getAllocationsByPurchase(purchaseId: string): Promise<PaymentAllocation[]> {
  const rows = await readSheet(SHEET_NAMES.PAYMENT_ALLOCATIONS);
  return rows
    .filter((r) => String(r[2] ?? '') === purchaseId)
    .map(rowToAllocation);
}

// ── Supplier Credits Public API ───────────────────────────────

export async function getAllSupplierCredits(includeDeleted = false): Promise<SupplierCredit[]> {
  const rows = await readSheet(SHEET_NAMES.SUPPLIER_CREDITS);
  return rows
    .filter((r) => r.length > 0 && r[0])
    .map(rowToCredit)
    .filter((c) => includeDeleted || !c.isDeleted);
}

export async function getCreditsByWholesaler(wholesalerId: string): Promise<SupplierCredit[]> {
  const all = await getAllSupplierCredits();
  return all.filter((c) => c.wholesalerId === wholesalerId);
}

export async function createSupplierCredit(
  data: Omit<SupplierCredit, 'id' | 'remainingCredit' | 'isDeleted' | 'createdAt'>,
): Promise<SupplierCredit> {
  const credit: SupplierCredit = {
    ...data,
    id: generateId('CRD'),
    remainingCredit: data.totalCredit - data.usedCredit,
    isDeleted: false,
    createdAt: new Date().toISOString(),
  };
  await appendRows(SHEET_NAMES.SUPPLIER_CREDITS, [creditToRow(credit)]);
  return credit;
}

// ── Refunds Public API ────────────────────────────────────────

export async function getAllRefunds(includeDeleted = false): Promise<Refund[]> {
  const rows = await readSheet(SHEET_NAMES.REFUNDS);
  return rows
    .filter((r) => r.length > 0 && r[0])
    .map(rowToRefund)
    .filter((r) => includeDeleted || !r.isDeleted);
}

export async function getRefundsByWholesaler(wholesalerId: string): Promise<Refund[]> {
  const all = await getAllRefunds();
  return all.filter((r) => r.wholesalerId === wholesalerId);
}

export async function createRefund(
  data: Omit<Refund, 'id' | 'isDeleted' | 'createdAt'>,
): Promise<Refund> {
  const refund: Refund = {
    ...data,
    id: generateId('REF'),
    isDeleted: false,
    createdAt: new Date().toISOString(),
  };
  await appendRows(SHEET_NAMES.REFUNDS, [refundToRow(refund)]);
  return refund;
}
