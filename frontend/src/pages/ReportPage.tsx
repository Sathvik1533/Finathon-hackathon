import React, { useEffect } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { KpiCard } from '../components/ui/KpiCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ModuleCoverageRow } from '../components/ui/ModuleCoverageRow';
import { useReport } from '../hooks/useReport';
import { downloadReportCsv, getCsvDownloadUrl } from '../api/report';
import { useAuth } from '../context/AuthContext';

const MODULE_LABELS: Record<string, string> = {
  // Hyphenated API keys from /api/report
  'M1-InternalTransactionRecords': 'M1 · Internal Transaction Records',
  'M2-PaymentGatewayRecords':      'M2 · Payment Gateway Records',
  'M3-BankSettlementRecords':      'M3 · Bank Settlement Records',
  'M4-TransactionIDMatching':      'M4 · Transaction-ID Matching',
  'M5-ReferenceMatching':          'M5 · Reference Matching',
  'M6-PartialMatching':            'M6 · Partial Matching',
  'M7-FeeCalculation':             'M7 · Fee Calculation',
  'M8-RefundReversalHandling':     'M8 · Refund/Reversal Handling',
  'M9-SettlementMatching':         'M9 · Settlement Matching',
  'M10-ExceptionManagement':       'M10 · Exception Management',
  'M11-ReconciliationReport':      'M11 · Reconciliation Report',
  // CamelCase aliases
  internalTransactionRecords: 'M1 · Internal Transaction Records',
  paymentGatewayRecords:      'M2 · Payment Gateway Records',
  bankSettlementRecords:      'M3 · Bank Settlement Records',
  transactionIdMatching:      'M4 · Transaction-ID Matching',
  referenceMatching:          'M5 · Reference Matching',
  partialMatching:            'M6 · Partial Matching',
  feeCalculation:             'M7 · Fee Calculation',
  refundReversalHandling:     'M8 · Refund/Reversal Handling',
  settlementMatching:         'M9 · Settlement Matching',
  exceptionManagement:        'M10 · Exception Management',
  reconciliationReport:       'M11 · Reconciliation Report',
};

export const ReportPage: React.FC = () => {
  const { user } = useAuth();
  const { report, loading, error, refresh } = useReport();

  useEffect(() => { refresh(); }, []);

  const handleCsvDownload = async () => {
    if (!user?.token) return;
    try {
      const csvText = await downloadReportCsv(user.token);
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledgersense-${report?.reportId || 'report'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback to token query link
      const fallbackUrl = getCsvDownloadUrl(user.token);
      const a = document.createElement('a');
      a.href = fallbackUrl;
      a.download = `ledgersense-${report?.reportId || 'report'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <PageShell
      title="Reconciliation Report"
      subtitle="M11 — Complete system health check across all 11 FIN-11 modules"
      actions={
        <div className="flex gap-2">
          <button onClick={refresh}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50">
            ↺ Refresh
          </button>
          <button onClick={handleCsvDownload}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold">
            ↓ Export CSV
          </button>
        </div>
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>
      )}

      {loading && (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}
        </div>
      )}

      {report && (
        <>
          {/* Report ID banner */}
          <div className="bg-slate-900 text-white rounded-xl px-5 py-3 mb-6 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Report ID</div>
              <div className="font-mono text-sm font-semibold">{report.reportId}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400">Generated</div>
              <div className="text-xs font-mono">{new Date(report.generatedAt).toLocaleString()}</div>
            </div>
          </div>

          {/* KPI summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard title="Orders Ingested"    value={report.summary.totalOrdersIngested} color="slate" />
            <KpiCard title="Clean Matches"      value={report.summary.cleanMatchedOrders} color="emerald" />
            <KpiCard title="Discrepancies"      value={report.summary.discrepanciesFound} color={report.summary.discrepanciesFound > 0 ? 'rose' : 'emerald'} />
            <KpiCard title="Amount at Risk"     value={report.summary.totalAmountAtRisk} color="amber" />
          </div>

          {/* Module coverage */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-800">
                Module Coverage
                <span className="ml-2 text-[11px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                  11 / 11 Implemented
                </span>
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {Object.entries(report.moduleCoverage).map(([key, cov]: [string, any]) => {
                let detail = cov.method ?? cov.algorithm;
                if (!detail && cov.stage !== undefined) {
                  detail = `Stage ${cov.stage}${cov.schedule ? ` (${cov.schedule})` : ''}`;
                } else if (!detail && cov.recordCount !== undefined) {
                  detail = `${cov.recordCount} records ingested`;
                } else if (!detail && cov.reportId) {
                  detail = cov.reportId;
                } else if (!detail && cov.schedule) {
                  detail = cov.schedule;
                }
                return (
                  <ModuleCoverageRow
                    key={key}
                    label={MODULE_LABELS[key] ?? key}
                    status={cov.status}
                    detail={detail ?? 'Verified'}
                  />
                );
              })}
            </div>
          </div>

          {/* Exception breakdown */}
          {report.exceptionBreakdown.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Exception Breakdown</h3>
              <div className="space-y-2">
                {report.exceptionBreakdown.map(e => (
                  <div key={e.type} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={e.type} />
                      <span className="text-xs text-slate-500">{e.count} case{e.count !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-rose-700">{e.totalAmountAtRisk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settlement verification */}
          <div className={`border rounded-xl p-5 mb-6 ${
            report.settlementVerification.status === 'BALANCED'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-rose-50 border-rose-200'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg">{report.settlementVerification.status === 'BALANCED' ? '✓' : '⚠'}</span>
              <h3 className="text-sm font-semibold text-slate-800">Settlement Verification</h3>
              <StatusBadge status={report.settlementVerification.status} />
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div><div className="text-slate-500">Gateway Net Total</div><div className="font-mono font-semibold">{report.settlementVerification.gatewayNetTotal}</div></div>
              <div><div className="text-slate-500">Bank Credit Total</div><div className="font-mono font-semibold">{report.settlementVerification.bankCreditTotal}</div></div>
              <div><div className="text-slate-500">Variance</div><div className={`font-mono font-bold ${report.settlementVerification.variance === '₹0.00' ? 'text-emerald-700' : 'text-rose-700'}`}>{report.settlementVerification.variance}</div></div>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
};
