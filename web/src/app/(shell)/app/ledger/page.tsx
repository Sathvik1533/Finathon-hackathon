"use client";
import React, { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { transactionApi, settlementApi, refundApi, type Settlement } from "@/lib/api-client";
import { formatPaise, formatDate } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { TabsNav, type TabItem } from "@/components/ui/TabsNav";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/ui/FilterBar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import {
  ChevronDown,
  ChevronRight,
  CreditCard,
  Building2,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

type Tab = "transactions" | "settlements" | "refunds";

const TABS: TabItem<Tab>[] = [
  { key: "transactions", label: "Transactions", icon: CreditCard },
  { key: "settlements", label: "Settlements (1-to-Many)", icon: Building2 },
  { key: "refunds", label: "Refunds & Reversals", icon: RotateCcw },
];

const SOURCE_COLORS: Record<string, string> = {
  internal: "text-indigo-400 font-semibold",
  gateway: "text-sky-400 font-semibold",
  bank: "text-emerald-400 font-semibold",
  refund: "text-amber-400 font-semibold",
};

function LedgerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as Tab) ?? "transactions";

  function handleTabChange(newTab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.replace(`/app/ledger?${params.toString()}`);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Ledger" subtitle="Multi-Source Financial Records" />

      <TabsNav tabs={TABS} activeTab={tab} onChange={handleTabChange} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6" role="tabpanel">
        {tab === "transactions" && <TransactionsTab />}
        {tab === "settlements" && <SettlementsTab />}
        {tab === "refunds" && <RefundsTab />}
      </div>
    </div>
  );
}

export default function LedgerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-xs text-zinc-500">Loading Ledger…</p>
          </div>
        </div>
      }
    >
      <LedgerContent />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Transactions Explorer Tab
// ─────────────────────────────────────────────────────────────────────────────

function TransactionsTab() {
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const params: Record<string, string> = {
    page: String(page),
    pageSize: String(PAGE_SIZE),
  };
  if (q.trim()) params.q = q.trim();
  if (source) params.source = source;
  if (status) params.status = status;

  const { data, isLoading, error } = useQuery({
    queryKey: ["transactions", params],
    queryFn: () => transactionApi.list(params),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const hasActiveFilters = Boolean(q || source || status);

  function resetFilters() {
    setQ("");
    setSource("");
    setStatus("");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto">
      <PageHeader
        title="Transaction Explorer"
        description="Search across Internal, Gateway, Bank Statement, and Refund records."
      />

      <Card className="p-3 bg-zinc-900/50">
        <FilterBar
          search={q}
          onSearchChange={(val) => {
            setQ(val);
            setPage(1);
          }}
          searchPlaceholder="Search by ID, order reference, gateway ref…"
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
        >
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by source"
            className="h-9 rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Sources</option>
            <option value="internal">Internal</option>
            <option value="gateway">Gateway</option>
            <option value="bank">Bank</option>
            <option value="refund">Refund</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="h-9 rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="matched">Matched</option>
            <option value="unmatched">Unmatched</option>
            <option value="pending">Pending</option>
          </select>
        </FilterBar>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading && <p className="animate-pulse p-6 text-xs text-zinc-500">Loading transactions…</p>}
          {error && <div className="p-4"><ErrorState error={error} title="Failed to load transactions" /></div>}
          {data && data.data.length === 0 && (
            <EmptyState
              icon={CreditCard}
              title="No transactions found"
              description="No records match the current filter or search criteria."
            />
          )}
          {data && data.data.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nova Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-zinc-200">
                        {tx.id.slice(0, 14)}…
                      </TableCell>
                      <TableCell>
                        <span className={`capitalize text-xs ${SOURCE_COLORS[tx.source] ?? "text-zinc-300"}`}>
                          {tx.source}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums font-semibold text-zinc-100">
                        {formatPaise(tx.amountPaise)}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-zinc-500">
                        {tx.novaId || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Server Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-zinc-800/80 px-4 py-3 text-xs text-zinc-400 bg-zinc-950/40">
                  <span>
                    Page {page} of {totalPages} ({data.total.toLocaleString("en-IN")} total rows)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Settlements Tab (One-to-Many Grouped Credits)
// ─────────────────────────────────────────────────────────────────────────────

function SettlementsTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: settlements, isLoading, error } = useQuery({
    queryKey: ["settlements"],
    queryFn: settlementApi.list,
  });

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto">
      <PageHeader
        title="Settlement Reconciliations"
        description="Inspect batch credits deposited by bank gateways against aggregated merchant payments."
      />

      {isLoading && <p className="animate-pulse p-6 text-xs text-zinc-500">Loading settlements…</p>}
      {error && <ErrorState error={error} title="Failed to load settlements" />}
      {settlements && settlements.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No settlements found"
          description="Settlements from bank statement files will appear here."
        />
      )}

      <div className="space-y-3">
        {settlements?.map((s) => (
          <SettlementItem
            key={s.id}
            settlement={s}
            expanded={expandedId === s.id}
            onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SettlementItem({
  settlement: s,
  expanded,
  onToggle,
}: {
  settlement: Settlement;
  expanded: boolean;
  onToggle: () => void;
}) {
  const diffPaise = BigInt(s.differencePaise ?? 0);
  const diffColor =
    diffPaise === 0n
      ? "text-emerald-400"
      : diffPaise > 0n
      ? "text-amber-400"
      : "text-red-400";

  return (
    <Card className="overflow-hidden border-zinc-800/80 bg-zinc-900/40">
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between p-4 sm:p-5 text-left transition-colors hover:bg-zinc-800/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <StatusBadge status={s.status} />
          <div className="space-y-0.5">
            <span className="font-mono text-xs font-semibold text-zinc-200">{s.bankRef}</span>
            <p className="text-[11px] text-zinc-500">Value Date: {formatDate(s.valueDate)}</p>
          </div>
        </div>

        <div className="flex items-center gap-5 sm:gap-8">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Bank Credited</p>
            <p className="text-sm font-semibold tabular-nums text-zinc-100">
              {formatPaise(s.creditPaise)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Difference</p>
            <p className={`text-sm font-semibold tabular-nums ${diffColor}`}>
              {formatPaise(s.differencePaise)}
            </p>
          </div>

          <div className="text-zinc-500">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {/* Expanded Payment Breakdown (One-to-Many grouping) */}
      {expanded && (
        <div className="border-t border-zinc-800 bg-zinc-950/70 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium text-zinc-300">
              Underlying Payment Transactions ({s.payments.length})
            </span>
            {s.novaNetPaise && (
              <span className="font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                Nova-reported Net: {formatPaise(s.novaNetPaise)}
              </span>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Reference</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Refunds</TableHead>
                <TableHead className="text-right">Calculated Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-zinc-300">{p.id.slice(0, 14)}…</TableCell>
                  <TableCell className="tabular-nums text-zinc-300">{formatPaise(p.grossPaise)}</TableCell>
                  <TableCell className="tabular-nums text-zinc-400">{formatPaise(p.feePaise)}</TableCell>
                  <TableCell className="tabular-nums text-zinc-400">{formatPaise(p.gstPaise)}</TableCell>
                  <TableCell className="tabular-nums text-zinc-400">{formatPaise(p.refundsPaise)}</TableCell>
                  <TableCell className="tabular-nums font-semibold text-zinc-100 text-right">
                    {formatPaise(p.netPaise)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Refunds & Reversals Tab
// ─────────────────────────────────────────────────────────────────────────────

function RefundsTab() {
  const { data: refunds, isLoading, error } = useQuery({
    queryKey: ["refunds"],
    queryFn: refundApi.list,
  });

  const kindLabel: Record<string, string> = {
    refund: "Standard Refund",
    chargeback: "Chargeback Dispute",
    chargeback_reversal: "Chargeback Reversal",
  };

  const kindColor: Record<string, string> = {
    refund: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    chargeback: "text-red-400 bg-red-500/10 border-red-500/20",
    chargeback_reversal: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  };

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto">
      <PageHeader
        title="Refunds &amp; Disputes"
        description="Track customer refunds, gateway chargeback disputes, and settlement clawbacks."
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading && <p className="animate-pulse p-6 text-xs text-zinc-500">Loading refunds…</p>}
          {error && <div className="p-4"><ErrorState error={error} title="Failed to load refunds" /></div>}
          {refunds && refunds.length === 0 && (
            <EmptyState icon={RotateCcw} title="No refunds found" description="Settled refunds and chargebacks will appear here." />
          )}
          {refunds && refunds.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Refund ID</TableHead>
                  <TableHead>Kind / Dispute</TableHead>
                  <TableHead>Original Payment</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Settlement Status</TableHead>
                  <TableHead className="text-right">Dossier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refunds.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-zinc-200">{r.id.slice(0, 12)}…</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          kindColor[r.kind] ?? "text-zinc-400 border-zinc-700"
                        }`}
                      >
                        {kindLabel[r.kind] ?? r.kind}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-zinc-400">
                      {r.originalPaymentId.slice(0, 12)}…
                    </TableCell>
                    <TableCell className="tabular-nums font-semibold text-amber-300">
                      {formatPaise(r.amountPaise)}
                    </TableCell>
                    <TableCell className="text-zinc-400">{formatDate(r.date)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.settlementStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      {r.caseId ? (
                        <Link
                          href={`/app/review?tab=case&id=${r.caseId}`}
                          className="text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
                        >
                          Review Case →
                        </Link>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
