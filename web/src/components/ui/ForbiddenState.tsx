import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ForbiddenStateProps {
  title?: string;
  description?: string;
  requestId?: string;
}

export function ForbiddenState({
  title = "403 — Access Denied",
  description = "You do not have administrative permissions to view or edit this resource. Only users with the admin role can access this configuration area.",
  requestId,
}: ForbiddenStateProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center" role="alert">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
        <ShieldAlert className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-bold text-zinc-100">{title}</h2>
      <p className="mt-2 max-w-md text-xs sm:text-sm text-zinc-400 leading-relaxed">
        {description}
      </p>
      {requestId && (
        <p className="mt-3 font-mono text-xs text-zinc-600 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1">
          Request ID: {requestId}
        </p>
      )}
      <div className="mt-6 flex items-center gap-3">
        <Link href="/app">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
