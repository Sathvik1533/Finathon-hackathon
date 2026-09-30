import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PageShell } from '../components/layout/PageShell';
import { syncNova } from '../api/nova';
import type { NovaSyncResponse } from '../api/nova';
import { useAuth } from '../context/AuthContext';
import { buttonPressProps, cardHoverProps, itemFadeInVariants } from '../utils/motion';

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

  const tabs: Array<{ key: typeof activeTab; label: string; count?: number }> = [
    { key: 'payments',    label: 'M1 · Internal Records',   count: data?.payments.length },
    { key: 'gateway',     label: 'M2 · Gateway Txns',       count: data?.gatewayTransactions.length },
    { key: 'bank',        label: 'M3 · Bank Statements',    count: data?.bankTransactions.length },
    { key: 'settlements', label: 'M9 · Settlement Bundles', count: data?.settlements.length },
  ];

  return (
    <PageShell
      title="Aczen Nova 4-Source Explorer"
      subtitle="Live multi-source financial feeds connecting ERP, Payment Gateway, Bank Clearing, and Settlements"
      actions={
        <motion.button
          {...buttonPressProps}
          onClick={handleSync}
          disabled={loading}
          className="bg-[#006241] hover:bg-[#004e34] text-white rounded-full px-5 py-2.5 text-xs font-semibold shadow-pill transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          <span>⟳</span>
          <span>{loading ? 'Syncing...' : 'Sync Nova Feeds'}</span>
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

      {data && (
        <div className="text-[11px] font-mono text-slate-500 mb-4 flex items-center gap-2">
          <span>Source Profile:</span>
          <span className="text-[#006241] bg-[#e6f7ef] border border-[#c1ebd5] font-bold px-2.5 py-0.5 rounded-full">
            {data.source}
          </span>
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
          {/* Segmented Pills for 4 Streams with Smooth Selection */}
          <div className="flex flex-wrap gap-1.5 bg-[#f4f5f7] p-1.5 rounded-full max-w-fit">
            {tabs.map(tab => (
              <motion.button
                key={tab.key}
                {...buttonPressProps}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
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
              </motion.button>
            ))}
          </div>

          {/* Table Container in Rounded-3xl */}
          <motion.div
            variants={itemFadeInVariants}
            className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card overflow-x-auto"
          >
            {activeTab === 'payments' && (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="py-2.5 px-3">Order Ref</th>
                    <th className="py-2.5 px-3">Customer ID</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Currency</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.payments.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.order_ref}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{p.id}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{paise(p.amount_paise)}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{p.currency}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-[#e6f7ef] text-[#006241] border border-[#c1ebd5] px-2 py-0.5 rounded-full font-bold text-[10px]">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{new Date(p.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'gateway' && (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="py-2.5 px-3">Gateway Payment ID</th>
                    <th className="py-2.5 px-3">Order Ref</th>
                    <th className="py-2.5 px-3">Gross</th>
                    <th className="py-2.5 px-3">MDR Fee</th>
                    <th className="py-2.5 px-3">GST Tax</th>
                    <th className="py-2.5 px-3">Settlement ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.gatewayTransactions.map((g, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{g.gateway_payment_id}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{g.order_ref}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{paise(g.amount_paise)}</td>
                      <td className="py-2.5 px-3 font-mono text-amber-700">{paise(g.fee_paise)}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{paise(g.tax_paise)}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-600">{g.settlement_id ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'bank' && (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="py-2.5 px-3">UTR Code</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Credit Date</th>
                    <th className="py-2.5 px-3">Settlement Ref</th>
                    <th className="py-2.5 px-3">Bank Narration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.bankTransactions.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#006241]">{b.utr}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{paise(b.amount_paise)}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{new Date(b.credit_date).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{b.settlement_ref ?? '—'}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] max-w-xs truncate">{b.narration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'settlements' && (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="py-2.5 px-3">Settlement ID</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Settled At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.settlements.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{s.settlement_id}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#006241]">{paise(s.amount_paise)}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-[#e6f7ef] text-[#006241] border border-[#c1ebd5] px-2 py-0.5 rounded-full font-bold text-[10px]">
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{new Date(s.settled_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </motion.div>
        </div>
      )}
    </PageShell>
  );
};
