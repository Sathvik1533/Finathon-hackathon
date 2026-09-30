"use client";
import React, { useState, useMemo, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { exceptionApi, caseApi, auditApi, type Case, type ExceptionItem } from "@/lib/api-client";
import { formatPaise, formatDateTime } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { TabsNav, type TabItem } from "@/components/ui/TabsNav";
import { FilterBar } from "@/components/ui/FilterBar";
import { Timeline } from "@/components/ui/Timeline";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import {
  ClipboardList,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Sparkles,
  ArrowLeft,
  ShieldAlert,
  Clock,
  Layers,
} from "lucide-react";

type Tab = "queue" | "case" | "audit";

const TABS: TabItem<Tab>[] = [
  { key: "queue", label: "Exception Queue", icon: ClipboardList },
  { key: "case", label: "Case Dossier", icon: FileText },
  { key: "audit", label: "Audit Trail", icon: Layers },
];

function ReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as Tab) ?? "queue";
  const caseId = searchParams.get("id");

  function handleTabChange(newTab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    if (newTab !== "case") {
      params.delete("id");
    }
    router.replace(`/app/review?${params.toString()}`);
  }

  function handleOpenCase(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "case");
    params.set("id", id);
    router.push(`/app/review?${params.toString()}`);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Review Center" subtitle="Exception Resolution & Case Investigation" />

      <TabsNav tabs={TABS} activeTab={tab} onChange={handleTabChange} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6" role="tabpanel">
        {tab === "queue" && <QueueTab onOpenCase={handleOpenCase} />}
        {tab === "case" && <CaseTab caseId={caseId} onBackToQueue={() => handleTabChange("queue")} />}
        {tab === "audit" && <AuditTab />}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-xs text-zinc-500">Loading Review Center…</p>
          </div>
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Exception Queue Tab
// ─────────────────────────────────────────────────────────────────────────────

function QueueTab({ onOpenCase }: { onOpenCase: (caseId: string) => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("open");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const queryParams: Record<string, string> = useMemo(() => {
    const p: Record<string, string> = {
      page: String(page),
      pageSize: String(PAGE_SIZE),
    };
    if (search.trim()) p.q = search.trim();
    if (status) p.status = status;
    if (category) p.category = category;
    if (severity) p.severity = severity;
    return p;
  }, [search, status, category, severity, page]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["exceptions", queryParams],
    queryFn: () => exceptionApi.list(queryParams),
  });

  // Calculate summary metrics strictly from returned real data
  const summary = useMemo(() => {
    if (!data?.data) return { total: 0, highRisk: 0, openCount: 0, totalAmountAtRisk: 0n };
    const items = data.data;
    let totalRiskPaise = 0n;
    let highCount = 0;
    let openCount = 0;

    for (const item of items) {
      try {
        totalRiskPaise += BigInt(item.amountAtRiskPaise ?? 0);
      } catch {
        // ignore parse error
      }
      if (item.severity === "high") highCount++;
      if (item.status === "open") openCount++;
    }

    return {
      total: data.total ?? items.length,
      highRisk: highCount,
      openCount: openCount,
      totalAmountAtRisk: totalRiskPaise,
    };
  }, [data]);

  const hasActiveFilters = Boolean(search || (status && status !== "open") || category || severity);

  function resetFilters() {
    setSearch("");
    setStatus("open");
    setCategory("");
    setSeverity("");
    setPage(1);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-5">
      {/* Real Summary Metrics Bar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile
          label="Total Exceptions"
          value={summary.total.toLocaleString("en-IN")}
          icon={<ClipboardList className="h-4 w-4 text-indigo-400" />}
        />
        <SummaryTile
          label="Open for Review"
          value={summary.openCount.toLocaleString("en-IN")}
          icon={<Clock className="h-4 w-4 text-sky-400" />}
        />
        <SummaryTile
          label="High Severity"
          value={summary.highRisk.toLocaleString("en-IN")}
          icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
        />
        <SummaryTile
          label="Amount at Risk"
          value={formatPaise(summary.totalAmountAtRisk)}
          icon={<ShieldAlert className="h-4 w-4 text-red-400" />}
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 bg-zinc-900/50">
        <FilterBar
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          searchPlaceholder="Search case ID, transaction…"
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
        >
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
            <option value="open">Open</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="escalated">Escalated</option>
          </select>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by category"
            className="h-9 rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="amount_mismatch">Amount Mismatch</option>
            <option value="missing_transaction">Missing Transaction</option>
            <option value="timing_lag">Timing Lag</option>
            <option value="fee_discrepancy">Fee Discrepancy</option>
          </select>

          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by severity"
            className="h-9 rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </FilterBar>
      </Card>

      {/* Exception Table */}
      <Card className="overflow-hidden">
        {isLoading && (
          <div className="flex flex-col gap-3 p-8 animate-pulse">
            <div className="h-6 w-1/4 rounded bg-zinc-800" />
            <div className="h-40 rounded-lg bg-zinc-800/50" />
          </div>
        )}

        {error && (
          <div className="p-6">
            <ErrorState error={error} title="Failed to load exception queue" />
          </div>
        )}

        {data && data.data.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title="No exceptions match criteria"
            description="All matching exception records have been resolved or filtered out."
            action={
              hasActiveFilters ? (
                <Button size="sm" variant="secondary" onClick={resetFilters}>
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        )}

        {data && data.data.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Priority</TableHead>
                  <TableHead>Case / ID</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount at Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((ex: ExceptionItem) => (
                  <TableRow key={ex.id}>
                    <TableCell>
                      <SeverityBadge severity={ex.severity} />
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs font-semibold text-zinc-200">
                        {ex.caseId ? ex.caseId.slice(0, 10) : ex.id.slice(0, 10)}…
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Run: {ex.runId ? ex.runId.slice(0, 8) : "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium capitalize text-zinc-300">
                        {ex.category.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums font-semibold text-red-400">
                      {formatPaise(ex.amountAtRiskPaise)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ex.status} />
                    </TableCell>
                    <TableCell className="text-zinc-400 whitespace-nowrap">
                      {formatDateTime(ex.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onOpenCase(ex.caseId || ex.id)}
                        className="gap-1 hover:border-indigo-500/50 hover:text-indigo-300"
                      >
                        <FileText className="h-3 w-3" aria-hidden="true" />
                        Investigate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-800/80 px-4 py-3 text-xs text-zinc-400 bg-zinc-950/40">
                <span>
                  Showing page {page} of {totalPages} ({data.total.toLocaleString("en-IN")} total items)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
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
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Case Dossier Investigation Workspace Tab
// ─────────────────────────────────────────────────────────────────────────────

function CaseTab({
  caseId,
  onBackToQueue,
}: {
  caseId: string | null;
  onBackToQueue: () => void;
}) {
  const { data: caseData, isLoading, error } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => caseApi.get(caseId!),
    enabled: !!caseId,
  });

  if (!caseId) {
    return (
      <EmptyState
        icon={FileText}
        title="No Case Selected"
        description="Select an exception from the queue to start investigating the 4-source transaction timeline, mismatch breakdown, and AI suggested resolution."
        action={
          <Button size="sm" onClick={onBackToQueue}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Go to Exception Queue
          </Button>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 w-1/3 rounded bg-zinc-800" />
        <div className="h-28 rounded-xl bg-zinc-800" />
        <div className="h-64 rounded-xl bg-zinc-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBackToQueue} className="text-zinc-400">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Queue
        </Button>
        <ErrorState error={error} title="Failed to load Case Dossier" />
      </div>
    );
  }

  if (!caseData) return null;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* 1. Header with Breadcrumb & Primary Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="space-y-1">
          <button
            onClick={onBackToQueue}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:outline-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Exception Queue
          </button>
          <div className="flex items-center gap-3 pt-1">
            <h2 className="text-lg font-bold text-zinc-100 font-mono">
              Case {caseData.id.slice(0, 12)}…
            </h2>
            <StatusBadge status={caseData.status} />
            <SourceBadge source={caseData.batchSource} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-mono">Version v{caseData.version}</span>
        </div>
      </div>

      {/* 2. Risk & Status Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-400">Amount at Risk</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-red-300">
            {formatPaise(caseData.amountAtRiskPaise)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Category</p>
          <p className="mt-1 text-sm font-semibold capitalize text-zinc-200 truncate">
            {caseData.category.replace(/_/g, " ")}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Severity</p>
          <div className="mt-1.5">
            <SeverityBadge severity={caseData.severity} />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Run Association</p>
          <p className="mt-1 text-xs font-mono text-zinc-300 truncate">
            {caseData.runId ? caseData.runId.slice(0, 10) : "—"}
          </p>
        </div>
      </div>

      {/* 3. 4-Source Timeline Investigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>4-Source Linked Timeline</CardTitle>
            <span className="text-[11px] text-zinc-500">
              Payment → Gateway → Bank → Settlement
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Timeline events={caseData.timeline} />
        </CardContent>
      </Card>

      {/* 4. Fee & Mismatch Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Fee &amp; Tax Mismatch Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FeeMetric
              label="Expected Fee"
              value={formatPaise(caseData.feeBreakdown.expectedFeePaise)}
            />
            <FeeMetric
              label="Actual Gateway Fee"
              value={formatPaise(caseData.feeBreakdown.actualFeePaise)}
            />
            <FeeMetric
              label="Fee Variance (Discrepancy)"
              value={formatPaise(caseData.feeBreakdown.differencePaise)}
              isDiff
              diffPaise={BigInt(caseData.feeBreakdown.differencePaise ?? 0)}
            />
            <FeeMetric
              label="Expected GST"
              value={formatPaise(caseData.feeBreakdown.expectedGstPaise)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 5. Deterministic Engine Explanation (Always Present) */}
      <Card className="border-indigo-500/20 bg-indigo-950/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-indigo-600/30 text-indigo-400">
              <CheckCircle className="h-3.5 w-3.5" />
            </div>
            <CardTitle>Deterministic Reconciliation Rationale</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-zinc-950/70 border border-zinc-800/80 p-3.5 font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {caseData.deterministicExplanation || "No deterministic rationale recorded."}
          </div>
        </CardContent>
      </Card>

      {/* 6. AI Analysis Panel (Handles Loading, Available, Unavailable, Failed) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <CardTitle>AI Suggestion &amp; Policy Alignment</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {caseData.aiUnavailable ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold">AI analysis unavailable for simulated dataset</p>
                <p className="text-zinc-400 mt-0.5">
                  AI suggestions and LLM policy evaluation are enabled only on live merchant and Nova-imported batches.
                </p>
              </div>
            </div>
          ) : caseData.aiSuggestion ? (
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {caseData.aiSuggestion}
            </div>
          ) : (
            <AILoader caseId={caseData.id} />
          )}
        </CardContent>
      </Card>

      {/* 7. Decision Panel */}
      <DecisionWorkspace caseData={caseData} />
    </div>
  );
}

function AILoader({ caseId }: { caseId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ai", "explain", caseId],
    queryFn: () => caseApi.explain(caseId),
    staleTime: Infinity,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-4 text-xs text-zinc-400">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        <span>Evaluating reconciliation policies and compiling AI suggestion…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400">
        AI suggestion currently unavailable. Use deterministic explanation to resolve this case.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
      {data?.suggestion || "No AI recommendation returned."}
    </div>
  );
}

function DecisionWorkspace({ caseData }: { caseData: Case }) {
  const qc = useQueryClient();
  const [decision, setDecision] = useState<"approved" | "rejected" | "escalated" | "">("");
  const [note, setNote] = useState("");

  const decideMutation = useMutation({
    mutationFn: () => caseApi.decide(caseData.id, decision!, note.trim(), caseData.version),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case", caseData.id] });
      qc.invalidateQueries({ queryKey: ["exceptions"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      setDecision("");
      setNote("");
    },
  });

  const isResolved = caseData.status !== "open";

  if (isResolved) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-xs sm:text-sm text-zinc-300 font-medium">
              This case was marked as <strong className="capitalize text-zinc-100">{caseData.status}</strong>.
            </span>
          </div>
          <StatusBadge status={caseData.status} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-500/30 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-2">
      <CardHeader>
        <CardTitle>Decision Workspace</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Action picker */}
        <div className="flex flex-wrap gap-2.5">
          <Button
            type="button"
            variant={decision === "approved" ? "primary" : "secondary"}
            onClick={() => setDecision("approved")}
            className="gap-1.5"
          >
            <CheckCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            Approve Adjustment
          </Button>

          <Button
            type="button"
            variant={decision === "rejected" ? "danger" : "secondary"}
            onClick={() => setDecision("rejected")}
            className="gap-1.5"
          >
            <XCircle className="h-4 w-4 text-rose-400" aria-hidden="true" />
            Reject &amp; Mark Invalid
          </Button>

          <Button
            type="button"
            variant={decision === "escalated" ? "outline" : "secondary"}
            onClick={() => setDecision("escalated")}
            className="gap-1.5"
          >
            <ArrowUpRight className="h-4 w-4 text-amber-400" aria-hidden="true" />
            Escalate to Lead
          </Button>
        </div>

        {/* Note input required */}
        {decision && (
          <div className="flex flex-col gap-3 pt-2 border-t border-zinc-800/80 animate-in fade-in duration-150">
            <Textarea
              label={`Audit Justification Note (Required for ${decision})`}
              placeholder="State the regulatory/accounting rationale, reference IDs, or justification for this decision…"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              error={!note.trim() && decideMutation.isError ? "A justification note is required." : undefined}
            />

            <div className="flex items-center gap-3">
              <Button
                loading={decideMutation.isPending}
                disabled={!note.trim() || decideMutation.isPending}
                onClick={() => decideMutation.mutate()}
                className="gap-1.5"
              >
                Submit Decision
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDecision("");
                  setNote("");
                }}
              >
                Cancel
              </Button>
            </div>

            {decideMutation.isError && (
              <ErrorState error={decideMutation.error} title="Decision submission failed" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Audit Trail Tab
// ─────────────────────────────────────────────────────────────────────────────

function AuditTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit"],
    queryFn: () => auditApi.list(),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Audit Trail Log</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="p-8 text-center text-xs text-zinc-500 animate-pulse">
            Loading immutable audit logs…
          </div>
        )}

        {error && (
          <div className="p-4">
            <ErrorState error={error} title="Failed to load audit entries" />
          </div>
        )}

        {data && data.data.length === 0 && (
          <EmptyState icon={Layers} title="No audit entries" description="Decisions and changes will appear here." />
        )}

        {data && data.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>User / Auditor</TableHead>
                <TableHead>Case Reference</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Audit Note</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-semibold text-zinc-200 capitalize">
                    {entry.action.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="font-mono text-zinc-300">
                    {entry.userEmail}
                  </TableCell>
                  <TableCell className="font-mono text-zinc-400">
                    {entry.caseId ? entry.caseId.slice(0, 10) : "—"}
                  </TableCell>
                  <TableCell>
                    {entry.decision ? <StatusBadge status={entry.decision} /> : "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-zinc-400">
                    {entry.note || "—"}
                  </TableCell>
                  <TableCell className="text-zinc-500 whitespace-nowrap">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents & Helpers
// ─────────────────────────────────────────────────────────────────────────────

function SummaryTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-3.5 bg-zinc-900/40 border-zinc-800/80">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-zinc-100 tabular-nums">
        {value}
      </p>
    </Card>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = severity?.toLowerCase();
  if (s === "high") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-[11px] font-semibold text-red-400">
        High
      </span>
    );
  }
  if (s === "medium") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
      Low
    </span>
  );
}

function FeeMetric({
  label,
  value,
  isDiff,
  diffPaise,
}: {
  label: string;
  value: string;
  isDiff?: boolean;
  diffPaise?: bigint;
}) {
  const isDanger = isDiff && diffPaise !== undefined && diffPaise !== 0n;
  return (
    <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/70 p-3">
      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
      <p
        className={`mt-1 text-sm font-semibold tabular-nums ${
          isDanger ? "text-amber-400" : "text-zinc-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
