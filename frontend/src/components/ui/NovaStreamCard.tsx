import React from 'react';
export const NovaStreamCard = ({ title, data }: any) => (
  <div className="border border-[#e2e8f0] p-4 rounded bg-white shadow-sm">
    <h3 className="font-bold mb-2">{title}</h3>
    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">{JSON.stringify(data, null, 2)}</pre>
  </div>
);
