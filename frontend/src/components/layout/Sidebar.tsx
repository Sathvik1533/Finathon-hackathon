import React from 'react';
import { Link } from 'react-router-dom';
export const Sidebar = () => (
  <div className="w-64 border-r border-[#e2e8f0] h-screen p-4 flex flex-col gap-4">
    <Link to="/dashboard" className="text-[#0f172a] hover:bg-gray-100 p-2 rounded">Dashboard</Link>
    <Link to="/timeline" className="text-[#0f172a] hover:bg-gray-100 p-2 rounded">Timeline</Link>
    <Link to="/nova-explorer" className="text-[#0f172a] hover:bg-gray-100 p-2 rounded">Nova Explorer</Link>
    <Link to="/exceptions" className="text-[#0f172a] hover:bg-gray-100 p-2 rounded">Exceptions</Link>
    <Link to="/settlement" className="text-[#0f172a] hover:bg-gray-100 p-2 rounded">Settlement</Link>
    <Link to="/report" className="text-[#0f172a] hover:bg-gray-100 p-2 rounded">Report</Link>
  </div>
);
