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
    { key: 'settlements', label: 'M9 · Settlement Bundles', count: data?.settlements.length,        badge: 'M9' },
  ];

  return (
    <PageShell
      title="Aczen Nova 4-Source Explorer"
      subtitle="Live multi-source financial feeds connecting ERP, Payment Gateway, Bank Clearing, and Settlements"
      actions={
        <button
          onClick={handleSync}
          disabled={loading}
          className="bg-[#006241] hover:bg-[#004e34] text-white rounded-full px-5 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          <span>⟳</span>
          <span>{loading ? 'Syncing...' : 'Sync Nova Feeds'}</span>
        </button>
      }
    >
      {error && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700">{error}</div>
      )}

      {data && (
        <div className="text-[11px] font-mono text-slate-500 mb-4 flex items-center gap-2">
          <span>Source:</span>
          <span className="text-[#006241] bg-[#e6f7ef] border border-[#c1ebd5] font-bold px-2 py-0.5 rounded-full">{data.source}</span>
          <span>· Last Synced: {new Date(data.syncedAt).toLocaleTimeString()}</span>
        </div>
      )}

      {!data && !loading && (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center mb-6">
          <div className="text-3xl mb-3 text-[#006241]">◈</div>
          <div className="text-sm font-semibold text-slate-800">No data synchronized yet</div>
          <div className="text-xs text-slate-400 mt-1">Click "Sync Nova Feeds" to fetch all 4 real-time financial streams</div>
        </div>
      )}

      {data && (
        <div className="space-y-5">
          {/* Segmented Pills for 4 Streams */}
          <div className="flex flex-wrap gap-1.5 bg-[#f4f5f7] p-1.5 rounded-full max-w-fit">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#006241] text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Table Container in Rounded-3xl */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card overflow-x-auto">
            {activeTab === 'payments' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-mono border-b border-slate-100">
                  <tr>
                    <th className="p-3">Order Ref</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Currency</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-mono font-bold text-slate-900">{p.order_ref}</td>
                      <td className="p-3 font-mono font-bold text-[#006241]">{paise(p.amount_paise)}</td>
                      <td className="p-3 font-mono text-slate-600">{p.currency}</td>
                      <td className="p-3"><span className="bg-[#e6f7ef] text-[#006241] border border-[#c1ebd5] px-2 py-0.5 rounded-full text-[10px] font-semibold">{p.status}</span></td>
                      <td className="p-3 font-mono text-slate-400 text-[11px]">{new Date(p.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'gateway' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-mono border-b border-slate-100">
                  <tr>
                    <th className="p-3">Gateway ID</th>
                    <th className="p-3">Linked Order</th>
                    <th className="p-3">Gross Captured</th>
                    <th className="p-3">MDR Fee (2%)</th>
                    <th className="p-3">GST (18%)</th>
                    <th className="p-3">Settlement Batch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.gatewayTransactions.map(g => (
                    <tr key={g.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-mono font-bold text-slate-900">{g.gateway_payment_id}</td>
                      <td className="p-3 font-mono text-slate-700">{g.order_ref}</td>
                      <td className="p-3 font-mono font-bold text-[#006241]">{paise(g.amount_paise)}</td>
                      <td className="p-3 font-mono text-amber-700">{paise(g.fee_paise)}</td>
                      <td className="p-3 font-mono text-slate-500">{paise(g.tax_paise)}</td>
                      <td className="p-3 font-mono text-xs">{g.settlement_id ?? <span className="text-slate-400 italic">Pending Cutoff</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'bank' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-mono border-b border-slate-100">
                  <tr>
                    <th className="p-3">Bank UTR</th>
                    <th className="p-3">Credit Amount</th>
                    <th className="p-3">Value Date</th>
                    <th className="p-3">Linked Batch</th>
                    <th className="p-3">Bank Narration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.bankTransactions.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-mono font-bold text-slate-900">{b.utr}</td>
                      <td className="p-3 font-mono font-bold text-[#006241]">{paise(b.amount_paise)}</td>
                      <td className="p-3 font-mono text-slate-600">{b.credit_date}</td>
                      <td className="p-3 font-mono text-xs">{b.settlement_ref ?? '—'}</td>
                      <td className="p-3 font-mono text-slate-500 text-[11px] max-w-xs truncate">{b.narration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'settlements' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-mono border-b border-slate-100">
                  <tr>
                    <th className="p-3">Settlement ID</th>
                    <th className="p-3">Net Payout</th>
                    <th className="p-3">Settled Timestamp</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.settlements.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-mono font-bold text-slate-900">{s.settlement_id}</td>
                      <td className="p-3 font-mono font-bold text-[#006241]">{paise(s.amount_paise)}</td>
                      <td className="p-3 font-mono text-slate-500">{new Date(s.settled_at).toLocaleString()}</td>
                      <td className="p-3"><span className="bg-[#e6f7ef] text-[#006241] border border-[#c1ebd5] px-2 py-0.5 rounded-full text-[10px] font-semibold">{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
};
