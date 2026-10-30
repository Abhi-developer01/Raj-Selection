'use client';

import { useEffect, useState, FormEvent } from 'react';
import type { Wholesaler, WholesalerSummary } from '@/lib/types';
import { formatCurrency, formatDate, paiseToRupees } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

interface WholesalersPageProps {
  onNavigate: (page: string, detail?: string) => void;
}

export default function WholesalersPage({ onNavigate }: WholesalersPageProps) {
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWholesaler, setEditingWholesaler] = useState<Wholesaler | null>(null);
  const { showToast } = useToast();

  useEffect(() => { fetchWholesalers(); }, []);

  async function fetchWholesalers() {
    setLoading(true);
    try {
      const url = search ? `/api/wholesalers?q=${encodeURIComponent(search)}` : '/api/wholesalers';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setWholesalers(data.data);
    } catch { showToast('Failed to load wholesalers.', 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const timer = setTimeout(fetchWholesalers, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openAdd() {
    setEditingWholesaler(null);
    setShowModal(true);
  }

  function openEdit(w: Wholesaler) {
    setEditingWholesaler(w);
    setShowModal(true);
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this wholesaler? They will be hidden from active lists.')) return;
    try {
      const res = await fetch(`/api/wholesalers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Wholesaler archived.', 'success');
        fetchWholesalers();
      } else {
        showToast(data.error, 'error');
      }
    } catch { showToast('Failed to archive.', 'error'); }
  }

  const active = wholesalers.filter((w) => w.status === 'active');
  const archived = wholesalers.filter((w) => w.status === 'archived');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Wholesalers</h1>
          <p className="page-subtitle">{active.length} active wholesaler{active.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Wholesaler</button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="form-input"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="card card-body">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ width: '100%', height: 20, marginBottom: 12 }} />
          ))}
        </div>
      ) : active.length === 0 && !search ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏪</div>
          <div className="empty-state-title">No wholesalers yet</div>
          <div className="empty-state-desc">Add your first wholesaler to start tracking purchases.</div>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={openAdd}>+ Add Wholesaler</button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Mobile</th>
                <th>GSTIN</th>
                <th style={{ textAlign: 'right' }}>Opening Bal.</th>
                <th>Added</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {active.map((w) => (
                <tr key={w.id}>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontWeight: 600, padding: '0.25rem 0', textDecoration: 'underline', color: 'var(--color-primary)' }}
                      onClick={() => onNavigate('wholesaler-detail', w.id)}
                    >
                      {w.name}
                    </button>
                  </td>
                  <td>{w.contactPerson || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{w.mobile}</td>
                  <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{w.gstin || '—'}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {w.openingBalance > 0 ? formatCurrency(w.openingBalance) : '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(w.createdAt)}</td>
                  <td>
                    <span className="badge badge-green">Active</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('wholesaler-detail', w.id)}>
                        View
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(w)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleArchive(w.id)}>
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {archived.map((w) => (
                <tr key={w.id} style={{ opacity: 0.5 }}>
                  <td>{w.name}</td>
                  <td>{w.contactPerson || '—'}</td>
                  <td>{w.mobile}</td>
                  <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{w.gstin || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{w.openingBalance > 0 ? formatCurrency(w.openingBalance) : '—'}</td>
                  <td>{formatDate(w.createdAt)}</td>
                  <td><span className="badge badge-gray">Archived</span></td>
                  <td>—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <WholesalerModal
          wholesaler={editingWholesaler}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchWholesalers();
          }}
        />
      )}
    </div>
  );
}

// ── Add / Edit Wholesaler Modal ──────────────────────────────

interface WholesalerModalProps {
  wholesaler: Wholesaler | null;
  onClose: () => void;
  onSaved: () => void;
}

function WholesalerModal({ wholesaler, onClose, onSaved }: WholesalerModalProps) {
  const isEdit = !!wholesaler;
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: wholesaler?.name ?? '',
    contactPerson: wholesaler?.contactPerson ?? '',
    mobile: wholesaler?.mobile ?? '',
    address: wholesaler?.address ?? '',
    gstin: wholesaler?.gstin ?? '',
    openingBalance: wholesaler ? String(paiseToRupees(wholesaler.openingBalance)) : '',
    notes: wholesaler?.notes ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.mobile.trim()) errs.mobile = 'Mobile is required.';
    else if (!/^[6-9]\d{9}$/.test(form.mobile.replace(/\s/g, ''))) errs.mobile = 'Enter a valid 10-digit mobile.';
    if (form.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin.toUpperCase())) {
      errs.gstin = 'Invalid GSTIN format.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const url = isEdit ? `/api/wholesalers/${wholesaler!.id}` : '/api/wholesalers';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          openingBalance: Number(form.openingBalance || 0),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(isEdit ? 'Wholesaler updated.' : 'Wholesaler added.', 'success');
        onSaved();
      } else {
        showToast(data.error, 'error');
      }
    } catch { showToast('Failed to save wholesaler.', 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? 'Edit Wholesaler' : 'Add New Wholesaler'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label form-label-required">Business Name</label>
                <input className={`form-input ${errors.name ? 'error' : ''}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Contact Person</label>
                <input className="form-input" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label form-label-required">Mobile Number</label>
                <input className={`form-input ${errors.mobile ? 'error' : ''}`} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} maxLength={10} />
                {errors.mobile && <span className="form-error">{errors.mobile}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">GSTIN</label>
                <input className={`form-input ${errors.gstin ? 'error' : ''}`} value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} placeholder="e.g. 07AAICS0000A1Z5" maxLength={15} style={{ fontFamily: 'monospace' }} />
                {errors.gstin && <span className="form-error">{errors.gstin}</span>}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-textarea" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Opening Balance (₹)</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} />
                <span className="form-hint">Outstanding amount owed at start</span>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update Wholesaler' : 'Add Wholesaler'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Wholesaler Detail / Ledger Page ──────────────────────────

interface WholesalerDetailPageProps {
  wholesalerId: string;
  onNavigate: (page: string, detail?: string) => void;
}

export function WholesalerDetailPage({ wholesalerId, onNavigate }: WholesalerDetailPageProps) {
  const [summary, setSummary] = useState<WholesalerSummary | null>(null);
  const [ledger, setLedger] = useState<Array<{ date: string; reference: string; type: string; description: string; debit: number; credit: number; runningBalance: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'ledger' | 'purchases' | 'returns' | 'payments'>('ledger');
  const { showToast } = useToast();

  useEffect(() => { fetchData(); }, [wholesalerId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [sumRes, ledgerRes] = await Promise.all([
        fetch(`/api/wholesalers/${wholesalerId}?include=summary`),
        fetch(`/api/wholesalers/${wholesalerId}?include=ledger`),
      ]);
      const sumData = await sumRes.json();
      const ledgerData = await ledgerRes.json();
      if (sumData.success) setSummary(sumData.data);
      if (ledgerData.success) setLedger(ledgerData.data);
    } catch { showToast('Failed to load wholesaler details.', 'error'); }
    finally { setLoading(false); }
  }

  if (loading) return (
    <div className="card card-body">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width: '100%', height: 24, marginBottom: 12 }} />
      ))}
    </div>
  );

  if (!summary) return <div className="alert alert-danger">Wholesaler not found.</div>;

  const txTypeLabel: Record<string, string> = {
    opening_balance: 'Opening Balance',
    purchase: 'Purchase',
    return_credit: 'Return / Credit',
    payment: 'Payment',
    refund: 'Refund',
    adjustment: 'Adjustment',
  };

  const txTypeBadge: Record<string, string> = {
    opening_balance: 'badge-gray',
    purchase: 'badge-blue',
    return_credit: 'badge-yellow',
    payment: 'badge-green',
    refund: 'badge-green',
    adjustment: 'badge-gray',
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('wholesalers')}>← Back</button>
          <div>
            <h1 className="page-title">{summary.name}</h1>
            <p className="page-subtitle">
              {summary.contactPerson && `${summary.contactPerson} · `}
              {summary.mobile}
              {summary.gstin && ` · GSTIN: ${summary.gstin}`}
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Purchases</div>
          <div className="stat-card-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(summary.totalPurchases)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Approved Returns</div>
          <div className="stat-card-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(summary.approvedReturns)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Payments</div>
          <div className="stat-card-value" style={{ fontSize: '1.25rem' }}>{formatCurrency(summary.totalPayments)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Outstanding</div>
          <div className="stat-card-value text-debit" style={{ fontSize: '1.25rem' }}>{formatCurrency(summary.outstandingPayable)}</div>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '2px solid var(--color-border)' }}>
        {(['ledger', 'purchases', 'returns', 'payments'] as const).map((t) => (
          <button
            key={t}
            className={`btn btn-ghost btn-sm`}
            style={{
              borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
              borderRadius: 0,
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            }}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Ledger Tab */}
      {tab === 'ledger' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Type</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Debit (₹)</th>
                <th style={{ textAlign: 'right' }}>Credit (₹)</th>
                <th style={{ textAlign: 'right' }}>Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr><td colSpan={7} className="empty-state" style={{ padding: '2rem' }}>No ledger entries found.</td></tr>
              ) : (
                ledger.map((entry, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(entry.date)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{entry.reference}</td>
                    <td>
                      <span className={`badge ${txTypeBadge[entry.type] || 'badge-gray'}`}>
                        {txTypeLabel[entry.type] || entry.type}
                      </span>
                    </td>
                    <td>{entry.description}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {entry.debit > 0 ? <span className="text-debit">{formatCurrency(entry.debit)}</span> : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {entry.credit > 0 ? <span className="text-credit">{formatCurrency(entry.credit)}</span> : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      <span className={entry.runningBalance > 0 ? 'text-debit' : entry.runningBalance < 0 ? 'text-credit' : ''}>
                        {formatCurrency(Math.abs(entry.runningBalance))}
                        {entry.runningBalance > 0 ? ' Dr' : entry.runningBalance < 0 ? ' Cr' : ''}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'purchases' && (
        <WholesalerPurchasesTab wholesalerId={wholesalerId} />
      )}

      {tab === 'returns' && (
        <WholesalerReturnsTab wholesalerId={wholesalerId} />
      )}

      {tab === 'payments' && (
        <WholesalerPaymentsTab wholesalerId={wholesalerId} />
      )}
    </div>
  );
}

// Sub-tabs for detail page

function WholesalerPurchasesTab({ wholesalerId }: { wholesalerId: string }) {
  const [data, setData] = useState<Array<{ id: string; invoiceNumber: string; purchaseDate: string; invoiceTotal: number; amountPaid: number; paymentStatus: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/purchases?wholesalerId=${wholesalerId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, [wholesalerId]);

  if (loading) return <div className="skeleton" style={{ height: 200 }} />;

  return (
    <div className="table-container">
      <table>
        <thead><tr><th>Invoice</th><th>Date</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Paid</th><th>Status</th></tr></thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No purchases found.</td></tr>
          ) : data.map((p) => (
            <tr key={p.id}>
              <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{p.invoiceNumber}</td>
              <td>{formatDate(p.purchaseDate)}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(p.invoiceTotal)}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(p.amountPaid)}</td>
              <td><span className={`badge badge-${p.paymentStatus === 'paid' ? 'green' : p.paymentStatus === 'partially_paid' ? 'yellow' : 'red'}`}>
                {p.paymentStatus === 'paid' ? 'Paid' : p.paymentStatus === 'partially_paid' ? 'Partial' : 'Unpaid'}
              </span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WholesalerReturnsTab({ wholesalerId }: { wholesalerId: string }) {
  const [data, setData] = useState<Array<{ id: string; referenceNumber: string; returnDate: string; itemDescription: string; returnAmount: number; status: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/returns?wholesalerId=${wholesalerId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, [wholesalerId]);

  if (loading) return <div className="skeleton" style={{ height: 200 }} />;

  const statusLabels: Record<string, string> = { pending_approval: 'Pending', approved: 'Approved', rejected: 'Rejected', goods_exchanged: 'Exchanged', credit_note_received: 'Credit Note', refund_received: 'Refunded' };
  const statusColors: Record<string, string> = { pending_approval: 'yellow', approved: 'green', rejected: 'red', goods_exchanged: 'blue', credit_note_received: 'green', refund_received: 'green' };

  return (
    <div className="table-container">
      <table>
        <thead><tr><th>Ref</th><th>Date</th><th>Item</th><th style={{ textAlign: 'right' }}>Amount</th><th>Status</th></tr></thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No returns found.</td></tr>
          ) : data.map((r) => (
            <tr key={r.id}>
              <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{r.referenceNumber}</td>
              <td>{formatDate(r.returnDate)}</td>
              <td>{r.itemDescription}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.returnAmount)}</td>
              <td><span className={`badge badge-${statusColors[r.status] || 'gray'}`}>{statusLabels[r.status] || r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WholesalerPaymentsTab({ wholesalerId }: { wholesalerId: string }) {
  const [data, setData] = useState<Array<{ id: string; paymentDate: string; amount: number; paymentMethod: string; transactionRef?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/payments?wholesalerId=${wholesalerId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, [wholesalerId]);

  if (loading) return <div className="skeleton" style={{ height: 200 }} />;

  const methodLabels: Record<string, string> = { cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank Transfer', cheque: 'Cheque', credit: 'Credit' };

  return (
    <div className="table-container">
      <table>
        <thead><tr><th>Date</th><th style={{ textAlign: 'right' }}>Amount</th><th>Method</th><th>Reference</th></tr></thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No payments found.</td></tr>
          ) : data.map((p) => (
            <tr key={p.id}>
              <td>{formatDate(p.paymentDate)}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
              <td><span className="badge badge-blue">{methodLabels[p.paymentMethod] || p.paymentMethod}</span></td>
              <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{p.transactionRef || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
