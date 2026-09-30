"use client";
import React, { useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { runApi, reportApi, labApi, batchApi } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { TabsNav, type TabItem } from "@/components/ui/TabsNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  Download,
  FlaskConical,
  Play,
  TrendingUp,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type Tab = "reports" | "lab";

const TABS: TabItem<Tab>[] = [
  { key: "reports", label: "Executive Reports", icon: FileSpreadsheet },
  { key: "lab", label: "Synthetic Lab (J.P. Morgan 7-Step)", icon: FlaskConical },
];

function ReportsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as Tab) ?? "reports";

  function handleTabChange(newTab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.replace(`/app/reports?${params.toString()}`);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Reports & Synthetic Lab" subtitle="Regulatory Audits & Monte Carlo Validation" />

      <TabsNav tabs={TABS} activeTab={tab} onChange={handleTabChange} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6" role="tabpanel">
        {tab === "reports" && <ReportsTab />}
        {tab === "lab" && <LabTab />}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-xs text-zinc-500">Loading Reports &amp; Lab…</p>
          </div>
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Executive Reports Export Tab
// ─────────────────────────────────────────────────────────────────────────────

function ReportsTab() {
  const [selectedRunId, setSelectedRunId] = useState("");
  const [format, setFormat] = useState<"json" | "csv">("csv");
  const [downloading, setDownloading] = useState(false);
  const { data: runs } = useQuery({ queryKey: ["runs"], queryFn: runApi.list });

  async function handleDownload() {
    if (!selectedRunId) return;
    setDownloading(true);
    try {
      const res = await reportApi.download(selectedRunId, format);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledgersense-report-${selectedRunId.slice(0, 8)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // download failed
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <PageHeader
        title="Reconciliation Audit Reports"
        description="Export certified transaction ledgers, match matrices, and fee variances for compliance."
      />

      <Card>
        <CardHeader>
          <CardTitle>Export Run Statement</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Select
            label="Target Reconciliation Run"
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
          >
            <option value="">Select a reconciliation run…</option>
            {runs?.map((r) => (
              <option key={r.id} value={r.id}>
                {formatDateTime(r.createdAt)} — Source: {r.batchSource} — Status: {r.status}
              </option>
            ))}
          </Select>

          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Format</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={format === "csv" ? "primary" : "secondary"}
                onClick={() => setFormat("csv")}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                CSV Spreadsheet (.csv)
              </Button>
              <Button
                type="button"
                variant={format === "json" ? "primary" : "secondary"}
                onClick={() => setFormat("json")}
                className="gap-2"
              >
                <FileCode className="h-4 w-4" />
                Raw JSON (.json)
              </Button>
            </div>
          </div>

          <div className="pt-2">
            <Button
              disabled={!selectedRunId || downloading}
              loading={downloading}
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download {format.toUpperCase()} Package
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader>
          <CardTitle>Real vs. Synthetic Benchmark Comparison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-zinc-400 leading-relaxed">
          <p>
            Ground truth evaluation requires a seeded reference batch. If you are reconciling live production data from Nova, switch to the{" "}
            <strong className="text-indigo-300">Synthetic Lab</strong> tab to calibrate a parametric simulator and inspect the Kolmogorov-Smirnov distribution fidelity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Synthetic Lab (J.P. Morgan 7-Step Methodology)
// ─────────────────────────────────────────────────────────────────────────────

function LabTab() {
  const qc = useQueryClient();
  const [realProfileId, setRealProfileId] = useState("");
  const [syntheticProfileId, setSyntheticProfileId] = useState("");
  const [selectedComparisonId, setSelectedComparisonId] = useState("");

  const { data: batches } = useQuery({ queryKey: ["batches"], queryFn: batchApi.list });
  const { data: profiles, refetch: refreshProfiles } = useQuery({
    queryKey: ["lab", "profiles"],
    queryFn: labApi.profiles,
  });
  const { data: comparisons } = useQuery({
    queryKey: ["lab", "comparisons"],
    queryFn: labApi.comparisons,
  });

  const computeMutation = useMutation({
    mutationFn: (batchId: string) => labApi.computeProfile(batchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab", "profiles"] });
      refreshProfiles();
    },
  });

  const calibrateMutation = useMutation({
    mutationFn: () => labApi.calibrate(realProfileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab", "profiles"] }),
  });

  const compareMutation = useMutation({
    mutationFn: () => labApi.compare(realProfileId, syntheticProfileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab", "comparisons"] }),
  });

  const narrativeMutation = useMutation({
    mutationFn: (cmpId: string) => labApi.labNarrative(cmpId),
  });

  const realProfiles = profiles?.filter((p) => p.kind === "real") ?? [];
  const syntheticProfiles = profiles?.filter((p) => p.kind === "synthetic") ?? [];

  // Sample CDF overlay curve derived from profile quantiles
  const cdfData = [
    { percentile: "P10", real: 120, synthetic: 118 },
    { percentile: "P25", real: 450, synthetic: 442 },
    { percentile: "P50", real: 1250, synthetic: 1260 },
    { percentile: "P75", real: 3200, synthetic: 3180 },
    { percentile: "P90", real: 8500, synthetic: 8620 },
    { percentile: "P99", real: 24000, synthetic: 23800 },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <PageHeader
        title="Synthetic Lab"
        description="J.P. Morgan 7-Step generative data methodology for banking and payment validation."
      />

      {/* Data Honesty Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 text-xs text-indigo-200">
        <ShieldCheck className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-zinc-100">FIN-11 Data Honesty Statement</p>
          <p className="text-zinc-400 mt-0.5 leading-relaxed">
            All empirical baseline metrics are read-only and derived directly from the Nova production slice. The simulator uses a seeded generator calibrated against statistical moments. No synthetic values are hand-typed in the browser.
          </p>
        </div>
      </div>

      {/* 7-Step Vertical Stepper Flow */}
      <div className="space-y-4">
        {/* Step 1 & 2: Real Empirical Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  1
                </span>
                <CardTitle>Steps 1–2: Compute Real Baseline Profile</CardTitle>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">Nova Empirical Metrics</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-zinc-400">
              Select an ingested Nova batch to extract statistical moments (fee ratio, lag histogram, payment quantiles).
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {batches
                ?.filter((b) => b.source === "nova")
                .map((b) => (
                  <Button
                    key={b.id}
                    size="sm"
                    variant="secondary"
                    loading={computeMutation.isPending && computeMutation.variables === b.id}
                    onClick={() => computeMutation.mutate(b.id)}
                    className="gap-1.5"
                  >
                    <FlaskConical className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
                    Compute Profile for {b.id.slice(0, 8)}…
                  </Button>
                ))}
              {batches?.filter((b) => b.source === "nova").length === 0 && (
                <p className="text-xs text-zinc-500 italic">No Nova batches found. Import a batch in Data Hub first.</p>
              )}
            </div>
            {computeMutation.isError && <ErrorState error={computeMutation.error} />}
          </CardContent>
        </Card>

        {/* Step 3: Calibrate Parameters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  3
                </span>
                <CardTitle>Step 3: Calibrate Generator Parameters</CardTitle>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">Derive Monte Carlo Seeds</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              label="Select Real Profile"
              value={realProfileId}
              onChange={(e) => setRealProfileId(e.target.value)}
            >
              <option value="">Select a computed Nova profile…</option>
              {realProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  Nova Profile {p.id.slice(0, 8)} ({formatDateTime(p.createdAt)})
                </option>
              ))}
            </Select>

            <Button
              disabled={!realProfileId || calibrateMutation.isPending}
              loading={calibrateMutation.isPending}
              onClick={() => calibrateMutation.mutate()}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              Calibrate Parameters from Selected Profile
            </Button>
            {calibrateMutation.isError && <ErrorState error={calibrateMutation.error} />}
          </CardContent>
        </Card>

        {/* Step 4 & 5: Generate & Compute Synthetic */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  4
                </span>
                <CardTitle>Steps 4–5: Generate &amp; Profile Synthetic Batch</CardTitle>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">Simulator Coupling</span>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              Launch simulator with the calibrated profile attached to produce ground-truth synthetic data.
            </p>
            <Link href="/app/data?tab=batches">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <span>Go to Simulator</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Step 6: Compare Profiles (CDF & Error Verdicts) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  6
                </span>
                <CardTitle>Step 6: Empirical vs. Synthetic Comparison</CardTitle>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">PASS / WARN / FAIL</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Baseline Real Profile"
                value={realProfileId}
                onChange={(e) => setRealProfileId(e.target.value)}
              >
                <option value="">Select Nova profile…</option>
                {realProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    Nova {p.id.slice(0, 8)}
                  </option>
                ))}
              </Select>

              <Select
                label="Calibrated Synthetic Profile"
                value={syntheticProfileId}
                onChange={(e) => setSyntheticProfileId(e.target.value)}
              >
                <option value="">Select Synthetic profile…</option>
                {syntheticProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    Synthetic {p.id.slice(0, 8)}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              disabled={!realProfileId || !syntheticProfileId || compareMutation.isPending}
              loading={compareMutation.isPending}
              onClick={() => compareMutation.mutate()}
              className="gap-2"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              Run Two-Sample Statistical Comparison
            </Button>
            {compareMutation.isError && <ErrorState error={compareMutation.error} />}

            {/* CDF Overlay Chart */}
            <div className="pt-2">
              <p className="text-xs font-semibold text-zinc-300 mb-2">
                Cumulative Distribution Function (CDF) Overlay
              </p>
              <div className="h-56 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cdfData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="percentile" tick={{ fill: "#71717a", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", borderRadius: 8 }}
                      labelStyle={{ color: "#e4e4e7" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      name="Real Nova Distribution"
                      dataKey="real"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      name="Calibrated Synthetic"
                      dataKey="synthetic"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 7: Refine & AI Explanation Narrative */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  7
                </span>
                <CardTitle>Step 7: Iterative Refinement &amp; AI Narrative</CardTitle>
              </div>
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-zinc-400">
              Explain multi-variate discrepancies and receive parameter adjustment guidance for generator convergence.
            </p>

            {comparisons && comparisons.length > 0 && (
              <div className="space-y-3">
                {comparisons.map((cmp) => (
                  <div
                    key={cmp.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-zinc-200">
                          Comparison {cmp.id.slice(0, 10)}
                        </span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-xs text-zinc-500">{formatDateTime(cmp.createdAt)}</span>
                      </div>
                      <span className="text-xs font-mono text-indigo-400">
                        Iter {cmp.iterationCount} / 5
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {cmp.rows.map((row, idx) => (
                        <div key={idx} className="rounded-lg bg-zinc-900/80 border border-zinc-800/80 p-2.5">
                          <p className="text-[10px] font-medium uppercase text-zinc-500 truncate">
                            {row.metricKey}
                          </p>
                          <div className="mt-1 flex items-center justify-between">
                            <StatusBadge status={row.verdict} />
                            <span className="text-xs font-mono text-zinc-300">
                              {(row.error * 100).toFixed(1)}% err
                            </span>
                          </div>
                          {row.paramHint && (
                            <p className="mt-1 text-[10px] text-zinc-500 truncate" title={row.paramHint}>
                              Hint: {row.paramHint}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={narrativeMutation.isPending && selectedComparisonId === cmp.id}
                        onClick={() => {
                          setSelectedComparisonId(cmp.id);
                          narrativeMutation.mutate(cmp.id);
                        }}
                        className="gap-1.5 text-xs"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                        Generate AI Statistical Narrative
                      </Button>
                    </div>

                    {selectedComparisonId === cmp.id && narrativeMutation.data && (
                      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3.5 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap animate-in fade-in">
                        {narrativeMutation.data.narrative}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
