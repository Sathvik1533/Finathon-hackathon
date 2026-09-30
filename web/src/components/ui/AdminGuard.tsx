"use client";
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { ForbiddenState } from "@/components/ui/ForbiddenState";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-xs text-zinc-500">Checking permissions…</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <ForbiddenState />;
  }

  return <>{children}</>;
}
