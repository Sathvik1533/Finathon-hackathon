import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, badge, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">{title}</h1>
          {badge}
        </div>
        {description && <p className="text-xs text-zinc-400">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
