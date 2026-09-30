import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/dashboard',  icon: '▤',  label: 'Dashboard' },
  { to: '/timeline',   icon: '⋮',  label: 'Timeline' },
  { to: '/nova',       icon: '◈',  label: 'Nova Explorer' },
  { to: '/exceptions', icon: '⚠',  label: 'Exceptions' },
  { to: '/settlement', icon: '⟷',  label: 'Settlement' },
  { to: '/report',     icon: '⬡',  label: 'Recon Report' },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  return (
    <aside className="w-56 flex-none bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="text-base font-bold text-slate-900 tracking-tight">LedgerSense</div>
        <div className="text-[10px] font-mono text-slate-400 mt-0.5">FIN-11 · Reconciliation Engine</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <span className="text-sm w-4 text-center">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-slate-200 bg-slate-50">
        <div className="text-xs font-semibold text-slate-700">{user?.username ?? 'User'}</div>
        <div className="text-[10px] text-slate-400 font-mono">{user?.role}</div>
        <button
          onClick={logout}
          className="mt-2 text-[10px] text-slate-400 hover:text-rose-600 transition-colors font-medium"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
};
