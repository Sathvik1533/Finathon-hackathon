"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { configApi } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InfoCell } from "@/components/ui/InfoCell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AdminGuard } from "@/components/ui/AdminGuard";
import { History, Save, Shield } from "lucide-react";

function ConfigContent() {
  const qc = useQueryClient();
  const { data: config, isLoading, error } = useQuery({
    queryKey: ["config"],
    queryFn: configApi.get,
  });
  const { data: history } = useQuery({
    queryKey: ["config", "history"],
    queryFn: configApi.history,
  });

  const [feeBps, setFeeBps] = useState("");
  const [gstBps, setGstBps] = useState("");
  const [lagDays, setLagDays] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () =>
      configApi.update({
        feeBps: feeBps ? parseInt(feeBps) : undefined,
        gstBps: gstBps ? parseInt(gstBps) : undefined,
        timingLagDays: lagDays ? parseInt(lagDays) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config"] });
      setFeeBps("");
      setGstBps("");
      setLagDays("");
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    },
  });

  if (isLoading) {
    return <p className="p-6 text-xs text-zinc-500 animate-pulse">Loading system configuration…</p>;
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState error={error} title="Failed to load engine configuration" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Admin: Configuration" subtitle="Reconciliation Engine Rules & Thresholds" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Reconciliation Config"
          description="Adjust engine tolerances, fee parameters, and category severity weights. Changes apply to subsequent runs."
          badge={
            <span className="flex items-center gap-1 text-[11px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
              <Shield className="h-3 w-3" /> Active Version v{config.version}
            </span>
          }
        />

        {/* Current Configuration Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Active Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <InfoCell label="Default Fee (bps)" value={`${config.feeBps} bps (${(config.feeBps / 100).toFixed(2)}%)`} />
              <InfoCell label="GST Rate (bps)" value={`${config.gstBps} bps (${(config.gstBps / 100).toFixed(2)}%)`} />
              <InfoCell label="Timing Lag Threshold" value={`T+${config.timingLagDays} Days`} />
              <InfoCell label="Confidence Threshold" value={`${(config.confidenceThreshold * 100).toFixed(0)}%`} />
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="border-indigo-500/30 bg-zinc-900/40">
          <CardHeader>
            <CardTitle>Update Parameters (Creates New Version Snapshot)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Fee (basis points)"
                type="number"
                placeholder={String(config.feeBps)}
                value={feeBps}
                onChange={(e) => setFeeBps(e.target.value)}
                hint="e.g. 250 bps = 2.50%"
              />
              <Input
                label="GST (basis points)"
                type="number"
                placeholder={String(config.gstBps)}
                value={gstBps}
                onChange={(e) => setGstBps(e.target.value)}
                hint="e.g. 1800 bps = 18.0%"
              />
              <Input
                label="Timing Lag (days)"
                type="number"
                placeholder={String(config.timingLagDays)}
                value={lagDays}
                onChange={(e) => setLagDays(e.target.value)}
                hint="Max days before lag exception"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                loading={updateMutation.isPending}
                disabled={!feeBps && !gstBps && !lagDays}
                onClick={() => updateMutation.mutate()}
                className="gap-2"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Commit Configuration Update
              </Button>
              {savedSuccess && (
                <span className="text-xs text-emerald-400 font-medium animate-in fade-in">
                  Configuration v{config.version + 1} deployed successfully.
                </span>
              )}
            </div>

            {updateMutation.isError && (
              <ErrorState error={updateMutation.error} title="Configuration update failed" />
            )}
          </CardContent>
        </Card>

        {/* Version History Diff */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-zinc-400" />
              <CardTitle>Audit Version History</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {!history || history.length === 0 ? (
              <EmptyState icon={History} title="No version history" description="Modifications will generate version diff entries." />
            ) : (
              <div className="space-y-2">
                {history.map((v) => (
                  <div
                    key={v.version}
                    className="flex items-center justify-between rounded-lg bg-zinc-900/60 border border-zinc-800/80 px-4 py-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-semibold text-indigo-300">
                        v{v.version}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-xs text-zinc-400">{formatDateTime(v.createdAt)}</span>
                    </div>
                    <span className="font-mono text-xs text-zinc-500">
                      {Object.keys(v.diff || {}).length} parameter changes recorded
                    </span>
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

export default function ConfigPage() {
  return (
    <AdminGuard>
      <ConfigContent />
    </AdminGuard>
  );
}
