import React from "react";
import { cn } from "@/lib/utils";

interface InfoCellProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function InfoCell({ label, value, className }: InfoCellProps) {
  return (
    <div className={cn("rounded-lg bg-zinc-900/60 border border-zinc-800/60 px-3.5 py-2.5", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="mt-1 text-sm font-semibold text-zinc-200 truncate">{value}</div>
    </div>
  );
}
