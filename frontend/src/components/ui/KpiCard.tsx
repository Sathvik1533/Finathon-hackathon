import React from 'react';
export const KpiCard = ({ title, value, delta, color }: any) => (
  <div className={`p-4 bg-white border border-[#e2e8f0] rounded shadow-sm flex flex-col`}>
    <span className="text-sm text-gray-500">{title}</span>
    <span className="text-2xl font-bold text-[#0f172a] tabular-nums">{value}</span>
    <span className={`text-sm ${color}`}>{delta}</span>
  </div>
);
