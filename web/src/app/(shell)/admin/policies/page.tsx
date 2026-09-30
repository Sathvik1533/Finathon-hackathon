"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { policyApi } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FileCode2, Plus, RefreshCw } from "lucide-react";

export default function PoliciesPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: policies, isLoading, error } = useQuery({ queryKey: ["policies"], queryFn: policyApi.list });

  const saveMutation = useMutation({
    mutationFn: () => policyApi.save(editingId, { title, content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["policies"] });
      setEditingId(null);
      setTitle("");
      setContent("");
    },
  });

  const reindexMutation = useMutation({
    mutationFn: policyApi.reindex,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });

  function handleEdit(id: string) {
    const policy = policies?.find((p) => p.id === id);
    if (!policy) return;
    setEditingId(id);
    setTitle(policy.title);
    setContent(policy.content);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Admin: Policies">
        <Button size="sm" variant="secondary" loading={reindexMutation.isPending} onClick={() => reindexMutation.mutate()}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Re-index
        </Button>
      </TopBar>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-6">
          {/* Editor */}
          <Card className="border-indigo-500/30 bg-indigo-600/5">
            <CardHeader>
              <CardTitle>{editingId ? "Edit Policy" : "New Policy"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea label="Content (markdown)" rows={10} value={content} onChange={(e) => setContent(e.target.value)} />
              <div className="flex gap-2">
                <Button loading={saveMutation.isPending} disabled={!title.trim() || !content.trim()}
                  onClick={() => saveMutation.mutate()}>
                  {editingId ? "Update" : "Create"}
                </Button>
                {editingId && (
                  <Button variant="secondary" onClick={() => { setEditingId(null); setTitle(""); setContent(""); }}>
                    Cancel
                  </Button>
                )}
              </div>
              {saveMutation.isError && <ErrorState error={saveMutation.error} />}
            </CardContent>
          </Card>

          {/* List */}
          <Card>
            <CardHeader><CardTitle>Policies</CardTitle></CardHeader>
            <CardContent>
              {isLoading && <p className="animate-pulse text-xs text-zinc-500">Loading…</p>}
              {error && <ErrorState error={error} />}
              {policies && policies.length === 0 && <EmptyState icon={FileCode2} title="No policies" />}
              {policies && policies.length > 0 && (
                <div className="space-y-2">
                  {policies.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg bg-zinc-800/40 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{p.title}</p>
                        <p className="text-xs text-zinc-500">v{p.version} · {formatDateTime(p.createdAt)}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(p.id)}>Edit</Button>
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
