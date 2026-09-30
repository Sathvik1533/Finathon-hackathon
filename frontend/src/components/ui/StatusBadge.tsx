import React from 'react';

type StatusVariant =
  | 'IMPLEMENTED' | 'SETTLED' | 'APPROVED' | 'MATCHED'
  | 'PENDING_REVIEW' | 'OPEN' | 'PENDING'
  | 'REJECTED' | 'ESCALATED'
  | 'FEE_MISMATCH' | 'TIMING_LAG' | 'MISSING_BANK_CREDIT'
  | 'AMBIGUOUS_MATCH' | 'UNMATCHED_GATEWAY'
  | string;

const variantStyles: Record<string, string> = {
  IMPLEMENTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SETTLED:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  APPROVED:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  MATCHED:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  DISCREPANCY: 'bg-rose-50 text-rose-700 border-rose-200',
  DISCREPANCY_DETECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  OPEN:        'bg-amber-50 text-amber-700 border-amber-200',
  PENDING:     'bg-amber-50 text-amber-700 border-amber-200',
  REJECTED:    'bg-rose-50 text-rose-700 border-rose-200',
  ESCALATED:   'bg-purple-50 text-purple-700 border-purple-200',
  FEE_MISMATCH:       'bg-orange-50 text-orange-700 border-orange-200',
  TIMING_LAG:         'bg-blue-50 text-blue-700 border-blue-200',
  MISSING_BANK_CREDIT:'bg-rose-50 text-rose-700 border-rose-200',
  AMBIGUOUS_MATCH:    'bg-purple-50 text-purple-700 border-purple-200',
  UNMATCHED_GATEWAY:  'bg-slate-50 text-slate-600 border-slate-200',
};

interface StatusBadgeProps {
  status: StatusVariant;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const styles = variantStyles[status] ?? 'bg-slate-50 text-slate-600 border-slate-200';
  const px = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center rounded-full border font-semibold font-mono ${px} ${styles}`}>
      {status}
    </span>
  );
};
