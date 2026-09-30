import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageShell } from '../components/layout/PageShell';
import { syncNova } from '../api/nova';
import type { NovaSyncResponse, NovaPayment, NovaGatewayTxn, NovaBankTxn, NovaSettlement } from '../api/nova';
import { useAuth } from '../context/AuthContext';
import { buttonPressProps, cardHoverProps, itemFadeInVariants, containerStaggerVariants } from '../utils/motion';

type OrderId = 'ORD-101' | 'ORD-102' | 'ORD-103' | 'ORD-104';
const ORDERS: OrderId[] = ['ORD-101', 'ORD-102', 'ORD-103', 'ORD-104'];
const paise = (v: number) => `₹${(v / 100).toFixed(2)}`;

export const TimelinePage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialOrder = (searchParams.get('order') as OrderId) || 'ORD-101';

  const [data, setData] = useState<NovaSyncResponse | null>(null);
  const [selected, setSelected] = useState<OrderId>(
    ORDERS.includes(initialOrder) ? initialOrder : 'ORD-101'
  );
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'CLEAN' | 'DISCREPANCY'>('ALL');
  const [searchTxn, setSearchTxn] = useState('');

  // Update selection if query param changes
  useEffect(() => {
    const qOrder = searchParams.get('order') as OrderId;
    if (qOrder && ORDERS.includes(qOrder)) {
      setSelected(qOrder);
    }
  }, [searchParams]);

  const sync = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      setData(await syncNova(user.token));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    sync();
  }, [user?.token]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const filteredOrders = ORDERS.filter(ord => {
    if (filterMode === 'CLEAN' && (ord === 'ORD-103' || ord === 'ORD-104')) return false;
    if (filterMode === 'DISCREPANCY' && (ord === 'ORD-101' || ord === 'ORD-102')) return false;
    if (searchTxn.trim()) {
      return ord.toLowerCase().includes(searchTxn.toLowerCase());
    }
    return true;
  });

  const payment = data?.payments.find((p: NovaPayment) => p.order_ref === selected);
  const gateway = data?.gatewayTransactions.find((g: NovaGatewayTxn) => g.order_ref === selected);
  const bank = gateway?.settlement_id
    ? data?.bankTransactions.find((b: NovaBankTxn) => b.settlement_ref === gateway.settlement_id)
    : undefined;
  const settlement = gateway?.settlement_id
    ? data?.settlements.find((s: NovaSettlement) => s.settlement_id === gateway.settlement_id)
    : undefined;

  return (
    <PageShell
      title="Multi-Stream Financial Timeline"
      subtitle="Forensic transaction tracing across Internal ERP, Gateway Auth, Bank Clearing, and Settlement Batch"
      actions={
        <motion.button
          {...buttonPressProps}
          onClick={sync}
          disabled={loading}
          className="bg-[#006241] hover:bg-[#004e34] text-white rounded-full px-5 py-2.5 text-xs font-semibold shadow-pill transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          <span>⟳</span>
          <span>{loading ? 'Syncing...' : 'Sync Nova Feeds'}</span>
        </motion.button>
      }
    >
      {/* Transaction ID Search & Filter Controls */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchTxn}
              onChange={e => setSearchTxn(e.target.value)}
              placeholder="Search Transaction ID (ORD-101, gw_tx_, UTR...)"
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-full focus:outline-none focus:border-[#006241] text-slate-800"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#f4f5f7] p-1 rounded-full text-xs font-semibold">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                filterMode === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All (4)
            </button>
            <button
              onClick={() => setFilterMode('CLEAN')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                filterMode === 'CLEAN' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Clean (2)
            </button>
            <button
              onClick={() => setFilterMode('DISCREPANCY')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                filterMode === 'DISCREPANCY' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Exceptions (2)
            </button>
          </div>

        </div>

        {/* Target Order Pills & Copy Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Target Order:</span>
            {filteredOrders.map(ord => (
              <motion.button
                key={ord}
                {...buttonPressProps}
                onClick={() => setSelected(ord)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  selected === ord
                    ? 'bg-[#006241] border-[#006241] text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-[#006241] hover:text-[#006241]'
                }`}
              >
                {ord}
                {ord === 'ORD-103' && <span className="ml-1 text-[10px] text-amber-300">⚠</span>}
                {ord === 'ORD-104' && <span className="ml-1 text-[10px] text-blue-300">⏳</span>}
              </motion.button>
            ))}
          </div>

          {/* Copy Button */}
          <button
            onClick={() => copyToClipboard(selected)}
            className="text-xs font-mono font-semibold px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 cursor-pointer"
          >
            <span>{copiedId ? '✓ Copied ID' : '📋 Copy ID'}</span>
          </button>
        </div>

        {/* Multi-Stream Identifier Trace Breadcrumbs */}
        <div className="p-3 bg-slate-50 rounded-2xl flex flex-wrap items-center gap-2 text-[11px] font-mono border border-slate-200/60">
          <span className="text-slate-400 font-sans font-bold">Lifecycle Trace:</span>
          <span className="font-bold text-[#006241]">ERP: {selected}</span>
          <span className="text-slate-300">➔</span>
          <span className="text-slate-700">GW: {gateway?.gateway_payment_id ?? 'gw_tx_001'}</span>
          <span className="text-slate-300">➔</span>
          <span className="text-slate-700">UTR: {bank?.utr ?? 'CMS/NACH/901'}</span>
          <span className="text-slate-300">➔</span>
          <span className="text-slate-700">Batch: {gateway?.settlement_id ?? 'SETTLE-901'}</span>
        </div>
      </div>

      {!data && (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center text-slate-400 text-sm">
          Click "Sync Nova Feeds" to populate timeline records
        </div>
      )}

      {data && (
        <motion.div
          variants={containerStaggerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StreamCard
            title="M1 · Internal ERP"
            icon="▤"
            status="Recorded"
            items={payment ? [
              ['Order Ref', payment.order_ref],
              ['Amount', paise(payment.amount_paise)],
              ['Currency', payment.currency],
              ['Status', payment.status],
              ['Timestamp', new Date(payment.created_at).toLocaleTimeString()],
            ] : []}
            empty="No internal ERP record found"
          />

          <StreamCard
            title="M2 · Gateway Auth"
            icon="◎"
            status={gateway ? 'Captured' : 'Missing'}
            items={gateway ? [
              ['Gateway ID', gateway.gateway_payment_id],
              ['Gross Captured', paise(gateway.amount_paise)],
              ['MDR Fee (2%)', paise(gateway.fee_paise)],
              ['GST (18%)', paise(gateway.tax_paise)],
              ['Settlement Ref', gateway.settlement_id ?? '— In-flight'],
            ] : []}
            empty="No payment gateway record found"
          />

          <StreamCard
            title="M3 · Bank Credit"
            icon="⊠"
            status={bank ? 'Credited' : 'Pending'}
            items={bank ? [
              ['UTR Code', bank.utr],
              ['Settled Credit', paise(bank.amount_paise)],
              ['Credit Date', new Date(bank.credit_date).toLocaleDateString()],
              ['Settlement Ref', bank.settlement_ref ?? '—'],
              ['Narration', bank.narration],
            ] : []}
            empty="No bank credit yet (T+2 cutoff window)"
          />

          <StreamCard
            title="M9 · Settlement Batch"
            icon="⬡"
            status={settlement ? 'Aggregated' : 'Pending'}
            items={settlement ? [
              ['Batch Ref', settlement.settlement_id],
              ['Total Net', paise(settlement.amount_paise)],
              ['Value Date', new Date(settlement.settled_at).toLocaleDateString()],
              ['Status', settlement.status],
            ] : []}
            empty="Pending settlement aggregation"
          />
        </motion.div>
      )}
    </PageShell>
  );
};

const StreamCard: React.FC<{
  title: string;
  icon: string;
  status: string;
  items: [string, string][];
  empty: string;
}> = ({ title, icon, status, items, empty }) => (
  <motion.div
    variants={itemFadeInVariants}
    {...cardHoverProps}
    className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card space-y-4 hover:border-[#006241]/50 transition-all flex flex-col justify-between"
  >
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
          <span className="text-[#006241]">{icon}</span>
          <span>{title}</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e6f7ef] text-[#006241] border border-[#c1ebd5]">
          {status}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-xs text-slate-400 italic py-8 text-center">{empty}</div>
      ) : (
        <div className="space-y-2.5">
          {items.map(([label, value]) => (
            <div key={label} className="flex justify-between items-center text-xs">
              <span className="text-slate-400 text-[11px]">{label}</span>
              <span className="font-mono font-medium text-slate-800 text-right max-w-[150px] truncate">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>

    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
      <span>Reconciliation Node</span>
      <span className="h-1.5 w-1.5 rounded-full bg-[#00c070]" />
    </div>
  </motion.div>
);
