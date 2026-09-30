"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { authApi, ApiError } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Zap, Lock } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const result = schema.safeParse({ email, password });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => { errs[String(i.path[0])] = i.message; });
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      await authApi.login(email, password);
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
      router.push(searchParams.get("next") ?? "/app");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          const secs = err.message.match(/\d+/)?.[0] ?? "60";
          setServerError(`Too many attempts. Please wait ${secs} seconds before trying again.`);
        } else {
          setServerError("Invalid email or password.");
        }
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" aria-hidden="true" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-900/50">
            <Zap className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">LedgerSense</h1>
            <p className="text-sm text-zinc-500">Financial Reconciliation Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-6 flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-300">Sign in to your account</h2>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
            />

            {serverError && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400"
              >
                {serverError}
              </div>
            )}

            <Button type="submit" loading={loading} className="mt-1 w-full">
              Sign In
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-zinc-600">
            No public sign-up — contact your admin for access.
          </p>
        </div>
      </div>
    </div>
  );
}
