import React, { useState } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { DataTable } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ExceptionDrawer } from '../components/ui/ExceptionDrawer';
import { useCases } from '../hooks/useCases';
import type { DiscrepancyCase } from '../api/reconcile';

const paise = (v: number) => `₹${(v / 100).toFixed(2)}`;

export const ExceptionsPage: React.FC = () => {
  const { cases, loading, error, reload, submitDecision } = useCases();
  const [selected, setSelected] = useState<DiscrepancyCase | null>(null);

  const columns = [
    { header: 'Case ID',     accessor: (r: DiscrepancyCase) => <span className="font-mono text-[11px] text-slate-600">{r.caseId}</span> },
    { header: 'Order',       accessor: (r: DiscrepancyCase) => <span className="font-mono font-semibold">{r.orderId}</span> },
    { header: 'Type',        accessor: (r: DiscrepancyCase) => <StatusBadge status={r.discrepancyType} /> },
    { header: 'Amount at Risk', accessor: (r: DiscrepancyCase) => <span className="font-mono text-rose-700 font-semibold">{paise(r.amountAtRisk)}</span> },
    { header: 'Expected',    accessor: (r: DiscrepancyCase) => <span className="font-mono text-slate-600">{paise(r.expectedAmount)}</span> },
    { header: 'Actual',      accessor: (r: DiscrepancyCase) => <span className="font-mono text-slate-600">{paise(r.actualAmount)}</span> },
    { header: 'Status',      accessor: (r: DiscrepancyCase) => <StatusBadge status={r.status} /> },
    { header: 'Stage',       accessor: (r: DiscrepancyCase) => <span className="text-slate-400 text-[11px]">Stage {r.stageIdentified}</span> },
  ];

  return (
    <PageShell
      title="Exceptions Queue"
      subtitle="M10 — Human review workflow for all flagged discrepancies"
      actions={
        <button
          onClick={reload}
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors"
        >
          ↺ Refresh
        </button>
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>
      )}

      {/* Summary banner */}
      {cases.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED'] as const).map(s => {
            const count = cases.filter(c => c.status === s).length;
            return (
              <div key={s} className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-center shadow-sm">
                <div className="text-xl font-bold font-mono text-slate-800">{count}</div>
                <StatusBadge status={s} size="sm" />
              </div>
            );
          })}
        </div>
      )}

      <DataTable
        columns={columns as any}
        rows={cases as any[]}
        onRowClick={(row) => setSelected(row as DiscrepancyCase)}
        loading={loading}
        emptyMessage="No exceptions found. Run reconciliation first."
      />

      <ExceptionDrawer
        case_={selected}
        onClose={() => setSelected(null)}
        onDecision={submitDecision}
      />
    </PageShell>
  );
};
