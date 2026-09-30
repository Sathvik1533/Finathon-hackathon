"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi, type AppUser } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { AdminGuard } from "@/components/ui/AdminGuard";
import { Users, UserPlus, KeyRound, Copy, Check } from "lucide-react";

function UsersContent() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"reviewer" | "admin">("reviewer");
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: userApi.list,
  });

  const createMutation = useMutation({
    mutationFn: () => userApi.create({ email: email.trim(), role }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setTempPassword(data.tempPassword);
      setEmail("");
    },
  });

  function copyPassword() {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Admin: Users" subtitle="Access Management & Role Provisioning" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Team Access Management"
          description="Provision Reviewer and Administrator credentials for financial operations staff."
        />

        {/* Create User Form */}
        <Card className="border-indigo-500/30 bg-zinc-900/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-indigo-400" />
              <CardTitle>Provision New Operator</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Email Address"
                type="email"
                placeholder="analyst@fintech.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Select
                label="Role Permission Level"
                value={role}
                onChange={(e) => setRole(e.target.value as "reviewer" | "admin")}
              >
                <option value="reviewer">Reviewer (Queue investigation &amp; adjustment approvals)</option>
                <option value="admin">Administrator (Simulator, Nova import, rules &amp; users)</option>
              </Select>
            </div>

            <div className="pt-1">
              <Button
                loading={createMutation.isPending}
                disabled={!email.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Generate Credentials
              </Button>
            </div>

            {createMutation.isError && (
              <ErrorState error={createMutation.error} title="Failed to create user" />
            )}

            {/* Temporary password notification banner */}
            {tempPassword && (
              <div
                role="alert"
                className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2 animate-in fade-in"
              >
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs sm:text-sm">
                  <KeyRound className="h-4 w-4" />
                  <span>Account Provisioned Successfully</span>
                </div>
                <p className="text-xs text-zinc-300">
                  Temporary Single-Use Password:{" "}
                  <code className="font-mono font-bold text-emerald-300 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 ml-1">
                    {tempPassword}
                  </code>
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="secondary" onClick={copyPassword} className="gap-1 text-xs">
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied to clipboard" : "Copy Password"}
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  This temporary password cannot be retrieved once refreshed. Share it securely with the operator.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing Users Table */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Existing Team Members</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && <p className="animate-pulse p-6 text-xs text-zinc-500">Loading user directory…</p>}
            {error && <div className="p-4"><ErrorState error={error} title="Failed to load user directory" /></div>}
            {users && users.length === 0 && (
              <EmptyState icon={Users} title="No users registered" description="Create the first user above." />
            )}
            {users && users.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u: AppUser) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-zinc-200">{u.email}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            u.role === "admin"
                              ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/30"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700/60"
                          }`}
                        >
                          {u.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-zinc-400 font-mono">
                        {formatDateTime(u.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <AdminGuard>
      <UsersContent />
    </AdminGuard>
  );
}
