import { cn } from "@/lib/utils";
import type { BatchSource } from "@/lib/api-client";

const config: Record<BatchSource, { label: string; dot: string; badge: string }> = {
  nova:      { label: "Nova",      dot: "bg-blue-400",   badge: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  simulated: { label: "Simulated", dot: "bg-violet-400", badge: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  upload:    { label: "Upload",    dot: "bg-amber-400",  badge: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
};

interface SourceBadgeProps {
  source: BatchSource;
  className?: string;
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const { label, dot, badge } = config[source];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        badge,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
