"use client";
import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface TabsNavProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  className?: string;
}

export function TabsNav<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className,
}: TabsNavProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1 border-b border-zinc-800 px-6 bg-zinc-950/40",
        className
      )}
    >
      {tabs.map(({ key, label, icon: Icon, count }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            className={cn(
              "group relative flex items-center gap-2 border-b-2 px-3.5 py-3 text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              isActive
                ? "border-indigo-500 text-indigo-300 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-400"
                )}
                aria-hidden="true"
              />
            )}
            <span>{label}</span>
            {typeof count === "number" && (
              <span
                className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  isActive
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-300"
                )}
              >
                {count.toLocaleString("en-IN")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
