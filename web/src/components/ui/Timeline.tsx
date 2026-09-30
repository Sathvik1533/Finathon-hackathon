"use client";
import React from "react";
import { formatPaise, formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ArrowDown, Database, CreditCard, Building2, RotateCcw } from "lucide-react";
import type { CaseTimeline } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface TimelineProps {
  events: CaseTimeline[];
  className?: string;
}

const SOURCE_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string; border: string; bg: string }
> = {
  internal: {
    label: "Internal Ledger",
    icon: Database,
    color: "text-indigo-400",
    border: "border-indigo-500/40",
    bg: "bg-indigo-500/10",
  },
  gateway: {
    label: "Payment Gateway",
    icon: CreditCard,
    color: "text-sky-400",
    border: "border-sky-500/40",
    bg: "bg-sky-500/10",
  },
  bank: {
    label: "Bank Statement",
    icon: Building2,
    color: "text-emerald-400",
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
  },
  refund: {
    label: "Refund / Reversal",
    icon: RotateCcw,
    color: "text-amber-400",
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
  },
};

export function Timeline({ events, className }: TimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-zinc-500">
        No linked events found for this case.
      </div>
    );
  }

  return (
    <div className={cn("relative space-y-3 py-2", className)}>
      {events.map((ev, idx) => {
        const meta = SOURCE_META[ev.source] ?? SOURCE_META.internal;
        const Icon = meta.icon;
        const isLast = idx === events.length - 1;

        return (
          <div key={ev.id ?? idx} className="relative flex items-start gap-3.5 group">
            {/* Visual connector column */}
            <div className="relative flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl border transition-all",
                  meta.bg,
                  meta.border,
                  meta.color
                )}
                aria-hidden="true"
              >
                <Icon className="h-4 w-4" />
              </div>
              {!isLast && (
                <div className="my-1.5 flex flex-col items-center justify-center">
                  <div className="h-8 w-0.5 bg-zinc-800" />
                  <ArrowDown className="h-3 w-3 text-zinc-600 -my-1" aria-hidden="true" />
                </div>
              )}
            </div>

            {/* Event detail card */}
            <div className="flex-1 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 transition-all hover:border-zinc-700/80 hover:bg-zinc-900/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-semibold uppercase tracking-wider", meta.color)}>
                    {meta.label}
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-xs font-medium text-zinc-300">{ev.type}</span>
                  <StatusBadge status={ev.status} />
                </div>
                <span className="text-xs text-zinc-500">{formatDateTime(ev.date)}</span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Amount</p>
                  <p className="text-sm font-semibold tabular-nums text-zinc-100">
                    {formatPaise(ev.amountPaise)}
                  </p>
                </div>

                {ev.novaId && (
                  <div className="text-right">
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Nova Record</p>
                    <p className="font-mono text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5">
                      {ev.novaId}
                    </p>
                  </div>
                )}
              </div>

              {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
                  {Object.entries(ev.metadata).map(([k, v]) => (
                    <span key={k}>
                      <span className="text-zinc-500">{k}:</span> {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
