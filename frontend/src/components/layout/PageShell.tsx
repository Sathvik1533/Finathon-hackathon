import React from 'react';
export const PageShell = ({ children, title }: { children: React.ReactNode, title: string }) => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-6 text-[#0f172a]">{title}</h2>
    {children}
  </div>
);
