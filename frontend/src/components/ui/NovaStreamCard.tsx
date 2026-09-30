import React from 'react';

interface NovaStreamCardProps {
  title: string;
  subtitle?: string;
  count: number;
  icon?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'purple';
}

const colorMap = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    count: 'text-blue-900' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', count: 'text-emerald-900' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   count: 'text-amber-900' },
  purple:  { bg: 'bg-purple-50',  border: 'border-purple-200',  text: 'text-purple-700',  count: 'text-purple-900' },
};

export const NovaStreamCard: React.FC<NovaStreamCardProps> = ({
  title, subtitle, count, icon = '◈', color = 'blue',
}) => {
  const c = colorMap[color];
  return (
    <div className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
      <div className={`text-lg mb-1 ${c.text}`}>{icon}</div>
      <div className={`text-2xl font-bold font-mono ${c.count}`}>{count}</div>
      <div className={`text-xs font-semibold mt-0.5 ${c.text}`}>{title}</div>
      {subtitle && <div className="text-[10px] text-slate-500 mt-0.5">{subtitle}</div>}
    </div>
  );
};
