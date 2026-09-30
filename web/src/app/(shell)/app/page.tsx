"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { runApi, metricsApi } from "@/lib/api-client";
import { formatPaise, formatDateTime } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  IndianRupee,
  RefreshCw,
  ChevronDown,
  ShieldCheck,
  Activity,
  Layers,
} from "lucide-react";
import Link from "next/link";

const CHART_STYLE = {
  tooltip: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: "10px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
  },
  label: { color: "#e4e4e7", fontSize: 12 },
  item: { color: "#a1a1aa", fontSize: 12 },
  grid: "#27272a",
  indigo: "#6366f1",
  emerald: "#10b981",
};

export default function DashboardPage() {
  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: runApi.list,
  });

  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const activeRunId = selectedRunId || runs?.[0]?.id || null;
  const selectedRun = runs?.find((r) => r.id === activeRunId) ?? runs?.[0];

  const {
    data: metrics,
    isLoading: metricsLoading,
    error,
  } = useQuery({
    queryKey: ["metrics", activeRunId],
    queryFn: () => metricsApi.get(activeRunId!),
    enabled: !!activeRunId,
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Dashboard" subtitle="Reconciliation Health & Metrics">
        {runs && runs.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-xs text-zinc-500 font-medium">
              Run:
            </span>
            <div className="relative">
              <select
                id="run-sel"
                value={activeRunId ?? ""}
                onChange={(e) => setSelectedRunId(e.target.value)}
                aria-label="Select reconciliation run"
                className="h-8 appearance-none rounded-lg border border-zinc-700/80 bg-zinc-900 py-0 pl-3 pr-8 text-xs font-medium text-zinc-200 focus:border-indigo-500 focus:outline-none transition-colors"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {formatDateTime(r.createdAt)} — {r.batchSource}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
            </div>
            {selectedRun && <SourceBadge source={selectedRun.batchSource} />}
          </div>
        )}
      </TopBar>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Header with Run Trigger */}
        <PageHeader
          title="Reconciliation Overview"
          description="Real-time multi-source matching performance, exception volume, and settlement velocity."
          actions={
            <Link href="/app/data?tab=batches">
              <Button size="sm" variant="secondary" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
                <span>Simulate New Run</span>
              </Button>
            </Link>
          }
        />

        {!activeRunId && !runsLoading && (
          <EmptyState
            icon={TrendingUp}
            title="No Reconciliation Runs Found"
            description="Import transaction data from Nova or trigger a simulated batch from the Data Hub."
            action={
              <Link href="/app/data">
                <Button size="sm">Go to Data Hub</Button>
              </Link>
            }
          />
        )}

        {activeRunId && error && (
          <ErrorState error={error} title="Failed to load run metrics" />
        )}

        {activeRunId && metricsLoading && <DashboardSkeleton />}

        {metrics && (
          <div className="flex flex-col gap-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard
                label="Match Rate"
                value={`${(metrics.matchRate * 100).toFixed(1)}%`}
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                helperText="Matched across all 4 internal & external sources"
                change={metrics.matchRate >= 0.95 ? "Optimal" : "Review"}
                trend={metrics.matchRate >= 0.95 ? "up" : "down"}
              />

              <KpiCard
                label="Settled Value"
                value={formatPaise(metrics.settledAmountPaise)}
                icon={<IndianRupee className="h-4 w-4 text-indigo-400" />}
                helperText="Verified bank-cleared credits"
              />

              <KpiCard
                label="Unresolved Exceptions"
                value={metrics.exceptionCount.toLocaleString("en-IN")}
                icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
                helperText="Discrepancies pending analyst investigation"
                change={metrics.exceptionCount === 0 ? "Zero" : "Action Needed"}
                trend={metrics.exceptionCount === 0 ? "up" : "down"}
              />

              <KpiCard
                label="Amount at Risk"
                value={formatPaise(metrics.amountAtRiskPaise)}
                icon={<ShieldCheck className="h-4 w-4 text-red-400" />}
                helperText="Total financial variance requiring settlement"
                trend="down"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Exceptions by Category</CardTitle>
                    <span className="text-xs text-zinc-500 font-medium">Distribution</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {metrics.exceptionsByCategory.length === 0 ? (
                    <div className="flex h-56 flex-col items-center justify-center text-xs text-zinc-500">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500/50 mb-2" />
                      <span>Zero exceptions in this reconciliation run</span>
                    </div>
                  ) : (
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={metrics.exceptionsByCategory}
                          layout="vertical"
                          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} horizontal vertical={false} />
                          <XAxis type="number" tick={{ fill: "#71717a", fontSize: 11 }} />
                          <YAxis
                            type="category"
                            dataKey="category"
                            width={130}
                            tick={{ fill: "#a1a1aa", fontSize: 11 }}
                            tickFormatter={(val: string) => val.replace(/_/g, " ")}
                          />
                          <Tooltip
                            contentStyle={CHART_STYLE.tooltip}
                            labelStyle={CHART_STYLE.label}
                            itemStyle={CHART_STYLE.item}
                            formatter={(value: unknown) => [Number(value).toLocaleString("en-IN"), "Exceptions"]}
                          />
                          <Bar dataKey="count" fill={CHART_STYLE.indigo} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Settlement Lag Distribution</CardTitle>
                    <span className="text-xs text-zinc-500 font-medium">Days from Transaction</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {metrics.settlementLagDays.length === 0 ? (
                    <div className="flex h-56 flex-col items-center justify-center text-xs text-zinc-500">
                      <Activity className="h-6 w-6 text-zinc-600 mb-2" />
                      <span>No timing lag records available for this run</span>
                    </div>
                  ) : (
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics.settlementLagDays} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} />
                          <XAxis
                            dataKey="day"
                            tick={{ fill: "#71717a", fontSize: 11 }}
                            tickFormatter={(d: number) => `T+${d}`}
                          />
                          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                          <Tooltip
                            contentStyle={CHART_STYLE.tooltip}
                            labelStyle={CHART_STYLE.label}
                            itemStyle={CHART_STYLE.item}
                            formatter={(value: unknown) => [Number(value).toLocaleString("en-IN"), "Settlements"]}
                            labelFormatter={(label) => `Settled at T+${label} days`}
                          />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke={CHART_STYLE.indigo}
                            strokeWidth={2.5}
                            dot={{ fill: CHART_STYLE.indigo, r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Benchmark vs Ground Truth Panel */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-400" />
                    <CardTitle>Ground Truth Benchmark &amp; Validation</CardTitle>
                  </div>
                  {metrics.benchmark && (
                    <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      Seeded Ground Truth Validated
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {metrics.benchmark === null ? (
                  <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" aria-hidden="true" />
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-zinc-300">
                        Ground truth benchmark is unavailable for Nova and user-uploaded batches
                      </p>
                      <p className="text-zinc-500">
                        Real-world data sources do not contain pre-labelled exception truth. Use the Synthetic Lab to evaluate generator calibration against Nova profiles.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <BenchmarkStat
                      label="Match Precision"
                      value={`${(metrics.benchmark.precision * 100).toFixed(1)}%`}
                      subtext="Zero false positive rate"
                    />
                    <BenchmarkStat
                      label="Recall Rate"
                      value={`${(metrics.benchmark.recall * 100).toFixed(1)}%`}
                      subtext="Captured seeded anomalies"
                    />
                    <BenchmarkStat
                      label="Category Accuracy"
                      value={`${(metrics.benchmark.categoryAccuracy * 100).toFixed(1)}%`}
                      subtext="Classification fidelity"
                    />
                    <BenchmarkStat
                      label="False Approvals"
                      value={String(metrics.benchmark.falseApprovals)}
                      danger={metrics.benchmark.falseApprovals > 0}
                      subtext={metrics.benchmark.falseApprovals === 0 ? "Target reached" : "Critical error"}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function BenchmarkStat({
  label,
  value,
  subtext,
  danger,
}: {
  label: string;
  value: string;
  subtext?: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${danger ? "text-red-400" : "text-zinc-100"}`}>
        {value}
      </p>
      {subtext && <p className="mt-1 text-[11px] text-zinc-500">{subtext}</p>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-zinc-900/70 border border-zinc-800/60" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-72 rounded-xl bg-zinc-900/70 border border-zinc-800/60" />
        ))}
      </div>
      <div className="h-36 rounded-xl bg-zinc-900/70 border border-zinc-800/60" />
    </div>
  );
}
