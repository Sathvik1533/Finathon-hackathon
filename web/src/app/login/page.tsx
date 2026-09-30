"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { authApi, ApiError } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Zap, Lock, ShieldCheck } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

function LoginForm() {
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
      result.error.issues.forEach((i) => {
        errs[String(i.path[0])] = i.message;
      });
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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="Email"
        type="email"
        placeholder="operations@ledgersense.internal"
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
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" aria-hidden="true" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-xl shadow-indigo-950/60 ring-1 ring-indigo-400/30">
            <Zap className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">LedgerSense</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Automated Multi-Way Financial Reconciliation</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-7 shadow-2xl backdrop-blur-md ring-1 ring-zinc-800/80">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-zinc-200">Sign in to console</h2>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <ShieldCheck className="h-3 w-3" /> Encrypted
            </span>
          </div>

          <Suspense
            fallback={
              <div className="flex flex-col gap-4 py-8 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                <p className="text-xs text-zinc-500">Loading sign in form…</p>
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          <p className="mt-5 text-center text-[11px] text-zinc-500">
            Enterprise access only. Accounts are provisioned by system administrators.
          </p>
        </div>
      </div>
    </div>
  );
}
