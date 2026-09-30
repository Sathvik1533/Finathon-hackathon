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
    { header: 'Case ID',     accessor: (r: DiscrepancyCase) => <span className="font-mono text-xs font-bold text-slate-800">{r.caseId}</span> },
    { header: 'Order',       accessor: (r: DiscrepancyCase) => <span className="font-mono font-semibold text-slate-900">{r.orderId}</span> },
    { header: 'Type',        accessor: (r: DiscrepancyCase) => <StatusBadge status={r.discrepancyType} /> },
    { header: 'Amount at Risk', accessor: (r: DiscrepancyCase) => <span className="font-mono text-rose-700 font-bold">{paise(r.amountAtRisk)}</span> },
    { header: 'Expected',    accessor: (r: DiscrepancyCase) => <span className="font-mono text-slate-600">{paise(r.expectedAmount)}</span> },
    { header: 'Actual',      accessor: (r: DiscrepancyCase) => <span className="font-mono text-slate-600">{paise(r.actualAmount)}</span> },
    { header: 'Status',      accessor: (r: DiscrepancyCase) => <StatusBadge status={r.status} /> },
    { header: 'Stage',       accessor: (r: DiscrepancyCase) => <span className="text-slate-400 text-xs">Stage {r.stageIdentified}</span> },
  ];

  return (
    <PageShell
      title="Exceptions Management Queue"
      subtitle="M10 — Prioritized human review and governance for financial discrepancy cases"
      actions={
        <button
          onClick={reload}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full px-4 py-2 text-xs font-semibold shadow-xs transition-colors"
        >
          ↺ Refresh Queue
        </button>
      }
    >
      {error && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700">{error}</div>
      )}

      {/* Summary status pill cards matching Pinterest theme */}
      {cases.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED'] as const).map(s => {
            const count = cases.filter(c => c.status === s).length;
            return (
              <div key={s} className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center shadow-card space-y-1">
                <div className="text-2xl font-bold font-mono text-slate-900">{count}</div>
                <StatusBadge status={s} size="sm" />
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card">
        <DataTable
          columns={columns as any}
          rows={cases as any[]}
          onRowClick={(row) => setSelected(row as DiscrepancyCase)}
          loading={loading}
          emptyMessage="No discrepancies flagged. System is in 100% balanced zero-drift state."
        />
      </div>

      <ExceptionDrawer
        case_={selected}
        onClose={() => setSelected(null)}
        onDecision={submitDecision}
      />
    </PageShell>
  );
};
