// ============================================================
// Wholesaler Repository — CRUD for Wholesalers sheet tab
// ============================================================
import {
  readSheet,
  appendRows,
  updateRow,
  findRowIndexById,
  SHEET_NAMES,
} from '@/services/googleSheetsService';
import type { Wholesaler, SheetRow } from '@/lib/types';
import { generateId } from '@/lib/utils';

// ── Row serialization ─────────────────────────────────────────
// Headers: ID, Name, ContactPerson, Mobile, Address, GSTIN,
//          OpeningBalance, Notes, Status, CreatedAt

function rowToWholesaler(row: SheetRow): Wholesaler {
  return {
    id: String(row[0] ?? ''),
    name: String(row[1] ?? ''),
    contactPerson: String(row[2] ?? ''),
    mobile: String(row[3] ?? ''),
    address: String(row[4] ?? ''),
    gstin: String(row[5] ?? '') || undefined,
    openingBalance: Number(row[6] ?? 0),
    notes: String(row[7] ?? '') || undefined,
    status: (String(row[8] ?? 'active') as 'active' | 'archived'),
    createdAt: String(row[9] ?? ''),
  };
}

function wholesalerToRow(w: Wholesaler): SheetRow {
  return [
    w.id,
    w.name,
    w.contactPerson,
    w.mobile,
    w.address,
    w.gstin ?? '',
    w.openingBalance,
    w.notes ?? '',
    w.status,
    w.createdAt,
  ];
}

// ── Public API ────────────────────────────────────────────────

export async function getAllWholesalers(): Promise<Wholesaler[]> {
  const rows = await readSheet(SHEET_NAMES.WHOLESALERS);
  return rows
    .filter((r) => r.length > 0 && r[0])
    .map(rowToWholesaler);
}

export async function getActiveWholesalers(): Promise<Wholesaler[]> {
  const all = await getAllWholesalers();
  return all.filter((w) => w.status === 'active');
}

export async function getWholesalerById(id: string): Promise<Wholesaler | null> {
  const all = await getAllWholesalers();
  return all.find((w) => w.id === id) ?? null;
}

export async function createWholesaler(
  data: Omit<Wholesaler, 'id' | 'createdAt' | 'status'>,
): Promise<Wholesaler> {
  const wholesaler: Wholesaler = {
    ...data,
    id: generateId('WSL'),
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  await appendRows(SHEET_NAMES.WHOLESALERS, [wholesalerToRow(wholesaler)]);
  return wholesaler;
}

export async function updateWholesaler(
  id: string,
  data: Partial<Omit<Wholesaler, 'id' | 'createdAt'>>,
): Promise<Wholesaler> {
  const existing = await getWholesalerById(id);
  if (!existing) throw new Error(`Wholesaler not found: ${id}`);

  const updated: Wholesaler = { ...existing, ...data };
  const rowIndex = await findRowIndexById(SHEET_NAMES.WHOLESALERS, id);
  if (rowIndex < 0) throw new Error(`Row not found for wholesaler: ${id}`);

  await updateRow(SHEET_NAMES.WHOLESALERS, rowIndex, wholesalerToRow(updated));
  return updated;
}

export async function archiveWholesaler(id: string): Promise<Wholesaler> {
  return updateWholesaler(id, { status: 'archived' });
}

export async function searchWholesalers(query: string): Promise<Wholesaler[]> {
  const all = await getAllWholesalers();
  const q = query.toLowerCase();
  return all.filter(
    (w) =>
      w.name.toLowerCase().includes(q) ||
      w.mobile.includes(q) ||
      w.contactPerson.toLowerCase().includes(q),
  );
}
