"use client";
import { useAuth } from "@/hooks/useAuth";
import { useShell } from "./ShellContext";
import { Menu, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

export function TopBar({ title, subtitle, children, className }: TopBarProps) {
  const { user } = useAuth();
  const { toggleSidebar } = useShell();

  return (
    <header
      className={cn(
        "flex h-14 flex-shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 sm:px-6 backdrop-blur-md z-30",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-baseline gap-2 min-w-0">
          {title && (
            <h1 className="text-sm font-semibold text-zinc-100 truncate">{title}</h1>
          )}
          {subtitle && (
            <span className="hidden sm:inline-block text-xs text-zinc-500 truncate">
              · {subtitle}
            </span>
          )}
        </div>

        {children}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {user?.merchantName && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800/80 px-2.5 py-1 text-xs text-zinc-400">
            <Building2 className="h-3 w-3 text-indigo-400" aria-hidden="true" />
            <span className="font-medium text-zinc-300 truncate max-w-[160px]">
              {user.merchantName}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
