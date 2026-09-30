import React from 'react';
import { NavLink } from 'react-router-dom';

export const SlimIconSidebar: React.FC = () => {
  return (
    <aside className="w-14 bg-white border border-slate-200/80 rounded-2xl py-4 flex flex-col items-center justify-between shadow-xs hidden xl:flex self-stretch">
      <div className="space-y-4 flex flex-col items-center">
        {/* Top Active Dashboard Icon (4-dots grid matching reference) */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `h-10 w-10 rounded-2xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-[#006241] text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`
          }
          title="Dashboard Overview"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="3" width="7" height="7" rx="2" />
            <rect x="14" y="3" width="7" height="7" rx="2" />
            <rect x="3" y="14" width="7" height="7" rx="2" />
            <rect x="14" y="14" width="7" height="7" rx="2" />
          </svg>
        </NavLink>

        {/* Timeline Forensics */}
        <NavLink
          to="/timeline"
          className={({ isActive }) =>
            `h-10 w-10 rounded-2xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-[#006241] text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`
          }
          title="Lifecycle Timeline"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </NavLink>

        {/* Nova 4-Source Feeds */}
        <NavLink
          to="/nova"
          className={({ isActive }) =>
            `h-10 w-10 rounded-2xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-[#006241] text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`
          }
          title="Nova 4-Source Feeds"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7M4 7c0-2 1.5-3 3.5-3h9c2 0 3.5 1 3.5 3M4 7h16" />
          </svg>
        </NavLink>

        {/* Exceptions Queue */}
        <NavLink
          to="/exceptions"
          className={({ isActive }) =>
            `h-10 w-10 rounded-2xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-[#006241] text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`
          }
          title="Exceptions Queue"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </NavLink>

        {/* Settlements */}
        <NavLink
          to="/settlement"
          className={({ isActive }) =>
            `h-10 w-10 rounded-2xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-[#006241] text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`
          }
          title="Settlements"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </NavLink>

        {/* Recon Report */}
        <NavLink
          to="/report"
          className={({ isActive }) =>
            `h-10 w-10 rounded-2xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-[#006241] text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`
          }
          title="Module 11 Report"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </NavLink>
      </div>

      {/* Bottom Icons (Settings & System Info) */}
      <div className="space-y-3 flex flex-col items-center pt-4 border-t border-slate-100">
        <button
          title="PostgreSQL & Redis Status: Active"
          className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </aside>
  );
};
