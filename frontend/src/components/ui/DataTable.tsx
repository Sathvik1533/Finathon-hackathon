import React from 'react';
export const DataTable = ({ data, columns }: any) => (
  <div className="overflow-x-auto border border-[#e2e8f0] rounded">
    <table className="min-w-full divide-y divide-[#e2e8f0]">
      <thead className="bg-gray-50">
        <tr>{columns.map((c: any) => <th key={c.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{c.label}</th>)}</tr>
      </thead>
      <tbody className="bg-white divide-y divide-[#e2e8f0]">
        {data.map((row: any, i: number) => (
          <tr key={i}>{columns.map((c: any) => <td key={c.key} className="px-4 py-3 whitespace-nowrap text-sm text-[#0f172a] tabular-nums">{row[c.key]}</td>)}</tr>
        ))}
      </tbody>
    </table>
  </div>
);
