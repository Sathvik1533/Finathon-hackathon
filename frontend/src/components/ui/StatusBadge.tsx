import React from 'react';
export const StatusBadge = ({ status }: { status: string }) => {
  let color = 'bg-gray-100 text-gray-800';
  if (status === 'OPEN' || status === 'PENDING') color = 'bg-amber-100 text-amber-800';
  if (status === 'APPROVED' || status === 'MATCHED') color = 'bg-emerald-100 text-emerald-800';
  if (status === 'REJECTED') color = 'bg-rose-100 text-rose-800';
  if (status === 'FEE_MISMATCH') color = 'bg-rose-100 text-rose-800';
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>{status}</span>;
};
