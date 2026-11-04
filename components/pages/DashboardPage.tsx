'use client';

import { useEffect, useState } from 'react';
import type { DashboardStats, RecentTransaction, MonthlyDataPoint, WholesalerBalance } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DashboardPageProps {
  onNavigate: (page: string, detail?: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || 'Failed to load dashboard.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <DashboardSkeleton />;
  if (error) return (
    <div className="alert alert-danger">
      <span>⚠</span>
      <span>{error}</span>
      <button className="btn btn-sm btn-secondary" onClick={fetchDashboard} style={{ marginLeft: 'auto' }}>Retry</button>
    </div>
  );
  if (!stats) return null;

  const statCards = [
    { label: 'Total Purchases', value: formatCurrency(stats.totalPurchaseAmount), color: '#1e40af', bgColor: '#eff6ff', icon: '📦' },
    { label: 'Total Returns', value: formatCurrency(stats.totalReturnAmount), color: '#d97706', bgColor: '#fffbeb', icon: '↩️' },
    { label: 'Net Purchases', value: formatCurrency(stats.netPurchaseAmount), color: '#0891b2', bgColor: '#ecfeff', icon: '📊' },
    { label: 'Amount Paid', value: formatCurrency(stats.totalAmountPaid), color: '#16a34a', bgColor: '#f0fdf4', icon: '✅' },
    { label: 'Outstanding', value: formatCurrency(stats.outstandingPayable), color: '#dc2626', bgColor: '#fef2f2', icon: '⏳' },
    { label: 'Wholesalers', value: String(stats.totalWholesalers), color: '#7c3aed', bgColor: '#f5f3ff', icon: '🏪' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Financial overview of your showroom</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchDashboard}>
          ↻ Refresh
        </button>
      </div>

      {/* Stat Cards */}
      {/* <div className="stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-card-label">{card.label}</div>
                <div className="stat-card-value">{card.value}</div>
              </div>
              <div
                className="stat-card-icon"
                style={{ background: card.bgColor, color: card.color, fontSize: '1.25rem' }}
              >
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div> */}

      

<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "20px",gap: "16px" }}>
  {statCards.map((card) => (
    <div
      key={card.label}
      style={{
        minWidth: 0,
        overflow: "hidden",
        padding: "16px",
        borderRadius: "12px",
        background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "4px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px" }}>
            {card.label}
          </div>

          <div
            style={{
              fontSize: "clamp(12px, 1vw, 18px)",
              fontWeight: 700,
              whiteSpace: "nowrap",
              letterSpacing: "-0.4px",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {card.value}
          </div>
        </div>

        <div
          style={{
            background: card.bgColor,
            color: card.color,
            fontSize: "16px",
            width: "32px",
            height: "32px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
          }}
        >
          {card.icon}
        </div>
      </div>
    </div>
  ))}
</div>



      

        {/* Wholesaler Balances */}
        <div className="card" style={{ gridColumn: '1 / -1',marginBottom:'40px' }}>
          <div className="card-header">
            <h3 className="card-title">Wholesaler Balances</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('wholesalers')}>
              View All →
            </button>
          </div>
          {stats.wholesalerBalances.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏪</div>
              <div className="empty-state-title">No wholesalers yet</div>
              <div className="empty-state-desc">Add wholesalers to track balances.</div>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Wholesaler</th>
                    <th style={{ textAlign: 'right' }}>Purchases</th>
                    <th style={{ textAlign: 'right' }}>Returns</th>
                    <th style={{ textAlign: 'right' }}>Payments</th>
                    <th style={{ textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.wholesalerBalances.map((wb: WholesalerBalance, i: number) => (
                    <tr key={i}>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontWeight: 600, padding: '0.25rem 0', textDecoration: 'underline', color: 'var(--color-primary)' }}
                          onClick={() => onNavigate('wholesaler-detail', wb.wholesalerId)}
                        >
                          {wb.wholesalerName}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(wb.totalPurchases)}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <span className="text-credit">-{formatCurrency(wb.totalReturns)}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <span className="text-credit">-{formatCurrency(wb.totalPayments)}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        <span className={wb.outstandingBalance > 0 ? 'text-debit' : 'text-credit'}>
                          {formatCurrency(wb.outstandingBalance)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Recent Transactions */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <h3 className="card-title">Recent Transactions</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('purchases')}>
              View All →
            </button>
          </div>
          {stats.recentTransactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No transactions yet</div>
              <div className="empty-state-desc">Start by adding a purchase or wholesaler.</div>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Wholesaler</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTransactions.map((tx: RecentTransaction, i: number) => (
                    <tr key={i}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(tx.date)}</td>
                      <td>
                        <span className={`badge ${getTxBadgeClass(tx.type)}`}>
                          {getTxLabel(tx.type)}
                        </span>
                      </td>
                      <td>{tx.description}</td>
                      <td>{tx.wholesalerName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        <span className={tx.type === 'purchase' ? 'text-debit' : 'text-credit'}>
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Monthly Chart */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <h3 className="card-title">Monthly Purchase & Return Trends</h3>
          </div>
          <div className="card-body">
            {stats.monthlyData.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-state-title">No monthly data yet</div>
              </div>
            ) : (
              <MonthlyChart data={stats.monthlyData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getTxBadgeClass(type: string): string {
  switch (type) {
    case 'purchase': return 'badge-blue';
    case 'return': return 'badge-yellow';
    case 'payment': return 'badge-green';
    case 'refund': return 'badge-gray';
    default: return 'badge-gray';
  }
}

function getTxLabel(type: string): string {
  switch (type) {
    case 'purchase': return 'Purchase';
    case 'return': return 'Return';
    case 'payment': return 'Payment';
    case 'refund': return 'Refund';
    default: return type;
  }
}

function MonthlyChart({ data }: { data: MonthlyDataPoint[] }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.purchases, d.returns, d.payments]), 1);

  const formatMonth = (ym: string) => {
    const [year, month] = ym.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', fontSize: '0.75rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#3b82f6', display: 'inline-block' }} />
          Purchases
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b', display: 'inline-block' }} />
          Returns
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#22c55e', display: 'inline-block' }} />
          Payments
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 200 }}>
        {data.map((d) => (
          <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160, width: '100%', justifyContent: 'center' }}>
              <div
                style={{
                  width: '24%',
                  height: `${Math.max((d.purchases / maxVal) * 160, 4)}px`,
                  background: '#3b82f6',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.3s ease',
                }}
                title={`Purchases: ${formatCurrency(d.purchases)}`}
              />
              <div
                style={{
                  width: '24%',
                  height: `${Math.max((d.returns / maxVal) * 160, 4)}px`,
                  background: '#f59e0b',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.3s ease',
                }}
                title={`Returns: ${formatCurrency(d.returns)}`}
              />
              <div
                style={{
                  width: '24%',
                  height: `${Math.max((d.payments / maxVal) * 160, 4)}px`,
                  background: '#22c55e',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.3s ease',
                }}
                title={`Payments: ${formatCurrency(d.payments)}`}
              />
            </div>
            <span style={{ fontSize: '0.6875rem', color: '#64748b', whiteSpace: 'nowrap' }}>
              {formatMonth(d.month)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="skeleton" style={{ width: 180, height: 28, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 240, height: 16 }} />
        </div>
      </div>
      <div className="stats-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="stat-card">
            <div className="skeleton" style={{ width: '60%', height: 14, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: '80%', height: 28 }} />
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-body">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ width: '100%', height: 20, marginBottom: 12 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
