import { AlertTriangle } from "lucide-react";
import { ApiError } from "@/lib/api-client";

interface ErrorStateProps {
  error: unknown;
  title?: string;
}

export function ErrorState({ error, title = "Something went wrong" }: ErrorStateProps) {
  const isApi = error instanceof ApiError;
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 py-10 text-center"
    >
      <AlertTriangle className="h-8 w-8 text-red-400" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-red-300">{title}</p>
        {isApi && (
          <>
            <p className="mt-1 text-xs text-zinc-400">{error.message}</p>
            {error.requestId && (
              <p className="mt-1 font-mono text-xs text-zinc-600">
                Request ID: {error.requestId}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
