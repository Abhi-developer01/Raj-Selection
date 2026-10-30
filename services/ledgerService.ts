// ============================================================
// Ledger Service — builds ledger entries and financial summaries
// All calculations driven from raw transaction records (single source of truth)
// ============================================================
import type {
  LedgerEntry,
  LedgerTxType,
  WholesalerSummary,
  DashboardStats,
  RecentTransaction,
  MonthlyDataPoint,
} from '@/lib/types';
import { getAllWholesalers } from '@/repositories/wholesalerRepository';
import { getAllPurchases } from '@/repositories/purchaseRepository';
import { getAllReturns } from '@/repositories/returnRepository';
import {
  getAllPayments,
  getAllRefunds,
  getAllSupplierCredits,
} from '@/repositories/paymentRepository';

const APPROVED_RETURN_STATUSES = new Set([
  'approved',
  'credit_note_received',
  'refund_received',
  'goods_exchanged',
]);

// ── Wholesaler Financial Summary ──────────────────────────────

export async function getWholesalerSummary(wholesalerId: string): Promise<WholesalerSummary> {
  const [wholesalers, purchases, returns, payments, refunds] = await Promise.all([
    getAllWholesalers(),
    getAllPurchases(),
    getAllReturns(),
    getAllPayments(),
    getAllRefunds(),
  ]);

  const wsl = wholesalers.find((w) => w.id === wholesalerId);
  if (!wsl) throw new Error(`Wholesaler not found: ${wholesalerId}`);

  const myPurchases = purchases.filter((p) => p.wholesalerId === wholesalerId);
  const myReturns = returns.filter((r) => r.wholesalerId === wholesalerId);
  const myPayments = payments.filter((p) => p.wholesalerId === wholesalerId);
  const myRefunds = refunds.filter((r) => r.wholesalerId === wholesalerId);

  const totalPurchases = myPurchases.reduce((s, p) => s + p.invoiceTotal, 0);
  const approvedReturns = myReturns
    .filter((r) => APPROVED_RETURN_STATUSES.has(r.status))
    .reduce((s, r) => s + r.returnAmount, 0);
  const totalPayments = myPayments.reduce((s, p) => s + p.amount, 0);
  const totalRefunds = myRefunds.reduce((s, r) => s + r.amount, 0);

  // Outstanding = openingBalance + purchases - approvedReturns - payments - refunds
  const outstandingPayable = Math.max(
    0,
    wsl.openingBalance +
      totalPurchases -
      approvedReturns -
      totalPayments -
      totalRefunds,
  );

  return {
    ...wsl,
    totalPurchases,
    approvedReturns,
    totalPayments,
    outstandingPayable,
  };
}

// ── Wholesaler Ledger ─────────────────────────────────────────

export async function buildWholesalerLedger(
  wholesalerId: string,
  from?: string,
  to?: string,
): Promise<LedgerEntry[]> {
  const [wholesalers, purchases, returns, payments, refunds] = await Promise.all([
    getAllWholesalers(),
    getAllPurchases(),
    getAllReturns(),
    getAllPayments(),
    getAllRefunds(),
  ]);

  const wsl = wholesalers.find((w) => w.id === wholesalerId);
  if (!wsl) throw new Error(`Wholesaler not found: ${wholesalerId}`);

  type RawEntry = {
    date: string;
    reference: string;
    type: LedgerTxType;
    description: string;
    debit: number;
    credit: number;
  };

  const raw: RawEntry[] = [];

  // Opening balance
  if (wsl.openingBalance > 0) {
    raw.push({
      date: wsl.createdAt.substring(0, 10),
      reference: 'OB',
      type: 'opening_balance',
      description: 'Opening Balance',
      debit: wsl.openingBalance,
      credit: 0,
    });
  }

  // Purchases
  for (const p of purchases.filter((x) => x.wholesalerId === wholesalerId)) {
    raw.push({
      date: p.purchaseDate,
      reference: p.invoiceNumber,
      type: 'purchase',
      description: `Purchase — ${p.invoiceNumber}`,
      debit: p.invoiceTotal,
      credit: 0,
    });
    if (p.amountPaid > 0) {
      raw.push({
        date: p.purchaseDate,
        reference: p.invoiceNumber + '-PMT',
        type: 'payment',
        description: `Payment at purchase — ${p.invoiceNumber}`,
        debit: 0,
        credit: p.amountPaid,
      });
    }
  }

  // Returns (only approved reduce balance)
  for (const r of returns.filter(
    (x) => x.wholesalerId === wholesalerId && APPROVED_RETURN_STATUSES.has(x.status),
  )) {
    raw.push({
      date: r.returnDate,
      reference: r.referenceNumber,
      type: 'return_credit',
      description: `Return — ${r.itemDescription} (${r.referenceNumber})`,
      debit: 0,
      credit: r.returnAmount,
    });
  }

  // Payments (standalone, not at-purchase)
  for (const p of payments.filter((x) => x.wholesalerId === wholesalerId)) {
    raw.push({
      date: p.paymentDate,
      reference: p.id,
      type: 'payment',
      description: `Payment${p.transactionRef ? ` — Ref: ${p.transactionRef}` : ''}`,
      debit: 0,
      credit: p.amount,
    });
  }

  // Refunds received (reduce payable)
  for (const r of refunds.filter((x) => x.wholesalerId === wholesalerId)) {
    raw.push({
      date: r.refundDate,
      reference: r.id,
      type: 'refund',
      description: `Refund received${r.transactionRef ? ` — ${r.transactionRef}` : ''}`,
      debit: 0,
      credit: r.amount,
    });
  }

  // Sort chronologically
  raw.sort((a, b) => a.date.localeCompare(b.date));

  // Apply date range filter
  const filtered = raw.filter((e) => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  });

  // Compute running balance
  let balance = 0;
  const ledger: LedgerEntry[] = [];

  // If date range applied, compute opening balance from entries before range
  if (from) {
    const before = raw.filter((e) => e.date < from);
    balance = before.reduce((s, e) => s + e.debit - e.credit, 0);
  }

  for (const e of filtered) {
    balance += e.debit - e.credit;
    ledger.push({ ...e, runningBalance: balance });
  }

  return ledger;
}

// ── Dashboard Stats ───────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const [wholesalers, purchases, returns, payments, refunds] = await Promise.all([
    getAllWholesalers(),
    getAllPurchases(),
    getAllReturns(),
    getAllPayments(),
    getAllRefunds(),
  ]);

  const activePurchases = purchases.filter((p) => !p.isDeleted);
  const approvedReturns = returns.filter(
    (r) => !r.isDeleted && APPROVED_RETURN_STATUSES.has(r.status),
  );
  const activePayments = payments.filter((p) => !p.isDeleted);

  const totalPurchaseAmount = activePurchases.reduce((s, p) => s + p.invoiceTotal, 0);
  const totalReturnAmount = approvedReturns.reduce((s, r) => s + r.returnAmount, 0);
  const netPurchaseAmount = totalPurchaseAmount - totalReturnAmount;
  const totalAmountPaid =
    activePurchases.reduce((s, p) => s + p.amountPaid, 0) +
    activePayments.reduce((s, p) => s + p.amount, 0) +
    refunds.filter((r) => !r.isDeleted).reduce((s, r) => s + r.amount, 0);

  const openingBalanceTotal = wholesalers.reduce((s, w) => s + w.openingBalance, 0);
  const outstandingPayable = Math.max(
    0,
    openingBalanceTotal + totalPurchaseAmount - totalReturnAmount - totalAmountPaid,
  );

  // Recent transactions (last 10)
  type Entry = { date: string; type: string; desc: string; amount: number; wslId: string; ref: string };
  const allEntries: Entry[] = [
    ...activePurchases.map((p) => ({
      date: p.purchaseDate,
      type: 'purchase',
      desc: `Invoice ${p.invoiceNumber}`,
      amount: p.invoiceTotal,
      wslId: p.wholesalerId,
      ref: p.invoiceNumber,
    })),
    ...returns
      .filter((r) => !r.isDeleted)
      .map((r) => ({
        date: r.returnDate,
        type: 'return',
        desc: `Return ${r.referenceNumber}`,
        amount: r.returnAmount,
        wslId: r.wholesalerId,
        ref: r.referenceNumber,
      })),
    ...activePayments.map((p) => ({
      date: p.paymentDate,
      type: 'payment',
      desc: `Payment${p.transactionRef ? ` (${p.transactionRef})` : ''}`,
      amount: p.amount,
      wslId: p.wholesalerId,
      ref: p.id,
    })),
  ];

  allEntries.sort((a, b) => b.date.localeCompare(a.date));

  const wslMap = Object.fromEntries(wholesalers.map((w) => [w.id, w.name]));

  const recentTransactions: RecentTransaction[] = allEntries.slice(0, 10).map((e) => ({
    date: e.date,
    type: e.type as RecentTransaction['type'],
    description: e.desc,
    amount: e.amount,
    wholesalerName: wslMap[e.wslId] ?? 'Unknown',
    reference: e.ref,
  }));

  // Monthly data — last 6 months
  const monthlyMap: Record<string, { purchases: number; returns: number; payments: number }> = {};

  const addMonth = (ym: string) => {
    if (!monthlyMap[ym]) monthlyMap[ym] = { purchases: 0, returns: 0, payments: 0 };
  };

  for (const p of activePurchases) {
    const ym = p.purchaseDate.substring(0, 7);
    addMonth(ym);
    monthlyMap[ym].purchases += p.invoiceTotal;
  }
  for (const r of approvedReturns) {
    const ym = r.returnDate.substring(0, 7);
    addMonth(ym);
    monthlyMap[ym].returns += r.returnAmount;
  }
  for (const p of activePayments) {
    const ym = p.paymentDate.substring(0, 7);
    addMonth(ym);
    monthlyMap[ym].payments += p.amount;
  }

  const monthlyData: MonthlyDataPoint[] = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([ym, data]) => ({
      month: ym,
      ...data,
    }));

  // Wholesaler-wise balances
  // const wholesalerBalances = wholesalers.map((w) => {
  //   const wslPurchases = activePurchases.filter((p) => p.wholesalerId === w.id);
  //   const wslReturns = approvedReturns.filter((r) => r.wholesalerId === w.id);
  //   const wslPayments = activePayments.filter((p) => p.wholesalerId === w.id);

  //   const totalPurchases = wslPurchases.reduce((s, p) => s + p.invoiceTotal, 0);
  //   const totalReturns = wslReturns.reduce((s, r) => s + r.returnAmount, 0);
  //   const totalPayments = wslPayments.reduce((s, p) => s + p.amount, 0);
  //   const outstandingBalance = Math.max(0, w.openingBalance + totalPurchases - totalReturns - totalPayments);

  //   return {
  //     wholesalerId: w.id,
  //     wholesalerName: w.name,
  //     totalPurchases,
  //     totalReturns,
  //     totalPayments,
  //     outstandingBalance,
  //   };
  // });

  const wholesalerBalances = wholesalers.map((w) => {
  const wslPurchases = activePurchases.filter(
    (p) => p.wholesalerId === w.id
  );

  const wslReturns = approvedReturns.filter(
    (r) => r.wholesalerId === w.id
  );

  const wslPayments = activePayments.filter(
    (p) => p.wholesalerId === w.id
  );

  const wslRefunds = refunds.filter(
    (r) => r.wholesalerId === w.id && !r.isDeleted
  );

  const totalPurchases = wslPurchases.reduce(
    (s, p) => s + p.invoiceTotal,
    0
  );

  const totalReturns = wslReturns.reduce(
    (s, r) => s + r.returnAmount,
    0
  );

  // Include payments made during purchase as well as standalone payments
  const purchasePayments = wslPurchases.reduce(
    (s, p) => s + p.amountPaid,
    0
  );

  const standalonePayments = wslPayments.reduce(
    (s, p) => s + p.amount,
    0
  );

  const totalPayments = purchasePayments + standalonePayments;

  const totalRefunds = wslRefunds.reduce(
    (s, r) => s + r.amount,
    0
  );

  const outstandingBalance = Math.max(
    0,
    w.openingBalance +
      totalPurchases -
      totalReturns -
      totalPayments -
      totalRefunds
  );

  return {
    wholesalerId: w.id,
    wholesalerName: w.name,
    totalPurchases,
    totalReturns,
    totalPayments,
    outstandingBalance,
  };
});

  return {
    totalPurchaseAmount,
    totalReturnAmount,
    netPurchaseAmount,
    totalAmountPaid,
    outstandingPayable,
    totalWholesalers: wholesalers.filter((w) => w.status === 'active').length,
    recentTransactions,
    monthlyData,
    wholesalerBalances,
  };
}

// ── Reports ───────────────────────────────────────────────────

export interface ReportFilters {
  from?: string;
  to?: string;
  wholesalerId?: string;
}

export async function getWholesalerWiseSummary(filters: ReportFilters) {
  const [wholesalers, purchases, returns, payments] = await Promise.all([
    getAllWholesalers(),
    getAllPurchases(),
    getAllReturns(),
    getAllPayments(),
  ]);

  return wholesalers
    .filter((w) => !filters.wholesalerId || w.id === filters.wholesalerId)
    .map((w) => {
      const myPurchases = purchases.filter(
        (p) =>
          p.wholesalerId === w.id &&
          (!filters.from || p.purchaseDate >= filters.from) &&
          (!filters.to || p.purchaseDate <= filters.to),
      );
      const myReturns = returns.filter(
        (r) =>
          r.wholesalerId === w.id &&
          APPROVED_RETURN_STATUSES.has(r.status) &&
          (!filters.from || r.returnDate >= filters.from) &&
          (!filters.to || r.returnDate <= filters.to),
      );
      const myPayments = payments.filter(
        (p) =>
          p.wholesalerId === w.id &&
          (!filters.from || p.paymentDate >= filters.from) &&
          (!filters.to || p.paymentDate <= filters.to),
      );

      const totalPurchases = myPurchases.reduce((s, p) => s + p.invoiceTotal, 0);
      const totalReturns = myReturns.reduce((s, r) => s + r.returnAmount, 0);
      const totalPayments =
        myPayments.reduce((s, p) => s + p.amount, 0) +
        myPurchases.reduce((s, p) => s + p.amountPaid, 0);

      return {
        wholesalerId: w.id,
        wholesalerName: w.name,
        totalPurchases,
        totalReturns,
        netPurchases: totalPurchases - totalReturns,
        totalPayments,
        outstandingPayable: Math.max(0, w.openingBalance + totalPurchases - totalReturns - totalPayments),
        purchaseCount: myPurchases.length,
        returnCount: myReturns.length,
      };
    });
}
