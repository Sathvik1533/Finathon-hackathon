import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/nova', label: 'Nova Feeds' },
  { to: '/exceptions', label: 'Exceptions' },
  { to: '/settlement', label: 'Settlement' },
  { to: '/report', label: 'Reports' },
];

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f4f5f7] py-4 sm:py-6 px-3 sm:px-6 lg:px-8 flex justify-center items-start antialiased text-slate-900">
      {/* Outer Card Container matching Pinterest Quixotic layout */}
      <div className="w-full max-w-[1400px] bg-white rounded-[32px] p-5 sm:p-7 lg:p-8 shadow-card border border-slate-200/70 space-y-6">
        
        {/* Top App Bar */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#006241] flex items-center justify-center text-white font-bold text-base shadow-xs tracking-tight">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 10 10" />
                <circle cx="12" cy="12" r="4" fill="white" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900">LedgerSense</span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-semibold tracking-wider text-[#006241] bg-[#e6f7ef] px-2 py-0.5 rounded-full border border-[#c1ebd5]">
                FIN-11
              </span>
            </div>
          </div>

          {/* Segmented Navigation Pills */}
          <nav className="bg-[#f4f5f7] p-1 rounded-full flex items-center gap-1 text-xs font-medium overflow-x-auto max-w-full">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-4 sm:px-5 py-2 rounded-full transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#006241] text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right Action Icons & User Avatar */}
          <div className="flex items-center gap-2.5">
            {/* Search Button */}
            <button
              title="Search records"
              className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Notification Bell with Green Dot */}
            <button
              title="Notifications"
              className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors relative"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#00c070]" />
            </button>

            {/* User Profile Avatar with drop-down */}
            <div className="flex items-center gap-2 pl-1">
              <div className="h-9 w-9 rounded-full bg-slate-900 border-2 border-white shadow-xs overflow-hidden flex items-center justify-center text-white text-xs font-bold">
                {user?.username ? user.username.slice(0, 2).toUpperCase() : 'AR'}
              </div>
              <button
                onClick={() => {
                  if (confirm('Sign out of LedgerSense?')) {
                    logout();
                    navigate('/login');
                  }
                }}
                title="Click to sign out"
                className="text-xs text-slate-500 hover:text-rose-600 font-medium transition-colors hidden sm:block"
              >
                Sign out
              </button>
            </div>
          </div>

        </header>

        {/* Dynamic View Body */}
        <main>{children}</main>

      </div>
    </div>
  );
};
