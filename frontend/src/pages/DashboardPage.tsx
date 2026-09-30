import React, { useEffect } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { KpiCard } from '../components/ui/KpiCard';
import { StageProgress } from '../components/ui/StageProgress';
import { useReconcile } from '../hooks/useReconcile';

const paise = (v: number) => `₹${(v / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export const DashboardPage: React.FC = () => {
  const { run, loading, error, trigger, loadLatest } = useReconcile();

  useEffect(() => { loadLatest(); }, [loadLatest]);

  const matchPct = run
    ? ((run.matchedCount / Math.max(run.totalRecordsProcessed, 1)) * 100).toFixed(1)
    : null;

  return (
    <PageShell
      title="Dashboard"
      subtitle="Real-time reconciliation status across all 11 FIN-11 modules"
      actions={
        <button
          onClick={trigger}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {loading && (
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {loading ? 'Running reconciliation...' : 'Trigger Reconciliation'}
        </button>
      }
    >
      {/* Error banner */}
      {error && (
        <div className="mb-6 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          ⚠ {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Total Orders"
          value={run ? run.totalRecordsProcessed : '—'}
          color="slate"
        />
        <KpiCard
          title="Matched"
          value={run ? run.matchedCount : '—'}
          delta={matchPct ? `${matchPct}% match rate` : undefined}
          color="emerald"
        />
        <KpiCard
          title="Discrepancies"
          value={run ? run.discrepancyCount : '—'}
          color={run && run.discrepancyCount > 0 ? 'rose' : 'emerald'}
        />
        <KpiCard
          title="Amount at Risk"
          value={run ? paise(run.totalAmountAtRiskPaise) : '—'}
          color={run && run.totalAmountAtRiskPaise > 0 ? 'amber' : 'emerald'}
        />
      </div>

      {/* 7-stage pipeline */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800">7-Stage Reconciliation Pipeline</h3>
          {run && (
            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
              Completed at {new Date(run.executedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <StageProgress completedStages={run ? 7 : 0} />
      </div>

      {/* Empty state */}
      {!run && !loading && (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
          <div className="text-3xl mb-3">◎</div>
          <div className="text-sm font-medium text-slate-700">No reconciliation run yet</div>
          <div className="text-xs text-slate-400 mt-1">Click "Trigger Reconciliation" to run all 11 FIN-11 modules</div>
        </div>
      )}

      {/* Run summary table */}
      {run && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Run Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-3">
              <Row label="Run ID" value={run.runId} mono />
              <Row label="Records Processed" value={String(run.totalRecordsProcessed)} />
              <Row label="Matched Orders" value={String(run.matchedCount)} />
            </div>
            <div className="space-y-3">
              <Row label="Discrepancies" value={String(run.discrepancyCount)} />
              <Row label="Total Settled" value={paise(run.totalSettledPaise)} />
              <Row label="Amount at Risk" value={paise(run.totalAmountAtRiskPaise)} />
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex justify-between">
    <span className="text-slate-500">{label}</span>
    <span className={`font-medium text-slate-800 ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</span>
  </div>
);
