'use client';

import { useEffect, useState, FormEvent } from 'react';
import type { Return, Purchase, Wholesaler, PurchaseItem } from '@/lib/types';
import { formatCurrency, formatDate, RETURN_REASON_LABELS, RETURN_STATUS_LABELS, SETTLEMENT_METHOD_LABELS, getReturnStatusColor } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([fetchReturns(), fetchWholesalers()]);
  }, []);

  async function fetchReturns() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/returns?${params}`);
      const data = await res.json();
      if (data.success) setReturns(data.data);
    } catch { showToast('Failed to load returns.', 'error'); }
    finally { setLoading(false); }
  }

  async function fetchWholesalers() {
    try {
      const res = await fetch('/api/wholesalers');
      const data = await res.json();
      if (data.success) setWholesalers(data.data.filter((w: Wholesaler) => w.status === 'active'));
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchReturns(); }, [filterStatus]);

  async function handleStatusUpdate(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/returns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) { showToast(`Return status updated to ${RETURN_STATUS_LABELS[newStatus] || newStatus}.`, 'success'); fetchReturns(); }
      else showToast(data.error, 'error');
    } catch { showToast('Failed to update.', 'error'); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this return entry?')) return;
    try {
      const res = await fetch(`/api/returns/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast('Return deleted.', 'success'); fetchReturns(); }
      else showToast(data.error, 'error');
    } catch { showToast('Failed to delete.', 'error'); }
  }

  const wslMap = Object.fromEntries(wholesalers.map((w) => [w.id, w.name]));

  const filtered = returns.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.referenceNumber.toLowerCase().includes(q) ||
      r.itemDescription.toLowerCase().includes(q) ||
      (wslMap[r.wholesalerId] || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Returns</h1>
          <p className="page-subtitle">{returns.length} return entr{returns.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Return</button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input className="form-input" placeholder="Search returns…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ maxWidth: 180 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending_approval">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="credit_note_received">Credit Note</option>
          <option value="refund_received">Refunded</option>
          <option value="goods_exchanged">Exchanged</option>
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
          <div className="empty-state-icon">↩️</div>
          <div className="empty-state-title">No returns found</div>
          <div className="empty-state-desc">Create a return entry when you send goods back to a wholesaler.</div>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ref No.</th>
                <th>Wholesaler</th>
                <th>Date</th>
                <th>Item</th>
                <th>Reason</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Return Amt</th>
                <th>Status</th>
                <th>Settlement</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8125rem' }}>{r.referenceNumber}</td>
                  <td>{wslMap[r.wholesalerId] || r.wholesalerId}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.returnDate)}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.itemDescription}</td>
                  <td><span className="badge badge-gray">{RETURN_REASON_LABELS[r.reason] || r.reason}</span></td>
                  <td style={{ textAlign: 'center' }}>{r.quantity}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.returnAmount)}</td>
                  <td>
                    <span className={`badge badge-${getReturnStatusColor(r.status)}`}>
                      {RETURN_STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>{SETTLEMENT_METHOD_LABELS[r.settlementMethod] || r.settlementMethod}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {/* {r.status === 'pending_approval' && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate(r.id, 'approved')}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleStatusUpdate(r.id, 'rejected')}>Reject</button>
                        </>
                      )} */}
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(r.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ReturnModal
          wholesalers={wholesalers}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchReturns(); }}
        />
      )}
    </div>
  );
}

// ── Return Creation Modal ────────────────────────────────────

interface ReturnModalProps {
  wholesalers: Wholesaler[];
  onClose: () => void;
  onSaved: () => void;
}

// function ReturnModal({ wholesalers, onClose, onSaved }: ReturnModalProps) {
//   const { showToast } = useToast();
//   const [saving, setSaving] = useState(false);
//   const [purchases, setPurchases] = useState<Purchase[]>([]);
//   const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

//   const [form, setForm] = useState({
//     wholesalerId: '',
//     purchaseId: '',
//     purchaseItemId: '',
//     returnDate: new Date().toISOString().substring(0, 10),
//     reason: 'unused_stock' as string,
//     quantity: '1',
//     settlementMethod: 'credit_adjustment' as string,
//     notes: '',
//   });

//   // When wholesaler changes, load their purchases
//   useEffect(() => {
//     if (!form.wholesalerId) { setPurchases([]); return; }
//     fetch(`/api/purchases?wholesalerId=${form.wholesalerId}`)
//       .then((r) => r.json())
//       .then((d) => { if (d.success) setPurchases(d.data); });
//   }, [form.wholesalerId]);

//   // When purchase changes, set selected purchase
//   useEffect(() => {
//     const p = purchases.find((p) => p.id === form.purchaseId);
//     setSelectedPurchase(p || null);
//   }, [form.purchaseId, purchases]);

//   const selectedItem = selectedPurchase?.items?.find((it: PurchaseItem) => it.id === form.purchaseItemId);
//   const unitPriceRupees = selectedItem ? selectedItem.unitPrice / 100 : 0;
//   const returnAmount = (Number(form.quantity) || 0) * unitPriceRupees;

//   async function handleSubmit(e: FormEvent) {
//     e.preventDefault();
//     if (!form.wholesalerId || !form.purchaseId || !form.purchaseItemId) {
//       showToast('Select wholesaler, purchase, and item.', 'error');
//       return;
//     }

//     setSaving(true);
//     try {
//       const res = await fetch('/api/returns', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           ...form,
//           quantity: Number(form.quantity),
//           unitPrice: unitPriceRupees,
//           returnAmount,
//           itemDescription: selectedItem?.description || '',
//         }),
//       });
//       const data = await res.json();
//       if (data.success) { showToast('Return recorded!', 'success'); onSaved(); }
//       else showToast(data.error, 'error');
//     } catch { showToast('Failed to save return.', 'error'); }
//     finally { setSaving(false); }
//   }

//   return (
//     <div className="modal-overlay" onClick={onClose}>
//       <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
//         <div className="modal-header">
//           <h3 className="modal-title">New Return Entry</h3>
//           <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
//         </div>
//         <form onSubmit={handleSubmit}>
//           <div className="modal-body">
//             <div className="form-grid">
//               <div className="form-group">
//                 <label className="form-label form-label-required">Wholesaler</label>
//                 <select className="form-select" value={form.wholesalerId} onChange={(e) => setForm({ ...form, wholesalerId: e.target.value, purchaseId: '', purchaseItemId: '' })} required>
//                   <option value="">Select wholesaler…</option>
//                   {wholesalers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
//                 </select>
//               </div>
//               <div className="form-group">
//                 <label className="form-label form-label-required">Purchase Invoice</label>
//                 <select className="form-select" value={form.purchaseId} onChange={(e) => setForm({ ...form, purchaseId: e.target.value, purchaseItemId: '' })} required disabled={!form.wholesalerId}>
//                   <option value="">Select purchase…</option>
//                   {purchases.map((p) => <option key={p.id} value={p.id}>{p.invoiceNumber} — {formatDate(p.purchaseDate)}</option>)}
//                 </select>
//               </div>
//             </div>

//             {selectedPurchase && (
//               <div className="form-group">
//                 <label className="form-label form-label-required">Item to Return</label>
//                 <select className="form-select" value={form.purchaseItemId} onChange={(e) => setForm({ ...form, purchaseItemId: e.target.value })} required>
//                   <option value="">Select item…</option>
//                   {selectedPurchase.items?.map((it: PurchaseItem) => {
//                     const avail = it.quantity - it.returnedQuantity;
//                     return (
//                       <option key={it.id} value={it.id} disabled={avail <= 0}>
//                         {it.description} ({it.category}) — {avail} available, ₹{(it.unitPrice / 100).toFixed(2)}/unit
//                       </option>
//                     );
//                   })}
//                 </select>
//               </div>
//             )}

//             <div className="form-grid-3">
//               <div className="form-group">
//                 <label className="form-label form-label-required">Return Date</label>
//                 <input className="form-input" type="date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} required />
//               </div>
//               <div className="form-group">
//                 <label className="form-label form-label-required">Quantity</label>
//                 <input
//                   className="form-input"
//                   type="number"
//                   min="1"
//                   max={selectedItem ? selectedItem.quantity - selectedItem.returnedQuantity : 9999}
//                   value={form.quantity}
//                   onChange={(e) => setForm({ ...form, quantity: e.target.value })}
//                   required
//                 />
//                 {selectedItem && (
//                   <span className="form-hint">Max: {selectedItem.quantity - selectedItem.returnedQuantity} units</span>
//                 )}
//               </div>
//               <div className="form-group">
//                 <label className="form-label">Return Amount</label>
//                 <div className="form-input" style={{ background: '#f8fafc', fontWeight: 600 }}>
//                   ₹{returnAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
//                 </div>
//               </div>
//             </div>

//             <div className="form-grid">
//               <div className="form-group">
//                 <label className="form-label form-label-required">Return Reason</label>
//                 <select className="form-select" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required>
//                   {Object.entries(RETURN_REASON_LABELS).map(([key, label]) => (
//                     <option key={key} value={key}>{label}</option>
//                   ))}
//                 </select>
//               </div>
//               <div className="form-group">
//                 <label className="form-label">Settlement Method</label>
//                 <select className="form-select" value={form.settlementMethod} onChange={(e) => setForm({ ...form, settlementMethod: e.target.value })}>
//                   {Object.entries(SETTLEMENT_METHOD_LABELS).map(([key, label]) => (
//                     <option key={key} value={key}>{label}</option>
//                   ))}
//                 </select>
//               </div>
//             </div>

//             <div className="form-group">
//               <label className="form-label">Notes</label>
//               <textarea className="form-textarea" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Reason details, condition, etc." />
//             </div>
//           </div>
//           <div className="modal-footer">
//             <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
//             <button type="submit" className="btn btn-primary" disabled={saving}>
//               {saving ? 'Saving…' : 'Record Return'}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }



function ReturnModal({ wholesalers, onClose, onSaved }: ReturnModalProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  const [form, setForm] = useState({
    wholesalerId: '',
    purchaseId: '',
    purchaseItemId: '',
    returnDate: new Date().toISOString().substring(0, 10),
    reason: 'unused_stock' as string,
    quantity: '',
    returnAmount: '',
    settlementMethod: 'credit_adjustment' as string,
    notes: '',
  });

  useEffect(() => {
    if (!form.wholesalerId) {
      setPurchases([]);
      return;
    }

    fetch(`/api/purchases?wholesalerId=${form.wholesalerId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPurchases(d.data);
      });
  }, [form.wholesalerId]);

  useEffect(() => {
    const p = purchases.find((p) => p.id === form.purchaseId);
    setSelectedPurchase(p || null);
  }, [form.purchaseId, purchases]);

  const selectedItem = selectedPurchase?.items?.find(
    (it: PurchaseItem) => it.id === form.purchaseItemId
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!form.wholesalerId || !form.purchaseId) {
      showToast('Select wholesaler and purchase invoice.', 'error');
      return;
    }

    if (!form.returnAmount || Number(form.returnAmount) <= 0) {
      showToast('Enter a valid return amount.', 'error');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity) || 0,
          returnAmount: Number(form.returnAmount),
          unitPrice: selectedItem ? selectedItem.unitPrice / 100 : 0,
          itemDescription: selectedItem?.description || '',
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast('Return recorded!', 'success');
        onSaved();
      } else {
        showToast(data.error, 'error');
      }
    } catch {
      showToast('Failed to save return.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">New Return Entry</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label form-label-required">Wholesaler</label>
                <select
                  className="form-select"
                  value={form.wholesalerId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      wholesalerId: e.target.value,
                      purchaseId: '',
                      purchaseItemId: '',
                    })
                  }
                  required
                >
                  <option value="">Select wholesaler…</option>
                  {wholesalers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">Purchase Invoice</label>
                <select
                  className="form-select"
                  value={form.purchaseId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      purchaseId: e.target.value,
                      purchaseItemId: '',
                    })
                  }
                  required
                  disabled={!form.wholesalerId}
                >
                  <option value="">Select purchase…</option>
                  {purchases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.invoiceNumber} — {formatDate(p.purchaseDate)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedPurchase && (
              <div className="form-group">
                <label className="form-label">Item to Return (Optional)</label>
                <select
                  className="form-select"
                  value={form.purchaseItemId}
                  onChange={(e) =>
                    setForm({ ...form, purchaseItemId: e.target.value })
                  }
                >
                  <option value="">No specific item</option>
                  {selectedPurchase.items?.map((it: PurchaseItem) => {
                    const avail = it.quantity - it.returnedQuantity;

                    return (
                      <option key={it.id} value={it.id} disabled={avail <= 0}>
                        {it.description} ({it.category}) — {avail} available
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label form-label-required">Return Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.returnDate}
                  onChange={(e) =>
                    setForm({ ...form, returnDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quantity (Optional)</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: e.target.value })
                  }
                  placeholder="Enter quantity"
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">Return Amount (₹)</label>
                <input
                  className="form-input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.returnAmount}
                  onChange={(e) =>
                    setForm({ ...form, returnAmount: e.target.value })
                  }
                  placeholder="Enter return amount"
                  required
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label form-label-required">Return Reason</label>
                <select
                  className="form-select"
                  value={form.reason}
                  onChange={(e) =>
                    setForm({ ...form, reason: e.target.value })
                  }
                  required
                >
                  {Object.entries(RETURN_REASON_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Settlement Method</label>
                <select
                  className="form-select"
                  value={form.settlementMethod}
                  onChange={(e) =>
                    setForm({ ...form, settlementMethod: e.target.value })
                  }
                >
                  {Object.entries(SETTLEMENT_METHOD_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
                placeholder="Additional return details..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Record Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
