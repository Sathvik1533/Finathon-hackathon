import React from 'react';
import { PageShell } from '../components/layout/PageShell';
import { ModuleCoverageRow } from '../components/ui/ModuleCoverageRow';
import { exportCsv } from '../api/report';
export const ReportPage = () => (
  <PageShell title="Reconciliation Report">
    <button onClick={exportCsv} className="bg-emerald-600 text-white px-4 py-2 rounded mb-6">Export CSV</button>
    <div className="bg-white border p-4 rounded shadow-sm">
      <h3 className="font-bold mb-4">Module Coverage 11/11</h3>
      <ModuleCoverageRow moduleName="M1 Internal Records" status="IMPLEMENTED" />
      <ModuleCoverageRow moduleName="M11 Recon Report" status="IMPLEMENTED" />
    </div>
  </PageShell>
);
