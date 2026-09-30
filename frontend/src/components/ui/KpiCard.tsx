import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  delta?: string;
  color?: 'emerald' | 'rose' | 'amber' | 'blue' | 'slate';
  mono?: boolean;
}

const colorMap: Record<string, string> = {
  emerald: 'text-emerald-600',
  rose: 'text-rose-600',
  amber: 'text-amber-600',
  blue: 'text-blue-600',
  slate: 'text-slate-700',
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title, value, delta, color = 'slate', mono = true,
}) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</div>
    <div className={`text-2xl font-bold mt-1 ${colorMap[color] ?? 'text-slate-900'} ${mono ? 'font-mono tabular-nums' : ''}`}>
      {value}
    </div>
    {delta && (
      <div className={`text-xs mt-1 font-medium ${delta.startsWith('+') ? 'text-emerald-600' : delta.startsWith('-') ? 'text-rose-600' : 'text-slate-500'}`}>
        {delta}
      </div>
    )}
  </div>
);
