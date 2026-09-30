import React from 'react';
import { PageShell } from '../components/layout/PageShell';
import { KpiCard } from '../components/ui/KpiCard';
import { StageProgress } from '../components/ui/StageProgress';
import { useReconcile } from '../hooks/useReconcile';
export const DashboardPage = () => {
  const { loading, trigger } = useReconcile();
  return (
    <PageShell title="Dashboard">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Volume" value="₹120,000" delta="+5%" color="text-emerald-500" />
        <KpiCard title="Matched" value="₹118,500" delta="+2%" color="text-emerald-500" />
        <KpiCard title="Exceptions" value="15" delta="-3" color="text-rose-500" />
        <KpiCard title="At Risk" value="₹1,500" delta="" color="text-rose-500" />
      </div>
      <div className="mb-6">
        <h3 className="mb-2 font-bold">Pipeline Progress</h3>
        <StageProgress stage={4} />
      </div>
      <button onClick={trigger} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded font-bold">
        {loading ? 'Running...' : 'Trigger Reconciliation'}
      </button>
    </PageShell>
  );
};
