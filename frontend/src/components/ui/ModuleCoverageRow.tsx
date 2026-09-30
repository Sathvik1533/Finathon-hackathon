import React from 'react';
import { StatusBadge } from './StatusBadge';

interface ModuleCoverageRowProps {
  label: string;
  status: 'IMPLEMENTED' | 'PARTIAL' | 'MISSING';
  detail?: string | number;
}

export const ModuleCoverageRow: React.FC<ModuleCoverageRowProps> = ({ label, status, detail }) => (
  <div className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
    <div className="flex items-center gap-3">
      <StatusBadge status={status} />
      <span className="text-xs font-medium text-slate-700">{label}</span>
    </div>
    {detail !== undefined && (
      <span className="text-[10px] font-mono text-slate-400">{detail}</span>
    )}
  </div>
);
