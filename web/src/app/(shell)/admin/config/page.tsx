"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { configApi } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Settings, History, Save } from "lucide-react";

export default function ConfigPage() {
  const qc = useQueryClient();
  const { data: config, isLoading, error } = useQuery({ queryKey: ["config"], queryFn: configApi.get });
  const { data: history } = useQuery({ queryKey: ["config", "history"], queryFn: configApi.history });

  const [feeBps, setFeeBps] = useState("");
  const [gstBps, setGstBps] = useState("");
  const [lagDays, setLagDays] = useState("");

  const updateMutation = useMutation({
    mutationFn: () => configApi.update({
      feeBps: feeBps ? parseInt(feeBps) : undefined,
      gstBps: gstBps ? parseInt(gstBps) : undefined,
      timingLagDays: lagDays ? parseInt(lagDays) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config"] });
      setFeeBps("");
      setGstBps("");
      setLagDays("");
    },
  });

  if (isLoading) return <p className="p-6 text-xs text-zinc-500 animate-pulse">Loading config…</p>;
  if (error) return <div className="p-6"><ErrorState error={error} /></div>;
  if (!config) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Admin: Config" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-6">
          {/* Current */}
          <Card>
            <CardHeader><CardTitle>Current Configuration (v{config.version})</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <InfoCell label="Fee (bps)"          value={config.feeBps} />
                <InfoCell label="GST (bps)"          value={config.gstBps} />
                <InfoCell label="Timing Lag (days)"  value={config.timingLagDays} />
                <InfoCell label="Confidence Threshold" value={config.confidenceThreshold} />
              </div>
            </CardContent>
          </Card>

          {/* Update */}
          <Card className="border-indigo-500/30 bg-indigo-600/5">
            <CardHeader><CardTitle>Update Configuration</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <Input label="Fee (bps)" type="number" placeholder={String(config.feeBps)}
                  value={feeBps} onChange={(e) => setFeeBps(e.target.value)} />
                <Input label="GST (bps)" type="number" placeholder={String(config.gstBps)}
                  value={gstBps} onChange={(e) => setGstBps(e.target.value)} />
                <Input label="Lag (days)" type="number" placeholder={String(config.timingLagDays)}
                  value={lagDays} onChange={(e) => setLagDays(e.target.value)} />
              </div>
              <Button loading={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
                <Save className="h-4 w-4" aria-hidden="true" />
                Save Changes
              </Button>
              {updateMutation.isError && <ErrorState error={updateMutation.error} />}
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader><CardTitle>Version History</CardTitle></CardHeader>
            <CardContent>
              {!history || history.length === 0
                ? <EmptyState icon={History} title="No history" />
                : (
                  <div className="space-y-2">
                    {history.map((v) => (
                      <div key={v.version} className="flex items-center justify-between rounded-lg bg-zinc-800/40 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-zinc-300">v{v.version}</span>
                          <span className="text-xs text-zinc-600">·</span>
                          <span className="text-xs text-zinc-500">{formatDateTime(v.createdAt)}</span>
                        </div>
                        <span className="font-mono text-xs text-zinc-600">{Object.keys(v.diff).length} changes</span>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-zinc-800/40 px-3 py-2.5">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-zinc-200">{value}</p>
    </div>
  );
}
