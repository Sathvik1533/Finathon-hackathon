import React, { useState } from 'react';
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
    try { setData(await syncNova(user.token)); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  };

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
      title="Payment Timeline"
      subtitle="Track a single order's lifecycle across all 4 financial streams"
      actions={
        <button onClick={sync} disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-50">
          {loading ? 'Loading...' : '⟳ Sync Data'}
        </button>
      }
    >
      {/* Order selector */}
      <div className="flex gap-2 mb-6">
        {ORDERS.map(ord => (
          <button key={ord} onClick={() => setSelected(ord)}
            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${
              selected === ord
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'
            }`}>
            {ord}
          </button>
        ))}
      </div>

      {!data && (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-400 text-sm">
          Sync data to view the order timeline
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <StreamCard title="M1 · Internal Record" color="blue" icon="▤" items={payment ? [
            ['Order Ref', payment.order_ref],
            ['Amount', paise(payment.amount_paise)],
            ['Currency', payment.currency],
            ['Status', payment.status],
            ['Created', new Date(payment.created_at).toLocaleString()],
          ] : []} empty="No internal record" />

          <StreamCard title="M2 · Gateway Txn" color="emerald" icon="◎" items={gateway ? [
            ['Gateway ID', gateway.gateway_payment_id],
            ['Gross', paise(gateway.amount_paise)],
            ['MDR Fee (2%)', paise(gateway.fee_paise)],
            ['GST (18%)', paise(gateway.tax_paise)],
            ['Settlement ID', gateway.settlement_id ?? '—'],
          ] : []} empty="No gateway record" />

          <StreamCard title="M3 · Bank Statement" color="amber" icon="⊠" items={bank ? [
            ['UTR', bank.utr],
            ['Credit Amount', paise(bank.amount_paise)],
            ['Credit Date', new Date(bank.credit_date).toLocaleDateString()],
            ['Settlement Ref', bank.settlement_ref ?? '—'],
            ['Narration', bank.narration.slice(0, 30) + '...'],
          ] : []} empty="No bank record (TIMING_LAG or pending)" />

          <StreamCard title="M9 · Settlement Bundle" color="purple" icon="⬡" items={settlement ? [
            ['Settlement ID', settlement.settlement_id],
            ['Total Amount', paise(settlement.amount_paise)],
            ['Settled At', new Date(settlement.settled_at).toLocaleDateString()],
            ['Status', settlement.status],
          ] : []} empty="No settlement yet" />
        </div>
      )}
    </PageShell>
  );
};

const colors: Record<string, string> = {
  blue:   'border-blue-200 bg-blue-50',
  emerald:'border-emerald-200 bg-emerald-50',
  amber:  'border-amber-200 bg-amber-50',
  purple: 'border-purple-200 bg-purple-50',
};
const headerColors: Record<string, string> = {
  blue:   'text-blue-700',
  emerald:'text-emerald-700',
  amber:  'text-amber-700',
  purple: 'text-purple-700',
};

const StreamCard: React.FC<{
  title: string; color: string; icon: string;
  items: [string, string][]; empty: string;
}> = ({ title, color, icon, items, empty }) => (
  <div className={`rounded-xl border p-4 ${colors[color] ?? ''}`}>
    <div className={`flex items-center gap-2 mb-3 font-semibold text-xs ${headerColors[color] ?? 'text-slate-700'}`}>
      <span>{icon}</span> {title}
    </div>
    {items.length === 0 ? (
      <div className="text-xs text-slate-400 italic">{empty}</div>
    ) : (
      <div className="space-y-2">
        {items.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</span>
            <span className="text-[11px] font-mono font-medium text-slate-800 break-all">{value}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);
