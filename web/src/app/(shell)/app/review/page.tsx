"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { exceptionApi, caseApi, auditApi } from "@/lib/api-client";
import { formatPaise, formatDateTime, formatDate } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ClipboardList, FileText, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { Case } from "@/lib/api-client";

type Tab = "queue" | "case" | "audit";
const TABS: { key: Tab; label: string }[] = [
  { key: "queue", label: "Exception Queue" },
  { key: "case",  label: "Case Dossier" },
  { key: "audit", label: "Audit Trail" },
];

export default function ReviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as Tab) ?? "queue";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Review Center" />

      <div className="flex gap-0 border-b border-zinc-800 px-6 pt-1" role="tablist" aria-label="Review sections">
        {TABS.map(({ key, label }) => (
          <button key={key} role="tab" aria-selected={tab === key}
            onClick={() => router.push(`/app/review?tab=${key}`)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              tab === key ? "border-indigo-500 text-indigo-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6" role="tabpanel">
        {tab === "queue" && <QueueTab />}
        {tab === "case"  && <CaseTab />}
        {tab === "audit" && <AuditTab />}
      </div>
    </div>
  );
}

// ── Exception Queue ───────────────────────────────────────────────────────────
function QueueTab() {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("open");

  const params: Record<string, string> = {};
  if (category) params.category = category;
  if (status)   params.status = status;

  const { data, isLoading, error } = useQuery({
    queryKey: ["exceptions", params],
    queryFn: () => exceptionApi.list(params),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="h-9 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none">
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="escalated">Escalated</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className="h-9 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none">
          <option value="">All Categories</option>
          <option value="amount_mismatch">Amount Mismatch</option>
          <option value="missing_transaction">Missing Transaction</option>
          <option value="timing_lag">Timing Lag</option>
          <option value="fee_discrepancy">Fee Discrepancy</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="animate-pulse p-5 text-xs text-zinc-500">Loading…</p>}
          {error && <div className="p-4"><ErrorState error={error} /></div>}
          {data && data.data.length === 0 && (
            <EmptyState icon={ClipboardList} title="No exceptions" className="rounded-none border-0" />
          )}
          {data && data.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" aria-label="Exception queue">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-500">
                    {["Category", "Severity", "Amount at Risk", "Status", "Created", "Action"].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((ex) => (
                    <tr key={ex.id} className="border-b border-zinc-800/40 text-zinc-300 hover:bg-zinc-800/20">
                      <td className="px-4 py-2.5 font-medium capitalize">{ex.category.replace(/_/g, " ")}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          ex.severity === "high" ? "bg-red-500/15 text-red-400" :
                          ex.severity === "medium" ? "bg-amber-500/15 text-amber-400" :
                          "bg-blue-500/15 text-blue-400"
                        }`}>
                          {ex.severity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums font-medium text-red-400">{formatPaise(ex.amountAtRiskPaise)}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={ex.status} /></td>
                      <td className="px-4 py-2.5">{formatDateTime(ex.createdAt)}</td>
                      <td className="px-4 py-2.5">
                        <Button size="sm" variant="ghost" onClick={() => router.push(`/app/review?tab=case&id=${ex.caseId}`)}>
                          <FileText className="h-3 w-3" aria-hidden="true" />
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Case Dossier ──────────────────────────────────────────────────────────────
function CaseTab() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("id");

  const { data: caseData, isLoading, error } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => caseApi.get(caseId!),
    enabled: !!caseId,
  });

  if (!caseId) return <EmptyState icon={FileText} title="Select a case" description="Pick a case from the Exception Queue to review it." />;
  if (isLoading) return <p className="animate-pulse text-xs text-zinc-500">Loading case…</p>;
  if (error) return <ErrorState error={error} />;
  if (!caseData) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-200">Case {caseData.id.slice(0, 10)}…</h2>
            <StatusBadge status={caseData.status} />
            <SourceBadge source={caseData.batchSource} />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {caseData.category.replace(/_/g, " ")} · {caseData.severity} severity · {formatPaise(caseData.amountAtRiskPaise)} at risk
          </p>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader><CardTitle>4-Source Timeline</CardTitle></CardHeader>
        <CardContent>
          {caseData.timeline.length === 0 && <p className="text-xs text-zinc-500">No events</p>}
          {caseData.timeline.length > 0 && (
            <div className="space-y-3">
              {caseData.timeline.map((ev, i) => (
                <div key={i} className="flex gap-3 rounded-lg bg-zinc-800/40 p-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">
                    {ev.source[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium capitalize text-zinc-300">{ev.source}</span>
                      <span className="text-xs text-zinc-600">·</span>
                      <span className="text-xs text-zinc-500">{ev.type}</span>
                      <StatusBadge status={ev.status} />
                    </div>
                    <p className="mt-1 tabular-nums text-sm font-medium text-zinc-200">{formatPaise(ev.amountPaise)}</p>
                    <p className="text-xs text-zinc-600">{formatDate(ev.date)}</p>
                    {ev.novaId && <p className="mt-1 font-mono text-xs text-zinc-600">Nova: {ev.novaId}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee breakdown */}
      <Card>
        <CardHeader><CardTitle>Fee Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Expected Fee",     value: formatPaise(caseData.feeBreakdown.expectedFeePaise) },
              { label: "Actual Fee",       value: formatPaise(caseData.feeBreakdown.actualFeePaise) },
              { label: "Fee Difference",   value: formatPaise(caseData.feeBreakdown.differencePaise), danger: BigInt(caseData.feeBreakdown.differencePaise) !== 0n },
              { label: "Expected GST",     value: formatPaise(caseData.feeBreakdown.expectedGstPaise) },
            ].map(({ label, value, danger }) => (
              <div key={label} className="rounded-lg bg-zinc-800/40 px-3 py-2.5">
                <p className="text-xs text-zinc-500">{label}</p>
                <p className={`mt-1 text-sm font-medium tabular-nums ${danger ? "text-red-400" : "text-zinc-200"}`}>{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Explanation */}
      <Card>
        <CardHeader><CardTitle>Deterministic Explanation</CardTitle></CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-zinc-300">{caseData.deterministicExplanation}</p>
        </CardContent>
      </Card>

      {/* AI panel */}
      <Card>
        <CardHeader><CardTitle>AI Suggestion</CardTitle></CardHeader>
        <CardContent>
          {caseData.aiUnavailable && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              AI unavailable for simulated batches.
            </div>
          )}
          {!caseData.aiUnavailable && !caseData.aiSuggestion && (
            <AISuggestionLoader caseId={caseData.id} />
          )}
          {caseData.aiSuggestion && (
            <p className="whitespace-pre-wrap text-sm text-zinc-300">{caseData.aiSuggestion}</p>
          )}
        </CardContent>
      </Card>

      {/* Decision */}
      {caseData.status === "open" && <DecisionPanel caseData={caseData} />}
    </div>
  );
}

function AISuggestionLoader({ caseId }: { caseId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ai", "explain", caseId],
    queryFn: () => caseApi.explain(caseId),
    staleTime: Infinity,
  });

  if (isLoading) return <p className="animate-pulse text-xs text-zinc-500">Generating AI suggestion…</p>;
  if (error) return <p className="text-xs text-red-400">AI generation failed.</p>;
  return <p className="whitespace-pre-wrap text-sm text-zinc-300">{data?.suggestion}</p>;
}

function DecisionPanel({ caseData }: { caseData: Case }) {
  const qc = useQueryClient();
  const [decision, setDecision] = useState<"approved" | "rejected" | "escalated" | "">("");
  const [note, setNote] = useState("");

  const decideMutation = useMutation({
    mutationFn: () => caseApi.decide(caseData.id, decision!, note, caseData.version),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case", caseData.id] });
      qc.invalidateQueries({ queryKey: ["exceptions"] });
      setDecision("");
      setNote("");
    },
  });

  return (
    <Card className="border-indigo-500/30 bg-indigo-600/5">
      <CardHeader><CardTitle>Make Decision</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button variant={decision === "approved" ? "primary" : "secondary"} onClick={() => setDecision("approved")}>
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            Approve
          </Button>
          <Button variant={decision === "rejected" ? "danger" : "secondary"} onClick={() => setDecision("rejected")}>
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Reject
          </Button>
          <Button variant={decision === "escalated" ? "outline" : "secondary"} onClick={() => setDecision("escalated")}>
            Escalate
          </Button>
        </div>
        {decision && (
          <>
            <Textarea label="Note (required)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex gap-2">
              <Button loading={decideMutation.isPending} disabled={!note.trim()} onClick={() => decideMutation.mutate()}>
                Submit Decision
              </Button>
              <Button variant="secondary" onClick={() => { setDecision(""); setNote(""); }}>Cancel</Button>
            </div>
            {decideMutation.isError && <ErrorState error={decideMutation.error} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Audit Trail ───────────────────────────────────────────────────────────────
function AuditTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit"],
    queryFn: () => auditApi.list(),
  });

  return (
    <Card>
      <CardContent className="p-0">
        {isLoading && <p className="animate-pulse p-5 text-xs text-zinc-500">Loading…</p>}
        {error && <div className="p-4"><ErrorState error={error} /></div>}
        {data && data.data.length === 0 && (
          <EmptyState icon={FileText} title="No audit entries" className="rounded-none border-0" />
        )}
        {data && data.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" aria-label="Audit trail">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-500">
                  {["Action", "User", "Case", "Decision", "Note", "Timestamp"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((entry) => (
                  <tr key={entry.id} className="border-b border-zinc-800/40 text-zinc-300">
                    <td className="px-4 py-2.5 font-medium">{entry.action}</td>
                    <td className="px-4 py-2.5">{entry.userEmail}</td>
                    <td className="px-4 py-2.5 font-mono">{entry.caseId?.slice(0, 10) ?? "—"}</td>
                    <td className="px-4 py-2.5">{entry.decision ? <StatusBadge status={entry.decision} /> : "—"}</td>
                    <td className="px-4 py-2.5 max-w-xs truncate">{entry.note ?? "—"}</td>
                    <td className="px-4 py-2.5">{formatDateTime(entry.createdAt)}</td>
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
