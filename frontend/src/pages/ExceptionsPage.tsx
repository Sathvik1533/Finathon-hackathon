import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PageShell } from '../components/layout/PageShell';
import { DataTable } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ExceptionDrawer } from '../components/ui/ExceptionDrawer';
import { useCases } from '../hooks/useCases';
import type { DiscrepancyCase } from '../api/reconcile';
import { buttonPressProps, cardHoverProps, containerStaggerVariants, itemFadeInVariants } from '../utils/motion';

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
    { header: 'Detection Stage', accessor: (r: DiscrepancyCase) => <span className="text-slate-400 text-xs font-mono">Stage {r.stageIdentified}</span> },
  ];

  return (
    <PageShell
      title="Exceptions Management Queue"
      subtitle="M10 — Prioritized human review and governance for financial discrepancy cases"
      actions={
        <motion.button
          {...buttonPressProps}
          onClick={reload}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full px-4 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          ↺ Refresh Queue
        </motion.button>
      }
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700"
        >
          {error}
        </motion.div>
      )}

      {/* Summary status pill cards matching Pinterest theme with Stagger */}
      {cases.length > 0 && (
        <motion.div
          variants={containerStaggerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"
        >
          {(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED'] as const).map(s => {
            const count = cases.filter(c => c.status === s).length;
            return (
              <motion.div
                key={s}
                variants={itemFadeInVariants}
                {...cardHoverProps}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center shadow-card space-y-1 hover:border-[#006241]/40 transition-colors"
              >
                <div className="text-2xl font-bold font-mono text-slate-900">{count}</div>
                <StatusBadge status={s} size="sm" />
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* DataTable in rounded-3xl container */}
      <motion.div
        variants={itemFadeInVariants}
        className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card"
      >
        <div className="mb-3 flex justify-between items-center text-xs text-slate-500">
          <span>Click any row to open forensic triage drawer</span>
          <span className="font-mono">{cases.length} cases tracked</span>
        </div>
        <DataTable
          columns={columns as any}
          rows={cases as any[]}
          onRowClick={(row) => setSelected(row as DiscrepancyCase)}
          loading={loading}
          emptyMessage="No exception records were returned by the API. This does not establish that all records are matched."
        />
      </motion.div>

      <ExceptionDrawer
        case_={selected}
        onClose={() => setSelected(null)}
        onDecision={submitDecision}
      />
    </PageShell>
  );
};
