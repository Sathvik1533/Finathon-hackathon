"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { transactionApi, settlementApi, refundApi } from "@/lib/api-client";
import { formatPaise, formatDate } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { Layers, ChevronDown, ChevronRight, Search } from "lucide-react";
import type { Settlement } from "@/lib/api-client";

type Tab = "transactions" | "settlements" | "refunds";
const TABS: { key: Tab; label: string }[] = [
  { key: "transactions", label: "Transactions" },
  { key: "settlements",  label: "Settlements" },
  { key: "refunds",      label: "Refunds" },
];

const SOURCE_COLORS: Record<string, string> = {
  internal: "text-indigo-400",
  gateway:  "text-blue-400",
  bank:     "text-emerald-400",
  refund:   "text-amber-400",
};

export default function LedgerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as Tab) ?? "transactions";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Ledger" />

      <div className="flex gap-0 border-b border-zinc-800 px-6 pt-1" role="tablist" aria-label="Ledger sections">
        {TABS.map(({ key, label }) => (
          <button key={key} role="tab" aria-selected={tab === key}
            onClick={() => router.push(`/app/ledger?tab=${key}`)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              tab === key ? "border-indigo-500 text-indigo-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6" role="tabpanel">
        {tab === "transactions" && <TransactionsTab />}
        {tab === "settlements"  && <SettlementsTab />}
        {tab === "refunds"      && <RefundsTab />}
      </div>
    </div>
  );
}

// ── Transactions ──────────────────────────────────────────────────────────────
function TransactionsTab() {
  const [q, setQ]         = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage]   = useState(1);
  const PAGE_SIZE = 25;

  const params: Record<string, string> = { page: String(page), pageSize: String(PAGE_SIZE) };
  if (q)      params.q      = q;
  if (source) params.source = source;
  if (status) params.status = status;

  const { data, isLoading, error } = useQuery({
    queryKey: ["transactions", params],
    queryFn: () => transactionApi.list(params),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search ID, ref…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            aria-label="Search transactions"
            className="h-9 rounded-lg border border-zinc-700 bg-zinc-800/60 pl-8 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}
          aria-label="Filter by source"
          className="h-9 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none">
          <option value="">All Sources</option>
          <option value="internal">Internal</option>
          <option value="gateway">Gateway</option>
          <option value="bank">Bank</option>
          <option value="refund">Refund</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          aria-label="Filter by status"
          className="h-9 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none">
          <option value="">All Statuses</option>
          <option value="matched">Matched</option>
          <option value="unmatched">Unmatched</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="animate-pulse p-5 text-xs text-zinc-500">Loading…</p>}
          {error && <div className="p-4"><ErrorState error={error} /></div>}
          {data && data.data.length === 0 && (
            <EmptyState icon={Layers} title="No transactions found" className="rounded-none border-0" />
          )}
          {data && data.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" aria-label="Transactions table">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-500">
                    {["ID", "Source", "Amount", "Date", "Status", "Nova ID"].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((tx) => (
                    <tr key={tx.id} className="border-b border-zinc-800/40 text-zinc-300 hover:bg-zinc-800/20">
                      <td className="px-4 py-2.5 font-mono">{tx.id.slice(0, 12)}…</td>
                      <td className={`px-4 py-2.5 font-medium capitalize ${SOURCE_COLORS[tx.source] ?? ""}`}>{tx.source}</td>
                      <td className="px-4 py-2.5 tabular-nums">{formatPaise(tx.amountPaise)}</td>
                      <td className="px-4 py-2.5">{formatDate(tx.date)}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={tx.status} /></td>
                      <td className="px-4 py-2.5 font-mono text-zinc-600">{tx.novaId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Page {page} of {totalPages} ({data?.total.toLocaleString("en-IN") ?? 0} rows)</span>
          <div className="flex gap-1">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Settlements ───────────────────────────────────────────────────────────────
function SettlementsTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: settlements, isLoading, error } =
    useQuery({ queryKey: ["settlements"], queryFn: settlementApi.list });

  return (
    <div className="flex flex-col gap-3">
      {isLoading && <p className="animate-pulse text-xs text-zinc-500">Loading…</p>}
      {error && <ErrorState error={error} />}
      {settlements && settlements.length === 0 && <EmptyState icon={Layers} title="No settlements found" />}
      {settlements?.map((s) => (
        <SettlementRow key={s.id} settlement={s} expanded={expandedId === s.id}
          onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)} />
      ))}
    </div>
  );
}

function SettlementRow({ settlement: s, expanded, onToggle }: {
  settlement: Settlement; expanded: boolean; onToggle: () => void;
}) {
  const diffPaise = BigInt(s.differencePaise);
  const diffColor = diffPaise === 0n ? "text-emerald-400" : diffPaise > 0n ? "text-amber-400" : "text-red-400";

  return (
    <Card>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <div className="flex items-center gap-4">
          <StatusBadge status={s.status} />
          <span className="font-mono text-xs text-zinc-400">{s.bankRef}</span>
          <span className="text-xs text-zinc-500">{formatDate(s.valueDate)}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-zinc-500">Credited</p>
            <p className="text-sm font-medium text-zinc-200 tabular-nums">{formatPaise(s.creditPaise)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Difference</p>
            <p className={`text-sm font-medium tabular-nums ${diffColor}`}>{formatPaise(s.differencePaise)}</p>
          </div>
          {expanded ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 px-5 pb-5 pt-4">
          {s.novaNetPaise && (
            <p className="mb-3 text-xs text-zinc-500">
              Nova-reported net: <span className="font-medium text-zinc-300 tabular-nums">{formatPaise(s.novaNetPaise)}</span>
            </p>
          )}
          <table className="w-full text-xs" aria-label="Settlement payment breakdown">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-500">
                {["Payment ID", "Gross", "Fee", "GST", "Refunds", "Net"].map((h) => (
                  <th key={h} scope="col" className="pb-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.payments.map((p) => (
                <tr key={p.id} className="border-b border-zinc-800/40 text-zinc-300">
                  <td className="py-2 pr-4 font-mono">{p.id.slice(0, 10)}…</td>
                  <td className="py-2 pr-4 tabular-nums">{formatPaise(p.grossPaise)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatPaise(p.feePaise)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatPaise(p.gstPaise)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatPaise(p.refundsPaise)}</td>
                  <td className="py-2 tabular-nums font-medium text-zinc-100">{formatPaise(p.netPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── Refunds ───────────────────────────────────────────────────────────────────
function RefundsTab() {
  const { data: refunds, isLoading, error } =
    useQuery({ queryKey: ["refunds"], queryFn: refundApi.list });

  const kindLabel: Record<string, string> = {
    refund:               "Refund",
    chargeback:           "Chargeback",
    chargeback_reversal:  "CB Reversal",
  };
  const kindColor: Record<string, string> = {
    refund:               "text-amber-400",
    chargeback:           "text-red-400",
    chargeback_reversal:  "text-emerald-400",
  };

  return (
    <Card>
      <CardContent className="p-0">
        {isLoading && <p className="animate-pulse p-5 text-xs text-zinc-500">Loading…</p>}
        {error && <div className="p-4"><ErrorState error={error} /></div>}
        {refunds && refunds.length === 0 && (
          <EmptyState icon={Layers} title="No refunds found" className="rounded-none border-0" />
        )}
        {refunds && refunds.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" aria-label="Refunds table">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-500">
                  {["ID", "Kind", "Original Payment", "Amount", "Date", "Status", "Settlement", "Case"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-800/40 text-zinc-300 hover:bg-zinc-800/20">
                    <td className="px-4 py-2.5 font-mono">{r.id.slice(0, 10)}…</td>
                    <td className={`px-4 py-2.5 font-medium ${kindColor[r.kind] ?? ""}`}>{kindLabel[r.kind] ?? r.kind}</td>
                    <td className="px-4 py-2.5 font-mono">{r.originalPaymentId.slice(0, 10)}…</td>
                    <td className="px-4 py-2.5 tabular-nums">{formatPaise(r.amountPaise)}</td>
                    <td className="px-4 py-2.5">{formatDate(r.date)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-2.5"><StatusBadge status={r.settlementStatus} /></td>
                    <td className="px-4 py-2.5">
                      {r.caseId
                        ? <a href={`/app/review?tab=case&id=${r.caseId}`} className="text-indigo-400 hover:underline">{r.caseId.slice(0, 8)}</a>
                        : <span className="text-zinc-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
