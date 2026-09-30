import React from 'react';
import { useAuth } from '../../context/AuthContext';
export const Header = () => {
  const { user } = useAuth();
  return (
    <div className="h-16 border-b border-[#e2e8f0] flex items-center justify-between px-6">
      <h1 className="text-xl font-bold text-[#0f172a]">LedgerSense</h1>
      {user && <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">Role: {user.role}</span>}
    </div>
  );
};
