import React, { useState } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { syncNova } from '../api/nova';
import type { NovaSyncResponse } from '../api/nova';
import { useAuth } from '../context/AuthContext';

const paise = (v: number) => `₹${(v / 100).toFixed(2)}`;

export const NovaExplorerPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<NovaSyncResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'payments' | 'gateway' | 'bank' | 'settlements'>('payments');

  const handleSync = async () => {
    if (!user?.token) return;
    setLoading(true);
    setError('');
    try {
      const result = await syncNova(user.token);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setLoading(false);
    }
  };

  const tabs: Array<{ key: typeof activeTab; label: string; count?: number; badge: string }> = [
    { key: 'payments',    label: 'M1 · Internal Records',   count: data?.payments.length,          badge: 'M1' },
    { key: 'gateway',     label: 'M2 · Gateway Txns',       count: data?.gatewayTransactions.length, badge: 'M2' },
    { key: 'bank',        label: 'M3 · Bank Statements',    count: data?.bankTransactions.length,   badge: 'M3' },
    { key: 'settlements', label: 'Settlement Bundles',       count: data?.settlements.length,        badge: 'S' },
  ];

  return (
    <PageShell
      title="Nova 4-Source Explorer"
      subtitle="Live data from Aczen Nova Financial API — all 4 streams"
      actions={
        <button
          onClick={handleSync}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-colors"
        >
          {loading ? 'Syncing...' : '⟳ Sync Nova Feeds'}
        </button>
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>
      )}

      {data && (
        <div className="text-[10px] font-mono text-slate-400 mb-4">
          Source: <span className="text-emerald-600 font-bold">{data.source}</span> · Synced: {new Date(data.syncedAt).toLocaleTimeString()}
        </div>
      )}

      {!data && !loading && (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center mb-6">
          <div className="text-3xl mb-3">◈</div>
          <div className="text-sm font-medium text-slate-700">No data synced yet</div>
          <div className="text-xs text-slate-400 mt-1">Click "Sync Nova Feeds" to fetch all 4 Aczen Nova data streams</div>
        </div>
      )}

      {data && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-1 justify-center ${
                  activeTab === tab.key
                    ? 'bg-white shadow-sm text-slate-900 font-semibold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-1.5 font-bold">{tab.badge}</span>
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1 text-[10px] text-slate-400">({tab.count})</span>
                )}
              </button>
            ))}
          </div>

          {/* Payment records */}
          {activeTab === 'payments' && (
            <StreamTable
              headers={['Order Ref', 'Amount', 'Currency', 'Status', 'Created At']}
              rows={data.payments.map(p => [
                p.order_ref, paise(p.amount_paise), p.currency, p.status,
                new Date(p.created_at).toLocaleDateString(),
              ])}
            />
          )}

          {/* Gateway transactions */}
          {activeTab === 'gateway' && (
            <StreamTable
              headers={['Gateway ID', 'Order Ref', 'Gross', 'MDR Fee', 'GST', 'Settlement ID', 'Captured']}
              rows={data.gatewayTransactions.map(g => [
                g.gateway_payment_id, g.order_ref, paise(g.amount_paise),
                paise(g.fee_paise), paise(g.tax_paise),
                g.settlement_id ?? '—', g.captured_at ? new Date(g.captured_at).toLocaleDateString() : '—',
              ])}
            />
          )}

          {/* Bank transactions */}
          {activeTab === 'bank' && (
            <StreamTable
              headers={['UTR', 'Amount', 'Credit Date', 'Settlement Ref', 'Narration']}
              rows={data.bankTransactions.map(b => [
                b.utr, paise(b.amount_paise),
                new Date(b.credit_date).toLocaleDateString(),
                b.settlement_ref ?? '—',
                b.narration.slice(0, 40) + (b.narration.length > 40 ? '...' : ''),
              ])}
            />
          )}

          {/* Settlement bundles */}
          {activeTab === 'settlements' && (
            <StreamTable
              headers={['Settlement ID', 'Amount', 'Settled At', 'Status']}
              rows={data.settlements.map(s => [
                s.settlement_id, paise(s.amount_paise),
                new Date(s.settled_at).toLocaleDateString(), s.status,
              ])}
            />
          )}
        </>
      )}
    </PageShell>
  );
};

const StreamTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
    <table className="w-full text-left text-xs">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          {headers.map(h => (
            <th key={h} className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {rows.map((row, ri) => (
          <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-slate-50/50'}>
            {row.map((cell, ci) => (
              <td key={ci} className="px-4 py-3 text-slate-700 font-mono whitespace-nowrap">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
