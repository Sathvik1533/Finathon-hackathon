"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/lib/api-client";
import { useShell } from "./ShellContext";
import {
  LayoutDashboard,
  Database,
  Layers,
  ClipboardList,
  FileText,
  Settings,
  FileCode2,
  Users,
  LogOut,
  Zap,
  X,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  adminOnly?: boolean;
  group?: "admin";
}

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  { label: "Data Hub", href: "/app/data", icon: Database },
  { label: "Ledger", href: "/app/ledger", icon: Layers },
  { label: "Review Center", href: "/app/review", icon: ClipboardList },
  { label: "Reports & Lab", href: "/app/reports", icon: FileText },
  { label: "Config", href: "/admin/config", icon: Settings, adminOnly: true, group: "admin" },
  { label: "Policies", href: "/admin/policies", icon: FileCode2, adminOnly: true, group: "admin" },
  { label: "Users", href: "/admin/users", icon: Users, adminOnly: true, group: "admin" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useShell();

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    qc.clear();
    router.push("/login");
  }

  const mainItems = NAV.filter((i) => !i.group);
  const adminItems = NAV.filter((i) => i.group === "admin" && isAdmin);

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950 transition-transform duration-300 ease-in-out lg:static lg:w-60 lg:translate-x-0 lg:flex-shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between border-b border-zinc-800/80 px-4">
          <Link
            href="/app"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm shadow-indigo-950 flex-shrink-0">
              <Zap className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-zinc-100">LedgerSense</span>
              <span className="text-[10px] font-medium text-zinc-500">Reconciliation Engine</span>
            </div>
          </Link>

          <button
            type="button"
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Main navigation">
          <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Platform
          </p>
          {mainItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onClose={() => setSidebarOpen(false)}
            />
          ))}

          {adminItems.length > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-900">
              <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <Shield className="h-3 w-3 text-indigo-400" aria-hidden="true" />
                <span>Administration</span>
              </div>
              {adminItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onClose={() => setSidebarOpen(false)}
                />
              ))}
            </div>
          )}
        </nav>

        {/* User / Organization Profile Footer */}
        <div className="border-t border-zinc-800/80 bg-zinc-900/30 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/30"
              aria-hidden="true"
            >
              {user?.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-zinc-200">{user?.email ?? "Signing in…"}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center rounded-full bg-zinc-800 px-1.5 py-0.2 text-[10px] font-medium capitalize text-zinc-400">
                  {user?.role ?? "Reviewer"}
                </span>
                {user?.merchantName && (
                  <span className="truncate text-[10px] text-zinc-500">
                    {user.merchantName}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavLink({
  item,
  pathname,
  onClose,
}: {
  item: NavItem;
  pathname: string;
  onClose: () => void;
}) {
  const isActive =
    item.href === "/app"
      ? pathname === "/app"
      : pathname.startsWith(item.href.split("?")[0]);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClose}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        isActive
          ? "bg-indigo-600/15 text-indigo-300 font-semibold shadow-sm shadow-indigo-950/20"
          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-colors",
            isActive ? "text-indigo-400" : "text-zinc-500"
          )}
          aria-hidden="true"
        />
        <span className="truncate">{item.label}</span>
      </div>
      {isActive && (
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" aria-hidden="true" />
      )}
    </Link>
  );
}
