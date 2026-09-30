import { cn } from "@/lib/utils";
import {
  CheckCircle2, XCircle, Clock, AlertTriangle,
  Loader2, ArrowUpRight, Minus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  classes: string;
  spin?: boolean;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  matched:     { label: "Matched",     icon: CheckCircle2,  classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  approved:    { label: "Approved",    icon: CheckCircle2,  classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  done:        { label: "Done",        icon: CheckCircle2,  classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  pass:        { label: "PASS",        icon: CheckCircle2,  classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  open:        { label: "Open",        icon: Clock,         classes: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  pending:     { label: "Pending",     icon: Clock,         classes: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  queued:      { label: "Queued",      icon: Clock,         classes: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  running:     { label: "Running",     icon: Loader2,       classes: "bg-blue-500/15 text-blue-400 border-blue-500/30", spin: true },
  connecting:  { label: "Connecting",  icon: Loader2,       classes: "bg-blue-500/15 text-blue-400 border-blue-500/30", spin: true },
  streaming:   { label: "Streaming",   icon: Loader2,       classes: "bg-blue-500/15 text-blue-400 border-blue-500/30", spin: true },
  reconnecting:{ label: "Reconnecting",icon: Loader2,       classes: "bg-amber-500/15 text-amber-400 border-amber-500/30", spin: true },
  warn:        { label: "WARN",        icon: AlertTriangle, classes: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  discrepancy: { label: "Discrepancy", icon: AlertTriangle, classes: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  escalated:   { label: "Escalated",   icon: ArrowUpRight,  classes: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  rejected:    { label: "Rejected",    icon: XCircle,       classes: "bg-red-500/15 text-red-400 border-red-500/30" },
  failed:      { label: "Failed",      icon: XCircle,       classes: "bg-red-500/15 text-red-400 border-red-500/30" },
  fail:        { label: "FAIL",        icon: XCircle,       classes: "bg-red-500/15 text-red-400 border-red-500/30" },
  idle:        { label: "Idle",        icon: Minus,         classes: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status.toLowerCase();
  const cfg: StatusConfig = STATUS_MAP[key] ?? {
    label: status,
    icon: Clock,
    classes: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };
  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        cfg.classes,
        className
      )}
    >
      <Icon
        className={cn("h-3 w-3 flex-shrink-0", cfg.spin && "animate-spin")}
        aria-hidden="true"
      />
      {cfg.label}
    </span>
  );
}
