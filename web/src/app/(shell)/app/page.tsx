"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { runApi, metricsApi } from "@/lib/api-client";
import { formatPaise, formatDateTime } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import {
  CheckCircle2, AlertTriangle, TrendingUp, IndianRupee,
  RefreshCw, ChevronDown,
} from "lucide-react";
import Link from "next/link";

const CHART_STYLE = {
  tooltip: { background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 },
  label:   { color: "#e4e4e7" },
  item:    { color: "#a1a1aa" },
  grid:    "#27272a",
  stroke:  "#6366f1",
};

export default function DashboardPage() {
  const { data: runs } = useQuery({ queryKey: ["runs"], queryFn: runApi.list });
  const [selectedRunId, setSelectedRunId] = useState<string>("");

  const activeRunId = selectedRunId || runs?.[0]?.id || null;
  const selectedRun = runs?.find((r) => r.id === activeRunId) ?? runs?.[0];

  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ["metrics", activeRunId],
    queryFn: () => metricsApi.get(activeRunId!),
    enabled: !!activeRunId,
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Dashboard">
        {runs && runs.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="run-sel" className="text-xs text-zinc-500">Run:</label>
            <div className="relative">
              <select
                id="run-sel"
                value={activeRunId ?? ""}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className="h-7 appearance-none rounded-lg border border-zinc-700 bg-zinc-800 py-0 pl-2.5 pr-7 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {formatDateTime(r.createdAt)} — {r.batchSource}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
            </div>
            {selectedRun && <SourceBadge source={selectedRun.batchSource} />}
          </div>
        )}
      </TopBar>

      <div className="flex-1 overflow-y-auto p-6">
        {!activeRunId && (
          <EmptyState
            icon={TrendingUp}
            title="No runs yet"
            description="Import data or simulate a batch to get started."
            action={<Link href="/app/data"><Button size="sm">Go to Data Hub</Button></Link>}
          />
        )}

        {activeRunId && error && <ErrorState error={error} />}

        {activeRunId && isLoading && <DashboardSkeleton />}

        {metrics && (
          <div className="flex flex-col gap-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                label="Match Rate"   value={`${(metrics.matchRate * 100).toFixed(1)}%`} />
              <KpiCard icon={<IndianRupee className="h-4 w-4 text-indigo-400" />}
                label="Settled"      value={formatPaise(metrics.settledAmountPaise)} />
              <KpiCard icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
                label="Exceptions"   value={metrics.exceptionCount.toLocaleString("en-IN")} />
              <KpiCard icon={<TrendingUp className="h-4 w-4 text-red-400" />}
                label="Amount at Risk" value={formatPaise(metrics.amountAtRiskPaise)} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Exceptions by Category</CardTitle></CardHeader>
                <CardContent>
                  {metrics.exceptionsByCategory.length === 0
                    ? <p className="py-8 text-center text-xs text-zinc-500">No exceptions</p>
                    : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={metrics.exceptionsByCategory} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} />
                          <XAxis type="number" tick={{ fill: "#71717a", fontSize: 11 }} />
                          <YAxis type="category" dataKey="category" width={130} tick={{ fill: "#71717a", fontSize: 11 }} />
                          <Tooltip contentStyle={CHART_STYLE.tooltip} labelStyle={CHART_STYLE.label} itemStyle={CHART_STYLE.item} />
                          <Bar dataKey="count" fill={CHART_STYLE.stroke} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Settlement Lag (days)</CardTitle></CardHeader>
                <CardContent>
                  {metrics.settlementLagDays.length === 0
                    ? <p className="py-8 text-center text-xs text-zinc-500">No data</p>
                    : (
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={metrics.settlementLagDays}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} />
                          <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 11 }} />
                          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                          <Tooltip contentStyle={CHART_STYLE.tooltip} labelStyle={CHART_STYLE.label} itemStyle={CHART_STYLE.item} />
                          <Line type="monotone" dataKey="count" stroke={CHART_STYLE.stroke} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                </CardContent>
              </Card>
            </div>

            {/* Benchmark */}
            <Card>
              <CardHeader><CardTitle>Benchmark</CardTitle></CardHeader>
              <CardContent>
                {metrics.benchmark === null ? (
                  <div className="flex items-start gap-2.5 rounded-lg bg-zinc-800/50 px-4 py-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" aria-hidden="true" />
                    <p className="text-xs text-zinc-400">
                      Benchmark is not available for Nova and upload batches.
                      Only simulated batches include ground-truth labels.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Match Rate",      value: `${(metrics.benchmark.matchRate * 100).toFixed(1)}%` },
                      { label: "Precision",        value: `${(metrics.benchmark.precision * 100).toFixed(1)}%` },
                      { label: "Recall",           value: `${(metrics.benchmark.recall * 100).toFixed(1)}%` },
                      { label: "False Approvals",  value: String(metrics.benchmark.falseApprovals), danger: metrics.benchmark.falseApprovals > 0 },
                    ].map(({ label, value, danger }) => (
                      <div key={label} className="rounded-lg bg-zinc-800/40 px-3 py-3">
                        <p className="text-xs text-zinc-500">{label}</p>
                        <p className={`mt-1 text-lg font-bold ${danger ? "text-red-400" : "text-zinc-100"}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Refresh shortcut */}
            <div className="flex justify-end">
              <Link href="/app/data?tab=batches">
                <Button variant="secondary" size="sm">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  New Run (Refresh)
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">{label}</p>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800" aria-hidden="true">{icon}</span>
        </div>
        <p className="mt-2 text-xl font-bold text-zinc-100">{value}</p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-zinc-800" />)}</div>
      <div className="grid grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <div key={i} className="h-64 rounded-xl bg-zinc-800" />)}</div>
      <div className="h-32 rounded-xl bg-zinc-800" />
    </div>
  );
}
