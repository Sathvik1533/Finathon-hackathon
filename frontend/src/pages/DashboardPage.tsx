import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReconcile } from '../hooks/useReconcile';
import { useAuth } from '../context/AuthContext';
import { downloadReportCsv } from '../api/report';
import { DataTable } from '../components/ui/DataTable';
import { PageShell } from '../components/layout/PageShell';
import type { DiscrepancyCase } from '../api/reconcile';

const money = (paise: number | null | undefined) => paise == null
  ? '—'
  : `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time not provided' : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

export const DashboardPage: React.FC = () => {
  const { run, loading, error, trigger, loadLatest } = useReconcile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => { void loadLatest(); }, [loadLatest]);

  const exportCsv = async () => {
    if (!user?.token) return;
    setExporting(true);
    setExportError('');
    try {
      const csv = await downloadReportCsv(user.token);
      const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `ledgersense-report-${run?.runId ?? 'latest'}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : 'The report export failed.');
    } finally {
      setExporting(false);
    }
  };

  const cases = run?.cases ?? [];
  const processed = run?.totalRecordsProcessed ?? 0;
  const matched = run?.matchedCount ?? 0;
  const exceptions = run?.discrepancyCount ?? cases.length;
  const matchedShare = processed > 0 ? Math.min(100, Math.max(0, (matched / processed) * 100)) : 0;

  const caseColumns = [
    { header: 'Case', accessor: (row: DiscrepancyCase) => <span className="font-mono text-xs font-medium">{row.caseId}</span> },
    { header: 'Order', accessor: (row: DiscrepancyCase) => <span className="font-mono text-xs">{row.orderId}</span> },
    { header: 'Reason', accessor: (row: DiscrepancyCase) => <span className="text-sm">{row.discrepancyType.replace(/_/g, ' ').toLowerCase()}</span> },
    { header: 'Amount at risk', accessor: (row: DiscrepancyCase) => <span className="font-mono tabular-nums text-sm text-rust">{money(row.amountAtRisk)}</span> },
    { header: 'Status', accessor: (row: DiscrepancyCase) => <span className="text-xs font-medium text-muted">{row.status.replace(/_/g, ' ').toLowerCase()}</span> },
  ];

  return (
    <PageShell
      title="Reconciliation overview"
      subtitle="A concise view of the latest run and the items that still need review."
      actions={<>
        <button type="button" onClick={exportCsv} disabled={exporting} className="touch-target border border-line bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50">{exporting ? 'Preparing…' : 'Export report'}</button>
        <button type="button" onClick={() => void trigger()} disabled={loading} className="touch-target bg-forest px-5 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:cursor-wait disabled:opacity-60">{loading ? 'Loading…' : 'Run reconciliation'}</button>
      </>}
    >
      {(error || exportError) && <div role="alert" className="border-l-2 border-rust bg-[#faf2ee] px-4 py-3 text-sm leading-6 text-rust">{error || exportError}</div>}

      {!run && !loading && (
        <div className="border border-line bg-white p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rust">No run data loaded</p>
          <h2 className="mt-3 font-display text-3xl">The API has not returned a run.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Check the service connection or start a reconciliation. This screen will not fill the gap with sample values.</p>
          <button type="button" onClick={() => void trigger()} disabled={loading} className="touch-target mt-5 bg-forest px-5 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50">Run reconciliation</button>
        </div>
      )}

      {run && <>
        <section className="grid gap-0 border-y border-line bg-white sm:grid-cols-2 lg:grid-cols-4" aria-label="Latest reconciliation summary">
          {[
            ['Records processed', processed.toLocaleString('en-IN'), 'Returned by latest run'],
            ['Matched', matched.toLocaleString('en-IN'), 'Returned match count'],
            ['Needs review', exceptions.toLocaleString('en-IN'), 'Returned discrepancy count'],
            ['Amount at risk', money(run.totalAmountAtRiskPaise), 'Returned exposure total'],
          ].map(([label, value, note], index) => <div key={label} className={`px-4 py-5 sm:px-5 ${index ? 'border-t border-line sm:border-l sm:border-t-0' : ''}`}>
            <p className="text-sm text-muted">{label}</p>
            <p className={`mt-3 text-2xl font-semibold tracking-[-0.03em] ${label === 'Amount at risk' ? 'font-mono tabular-nums text-rust' : 'text-ink'}`}>{value}</p>
            <p className="mt-1 text-xs text-muted">{note}</p>
          </div>)}
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="border border-line bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
              <div><h2 className="text-base font-semibold">Run composition</h2><p className="mt-1 text-sm text-muted">Counts from this run only</p></div>
              <span className="font-mono text-xs text-muted">{processed ? `${matchedShare.toFixed(1)}%` : '—'}</span>
            </div>
            {processed > 0 ? <>
              <div className="mt-6 flex h-2 overflow-hidden bg-paper" role="img" aria-label={`${matched} matched and ${exceptions} needing review out of ${processed} records`}>
                <span className="h-full bg-forest" style={{ width: `${matchedShare}%` }} />
                <span className="h-full bg-rust" style={{ width: `${Math.max(0, 100 - matchedShare)}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="border-l-2 border-forest pl-3"><p className="text-xs text-muted">Matched</p><p className="mt-1 font-mono text-lg tabular-nums">{matched.toLocaleString('en-IN')}</p></div>
                <div className="border-l-2 border-rust pl-3"><p className="text-xs text-muted">Needs review</p><p className="mt-1 font-mono text-lg tabular-nums">{exceptions.toLocaleString('en-IN')}</p></div>
              </div>
            </> : <p className="mt-6 text-sm text-muted">The API returned no processed-record count.</p>}
            <div className="mt-6 border-t border-line pt-4 text-xs leading-5 text-muted">
              <p>Latest run <span className="font-mono text-ink">{run.runId}</span></p>
              <p className="mt-1">Executed {dateTime(run.executedAt)}</p>
              <p className="mt-1">Net settlement value {money(run.totalSettledPaise)}</p>
            </div>
          </div>

          <div className="min-w-0 border border-line bg-white p-5 sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-4 border-b border-line pb-4">
              <div><h2 className="text-base font-semibold">Items to review</h2><p className="mt-1 text-sm text-muted">Cases returned by the latest run</p></div>
              <button type="button" onClick={() => navigate('/exceptions')} className="touch-target text-sm font-semibold text-forest underline underline-offset-4 hover:text-ink">Open queue</button>
            </div>
            <DataTable columns={caseColumns as any} rows={cases.slice(0, 5) as any[]} onRowClick={row => navigate(`/exceptions?case=${encodeURIComponent(row.caseId)}`)} emptyMessage="No case records were returned for this run." />
            {cases.length > 5 && <button type="button" onClick={() => navigate('/exceptions')} className="mt-4 min-h-11 text-sm font-semibold text-forest underline underline-offset-4">View all {cases.length} cases</button>}
          </div>
        </section>

        <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-muted">Summary values are read from the latest reconciliation response. Verify the data-source mode shown above before using any figure operationally.</p>
      </>}
    </PageShell>
  );
};
