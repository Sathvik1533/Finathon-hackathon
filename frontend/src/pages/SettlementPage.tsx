import React, { useEffect, useState } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { DataTable } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { getSettlements } from '../api/settlements';
import type { Settlement } from '../api/settlements';
import { useAuth } from '../context/AuthContext';

const paise = (v: number | null) =>
  v == null ? '—' : `₹${(v / 100).toFixed(2)}`;

export const SettlementPage: React.FC = () => {
  const { user } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const data = await getSettlements(user.token);
      setSettlements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.token]);

  const columns = [
    { header: 'Settlement ID',  accessor: (r: Settlement) => <span className="font-mono text-[11px]">{r.settlementId}</span> },
    { header: 'Orders',         accessor: (r: Settlement) => <span className="font-mono">{r.orderCount}</span> },
    { header: 'Total Gross',    accessor: (r: Settlement) => <span className="font-mono">{paise(r.totalGross)}</span> },
    { header: 'Fees + GST',     accessor: (r: Settlement) => <span className="font-mono text-amber-700">{paise(r.totalFees + r.totalTax)}</span> },
    { header: 'Net Expected',   accessor: (r: Settlement) => <span className="font-mono font-semibold">{paise(r.netAmount)}</span> },
    { header: 'Bank Credit',    accessor: (r: Settlement) => <span className="font-mono">{paise(r.bankCreditAmount)}</span> },
    { header: 'Variance',       accessor: (r: Settlement) => (
        <span className={`font-mono font-semibold ${Math.abs(r.variance) < 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {r.variance === 0 ? '₹0.00' : paise(r.variance)}
        </span>
    )},
    { header: 'UTR',            accessor: (r: Settlement) => <span className="font-mono text-[10px] text-slate-500">{r.utr ?? '—'}</span> },
    { header: 'Status',         accessor: (r: Settlement) => <StatusBadge status={r.status} /> },
  ];

  return (
    <PageShell
      title="Settlement Matcher"
      subtitle="M9 — 1:N batch grouping and bank credit verification"
      actions={
        <button onClick={load} className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50">
          ↺ Refresh
        </button>
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>
      )}

      {!loading && settlements.length === 0 && !error && (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
          <div className="text-3xl mb-3">⟷</div>
          <div className="text-sm font-medium text-slate-700">No settlement data yet</div>
          <div className="text-xs text-slate-400 mt-1">Run reconciliation from the Dashboard to generate settlement matches</div>
        </div>
      )}

      {settlements.length > 0 && (
        <DataTable columns={columns as any} rows={settlements as any[]} loading={loading} />
      )}
    </PageShell>
  );
};
