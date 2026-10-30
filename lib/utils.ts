// ============================================================
// Utility helpers — formatting, IDs, math
// ============================================================

// ── Money helpers (all internal values stored in paise = 1/100 ₹) ──

/** Convert paise to rupees for display */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** Convert rupees input to paise for storage */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Format a paise value as Indian Rupee string.
 * e.g., 12500000 paise → ₹1,25,000.00
 */


// export function formatCurrency(amount: number): string {
//   return new Intl.NumberFormat('en-IN', {
//     style: 'currency',
//     currency: 'INR',
//     maximumFractionDigits: 0,
//   }).format(amount);
// }

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  // }).format(amount);
  }).format(paiseToRupees(amount));

}

// export function formatCurrency(paise: number): string {
//   const rupees = paise / 100;
//   return new Intl.NumberFormat('en-IN', {
//     style: 'currency',
//     currency: 'INR',
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   }).format(rupees);
// }

/** Format a plain number in Indian number system */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

// ── Date helpers ─────────────────────────────────────────────

/** Format ISO date string to DD/MM/YYYY */
export function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Format date for input[type=date] — YYYY-MM-DD */
export function toInputDate(isoDate: string): string {
  if (!isoDate) return '';
  return isoDate.substring(0, 10);
}

/** Get today as YYYY-MM-DD */
export function todayISO(): string {
  return new Date().toISOString().substring(0, 10);
}

/** Readable month label, e.g., "Oct 2025" */
export function monthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
}

// ── ID generation ─────────────────────────────────────────────

/** Generate a short unique ID with a given prefix, e.g., "WSL-0001A2B3" */
export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}-${ts}${rand}`;
}

/** Generate invoice number: INV-YYYYMM-XXXX */
export function generateInvoiceNumber(): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `INV-${ym}-${rand}`;
}

/** Generate return reference: RTN-YYYYMM-XXXX */
export function generateReturnRef(): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `RTN-${ym}-${rand}`;
}

// ── String helpers ────────────────────────────────────────────

export function capitalize(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// ── Validation ────────────────────────────────────────────────

export function isValidMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile.replace(/\s/g, ''));
}

export function isValidGSTIN(gstin: string): boolean {
  if (!gstin) return true; // optional
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.toUpperCase());
}

// ── Return / Payment status labels ───────────────────────────

export const RETURN_REASON_LABELS: Record<string, string> = {
  unused_stock: 'Unused Stock',
  defective_damaged: 'Defective / Damaged',
  incorrect_item: 'Incorrect Item',
  size_colour_issue: 'Size / Colour Issue',
  other: 'Other',
};

export const RETURN_STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  goods_exchanged: 'Goods Exchanged',
  credit_note_received: 'Credit Note Received',
  refund_received: 'Refund Received',
};

export const SETTLEMENT_METHOD_LABELS: Record<string, string> = {
  credit_adjustment: 'Credit Adjustment',
  cash_refund: 'Cash Refund',
  bank_upi_refund: 'Bank / UPI Refund',
  replacement_exchange: 'Replacement / Exchange',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  credit: 'Credit',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  unpaid: 'Unpaid',
};

// ── Colour helpers for status badges ─────────────────────────

export function getReturnStatusColor(status: string): string {
  switch (status) {
    case 'approved':
    case 'credit_note_received':
    case 'refund_received':
      return 'green';
    case 'rejected':
      return 'red';
    case 'goods_exchanged':
      return 'blue';
    case 'pending_approval':
    default:
      return 'yellow';
  }
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return 'green';
    case 'partially_paid':
      return 'yellow';
    case 'unpaid':
      return 'red';
    default:
      return 'gray';
  }
}

// ── Calculation helpers ───────────────────────────────────────

/**
 * Compute invoice total from components.
 * All values in paise.
 */
export function computeInvoiceTotal(
  itemsTotal: number,
  additionalCharges: number,
  gstAmount: number,
  discount: number,
): number {
  return itemsTotal + additionalCharges + gstAmount - discount;
}

/**
 * Determine payment status from total and paid amounts.
 */
export function derivePaymentStatus(
  invoiceTotal: number,
  amountPaid: number,
): 'paid' | 'partially_paid' | 'unpaid' {
  if (amountPaid <= 0) return 'unpaid';
  if (amountPaid >= invoiceTotal) return 'paid';
  return 'partially_paid';
}

// ── Date range helpers ────────────────────────────────────────

export type DateRangePreset = 'today' | 'week' | 'month' | 'prev_month' | 'all';

export function getDateRange(preset: DateRangePreset): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (preset) {
    case 'today': {
      const t = fmt(now);
      return { from: t, to: t };
    }
    case 'week': {
      const day = now.getDay();
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((day + 6) % 7));
      return { from: fmt(mon), to: fmt(now) };
    }
    case 'month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(from), to: fmt(now) };
    }
    case 'prev_month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmt(from), to: fmt(to) };
    }
    case 'all':
    default:
      return { from: '2000-01-01', to: fmt(now) };
  }
}
