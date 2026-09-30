"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { runApi, reportApi, labApi, batchApi } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FileText, Download, FlaskConical, Play, TrendingUp } from "lucide-react";

type Tab = "reports" | "lab";
const TABS: { key: Tab; label: string }[] = [
  { key: "reports", label: "Reports" },
  { key: "lab",     label: "Synthetic Lab" },
];

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as Tab) ?? "reports";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Reports & Lab" />

      <div className="flex gap-0 border-b border-zinc-800 px-6 pt-1" role="tablist">
        {TABS.map(({ key, label }) => (
          <button key={key} role="tab" aria-selected={tab === key}
            onClick={() => router.push(`/app/reports?tab=${key}`)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key ? "border-indigo-500 text-indigo-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6" role="tabpanel">
        {tab === "reports" && <ReportsTab />}
        {tab === "lab"     && <LabTab />}
      </div>
    </div>
  );
}

// ── Reports ───────────────────────────────────────────────────────────────────
function ReportsTab() {
  const [selectedRunId, setSelectedRunId] = useState("");
  const [format, setFormat] = useState<"json" | "csv">("json");
  const { data: runs } = useQuery({ queryKey: ["runs"], queryFn: runApi.list });

  async function handleDownload() {
    if (!selectedRunId) return;
    const res = await reportApi.download(selectedRunId, format);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${selectedRunId.slice(0, 8)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader><CardTitle>Download Report</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Select label="Run" value={selectedRunId} onChange={(e) => setSelectedRunId(e.target.value)}>
            <option value="">Select a run</option>
            {runs?.map((r) => (
              <option key={r.id} value={r.id}>
                {formatDateTime(r.createdAt)} — {r.batchSource} — {r.status}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button variant={format === "json" ? "primary" : "secondary"} onClick={() => setFormat("json")}>JSON</Button>
            <Button variant={format === "csv" ? "primary" : "secondary"} onClick={() => setFormat("csv")}>CSV</Button>
          </div>
          <Button disabled={!selectedRunId} onClick={handleDownload}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download {format.toUpperCase()}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Real vs. Synthetic Benchmark Panel</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-500">
            Benchmark data is only available for simulated batches.
            Use the Synthetic Lab tab to compare real Nova data with calibrated simulations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Synthetic Lab ─────────────────────────────────────────────────────────────
function LabTab() {
  const qc = useQueryClient();
  const [realProfileId, setRealProfileId] = useState("");
  const [syntheticProfileId, setSyntheticProfileId] = useState("");

  const { data: batches } = useQuery({ queryKey: ["batches"], queryFn: batchApi.list });
  const { data: profiles, refetch: refreshProfiles } = useQuery({ queryKey: ["lab", "profiles"], queryFn: labApi.profiles });
  const { data: comparisons } = useQuery({ queryKey: ["lab", "comparisons"], queryFn: labApi.comparisons });

  const computeMutation = useMutation({
    mutationFn: (batchId: string) => labApi.computeProfile(batchId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lab", "profiles"] }); refreshProfiles(); },
  });

  const calibrateMutation = useMutation({
    mutationFn: () => labApi.calibrate(realProfileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab", "profiles"] }),
  });

  const compareMutation = useMutation({
    mutationFn: () => labApi.compare(realProfileId, syntheticProfileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab", "comparisons"] }),
  });

  const realProfiles = profiles?.filter((p) => p.kind === "real") ?? [];
  const syntheticProfiles = profiles?.filter((p) => p.kind === "synthetic") ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Step 1-2: Compute profile */}
      <Card>
        <CardHeader><CardTitle>Step 1-2: Compute Real Profile</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-zinc-500">
            Select a Nova batch to compute its statistical profile.
          </p>
          <div className="flex gap-2">
            {batches?.filter((b) => b.source === "nova").map((b) => (
              <Button key={b.id} size="sm" variant="secondary"
                loading={computeMutation.isPending && computeMutation.variables === b.id}
                onClick={() => computeMutation.mutate(b.id)}>
                <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                Compute {b.id.slice(0, 8)}
              </Button>
            ))}
          </div>
          {computeMutation.isError && <ErrorState error={computeMutation.error} />}
        </CardContent>
      </Card>

      {/* Step 3-4: Calibrate */}
      <Card>
        <CardHeader><CardTitle>Step 3-4: Calibrate Parameters</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Select label="Real Profile" value={realProfileId} onChange={(e) => setRealProfileId(e.target.value)}>
            <option value="">Select a profile</option>
            {realProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                Nova {p.id.slice(0, 8)} ({formatDateTime(p.createdAt)})
              </option>
            ))}
          </Select>
          <Button disabled={!realProfileId} loading={calibrateMutation.isPending} onClick={() => calibrateMutation.mutate()}>
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            Calibrate Parameters
          </Button>
          {calibrateMutation.isError && <ErrorState error={calibrateMutation.error} />}
        </CardContent>
      </Card>

      {/* Step 5: Generate synthetic */}
      <Card>
        <CardHeader><CardTitle>Step 5: Generate Synthetic Batch</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-500">
            Go to <strong>Data Hub → Batches</strong> and run the simulator with a calibration profile selected.
          </p>
        </CardContent>
      </Card>

      {/* Step 6: Compare */}
      <Card>
        <CardHeader><CardTitle>Step 6: Compare Profiles</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Real Profile" value={realProfileId} onChange={(e) => setRealProfileId(e.target.value)}>
              <option value="">Select</option>
              {realProfiles.map((p) => (
                <option key={p.id} value={p.id}>Nova {p.id.slice(0, 8)}</option>
              ))}
            </Select>
            <Select label="Synthetic Profile" value={syntheticProfileId} onChange={(e) => setSyntheticProfileId(e.target.value)}>
              <option value="">Select</option>
              {syntheticProfiles.map((p) => (
                <option key={p.id} value={p.id}>Sim {p.id.slice(0, 8)}</option>
              ))}
            </Select>
          </div>
          <Button disabled={!realProfileId || !syntheticProfileId} loading={compareMutation.isPending}
            onClick={() => compareMutation.mutate()}>
            <Play className="h-4 w-4" aria-hidden="true" />
            Compare
          </Button>
          {compareMutation.isError && <ErrorState error={compareMutation.error} />}
        </CardContent>
      </Card>

      {/* Comparison results */}
      <Card>
        <CardHeader><CardTitle>Comparison History</CardTitle></CardHeader>
        <CardContent>
          {!comparisons || comparisons.length === 0
            ? <EmptyState icon={FlaskConical} title="No comparisons yet" />
            : (
              <div className="space-y-3">
                {comparisons.map((cmp) => (
                  <div key={cmp.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-zinc-400">{cmp.id.slice(0, 10)}</span>
                        <span className="text-xs text-zinc-600">·</span>
                        <span className="text-xs text-zinc-500">{formatDateTime(cmp.createdAt)}</span>
                      </div>
                      <span className="text-xs text-zinc-500">{cmp.iterationCount} iterations</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {cmp.rows.slice(0, 6).map((row, i) => (
                        <div key={i} className="rounded bg-zinc-800/40 px-2 py-1.5">
                          <p className="text-[10px] text-zinc-500">{row.metricKey}</p>
                          <div className="mt-0.5 flex items-center gap-1">
                            <StatusBadge status={row.verdict} />
                            <span className="text-xs text-zinc-400">{(row.error * 100).toFixed(1)}% err</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
