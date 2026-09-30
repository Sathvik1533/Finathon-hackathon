import React, { useCallback, useEffect, useState } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { DataTable } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { getSettlements } from '../api/settlements';
import type { Settlement } from '../api/settlements';
import { useAuth } from '../context/AuthContext';

const money = (value: number | null | undefined) => value == null
  ? 'Not returned'
  : `₹${(value / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const SettlementPage: React.FC = () => {
  const { user } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError('');
    try { setSettlements(await getSettlements(user.token)); }
    catch (caught) { setSettlements([]); setError(caught instanceof Error ? caught.message : 'Could not load settlement records.'); }
    finally { setLoading(false); }
  }, [user?.token]);

  useEffect(() => { void load(); }, [load]);

  const columns = [
    { header: 'Batch reference', accessor: (row: Settlement) => <span className="font-mono text-xs font-semibold">{row.settlementId}</span> },
    { header: 'Orders', accessor: (row: Settlement) => <span className="font-mono tabular-nums">{row.orderCount}</span> },
    { header: 'Gross', accessor: (row: Settlement) => <span className="font-mono text-xs">{money(row.totalGross)}</span> },
    { header: 'Net expected', accessor: (row: Settlement) => <span className="font-mono text-xs">{money(row.netAmount)}</span> },
    { header: 'Bank credit', accessor: (row: Settlement) => <span className="font-mono text-xs">{money(row.bankCreditAmount)}</span> },
    { header: 'Variance', accessor: (row: Settlement) => <span className={`font-mono text-xs ${row.variance == null ? 'text-muted' : Math.abs(row.variance) < 1 ? 'text-forest' : 'text-rust'}`}>{row.variance == null ? 'Not available' : money(row.variance)}</span> },
    { header: 'Status', accessor: (row: Settlement) => <StatusBadge status={row.status} /> },
  ];

  const statusCount = (status: Settlement['status']) => settlements.filter(item => item.status === status).length;

  return (
    <PageShell title="Settlement review" subtitle="Compare each returned settlement batch with its linked bank credit and included gateway records." actions={<button type="button" onClick={() => void load()} disabled={loading} className="touch-target border border-line bg-white px-4 text-sm font-semibold text-ink hover:border-ink disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh records'}</button>}>
      {error && <div role="alert" className="border-l-2 border-rust bg-[#faf2ee] px-4 py-3 text-sm leading-6 text-rust">{error}</div>}
      {settlements.length > 0 && <div className="mb-5 grid grid-cols-3 border-y border-line bg-white">
        {[
          ['Matched', statusCount('MATCHED'), 'text-forest'],
          ['Pending bank credit', statusCount('PENDING'), 'text-muted'],
          ['Variance detected', statusCount('DISCREPANCY'), 'text-rust'],
        ].map(([label, count, tone], index) => <div key={String(label)} className={`px-3 py-4 sm:px-5 ${index ? 'border-l border-line' : ''}`}><p className="text-xs leading-5 text-muted">{label}</p><p className={`mt-2 font-mono text-xl tabular-nums ${tone}`}>{count}</p></div>)}
      </div>}

      <div className="border border-line bg-white p-3 sm:p-5">
        <DataTable columns={columns as any} rows={settlements as any[]} loading={loading} emptyMessage={error ? 'Settlement records could not be loaded.' : 'No settlement records were returned by the API.'} />
      </div>

      {settlements.map(settlement => {
        const childTotal = settlement.childOrders?.reduce((sum, child) => sum + child.netPaise, 0) ?? null;
        const childVariance = childTotal == null || settlement.bankCreditAmount == null ? null : childTotal - settlement.bankCreditAmount;
        return <article key={settlement.settlementId} className="mt-5 border border-line bg-white p-5 sm:p-6">
          <header className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-end">
            <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Settlement batch</p><h2 className="mt-1 font-mono text-lg font-semibold">{settlement.settlementId}</h2><p className="mt-2 text-xs text-muted">Bank UTR: {settlement.utr ?? 'Not returned'}</p></div>
            <div className="sm:text-right"><p className="text-xs text-muted">Net expected</p><p className="mt-1 font-mono text-xl font-semibold tabular-nums">{money(settlement.netAmount)}</p></div>
          </header>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Total gross', money(settlement.totalGross)],
              ['Fees and tax', money(settlement.totalFees + settlement.totalTax)],
              ['Bank credit', money(settlement.bankCreditAmount)],
              ['Bank variance', settlement.variance == null ? 'Not available' : money(settlement.variance)],
            ].map(([label, value]) => <div key={label} className="border-l-2 border-line pl-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 break-words font-mono text-sm tabular-nums">{value}</p></div>)}
          </div>
          {settlement.childOrders && settlement.childOrders.length > 0 ? <>
            <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between"><h3 className="text-sm font-semibold">Returned gateway records · {settlement.childOrders.length}</h3><p className="text-xs text-muted">Sum of child net: {money(childTotal)} · Difference vs bank: {childVariance == null ? 'Not available' : money(childVariance)}</p></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {settlement.childOrders.map(child => <div key={child.orderId} className="border border-line bg-paper p-4">
                <div className="flex flex-wrap items-start justify-between gap-2"><p className="font-mono text-sm font-semibold">{child.orderId}</p><span className="text-xs text-muted">{child.status}</span></div>
                <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
                  <div><dt className="text-muted">Gross</dt><dd className="mt-1 font-mono">{money(child.grossPaise)}</dd></div>
                  <div><dt className="text-muted">Net</dt><dd className="mt-1 font-mono">{money(child.netPaise)}</dd></div>
                  <div><dt className="text-muted">Fee</dt><dd className="mt-1 font-mono">{money(child.feePaise)}</dd></div>
                  <div><dt className="text-muted">Tax</dt><dd className="mt-1 font-mono">{money(child.taxPaise)}</dd></div>
                </dl>
              </div>)}
            </div>
          </> : <p className="mt-5 border-t border-line pt-4 text-sm text-muted">No child gateway records were linked to this batch in the API response.</p>}
        </article>;
      })}
    </PageShell>
  );
};
