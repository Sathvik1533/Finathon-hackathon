"use client";
import { useAuth } from "@/hooks/useAuth";

interface TopBarProps {
  title?: string;
  children?: React.ReactNode;
}

export function TopBar({ title, children }: TopBarProps) {
  const { user } = useAuth();
  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-sm font-semibold text-zinc-200">{title}</h1>}
        {children}
      </div>
      <div className="flex items-center gap-2">
        {user?.merchantName && (
          <span className="text-xs text-zinc-500">{user.merchantName}</span>
        )}
      </div>
    </header>
  );
}
