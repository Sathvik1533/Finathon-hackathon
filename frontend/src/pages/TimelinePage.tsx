import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { syncNova } from '../api/nova';
import type { NovaSyncResponse } from '../api/nova';
import { useAuth } from '../context/AuthContext';

const money = (paise: number | null | undefined) => paise == null ? '—' : `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const date = (value: string | undefined) => {
  if (!value) return 'Not provided';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

export const TimelinePage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryOrder = searchParams.get('order') ?? '';
  const [data, setData] = useState<NovaSyncResponse | null>(null);
  const [selected, setSelected] = useState(queryOrder);
  const [query, setQuery] = useState(queryOrder);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const sync = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError('');
    try { setData(await syncNova(user.token)); }
    catch (caught) { setData(null); setError(caught instanceof Error ? caught.message : 'Could not load feed records.'); }
    finally { setLoading(false); }
  }, [user?.token]);

  useEffect(() => { void sync(); }, [sync]);

  const orderIds = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set([
      ...data.payments.map(item => item.order_ref),
      ...data.gatewayTransactions.map(item => item.order_ref),
    ].filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [data]);

  useEffect(() => {
    if (queryOrder) setSelected(queryOrder);
    else if (!selected && orderIds.length) setSelected(orderIds[0]);
  }, [queryOrder, orderIds, selected]);

  const filteredIds = orderIds.filter(id => id.toLowerCase().includes(query.trim().toLowerCase()));
  const payment = data?.payments.find(item => item.order_ref === selected);
  const gateway = data?.gatewayTransactions.find(item => item.order_ref === selected);
  const bank = gateway?.settlement_id ? data?.bankTransactions.find(item => item.settlement_ref === gateway.settlement_id) : undefined;
  const settlement = gateway?.settlement_id ? data?.settlements.find(item => item.settlement_id === gateway.settlement_id) : undefined;

  const copyId = async () => {
    if (!selected) return;
    try { await navigator.clipboard.writeText(selected); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  };

  return (
    <PageShell title="Transaction trace" subtitle="Follow an order reference through the records returned by each configured source." actions={<button type="button" onClick={() => void sync()} disabled={loading} className="touch-target border border-line bg-white px-4 text-sm font-semibold text-ink hover:border-ink disabled:opacity-50">{loading ? 'Loading…' : 'Refresh records'}</button>}>
      {error && <p role="alert" className="border-l-2 border-rust bg-[#faf2ee] px-4 py-3 text-sm leading-6 text-rust">{error}</p>}
      {data?.dataMode === 'simulated' && <p role="status" className="border-l-2 border-amber bg-[#f6f0e3] px-4 py-3 text-sm leading-6 text-muted">These are demonstration records returned by the current adapter, not a live feed.</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="border border-line bg-white p-4 sm:p-5" aria-label="Order records">
          <div className="border-b border-line pb-4"><h2 className="text-sm font-semibold">Order references</h2><p className="mt-1 text-xs text-muted">{orderIds.length} returned by the feed response</p></div>
          <label htmlFor="trace-search" className="sr-only">Filter order references</label>
          <input id="trace-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter order IDs" className="mt-4 min-h-11 w-full border border-line px-3 text-sm focus:border-forest focus:outline-none" />
          <div className="mt-3 max-h-[28rem] space-y-1 overflow-y-auto">
            {filteredIds.length ? filteredIds.map(id => <button key={id} type="button" onClick={() => setSelected(id)} className={`flex min-h-11 w-full items-center justify-between border-l-2 px-3 text-left text-sm ${selected === id ? 'border-forest bg-[#f2f7f4] font-semibold text-forest' : 'border-transparent text-ink hover:bg-paper'}`}><span className="font-mono text-xs">{id}</span><span className="text-xs text-muted">{data?.payments.some(item => item.order_ref === id) ? 'Order' : 'Gateway only'}</span></button>) : <p className="px-2 py-5 text-sm text-muted">{loading ? 'Loading records…' : data ? 'No matching order records.' : 'No order records loaded.'}</p>}
          </div>
        </section>

        <section className="min-w-0">
          {!data && !loading && <div className="border border-line bg-white p-6 text-sm leading-6 text-muted">Feed data is unavailable. Refresh the records after confirming the API connection.</div>}
          {data && selected && !orderIds.includes(selected) && <div className="border border-line bg-white p-6 text-sm leading-6 text-muted">No returned record matches <span className="font-mono text-ink">{selected}</span>. Choose an order reference from the list.</div>}
          {data && selected && orderIds.includes(selected) && <>
            <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 sm:flex-row sm:items-end">
              <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-forest">Record lineage</p><h2 className="mt-1 font-mono text-xl font-semibold">{selected}</h2><p className="mt-1 text-xs text-muted">Source: {data.source} · {date(data.syncedAt)}</p></div>
              <button type="button" onClick={() => void copyId()} className="touch-target self-start border border-line bg-white px-4 text-sm font-medium hover:border-ink sm:self-auto">{copied ? 'Copied' : 'Copy reference'}</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <RecordCard title="Order record" source="Orders" status={payment?.status ?? 'Not returned'} items={payment ? [['Record ID', payment.id], ['Amount', money(payment.amount_paise)], ['Currency', payment.currency], ['Created', date(payment.created_at)]] : []} />
              <RecordCard title="Gateway record" source="Payment gateway" status={gateway?.status ?? 'Not returned'} items={gateway ? [['Gateway reference', gateway.gateway_payment_id], ['Gross amount', money(gateway.amount_paise)], ['Fee', money(gateway.fee_paise)], ['Tax', money(gateway.tax_paise)], ['Settlement reference', gateway.settlement_id ?? 'Not returned']] : []} />
              <RecordCard title="Bank record" source="Bank statement" status={bank ? 'Returned' : 'Not returned'} items={bank ? [['UTR', bank.utr], ['Credit', money(bank.amount_paise)], ['Credit date', date(bank.credit_date)], ['Narration', bank.narration]] : []} />
              <RecordCard title="Settlement record" source="Settlement batch" status={settlement?.status ?? 'Not returned'} items={settlement ? [['Batch reference', settlement.settlement_id], ['Amount', money(settlement.amount_paise)], ['Settled', date(settlement.settled_at)]] : []} />
            </div>
          </>}
        </section>
      </div>
    </PageShell>
  );
};

function RecordCard({ title, source, status, items }: { title: string; source: string; status: string; items: [string, string][] }) {
  return <article className="flex min-w-0 flex-col border border-line bg-white p-4">
    <div className="border-b border-line pb-3"><p className="text-xs text-muted">{source}</p><h3 className="mt-1 text-sm font-semibold">{title}</h3><p className="mt-2 text-xs font-medium text-forest">{status}</p></div>
    {items.length ? <dl className="mt-3 space-y-3">{items.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-ink">{value}</dd></div>)}</dl> : <p className="mt-4 text-sm leading-6 text-muted">No matching record was returned by this source.</p>}
  </article>;
}
