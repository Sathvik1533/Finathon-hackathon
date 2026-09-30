"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  novaApi, batchApi, runApi, labApi,
  type NovaImport, type Batch, type Run,
} from "@/lib/api-client";
import { useSSE } from "@/hooks/useSSE";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  Wifi, WifiOff, Download, Play, Database,
  Layers, Terminal, RefreshCw, Shuffle, Upload,
} from "lucide-react";
import Link from "next/link";

type Tab = "sources" | "batches" | "runs";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "sources", label: "Sources",            icon: Database },
  { key: "batches", label: "Batches & Simulator", icon: Layers },
  { key: "runs",    label: "Run Console",         icon: Terminal },
];

export default function DataHubPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as Tab) ?? "sources";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Data Hub" />

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-zinc-800 px-6 pt-1" role="tablist" aria-label="Data Hub sections">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => router.push(`/app/data?tab=${key}`)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              tab === key
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6" role="tabpanel">
        {tab === "sources" && <SourcesTab />}
        {tab === "batches" && <BatchesTab />}
        {tab === "runs"    && <RunsTab />}
      </div>
    </div>
  );
}

// ── Sources (Nova) ────────────────────────────────────────────────────────────
function SourcesTab() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [asOfOverride, setAsOfOverride] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [activeImportId, setActiveImportId] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading, error: statusError, refetch: recheckStatus } =
    useQuery({ queryKey: ["nova", "status"], queryFn: novaApi.status });

  const { data: imports, refetch: refreshImports } =
    useQuery({ queryKey: ["nova", "imports"], queryFn: novaApi.imports });

  const startMutation = useMutation({
    mutationFn: () => novaApi.startImport(asOfOverride || undefined),
    onSuccess: (data) => {
      setActiveImportId(data.importId);
      setShowDialog(false);
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
  const latest = progressEvents[progressEvents.length - 1]?.data as Record<string, unknown> | undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* Connection card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Nova API Connection</CardTitle>
            {isAdmin && (
              <Button size="sm" variant="secondary" onClick={() => recheckStatus()}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Check Connection
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {statusLoading && (
            <p className="animate-pulse text-xs text-zinc-500">Checking connection…</p>
          )}
          {statusError && <ErrorState error={statusError} title="Cannot reach Nova API" />}
          {status && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <InfoCell label="Status" value={
                <span className={`flex items-center gap-1 font-medium ${status.reachable ? "text-emerald-400" : "text-red-400"}`}>
                  {status.reachable
                    ? <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                    : <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />}
                  {status.reachable ? "Reachable" : "Unreachable"}
                </span>
              } />
              <InfoCell label="Team Slot"     value={status.teamSlot} />
              <InfoCell label="Dataset Slice" value={status.datasetSlice} />
              <InfoCell label="Key Prefix"    value={<span className="font-mono">{status.keyPrefix}…</span>} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">Nova is read-only — nothing is written to Nova.</p>
        {isAdmin ? (
          <Button onClick={() => setShowDialog(true)} disabled={!status?.reachable}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Import from Nova
          </Button>
        ) : (
          <span className="text-xs text-zinc-600" aria-label="Import restricted to admin users">
            Import requires admin role.
          </span>
        )}
      </div>

      {/* Import dialog */}
      {showDialog && (
        <Card className="border-indigo-500/30 bg-indigo-600/5">
          <CardHeader><CardTitle>Start Nova Import</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input
              label="As-of date override (optional)"
              type="date"
              value={asOfOverride}
              onChange={(e) => setAsOfOverride(e.target.value)}
              hint="Leave empty to derive automatically from the latest data in the import."
            />
            <div className="flex gap-2">
              <Button loading={startMutation.isPending} onClick={() => startMutation.mutate()}>
                Start Import
              </Button>
              <Button variant="secondary" onClick={() => setShowDialog(false)}>Cancel</Button>
            </div>
            {startMutation.isError && <ErrorState error={startMutation.error} title="Import failed to start" />}
          </CardContent>
        </Card>
      )}

      {/* Live progress */}
      {activeImportId && sseStatus !== "idle" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Import Progress</CardTitle>
              <StatusBadge status={sseStatus} />
            </div>
          </CardHeader>
          <CardContent>
            {latest && (
              <div className="mb-3 grid grid-cols-4 gap-2">
                <InfoCell label="Resource"     value={String(latest.resource ?? "—")} />
                <InfoCell label="Rows"         value={String(latest.count ?? "—")} />
                <InfoCell label="Requests"     value={String(latest.requestCount ?? "—")} />
                <InfoCell label="Rejects"      value={String(latest.rejects ?? "—")} />
              </div>
            )}
            <div
              aria-label="Import event log"
              aria-live="polite"
              className="max-h-40 overflow-y-auto rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-500"
            >
              {events.length === 0 && <p>Waiting for events…</p>}
              {events.map((ev, i) => (
                <p key={i}>{JSON.stringify(ev.data)}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import history */}
      <Card>
        <CardHeader><CardTitle>Import History</CardTitle></CardHeader>
        <CardContent>
          {!imports || imports.length === 0
            ? <EmptyState title="No imports yet" description="Start your first Nova import above." />
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" aria-label="Nova import history">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left text-zinc-500">
                      {["Started", "Status", "As-of", "Total Rows", "Rejects", "Action"].map((h) => (
                        <th key={h} scope="col" className="pb-2 pr-4 font-medium last:pr-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {imports.map((imp) => <ImportRow key={imp.id} imp={imp} />)}
                  </tbody>
                </table>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

function ImportRow({ imp }: { imp: NovaImport }) {
  const totalRows = Object.values(imp.resourceCounts).reduce((a, b) => a + b, 0);
  return (
    <tr className="border-b border-zinc-800/50 text-zinc-300">
      <td className="py-2.5 pr-4">{formatDateTime(imp.startedAt)}</td>
      <td className="py-2.5 pr-4"><StatusBadge status={imp.status} /></td>
      <td className="py-2.5 pr-4">
        {imp.asOf ?? "—"}
        {imp.asOf && <span className="ml-1 text-zinc-600">({imp.asOfDerived ? "derived" : "override"})</span>}
      </td>
      <td className="py-2.5 pr-4">{totalRows.toLocaleString("en-IN")}</td>
      <td className="py-2.5 pr-4">{imp.rejectCount}</td>
      <td className="py-2.5">
        {imp.batchId ? (
          <Link href="/app/data?tab=runs">
            <Button size="sm" variant="outline">
              <Play className="h-3 w-3" aria-hidden="true" />
              Run Reconciliation
            </Button>
          </Link>
        ) : <span className="text-zinc-600">—</span>}
      </td>
    </tr>
  );
}

// ── Batches & Simulator ───────────────────────────────────────────────────────
function BatchesTab() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [size, setSize]     = useState("1000");
  const [seed, setSeed]     = useState("42");
  const [feePct, setFeePct] = useState("2.5");
  const [gstPct, setGstPct] = useState("18");
  const [lagDays, setLagDays] = useState("3");
  const [profileId, setProfileId] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");

  const { data: batches, isLoading, error } =
    useQuery({ queryKey: ["batches"], queryFn: batchApi.list });

  const { data: profiles } =
    useQuery({ queryKey: ["lab", "profiles"], queryFn: labApi.profiles });

  const simulateMutation = useMutation({
    mutationFn: () =>
      batchApi.simulate({
        size: parseInt(size), seed: parseInt(seed),
        feePct: parseFloat(feePct), gstPct: parseFloat(gstPct),
        lagDays: parseInt(lagDays), exceptionRates: {},
        profileId: profileId || undefined,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["batches"] });
      router.push(`/app/data?tab=runs&runId=${data.runId}`);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Simulator */}
      {isAdmin && (
        <Card>
          <CardHeader><CardTitle>Simulator</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Input label="Size"     type="number" value={size}    onChange={(e) => setSize(e.target.value)} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-400" htmlFor="seed-input">Seed</label>
                <div className="flex gap-1">
                  <input id="seed-input" type="number" value={seed} onChange={(e) => setSeed(e.target.value)}
                    className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none" />
                  <button
                    onClick={() => setSeed(String(Math.floor(Math.random() * 99999)))}
                    aria-label="Randomize seed"
                    title="Randomize seed"
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  >
                    <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <Input label="Fee %"   type="number" step="0.1" value={feePct}  onChange={(e) => setFeePct(e.target.value)} />
              <Input label="GST %"   type="number" step="0.1" value={gstPct}  onChange={(e) => setGstPct(e.target.value)} />
              <Input label="Lag Days" type="number" value={lagDays} onChange={(e) => setLagDays(e.target.value)} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-400" htmlFor="profile-select">Calibration Profile</label>
                <select id="profile-select" value={profileId} onChange={(e) => setProfileId(e.target.value)}
                  className="h-9 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none">
                  <option value="">None</option>
                  {profiles?.filter((p) => p.kind === "real").map((p) => (
                    <option key={p.id} value={p.id}>
                      Nova {p.id.slice(0, 8)} ({p.createdAt.slice(0, 10)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button loading={simulateMutation.isPending} onClick={() => simulateMutation.mutate()}>
                <Play className="h-4 w-4" aria-hidden="true" />
                Simulate &amp; Run
              </Button>
              {simulateMutation.isError && <ErrorState error={simulateMutation.error} />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload */}
      {isAdmin && (
        <Card>
          <CardHeader><CardTitle>Upload Dataset</CardTitle></CardHeader>
          <CardContent>
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload a CSV or JSON file"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 py-10 transition-colors hover:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-zinc-600" aria-hidden="true" />
              <p className="text-sm text-zinc-400">Click or drag a <strong className="text-zinc-300">.csv</strong> or <strong className="text-zinc-300">.json</strong> file</p>
              <p className="text-xs text-zinc-600">Max 50 MB</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,.json" className="sr-only"
              onChange={() => setUploadMsg("Connect the backend to upload files.")} />
            {uploadMsg && <p className="mt-2 text-xs text-amber-400">{uploadMsg}</p>}
          </CardContent>
        </Card>
      )}

      {/* Batch list */}
      <Card>
        <CardHeader><CardTitle>Batches</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="animate-pulse text-xs text-zinc-500">Loading…</p>}
          {error && <ErrorState error={error} />}
          {batches && batches.length === 0 && <EmptyState icon={Database} title="No batches yet" />}
          {batches && batches.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" aria-label="Batch list">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-500">
                    {["ID", "Source", "Created", "Size", "Latest Run", "Action"].map((h) => (
                      <th key={h} scope="col" className="pb-2 pr-4 font-medium last:pr-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => <BatchRow key={b.id} batch={b} />)}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BatchRow({ batch }: { batch: Batch }) {
  return (
    <tr className="border-b border-zinc-800/50 text-zinc-300">
      <td className="py-2.5 pr-4 font-mono">{batch.id.slice(0, 10)}…</td>
      <td className="py-2.5 pr-4"><SourceBadge source={batch.source} /></td>
      <td className="py-2.5 pr-4">{formatDateTime(batch.createdAt)}</td>
      <td className="py-2.5 pr-4">{batch.size.toLocaleString("en-IN")}</td>
      <td className="py-2.5 pr-4">
        {batch.latestRunStatus ? <StatusBadge status={batch.latestRunStatus} /> : <span className="text-zinc-600">—</span>}
      </td>
      <td className="py-2.5">
        {batch.latestRunId
          ? <Link href={`/app/data?tab=runs&runId=${batch.latestRunId}`}><Button size="sm" variant="ghost"><Terminal className="h-3 w-3" />View Run</Button></Link>
          : <span className="text-zinc-600">—</span>}
      </td>
    </tr>
  );
}

// ── Run Console ───────────────────────────────────────────────────────────────
function RunsTab() {
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState(searchParams.get("runId") ?? "");

  const { data: runs } = useQuery({ queryKey: ["runs"], queryFn: runApi.list });
  const activeRun: Run | undefined = runs?.find((r) => r.id === selectedId) ?? runs?.[0];

  const isLive = !!activeRun && ["queued", "running"].includes(activeRun.status);
  const { status: sseStatus, events } = useSSE(
    isLive ? `/api/runs/${activeRun.id}/stream` : null
  );

  const counters = events.filter((e) => e.type === "counter")
    .reduce<Record<string, number>>((acc, e) => ({ ...acc, ...(e.data as Record<string, number>) }), {});

  return (
    <div className="flex flex-col gap-6">
      {runs && runs.length > 0 && (
        <div className="flex items-center gap-3">
          <label htmlFor="run-select-console" className="text-xs text-zinc-500">Run:</label>
          <select id="run-select-console" value={activeRun?.id ?? ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none">
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id.slice(0, 8)} — {r.batchSource} — {r.status} — {formatDateTime(r.createdAt)}
              </option>
            ))}
          </select>
          {activeRun && <SourceBadge source={activeRun.batchSource} />}
          {activeRun && <StatusBadge status={activeRun.status} />}
        </div>
      )}

      {!activeRun
        ? <EmptyState icon={Terminal} title="No runs" description="Simulate a batch to start a run." />
        : (
          <>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Records Processed", key: "recordsProcessed" },
                { label: "Matches Found",      key: "matchesFound" },
                { label: "Exceptions Found",   key: "exceptionsFound" },
              ].map(({ label, key }) => (
                <Card key={key}>
                  <CardContent className="px-5 py-4">
                    <p className="text-xs text-zinc-500">{label}</p>
                    <p className="mt-1 text-2xl font-bold text-zinc-100">
                      {(counters[key] ?? (activeRun as unknown as Record<string, number>)[key] ?? 0).toLocaleString("en-IN")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge status={isLive ? sseStatus : activeRun.status} />
              {(sseStatus === "done" || activeRun.status === "done") && (
                <Link href="/app" className="text-xs text-indigo-400 hover:underline">
                  Open Dashboard →
                </Link>
              )}
            </div>

            <Card>
              <CardHeader><CardTitle>Event Log</CardTitle></CardHeader>
              <CardContent>
                <div
                  aria-label="Run event log"
                  aria-live="polite"
                  className="max-h-80 overflow-y-auto rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-500"
                >
                  {events.length === 0 && (
                    <p className="text-zinc-600">
                      {activeRun.status === "done" ? "Run completed." : "Waiting for events…"}
                    </p>
                  )}
                  {events.map((ev, i) => (
                    <p key={i} className="py-px">
                      <span className="text-zinc-700">[{ev.type}]</span>{" "}
                      {JSON.stringify(ev.data)}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-800/40 px-3 py-2.5">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <div className="mt-0.5 text-sm text-zinc-200">{value}</div>
    </div>
  );
}
