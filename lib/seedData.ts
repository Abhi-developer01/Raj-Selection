// ============================================================
// Demo Data Seeder
// Seeds realistic sample data for development/demo mode ONLY.
// Call POST /api/seed to populate. Never runs automatically.
// ============================================================
import { appendRows, SHEET_NAMES } from '@/services/googleSheetsService';
import { generateId, generateInvoiceNumber, generateReturnRef } from '@/lib/utils';
import type { SheetRow } from '@/lib/types';

export async function seedDemoData(): Promise<void> {
  const now = new Date().toISOString();

  // ── Wholesalers ───────────────────────────────────────────
  const w1Id = generateId('WSL');
  const w2Id = generateId('WSL');
  const w3Id = generateId('WSL');

  const wholesalerRows: SheetRow[] = [
    [w1Id, 'Sharma Textiles', 'Ramesh Sharma', '9876543210',
      'Shop 12, Chandni Chowk, Delhi', '07AAICS0000A1Z5', 0,
      'Primary fabric supplier', 'active', now],
    [w2Id, 'Mumbai Fashion Hub', 'Priya Mehta', '9988776655',
      '45 Fashion Street, Dharavi, Mumbai', '27AABCS0000A1Z3', 500000,
      'Seasonal collection supplier', 'active', now],
    [w3Id, 'South Silk House', 'Venkat Rao', '9123456789',
      '78 Silk Market, T Nagar, Chennai', '33AAFCS0000A1Z1', 0,
      'Saree and ethnic wear specialist', 'active', now],
  ];
  await appendRows(SHEET_NAMES.WHOLESALERS, wholesalerRows);

  // ── Purchases ─────────────────────────────────────────────
  const p1Id = generateId('PUR');
  const p2Id = generateId('PUR');
  const p3Id = generateId('PUR');
  const p4Id = generateId('PUR');

  const inv1 = generateInvoiceNumber();
  const inv2 = generateInvoiceNumber();
  const inv3 = generateInvoiceNumber();
  const inv4 = generateInvoiceNumber();

  // P1: Fully paid — ₹25,000
  // P2: Partially paid — ₹18,000 total, ₹10,000 paid
  // P3: Unpaid — ₹12,500
  // P4: Mumbai Fashion Hub — ₹30,000 fully paid

  const purchaseRows: SheetRow[] = [
    // ID, InvoiceNumber, WholesalerID, PurchaseDate,
    // AdditionalCharges, Discount, GSTAmount, InvoiceTotal,
    // AmountPaid, PaymentMethod, PaymentStatus, Notes,
    // IsDeleted, CreatedAt, UpdatedAt
    [p1Id, inv1, w1Id, '2025-10-01', 50000, 0, 0, 2500000,
      2500000, 'upi', 'paid', 'Diwali stock purchase', 'false', now, now],
    [p2Id, inv2, w1Id, '2025-10-10', 75000, 25000, 162000, 1800000,
      1000000, 'cheque', 'partially_paid', 'Winter collection', 'false', now, now],
    [p3Id, inv3, w1Id, '2025-10-20', 0, 0, 112500, 1250000,
      0, 'credit', 'unpaid', 'Festival display items', 'false', now, now],
    [p4Id, inv4, w2Id, '2025-09-15', 100000, 50000, 270000, 3000000,
      3000000, 'bank_transfer', 'paid', 'Autumn seasonal batch', 'false', now, now],
  ];
  await appendRows(SHEET_NAMES.PURCHASES, purchaseRows);

  // ── Purchase Items ─────────────────────────────────────────
  const i1Id = generateId('ITM');
  const i2Id = generateId('ITM');
  const i3Id = generateId('ITM');
  const i4Id = generateId('ITM');
  const i5Id = generateId('ITM');
  const i6Id = generateId('ITM');
  const i7Id = generateId('ITM');

  // ID, PurchaseID, Category, Description, Quantity, UnitPrice, ReturnedQuantity
  const itemRows: SheetRow[] = [
    // P1 items
    [i1Id, p1Id, 'Shirts', 'Cotton formal shirts - White', 50, 25000, 5],
    [i2Id, p1Id, 'Trousers', 'Formal trousers - Black', 30, 35000, 0],
    // P2 items
    [i3Id, p2Id, 'Jeans', 'Slim fit jeans - Blue', 40, 28000, 0],
    [i4Id, p2Id, 'T-Shirts', 'Round neck T-shirts - Assorted', 60, 12000, 10],
    // P3 items
    [i5Id, p3Id, 'Sarees', 'Silk Banarasi sarees', 10, 120000, 0],
    // P4 items
    [i6Id, p4Id, 'Kurtas', 'Designer kurtas - Assorted', 80, 22000, 0],
    [i7Id, p4Id, 'Dresses', 'Party wear dresses', 40, 45000, 2],
  ];
  await appendRows(SHEET_NAMES.PURCHASE_ITEMS, itemRows);

  // ── Returns ───────────────────────────────────────────────
  const r1Id = generateId('RTN');
  const r2Id = generateId('RTN');
  const r3Id = generateId('RTN');
  const r4Id = generateId('RTN');
  const r5Id = generateId('RTN');

  const ref1 = generateReturnRef();
  const ref2 = generateReturnRef();
  const ref3 = generateReturnRef();
  const ref4 = generateReturnRef();
  const ref5 = generateReturnRef();

  // ID, ReferenceNumber, PurchaseID, WholesalerID, ReturnDate,
  // PurchaseItemID, ItemDescription, Reason, Quantity,
  // UnitPrice, ReturnAmount, Status, SettlementMethod,
  // Notes, IsDeleted, CreatedAt, UpdatedAt

  const returnRows: SheetRow[] = [
    // R1: Approved — unused shirts (5 units × ₹250 = ₹1,250)
    [r1Id, ref1, p1Id, w1Id, '2025-10-05',
      i1Id, 'Cotton formal shirts - White (5 pcs)', 'unused_stock',
      5, 25000, 125000, 'approved', 'credit_adjustment',
      'Excess stock, not needed', 'false', now, now],

    // R2: Approved — defective T-shirts (10 units × ₹120 = ₹1,200)
    [r2Id, ref2, p2Id, w1Id, '2025-10-15',
      i4Id, 'Round neck T-shirts - Defective stitching', 'defective_damaged',
      10, 12000, 120000, 'credit_note_received', 'credit_adjustment',
      'Stitching defect on collar', 'false', now, now],

    // R3: Pending — 2 party wear dresses wrong size
    [r3Id, ref3, p4Id, w2Id, '2025-10-18',
      i7Id, 'Party wear dresses - Wrong size (XL sent instead of M)', 'size_colour_issue',
      2, 45000, 90000, 'pending_approval', 'replacement_exchange',
      'Size mismatch — awaiting confirmation', 'false', now, now],

    // R4: Rejected
    [r4Id, ref4, p2Id, w1Id, '2025-10-12',
      i3Id, 'Slim fit jeans - Alleged damage claim', 'defective_damaged',
      5, 28000, 140000, 'rejected', 'cash_refund',
      'Wholesaler inspected and rejected claim', 'false', now, now],

    // R5: Refund received — Sharma Textiles
    [r5Id, ref5, p1Id, w1Id, '2025-10-08',
      i2Id, 'Formal trousers - None needed', 'unused_stock',
      0, 35000, 0, 'refund_received', 'bank_upi_refund',
      'UPI refund processed', 'false', now, now],
  ];
  await appendRows(SHEET_NAMES.RETURNS, returnRows);

  // ── Payments ─────────────────────────────────────────────
  const pay1Id = generateId('PAY');
  const pay2Id = generateId('PAY');

  // ID, WholesalerID, PaymentDate, Amount,
  // PaymentMethod, TransactionRef, Notes, IsDeleted, CreatedAt, UpdatedAt
  const paymentRows: SheetRow[] = [
    // Partial payment for P2 (₹5,000 additional beyond initial ₹10,000)
    [pay1Id, w1Id, '2025-10-25', 500000,
      'upi', 'UPI-REF-2025102501', 'Second instalment for winter collection', 'false', now, now],
    // Advance to South Silk House
    [pay2Id, w3Id, '2025-10-22', 250000,
      'bank_transfer', 'NEFT-2025102201', 'Advance payment for upcoming saree order', 'false', now, now],
  ];
  await appendRows(SHEET_NAMES.PAYMENTS, paymentRows);

  // ── Payment Allocations ───────────────────────────────────
  const alcId = generateId('ALC');
  // ID, PaymentID, PurchaseID, AllocatedAmount
  const allocRows: SheetRow[] = [
    [alcId, pay1Id, p2Id, 500000], // ₹5,000 toward P2
  ];
  await appendRows(SHEET_NAMES.PAYMENT_ALLOCATIONS, allocRows);

  // ── Supplier Credits ──────────────────────────────────────
  const crd1Id = generateId('CRD');
  // ID, WholesalerID, ReturnID, CreditDate,
  // TotalCredit, UsedCredit, Notes, IsDeleted, CreatedAt
  const creditRows: SheetRow[] = [
    [crd1Id, w1Id, r2Id, '2025-10-16',
      120000, 0, 'Credit note for defective T-shirts', 'false', now],
  ];
  await appendRows(SHEET_NAMES.SUPPLIER_CREDITS, creditRows);

  // ── Refunds ───────────────────────────────────────────────
  const ref1Id = generateId('REF');
  // ID, WholesalerID, ReturnID, RefundDate,
  // Amount, Method, TransactionRef, Notes, IsDeleted, CreatedAt
  const refundRows: SheetRow[] = [
    [ref1Id, w1Id, r1Id, '2025-10-06',
      50000, 'bank_upi', 'UPI-REF-2025100601',
      'Partial refund for returned shirts', 'false', now],
  ];
  await appendRows(SHEET_NAMES.REFUNDS, refundRows);

  // ── Audit Logs ────────────────────────────────────────────
  const auditRows: SheetRow[] = [
    [generateId('AUD'), 'CREATE', 'Wholesaler', w1Id, 'system', now, 'Demo seed: Sharma Textiles'],
    [generateId('AUD'), 'CREATE', 'Wholesaler', w2Id, 'system', now, 'Demo seed: Mumbai Fashion Hub'],
    [generateId('AUD'), 'CREATE', 'Wholesaler', w3Id, 'system', now, 'Demo seed: South Silk House'],
    [generateId('AUD'), 'CREATE', 'Purchase', p1Id, 'system', now, `Demo seed: ${inv1}`],
    [generateId('AUD'), 'CREATE', 'Purchase', p2Id, 'system', now, `Demo seed: ${inv2}`],
    [generateId('AUD'), 'CREATE', 'Purchase', p3Id, 'system', now, `Demo seed: ${inv3}`],
    [generateId('AUD'), 'CREATE', 'Purchase', p4Id, 'system', now, `Demo seed: ${inv4}`],
  ];
  await appendRows(SHEET_NAMES.AUDIT_LOGS, auditRows);
}
