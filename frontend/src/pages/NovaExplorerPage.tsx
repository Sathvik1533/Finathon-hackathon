import React, { useMemo, useState } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { DataTable } from '../components/ui/DataTable';
import { syncNova } from '../api/nova';
import type { NovaBankTxn, NovaGatewayTxn, NovaPayment, NovaSettlement, NovaSyncResponse } from '../api/nova';
import { useAuth } from '../context/AuthContext';

type Tab = 'payments' | 'gateway' | 'bank' | 'settlements';
const money = (paise: number | null | undefined) => paise == null ? '—' : `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const displayDate = (value: string | undefined) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

export const NovaExplorerPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<NovaSyncResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('payments');

  const handleSync = async () => {
    if (!user?.token) return;
    setLoading(true); setError('');
    try { setData(await syncNova(user.token)); }
    catch (caught) { setData(null); setError(caught instanceof Error ? caught.message : 'Could not load source records.'); }
    finally { setLoading(false); }
  };

  const tabs: Array<{ key: Tab; label: string; count: number | undefined }> = [
    { key: 'payments', label: 'Order records', count: data?.payments.length },
    { key: 'gateway', label: 'Gateway', count: data?.gatewayTransactions.length },
    { key: 'bank', label: 'Bank', count: data?.bankTransactions.length },
    { key: 'settlements', label: 'Settlements', count: data?.settlements.length },
  ];

  const table = useMemo(() => {
    switch (activeTab) {
      case 'payments': return {
        rows: (data?.payments ?? []) as NovaPayment[],
        columns: [
          { header: 'Payment ID', accessor: (row: NovaPayment) => <span className="font-mono text-xs">{row.id}</span> },
          { header: 'Order reference', accessor: (row: NovaPayment) => <span className="font-mono text-xs">{row.order_ref}</span> },
          { header: 'Amount', accessor: (row: NovaPayment) => <span className="font-mono tabular-nums">{money(row.amount_paise)}</span> },
          { header: 'Currency', accessor: (row: NovaPayment) => row.currency || '—' },
          { header: 'Status', accessor: (row: NovaPayment) => row.status || 'Not provided' },
          { header: 'Created', accessor: (row: NovaPayment) => displayDate(row.created_at) },
        ],
      };
      case 'gateway': return {
        rows: (data?.gatewayTransactions ?? []) as NovaGatewayTxn[],
        columns: [
          { header: 'Gateway reference', accessor: (row: NovaGatewayTxn) => <span className="font-mono text-xs">{row.gateway_payment_id}</span> },
          { header: 'Order reference', accessor: (row: NovaGatewayTxn) => <span className="font-mono text-xs">{row.order_ref}</span> },
          { header: 'Gross amount', accessor: (row: NovaGatewayTxn) => <span className="font-mono tabular-nums">{money(row.amount_paise)}</span> },
          { header: 'Fee', accessor: (row: NovaGatewayTxn) => <span className="font-mono">{money(row.fee_paise)}</span> },
          { header: 'Tax', accessor: (row: NovaGatewayTxn) => <span className="font-mono">{money(row.tax_paise)}</span> },
          { header: 'Status', accessor: (row: NovaGatewayTxn) => row.status || 'Not provided' },
          { header: 'Settlement reference', accessor: (row: NovaGatewayTxn) => row.settlement_id ?? 'Not returned' },
        ],
      };
      case 'bank': return {
        rows: (data?.bankTransactions ?? []) as NovaBankTxn[],
        columns: [
          { header: 'UTR', accessor: (row: NovaBankTxn) => <span className="font-mono text-xs">{row.utr}</span> },
          { header: 'Amount', accessor: (row: NovaBankTxn) => <span className="font-mono tabular-nums">{money(row.amount_paise)}</span> },
          { header: 'Credit date', accessor: (row: NovaBankTxn) => displayDate(row.credit_date) },
          { header: 'Settlement reference', accessor: (row: NovaBankTxn) => row.settlement_ref ?? 'Not returned' },
          { header: 'Narration', accessor: (row: NovaBankTxn) => row.narration || 'Not provided' },
        ],
      };
      case 'settlements': return {
        rows: (data?.settlements ?? []) as NovaSettlement[],
        columns: [
          { header: 'Settlement ID', accessor: (row: NovaSettlement) => <span className="font-mono text-xs">{row.settlement_id}</span> },
          { header: 'Amount', accessor: (row: NovaSettlement) => <span className="font-mono tabular-nums">{money(row.amount_paise)}</span> },
          { header: 'Status', accessor: (row: NovaSettlement) => row.status || 'Not provided' },
          { header: 'Settled at', accessor: (row: NovaSettlement) => displayDate(row.settled_at) },
        ],
      };
    }
  }, [activeTab, data]);

  return (
    <PageShell title="Source records" subtitle="Inspect the records returned by the configured data adapter. Source mode is shown explicitly; a successful request does not by itself mean the records are live." actions={<button type="button" onClick={() => void handleSync()} disabled={loading} className="touch-target bg-forest px-5 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:opacity-50">{loading ? 'Loading records…' : 'Request source records'}</button>}>
      {error && <div role="alert" className="border-l-2 border-rust bg-[#faf2ee] px-4 py-3 text-sm leading-6 text-rust">{error}</div>}
      {data && <div className={`mt-5 flex flex-col gap-2 border-l-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${data.dataMode === 'simulated' ? 'border-amber bg-[#f6f0e3]' : 'border-line bg-white'}`} role="status">
        <div><strong className="font-semibold text-ink">{data.dataMode === 'simulated' ? 'DEMONSTRATION RECORDS' : data.dataMode === 'live' ? 'LIVE SOURCE MODE' : 'SOURCE MODE UNCONFIRMED'}</strong><p className="mt-1 text-xs leading-5 text-muted">{data.source}. {data.dataMode === 'simulated' ? 'These records are not from a live merchant or bank feed.' : 'Verify source provenance before using records operationally.'}</p></div>
        <span className="shrink-0 text-xs text-muted">Response time · {displayDate(data.syncedAt)}</span>
      </div>}

      {!data && !loading && <div className="mt-5 border border-line bg-white p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-forest">Source inspection</p><h2 className="mt-3 font-display text-2xl">Request the records you want to inspect.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">The adapter response will be shown as returned. If the API is unavailable, the page reports that instead of filling tables with local sample rows.</p></div>}

      {data && <section className="mt-6 border border-line bg-white p-3 sm:p-5" aria-label="Records by source">
        <div className="mb-4 flex max-w-full gap-1 overflow-x-auto border-b border-line pb-3" role="tablist" aria-label="Record source">
          {tabs.map(tab => <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} className={`touch-target flex shrink-0 items-center gap-2 border-b-2 px-3 text-sm ${activeTab === tab.key ? 'border-forest font-semibold text-forest' : 'border-transparent text-muted hover:text-ink'}`}>
            {tab.label}{tab.count !== undefined && <span className="font-mono text-xs text-muted">{tab.count}</span>}
          </button>)}
        </div>
        <DataTable columns={table.columns as any} rows={table.rows as any[]} loading={loading} emptyMessage={`No ${tabs.find(tab => tab.key === activeTab)?.label.toLowerCase()} were returned by the API.`} />
      </section>}
    </PageShell>
  );
};
