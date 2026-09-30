import React, { useState, useEffect } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { syncNova } from '../api/nova';
import type { NovaSyncResponse, NovaPayment, NovaGatewayTxn, NovaBankTxn, NovaSettlement } from '../api/nova';
import { useAuth } from '../context/AuthContext';

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
      subtitle="Track an individual transaction across ERP, Gateway, Bank Statement, and Settlement"
      actions={
        <button
          onClick={sync}
          disabled={loading}
          className="bg-[#006241] hover:bg-[#004e34] text-white rounded-full px-5 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          <span>⟳</span>
          <span>{loading ? 'Syncing...' : 'Sync Nova Feeds'}</span>
        </button>
      }
    >
      {/* Order selector matching Pinterest pill buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs font-semibold text-slate-500 mr-1">Select Order:</span>
        {ORDERS.map(ord => (
          <button
            key={ord}
            onClick={() => setSelected(ord)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              selected === ord
                ? 'bg-[#006241] border-[#006241] text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:border-[#006241] hover:text-[#006241]'
            }`}
          >
            {ord}
          </button>
        ))}
      </div>

      {!data && (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center text-slate-400 text-sm">
          Click "Sync Nova Feeds" to populate timeline records
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StreamCard
            title="M1 · Internal ERP"
            color="emerald"
            icon="▤"
            items={payment ? [
              ['Order Ref', payment.order_ref],
              ['Amount', paise(payment.amount_paise)],
              ['Currency', payment.currency],
              ['Status', payment.status],
              ['Timestamp', new Date(payment.created_at).toLocaleString()],
            ] : []}
            empty="No internal ERP record found"
          />

          <StreamCard
            title="M2 · Gateway Auth"
            color="forest"
            icon="◎"
            items={gateway ? [
              ['Gateway ID', gateway.gateway_payment_id],
              ['Gross Captured', paise(gateway.amount_paise)],
              ['MDR Fee (2%)', paise(gateway.fee_paise)],
              ['GST (18%)', paise(gateway.tax_paise)],
              ['Settlement Ref', gateway.settlement_id ?? '— Pending Cutoff'],
            ] : []}
            empty="No payment gateway record found"
          />

          <StreamCard
            title="M3 · Bank Credit"
            color="slate"
            icon="⊠"
            items={bank ? [
              ['UTR Code', bank.utr],
              ['Settled Credit', paise(bank.amount_paise)],
              ['Credit Date', new Date(bank.credit_date).toLocaleDateString()],
              ['Settlement Ref', bank.settlement_ref ?? '—'],
              ['Narration', bank.narration],
            ] : []}
            empty="No bank credit yet (T+2 cutoff or in-flight lag)"
          />

          <StreamCard
            title="M9 · Settlement Batch"
            color="mint"
            icon="⬡"
            items={settlement ? [
              ['Batch Ref', settlement.settlement_id],
              ['Total Net', paise(settlement.amount_paise)],
              ['Value Date', new Date(settlement.settled_at).toLocaleDateString()],
              ['Status', settlement.status],
            ] : []}
            empty="Pending settlement aggregation"
          />
        </div>
      )}
    </PageShell>
  );
};

const StreamCard: React.FC<{
  title: string;
  color: string;
  icon: string;
  items: [string, string][];
  empty: string;
}> = ({ title, icon, items, empty }) => (
  <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card space-y-4 hover:border-[#006241]/40 transition-all">
    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
      <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
        <span className="text-[#006241]">{icon}</span>
        <span>{title}</span>
      </div>
      <span className="h-2 w-2 rounded-full bg-[#00c070]" />
    </div>

    {items.length === 0 ? (
      <div className="text-xs text-slate-400 italic py-6 text-center">{empty}</div>
    ) : (
      <div className="space-y-2.5">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between items-center text-xs">
            <span className="text-slate-400 text-[11px]">{label}</span>
            <span className="font-mono font-medium text-slate-800 text-right max-w-[160px] truncate">{value}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);
