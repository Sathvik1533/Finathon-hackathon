import React from 'react';
export const ModuleCoverageRow = ({ moduleName, status }: any) => (
  <div className="flex justify-between border-b border-[#e2e8f0] py-2">
    <span className="text-sm font-medium">{moduleName}</span>
    <span className="text-sm text-emerald-600 font-bold">{status}</span>
  </div>
);
