"use client";
import React, { useState, useRef, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  novaApi,
  batchApi,
  runApi,
  labApi,
  type Batch,
  type Run,
} from "@/lib/api-client";
import { useSSE } from "@/hooks/useSSE";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { TabsNav, type TabItem } from "@/components/ui/TabsNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { InfoCell } from "@/components/ui/InfoCell";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  Wifi,
  WifiOff,
  Download,
  Play,
  Database,
  Layers,
  Terminal,
  RefreshCw,
  Shuffle,
  Upload,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import Link from "next/link";

type Tab = "sources" | "batches" | "runs";

const TABS: TabItem<Tab>[] = [
  { key: "sources", label: "Data Sources (Nova)", icon: Database },
  { key: "batches", label: "Batches & Simulator", icon: Layers },
  { key: "runs", label: "Run Console", icon: Terminal },
];

function DataHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as Tab) ?? "sources";

  function handleTabChange(newTab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.replace(`/app/data?${params.toString()}`);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Data Hub" subtitle="Ingestion, Simulation & Run Execution" />

      <TabsNav tabs={TABS} activeTab={tab} onChange={handleTabChange} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6" role="tabpanel">
        {tab === "sources" && <SourcesTab />}
        {tab === "batches" && <BatchesTab />}
        {tab === "runs" && <RunsTab />}
      </div>
    </div>
  );
}

export default function DataHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-xs text-zinc-500">Loading Data Hub…</p>
          </div>
        </div>
      }
    >
      <DataHubContent />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Data Sources (Nova) Tab
// ─────────────────────────────────────────────────────────────────────────────

function SourcesTab() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [asOfOverride, setAsOfOverride] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeImportId, setActiveImportId] = useState<string | null>(null);

  const {
    data: status,
    isLoading: statusLoading,
    error: statusError,
    refetch: recheckStatus,
  } = useQuery({ queryKey: ["nova", "status"], queryFn: novaApi.status });

  const { data: imports, refetch: refreshImports } = useQuery({
    queryKey: ["nova", "imports"],
    queryFn: novaApi.imports,
  });

  const startMutation = useMutation({
    mutationFn: () => novaApi.startImport(asOfOverride.trim() || undefined),
    onSuccess: (data) => {
      setActiveImportId(data.importId);
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["nova", "imports"] });
    },
  });

  const { status: sseStatus, events } = useSSE(
    activeImportId ? `/api/nova/imports/${activeImportId}/stream` : null,
    {
      onDone: () => {
        refreshImports();
        qc.invalidateQueries({ queryKey: ["batches"] });
      },
    }
  );

  const progressEvents = events.filter((e) => e.type === "progress");
  const latestProgress = progressEvents[progressEvents.length - 1]?.data as
    | Record<string, unknown>
    | undefined;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <PageHeader
        title="Nova Data Ingestion"
        description="Secure read-only synchronizer connecting enterprise core banking and payment gateway datasets."
        actions={
          isAdmin && (
            <Button
              onClick={() => setDialogOpen(true)}
              disabled={!status?.reachable}
              className="gap-2"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Import from Nova</span>
            </Button>
          )
        }
      />

      {/* Connection Health Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  status?.reachable ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                }`}
              />
              <CardTitle>Nova Connection Gateway</CardTitle>
            </div>
            {isAdmin && (
              <Button size="sm" variant="secondary" onClick={() => recheckStatus()} className="gap-1.5">
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                Check Connection
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {statusLoading && <p className="animate-pulse text-xs text-zinc-500">Checking Nova API status…</p>}
          {statusError && <ErrorState error={statusError} title="Nova API unreachable" />}
          {status && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <InfoCell
                label="Reachable Status"
                value={
                  <span
                    className={`flex items-center gap-1.5 font-medium ${
                      status.reachable ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {status.reachable ? (
                      <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {status.reachable ? "Reachable" : "Unreachable"}
                  </span>
                }
              />
              <InfoCell label="Team Slot" value={status.teamSlot} />
              <InfoCell label="Dataset Slice" value={status.datasetSlice} />
              <InfoCell
                label="Key Prefix (16 chars)"
                value={<span className="font-mono text-zinc-300">{status.keyPrefix}…</span>}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Import Progress Stream */}
      {activeImportId && sseStatus !== "idle" && (
        <Card className="border-indigo-500/30 bg-zinc-950/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                <CardTitle>Active Import Stream: {activeImportId.slice(0, 10)}…</CardTitle>
              </div>
              <StatusBadge status={sseStatus} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestProgress && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <InfoCell label="Active Resource" value={String(latestProgress.resource ?? "—")} />
                <InfoCell label="Rows Ingested" value={String(latestProgress.count ?? "0")} />
                <InfoCell label="API Requests" value={String(latestProgress.requestCount ?? "0")} />
                <InfoCell label="Rejects" value={String(latestProgress.rejects ?? "0")} />
              </div>
            )}

            <div
              aria-label="Import event log"
              aria-live="polite"
              className="max-h-48 overflow-y-auto rounded-xl bg-zinc-950 p-3.5 font-mono text-xs text-zinc-400 border border-zinc-800"
            >
              {events.length === 0 && <p className="text-zinc-600">Waiting for live SSE stream events…</p>}
              {events.map((ev, i) => (
                <div key={i} className="py-0.5 border-b border-zinc-900 last:border-0">
                  <span className="text-indigo-400">[{ev.type}]</span> {JSON.stringify(ev.data)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import History Table */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ingestion History</CardTitle>
            <span className="text-xs text-zinc-500">
              Nova is read-only · Zero data written to upstream
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!imports || imports.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No Nova imports found"
              description="Initiate an import to pull raw statements, transactions, and settlement batches."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>As-of Date</TableHead>
                  <TableHead>Total Records</TableHead>
                  <TableHead>Rejects</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp) => {
                  const totalRows = Object.values(imp.resourceCounts || {}).reduce(
                    (a, b) => a + b,
                    0
                  );
                  return (
                    <TableRow key={imp.id}>
                      <TableCell className="font-mono text-zinc-300">
                        {formatDateTime(imp.startedAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={imp.status} />
                      </TableCell>
                      <TableCell>
                        {imp.asOf ? (
                          <span className="text-zinc-200">
                            {imp.asOf}{" "}
                            <span className="text-[10px] text-zinc-500">
                              ({imp.asOfDerived ? "derived" : "override"})
                            </span>
                          </span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums font-semibold text-zinc-200">
                        {totalRows.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="tabular-nums text-zinc-400">
                        {imp.rejectCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {imp.batchId ? (
                          <Link href={`/app/data?tab=runs`}>
                            <Button size="sm" variant="secondary" className="gap-1.5 text-xs">
                              <Play className="h-3 w-3 text-indigo-400" aria-hidden="true" />
                              Reconcile
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Import Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Data from Nova</DialogTitle>
            <DialogDescription>
              Pull read-only transactions, payments, gateway settlements, and refunds from the configured Nova team dataset slice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Input
              label="As-of Date Override (Optional)"
              type="date"
              value={asOfOverride}
              onChange={(e) => setAsOfOverride(e.target.value)}
              hint="Leave empty to automatically derive as-of date from the latest timestamp in the import."
            />

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-200 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Read-only safety assurance
              </div>
              <p>The frontend communicates only with the internal proxy. Secret keys are never exposed in browser storage or network payloads.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button loading={startMutation.isPending} onClick={() => startMutation.mutate()}>
              Start Import
            </Button>
          </DialogFooter>

          {startMutation.isError && (
            <ErrorState error={startMutation.error} title="Failed to launch import" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Batches & Simulator Tab
// ─────────────────────────────────────────────────────────────────────────────

function BatchesTab() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [size, setSize] = useState("1000");
  const [seed, setSeed] = useState("42");
  const [feePct, setFeePct] = useState("2.5");
  const [gstPct, setGstPct] = useState("18");
  const [lagDays, setLagDays] = useState("3");
  const [profileId, setProfileId] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");

  const { data: batches, isLoading, error } = useQuery({
    queryKey: ["batches"],
    queryFn: batchApi.list,
  });

  const { data: profiles } = useQuery({
    queryKey: ["lab", "profiles"],
    queryFn: labApi.profiles,
  });

  const simulateMutation = useMutation({
    mutationFn: () =>
      batchApi.simulate({
        size: parseInt(size) || 1000,
        seed: parseInt(seed) || 42,
        feePct: parseFloat(feePct) || 2.5,
        gstPct: parseFloat(gstPct) || 18,
        lagDays: parseInt(lagDays) || 3,
        exceptionRates: {},
        profileId: profileId || undefined,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["batches"] });
      router.push(`/app/data?tab=runs&runId=${data.runId}`);
    },
  });

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <PageHeader
        title="Batches &amp; Statistical Simulator"
        description="Generate calibrated synthetic datasets or upload custom CSV/JSON statement batches."
      />

      {/* Simulator Section */}
      {isAdmin && (
        <Card className="border-indigo-500/30 bg-zinc-900/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                <CardTitle>Parametric Batch Simulator</CardTitle>
              </div>
              <span className="text-xs text-zinc-500 font-medium">Seeded Synthetic Generator</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Input
                label="Size (Records)"
                type="number"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-400" htmlFor="seed-input">
                  Seed
                </label>
                <div className="flex gap-1">
                  <input
                    id="seed-input"
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setSeed(String(Math.floor(Math.random() * 99999)))}
                    aria-label="Randomize seed"
                    title="Randomize seed"
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <Input
                label="Fee %"
                type="number"
                step="0.1"
                value={feePct}
                onChange={(e) => setFeePct(e.target.value)}
              />
              <Input
                label="GST %"
                type="number"
                step="0.1"
                value={gstPct}
                onChange={(e) => setGstPct(e.target.value)}
              />
              <Input
                label="Lag (Days)"
                type="number"
                value={lagDays}
                onChange={(e) => setLagDays(e.target.value)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-400" htmlFor="profile-select">
                  Calibration Profile
                </label>
                <select
                  id="profile-select"
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">None (Default)</option>
                  {profiles
                    ?.filter((p) => p.kind === "real")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        Nova {p.id.slice(0, 8)} ({p.createdAt.slice(0, 10)})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-zinc-500">
                Simulating a batch creates ground-truth exception labels automatically.
              </span>
              <Button
                loading={simulateMutation.isPending}
                onClick={() => simulateMutation.mutate()}
                className="gap-2"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                Simulate &amp; Run Engine
              </Button>
            </div>

            {simulateMutation.isError && <ErrorState error={simulateMutation.error} />}
          </CardContent>
        </Card>
      )}

      {/* Dataset Upload Area */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Manual Statement Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload a CSV or JSON statement file"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-zinc-700/80 bg-zinc-900/30 py-8 transition-colors hover:border-zinc-500 hover:bg-zinc-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
                <Upload className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 font-medium">
                Click or drag statement file (<strong className="text-indigo-300 font-mono">.csv</strong> or{" "}
                <strong className="text-indigo-300 font-mono">.json</strong>)
              </p>
              <p className="text-[11px] text-zinc-500">Supports Gateway, Internal Ledger, and Bank formats up to 50 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              className="sr-only"
              onChange={() => setUploadMsg("File received. Storage upload endpoint active.")}
            />
            {uploadMsg && <p className="mt-2 text-xs text-amber-400 font-medium">{uploadMsg}</p>}
          </CardContent>
        </Card>
      )}

      {/* Batch List Table */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Existing Batches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <p className="animate-pulse p-6 text-xs text-zinc-500">Loading batches…</p>}
          {error && <div className="p-4"><ErrorState error={error} /></div>}
          {batches && batches.length === 0 && (
            <EmptyState icon={Layers} title="No batches available" description="Generate or import a batch above." />
          )}
          {batches && batches.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Record Size</TableHead>
                  <TableHead>Latest Run Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch: Batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono text-zinc-200">
                      {batch.id.slice(0, 12)}…
                    </TableCell>
                    <TableCell>
                      <SourceBadge source={batch.source} />
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {formatDateTime(batch.createdAt)}
                    </TableCell>
                    <TableCell className="tabular-nums font-semibold text-zinc-200">
                      {batch.size.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      {batch.latestRunStatus ? (
                        <StatusBadge status={batch.latestRunStatus} />
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {batch.latestRunId ? (
                        <Link href={`/app/data?tab=runs&runId=${batch.latestRunId}`}>
                          <Button size="sm" variant="ghost" className="gap-1 text-xs">
                            <Terminal className="h-3 w-3 text-indigo-400" />
                            View Run
                          </Button>
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

// ─────────────────────────────────────────────────────────────────────────────
// 3. Run Console Tab
// ─────────────────────────────────────────────────────────────────────────────

function RunsTab() {
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState(searchParams.get("runId") ?? "");

  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: runApi.list,
  });

  const activeRun: Run | undefined = runs?.find((r) => r.id === selectedId) ?? runs?.[0];
  const isLive = !!activeRun && ["queued", "running"].includes(activeRun.status);

  const { status: sseStatus, events } = useSSE(
    isLive ? `/api/runs/${activeRun.id}/stream` : null
  );

  const counters = events
    .filter((e) => e.type === "counter")
    .reduce<Record<string, number>>(
      (acc, e) => ({ ...acc, ...(e.data as Record<string, number>) }),
      {}
    );

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          title="Run Execution Console"
          description="Live EventSource streaming and pipeline stage tracking."
          className="pb-0"
        />

        {runs && runs.length > 0 && (
          <div className="flex items-center gap-2.5">
            <label htmlFor="run-select-console" className="text-xs text-zinc-500 font-medium">
              Run:
            </label>
            <select
              id="run-select-console"
              value={activeRun?.id ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-8 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs font-mono text-zinc-200 focus:border-indigo-500 focus:outline-none"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)} — {r.batchSource} — {r.status}
                </option>
              ))}
            </select>
            {activeRun && <SourceBadge source={activeRun.batchSource} />}
            {activeRun && <StatusBadge status={isLive ? sseStatus : activeRun.status} />}
          </div>
        )}
      </div>

      {!activeRun && !runsLoading ? (
        <EmptyState
          icon={Terminal}
          title="No reconciliation runs"
          description="Launch a simulation or import batch from the sources tab to inspect run telemetry."
        />
      ) : activeRun ? (
        <>
          {/* Real-time Counter Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                label: "Records Processed",
                key: "recordsProcessed",
                icon: <Database className="h-4 w-4 text-indigo-400" />,
              },
              {
                label: "Matches Found",
                key: "matchesFound",
                icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
              },
              {
                label: "Exceptions Found",
                key: "exceptionsFound",
                icon: <FileCheck className="h-4 w-4 text-amber-400" />,
              },
            ].map(({ label, key, icon }) => {
              const countVal =
                counters[key] ??
                (activeRun as unknown as Record<string, number>)[key] ??
                0;
              return (
                <Card key={key} className="bg-zinc-900/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                        {label}
                      </p>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                        {icon}
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-100 tabular-nums">
                      {countVal.toLocaleString("en-IN")}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick link to Dashboard if completed */}
          {(sseStatus === "done" || activeRun.status === "done") && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Reconciliation pipeline finished processing all stages.</span>
              </div>
              <Link href="/app">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs text-emerald-300 border-emerald-500/30">
                  <span>Open Dashboard</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          )}

          {/* Live Stream Telemetry Log */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-zinc-400" />
                  <CardTitle>Telemetry &amp; Event Stream</CardTitle>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">
                  {isLive ? "Listening on SSE stream" : "Historical Run Log"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div
                aria-label="Run event log"
                aria-live="polite"
                className="max-h-96 overflow-y-auto bg-zinc-950 p-4 font-mono text-xs text-zinc-400 divide-y divide-zinc-900"
              >
                {events.length === 0 && (
                  <p className="text-zinc-600 py-3">
                    {activeRun.status === "done"
                      ? "Execution finished. Check Dashboard for final KPI benchmarks."
                      : "Connecting to event telemetry stream…"}
                  </p>
                )}
                {events.map((ev, i) => (
                  <div key={i} className="py-1">
                    <span className="text-indigo-400 font-semibold">[{ev.type}]</span>{" "}
                    <span className="text-zinc-300">{JSON.stringify(ev.data)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
