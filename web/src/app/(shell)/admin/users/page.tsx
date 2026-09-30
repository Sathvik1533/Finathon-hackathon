"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Users, Plus } from "lucide-react";

export default function UsersPage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"reviewer" | "admin">("reviewer");
  const [tempPassword, setTempPassword] = useState("");

  const { data: users, isLoading, error } = useQuery({ queryKey: ["users"], queryFn: userApi.list });

  const createMutation = useMutation({
    mutationFn: () => userApi.create({ email, role }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setTempPassword(data.tempPassword);
      setEmail("");
    },
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="Admin: Users" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-6">
          {/* Create */}
          <Card className="border-indigo-500/30 bg-indigo-600/5">
            <CardHeader><CardTitle>Create User</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as "reviewer" | "admin")}>
                  <option value="reviewer">Reviewer</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
              <Button loading={createMutation.isPending} disabled={!email.trim()} onClick={() => createMutation.mutate()}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create User
              </Button>
              {createMutation.isError && <ErrorState error={createMutation.error} />}
              {tempPassword && (
                <div role="alert" className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
                  <p className="text-sm font-medium text-green-400">User created successfully</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Temporary password: <span className="font-mono text-green-300">{tempPassword}</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">Share this password securely. It cannot be retrieved again.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* List */}
          <Card>
            <CardHeader><CardTitle>Users</CardTitle></CardHeader>
            <CardContent>
              {isLoading && <p className="animate-pulse text-xs text-zinc-500">Loading…</p>}
              {error && <ErrorState error={error} />}
              {users && users.length === 0 && <EmptyState icon={Users} title="No users" />}
              {users && users.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" aria-label="Users table">
                    <thead>
                      <tr className="border-b border-zinc-800 text-left text-zinc-500">
                        {["Email", "Role", "Created"].map((h) => (
                          <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-zinc-800/40 text-zinc-300">
                          <td className="px-4 py-2.5">{u.email}</td>
                          <td className="px-4 py-2.5 capitalize">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              u.role === "admin" ? "bg-indigo-500/15 text-indigo-400" : "bg-zinc-500/15 text-zinc-400"
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">{formatDateTime(u.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
