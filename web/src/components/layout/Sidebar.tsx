"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/lib/api-client";
import {
  LayoutDashboard, Database, Layers, ClipboardList,
  FileText, FlaskConical, Settings, FileCode2, Users,
  LogOut, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  group?: "admin";
}

const NAV: NavItem[] = [
  { label: "Dashboard",  href: "/app",             icon: LayoutDashboard },
  { label: "Data Hub",   href: "/app/data",         icon: Database },
  { label: "Ledger",     href: "/app/ledger",       icon: Layers },
  { label: "Review",     href: "/app/review",       icon: ClipboardList },
  { label: "Reports",    href: "/app/reports",      icon: FileText },
  { label: "Lab",        href: "/app/reports?tab=lab", icon: FlaskConical },
  { label: "Config",     href: "/admin/config",     icon: Settings,   adminOnly: true, group: "admin" },
  { label: "Policies",   href: "/admin/policies",   icon: FileCode2,  adminOnly: true, group: "admin" },
  { label: "Users",      href: "/admin/users",      icon: Users,      adminOnly: true, group: "admin" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();

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
    <aside className="flex h-screen w-56 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-800 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 flex-shrink-0">
          <Zap className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold text-zinc-100">LedgerSense</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Main navigation">
        {mainItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {adminItems.length > 0 && (
          <>
            <p className="mt-4 mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              Admin
            </p>
            {adminItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600/25 text-xs font-bold text-indigo-300"
            aria-hidden="true"
          >
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-300">{user?.email ?? "—"}</p>
            <p className="text-[10px] capitalize text-zinc-600">{user?.role ?? "—"}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    item.href === "/app"
      ? pathname === "/app"
      : pathname.startsWith(item.href.split("?")[0]);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        isActive
          ? "bg-indigo-600/20 text-indigo-300 font-medium"
          : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  );
}
