"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { policyApi, type Policy } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AdminGuard } from "@/components/ui/AdminGuard";
import { FileCode2, RefreshCw, CheckCircle2 } from "lucide-react";

function PoliciesContent() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const {
    data: policies,
    isLoading,
    error,
  } = useQuery({ queryKey: ["policies"], queryFn: policyApi.list });

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

  function handleEdit(p: Policy) {
    setEditingId(p.id);
    setTitle(p.title);
    setContent(p.content);
  }

  function handleCancel() {
    setEditingId(null);
    setTitle("");
    setContent("");
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Admin: Policies" subtitle="LLM Dispute Guidelines & Prompts">
        <Button
          size="sm"
          variant="secondary"
          loading={reindexMutation.isPending}
          onClick={() => reindexMutation.mutate()}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
          <span>Re-index Vector Embeddings</span>
        </Button>
      </TopBar>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Dispute Policies &amp; Prompt Guidelines"
          description="Maintain reconciliation operating policies that ground AI explanation and recommendation models."
          actions={
            reindexMutation.isSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium animate-in fade-in">
                <CheckCircle2 className="h-3.5 w-3.5" /> Vector knowledgebase updated
              </span>
            )
          }
        />

        {/* Editor Form */}
        <Card className="border-indigo-500/30 bg-zinc-900/40">
          <CardHeader>
            <CardTitle>{editingId ? "Edit Policy" : "Author New Reconciliation Policy"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input
              label="Policy Identifier / Title"
              placeholder="e.g. UPI Chargeback Grace Period Policy (v2)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              label="Policy Markdown Body (Rule constraints, thresholds, escalation rules)"
              rows={8}
              placeholder="Enter markdown operating rules used by the AI engine to evaluate case validity…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <div className="flex items-center gap-2 pt-1">
              <Button
                loading={saveMutation.isPending}
                disabled={!title.trim() || !content.trim()}
                onClick={() => saveMutation.mutate()}
              >
                {editingId ? "Save Policy Revision" : "Publish Policy"}
              </Button>
              {editingId && (
                <Button variant="ghost" onClick={handleCancel}>
                  Cancel Editing
                </Button>
              )}
            </div>

            {saveMutation.isError && (
              <ErrorState error={saveMutation.error} title="Failed to save policy" />
            )}
          </CardContent>
        </Card>

        {/* Existing Policy Library */}
        <Card>
          <CardHeader>
            <CardTitle>Active Policy Library</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="animate-pulse p-4 text-xs text-zinc-500">Loading policy documents…</p>}
            {error && <ErrorState error={error} title="Failed to load policies" />}
            {policies && policies.length === 0 && (
              <EmptyState icon={FileCode2} title="No policies published" description="Publish policies to guide AI suggestions." />
            )}
            {policies && policies.length > 0 && (
              <div className="space-y-3">
                {policies.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start justify-between rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-4 transition-colors hover:border-zinc-700"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-200">{p.title}</span>
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                          v{p.version}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Last revised: {formatDateTime(p.createdAt)}
                      </p>
                      <p className="line-clamp-2 text-xs text-zinc-400 mt-2 font-mono bg-zinc-950 p-2 rounded">
                        {p.content}
                      </p>
                    </div>

                    <Button size="sm" variant="secondary" onClick={() => handleEdit(p)}>
                      Edit
                    </Button>
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

export default function PoliciesPage() {
  return (
    <AdminGuard>
      <PoliciesContent />
    </AdminGuard>
  );
}
