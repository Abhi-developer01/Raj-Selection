// ============================================================
// Shared TypeScript types for Raj Selection Ledger System
// ============================================================

// ── Common ────────────────────────────────────────────────────
export type Status = 'active' | 'archived';

export interface AuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE';
  entity: string;
  entityId: string;
  changedBy: string;
  changedAt: string; // ISO
  details: string; // JSON string of before/after
}

// ── Wholesaler ────────────────────────────────────────────────
export interface Wholesaler {
  id: string;
  name: string;
  contactPerson: string;
  mobile: string;
  address: string;
  gstin?: string;
  openingBalance: number; // in paise for precision; displayed in ₹
  notes?: string;
  status: Status;
  createdAt: string; // ISO date
}

export interface WholesalerSummary extends Wholesaler {
  totalPurchases: number;
  approvedReturns: number;
  totalPayments: number;
  outstandingPayable: number;
}

// ── Purchase ─────────────────────────────────────────────────
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'credit';
export type PaymentStatus = 'paid' | 'partially_paid' | 'unpaid';

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  category: string;
  description: string;
  quantity: number;
  unitPrice: number; // paise
  returnedQuantity: number; // cumulative approved returns
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  wholesalerId: string;
  wholesalerName?: string; // joined
  purchaseDate: string; // YYYY-MM-DD
  items: PurchaseItem[];
  additionalCharges: number; // paise
  discount: number; // paise
  gstAmount: number; // paise
  invoiceTotal: number; // paise
  amountPaid: number; // paise (at time of purchase)
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export const CLOTHING_CATEGORIES = [
  'Shirts',
  'T-Shirts',
  'Trousers',
  'Jeans',
  'Dresses',
  'Sarees',
  'Kurtas',
  'Suits',
  'Jackets',
  'Leggings',
  'Ethnic Wear',
  'Sportswear',
  'Innerwear',
  'Kids Wear',
  'Other',
] as const;

// ── Returns ──────────────────────────────────────────────────
export type ReturnReason =
  | 'unused_stock'
  | 'defective_damaged'
  | 'incorrect_item'
  | 'size_colour_issue'
  | 'other';

export type ReturnStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'goods_exchanged'
  | 'credit_note_received'
  | 'refund_received';

export type SettlementMethod =
  | 'credit_adjustment'
  | 'cash_refund'
  | 'bank_upi_refund'
  | 'replacement_exchange';

export interface Return {
  id: string;
  referenceNumber: string;
  purchaseId: string;
  purchaseInvoiceNumber?: string; // joined
  wholesalerId: string;
  wholesalerName?: string; // joined
  returnDate: string; // YYYY-MM-DD
  purchaseItemId: string;
  itemDescription: string;
  reason: ReturnReason;
  quantity: number;
  unitPrice: number; // paise — original purchase price
  returnAmount: number; // paise = quantity × unitPrice (after discount/tax prorate)
  status: ReturnStatus;
  settlementMethod: SettlementMethod;
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Payments ─────────────────────────────────────────────────
export interface Payment {
  id: string;
  wholesalerId: string;
  wholesalerName?: string; // joined
  paymentDate: string; // YYYY-MM-DD
  amount: number; // paise
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  purchaseId: string;
  invoiceNumber?: string; // joined
  allocatedAmount: number; // paise
}

// ── Supplier Credits ─────────────────────────────────────────
export interface SupplierCredit {
  id: string;
  wholesalerId: string;
  wholesalerName?: string; // joined
  returnId?: string;
  creditDate: string;
  totalCredit: number; // paise
  usedCredit: number; // paise
  remainingCredit: number; // paise (computed)
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
}

// ── Refunds ──────────────────────────────────────────────────
export type RefundMethod = 'cash' | 'bank_upi';

export interface Refund {
  id: string;
  wholesalerId: string;
  wholesalerName?: string;
  returnId: string;
  refundDate: string;
  amount: number; // paise
  method: RefundMethod;
  transactionRef?: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
}

// ── Ledger ───────────────────────────────────────────────────
export type LedgerTxType =
  | 'purchase'
  | 'return_credit'
  | 'payment'
  | 'refund'
  | 'opening_balance'
  | 'adjustment';

export interface LedgerEntry {
  date: string;
  reference: string;
  type: LedgerTxType;
  description: string;
  debit: number; // paise — amount owed to wholesaler
  credit: number; // paise — credit toward balance
  runningBalance: number; // paise — positive = payable, negative = credit
}

// ── Dashboard / Reports ──────────────────────────────────────
export interface WholesalerBalance {
  wholesalerId: string;
  wholesalerName: string;
  totalPurchases: number;
  totalReturns: number;
  totalPayments: number;
  outstandingBalance: number;
}

export interface DashboardStats {
  totalPurchaseAmount: number;
  totalReturnAmount: number; // approved only
  netPurchaseAmount: number;
  totalAmountPaid: number;
  outstandingPayable: number;
  totalWholesalers: number;
  recentTransactions: RecentTransaction[];
  monthlyData: MonthlyDataPoint[];
  wholesalerBalances: WholesalerBalance[];
}

export interface RecentTransaction {
  date: string;
  type: 'purchase' | 'return' | 'payment' | 'refund';
  description: string;
  amount: number;
  wholesalerName: string;
  reference: string;
}

export interface MonthlyDataPoint {
  month: string; // "Oct 2025"
  purchases: number; // paise
  returns: number; // paise
  payments: number; // paise
}

// ── API Response wrappers ────────────────────────────────────
export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Sheet row helper types ───────────────────────────────────
// Raw arrays as returned by Google Sheets API
export type SheetRow = (string | number | boolean)[];
