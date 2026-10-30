'use client';

import { useEffect, useState, FormEvent } from 'react';
import type { Purchase, Wholesaler } from '@/lib/types';
import { CLOTHING_CATEGORIES } from '@/lib/types';
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, getPaymentStatusColor } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWholesaler, setFilterWholesaler] = useState('');
  const [search, setSearch] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([fetchPurchases(), fetchWholesalers()]);
  }, []);

  async function fetchPurchases() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterWholesaler) params.set('wholesalerId', filterWholesaler);
      const res = await fetch(`/api/purchases?${params}`);
      const data = await res.json();
      if (data.success) setPurchases(data.data);
    } catch { showToast('Failed to load purchases.', 'error'); }
    finally { setLoading(false); }
  }

  async function fetchWholesalers() {
    try {
      const res = await fetch('/api/wholesalers');
      const data = await res.json();
      if (data.success) setWholesalers(data.data.filter((w: Wholesaler) => w.status === 'active'));
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchPurchases();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterWholesaler]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this purchase? This action can be reversed by an admin.')) return;
    try {
      const res = await fetch(`/api/purchases/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast('Purchase deleted.', 'success'); fetchPurchases(); }
      else showToast(data.error, 'error');
    } catch { showToast('Failed to delete.', 'error'); }
  }

  const wslMap = Object.fromEntries(wholesalers.map((w) => [w.id, w.name]));

  const filtered = purchases.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.invoiceNumber.toLowerCase().includes(q) ||
      (wslMap[p.wholesalerId] || '').toLowerCase().includes(q) ||
      p.items?.some((it) => it.description.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">{purchases.length} purchase invoice{purchases.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Purchase</button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input className="form-input" placeholder="Search invoices…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ maxWidth: 180 }} value={filterWholesaler} onChange={(e) => setFilterWholesaler(e.target.value)}>
          <option value="">All Wholesalers</option>
          {wholesalers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: 160 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>

      {loading ? (
        <div className="card card-body">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ width: '100%', height: 20, marginBottom: 12 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <div className="empty-state-title">No purchases found</div>
          <div className="empty-state-desc">Record your first purchase from a wholesaler.</div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Wholesaler</th>
                <th>Date</th>
                <th>Items</th>
                <th style={{ textAlign: 'right' }}>Invoice Total</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Pending</th>
                <th>Status</th>
                <th>Method</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const pending = p.invoiceTotal - p.amountPaid;
                return (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8125rem' }}>{p.invoiceNumber}</td>
                    <td>{wslMap[p.wholesalerId] || p.wholesalerId}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(p.purchaseDate)}</td>
                    <td>
                      {p.items?.length ?? 0} item{(p.items?.length ?? 0) !== 1 ? 's' : ''}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(p.invoiceTotal)}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(p.amountPaid)}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {pending > 0 ? <span className="text-debit">{formatCurrency(pending)}</span> : '—'}
                    </td>
                    <td>
                      <span className={`badge badge-${getPaymentStatusColor(p.paymentStatus)}`}>
                        {PAYMENT_STATUS_LABELS[p.paymentStatus] || p.paymentStatus}
                      </span>
                    </td>
                    <td><span className="badge badge-gray">{PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</span></td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <PurchaseModal
          wholesalers={wholesalers}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchPurchases(); }}
        />
      )}
    </div>
  );
}

// ── Purchase creation modal ──────────────────────────────────

interface PurchaseModalProps {
  wholesalers: Wholesaler[];
  onClose: () => void;
  onSaved: () => void;
}

interface ItemForm {
  category: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

function PurchaseModal({ wholesalers, onClose, onSaved }: PurchaseModalProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    wholesalerId: '',
    purchaseDate: new Date().toISOString().substring(0, 10),
    invoiceNumber: '',
    additionalCharges: '',
    discount: '',
    gstAmount: '',
    amountPaid: '',
    paymentMethod: 'cash',
    notes: '',
  });

  const [items, setItems] = useState<ItemForm[]>([
    { category: 'Shirts', description: '', quantity: '1', unitPrice: '' },
  ]);

  function addItem() {
    setItems([...items, { category: 'Shirts', description: '', quantity: '1', unitPrice: '' }]);
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof ItemForm, value: string) {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  }

  const itemsTotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const invoiceTotal = itemsTotal + (Number(form.additionalCharges) || 0) + (Number(form.gstAmount) || 0) - (Number(form.discount) || 0);
  const pending = invoiceTotal - (Number(form.amountPaid) || 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.wholesalerId) { showToast('Select a wholesaler.', 'error'); return; }
    // if (items.some((it) => !it.description.trim())) { showToast('All items must have a description.', 'error'); return; }
    // if (items.some((it) => Number(it.quantity) < 1)) { showToast('Quantity must be at least 1.', 'error'); return; }
    // if (items.some((it) => Number(it.unitPrice) <= 0)) { showToast('Unit price must be positive.', 'error'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          additionalCharges: Number(form.additionalCharges || 0),
          discount: Number(form.discount || 0),
          gstAmount: Number(form.gstAmount || 0),
          amountPaid: Number(form.amountPaid || 0),
          items: [],
          // items: items.map((it) => ({
          //   category: it.category,
          //   description: it.description,
          //   quantity: Number(it.quantity),
          //   unitPrice: Number(it.unitPrice),
          // })),
        }),
      });
      const data = await res.json();
      if (data.success) { showToast('Purchase recorded!', 'success'); onSaved(); }
      else showToast(data.error, 'error');
    } catch { showToast('Failed to save purchase.', 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" style={{ maxWidth: 900 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">New Purchase Entry</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Top fields */}
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label form-label-required">Wholesaler</label>
                <select className="form-select" value={form.wholesalerId} onChange={(e) => setForm({ ...form, wholesalerId: e.target.value })} required>
                  <option value="">Select wholesaler…</option>
                  {wholesalers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label form-label-required">Purchase Date</label>
                <input className="form-input" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} required />
              </div>
              <div className="form-group">
                {/* <label className="form-label">Invoice Number</label> */}
                <label className="form-label">Particulars</label>
                <input className="form-input" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="Auto-generated if blank" />
              </div>
            </div>

            {/* Items table */}
            {/* <div style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Line Items</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ Add Item</button>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>Category</th>
                      <th>Description</th>
                      <th style={{ width: 80 }}>Qty</th>
                      <th style={{ width: 120 }}>Unit Price (₹)</th>
                      <th style={{ width: 120, textAlign: 'right' }}>Line Total</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td>
                          <select className="form-select" value={it.category} onChange={(e) => updateItem(idx, 'category', e.target.value)} style={{ minWidth: 100 }}>
                            {CLOTHING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="form-input" value={it.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Item description" required />
                        </td>
                        <td>
                          <input className="form-input" type="number" min="1" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} required />
                        </td>
                        <td>
                          <input className="form-input" type="number" min="0" step="0.01" value={it.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} required />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          ₹{((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          {items.length > 1 && (
                            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => removeItem(idx)} title="Remove">✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div> */}

            {/* Charges / totals */}
            <div className="form-grid" style={{ marginTop: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Additional Charges (₹)</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.additionalCharges} onChange={(e) => setForm({ ...form, additionalCharges: e.target.value })} />
                <span className="form-hint">Transport, loading, etc.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Discount (₹)</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">GST Amount (₹)</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.gstAmount} onChange={(e) => setForm({ ...form, gstAmount: e.target.value })} />
              </div>
              <div className="form-group">
                {/* <label className="form-label">Amount Paid Now (₹)</label> */}
                <label className="form-label">Credit (जमा) (₹)</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            {/* Invoice summary */}
            <div className="card" style={{ marginTop: '1rem', background: '#f8fafc' }}>
              <div className="card-body" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                  <span className="text-secondary">Items Subtotal</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{itemsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(form.additionalCharges) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                    <span className="text-secondary">+ Additional Charges</span>
                    <span>₹{Number(form.additionalCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {Number(form.gstAmount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                    <span className="text-secondary">+ GST</span>
                    <span>₹{Number(form.gstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {Number(form.discount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                    <span className="text-secondary">− Discount</span>
                    <span className="text-credit">−₹{Number(form.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="divider" style={{ margin: '0.5rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem' }}>
                  <span>Invoice Total</span>
                  <span>₹{invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {pending > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
                    <span className="text-debit">Outstanding</span>
                    <span className="text-debit" style={{ fontWeight: 600 }}>₹{pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Record Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
