import React, { useState, useEffect } from 'react';
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
  const [data, setData] = useState<NovaSyncResponse | null>(null);
  const [selected, setSelected] = useState<OrderId>('ORD-101');
  const [loading, setLoading] = useState(false);

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
      {/* Order selector matching Pinterest pill buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-6 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <span className="text-xs font-bold text-slate-700 mr-2">Select Target Order:</span>
        <div className="flex flex-wrap gap-2">
          {ORDERS.map(ord => (
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
            </motion.button>
          ))}
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
