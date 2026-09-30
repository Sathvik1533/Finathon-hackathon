import React from 'react';

interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const PageShell: React.FC<PageShellProps> = ({ title, subtitle, actions, children }) => (
  <div className="flex-1 min-h-screen bg-slate-50/50">
    {/* Page header */}
    <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    {/* Page content */}
    <div className="px-8 py-6">{children}</div>
  </div>
);
