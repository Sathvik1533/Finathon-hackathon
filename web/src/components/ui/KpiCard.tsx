import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  helperText?: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function KpiCard({
  label,
  value,
  icon,
  helperText,
  change,
  trend = "neutral",
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("overflow-hidden border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm transition-all hover:border-zinc-700/80", className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-400">{label}</p>
          {icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/70 text-zinc-300 ring-1 ring-zinc-700/50" aria-hidden="true">
              {icon}
            </div>
          )}
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 tabular-nums">
            {value}
          </div>
          {change && (
            <span
              className={cn(
                "text-xs font-medium",
                trend === "up" && "text-emerald-400",
                trend === "down" && "text-red-400",
                trend === "neutral" && "text-zinc-500"
              )}
            >
              {change}
            </span>
          )}
        </div>
        {helperText && <p className="mt-1 text-[11px] text-zinc-500 truncate">{helperText}</p>}
      </CardContent>
    </Card>
  );
}
