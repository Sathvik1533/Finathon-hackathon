import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { buttonPressProps } from '../../utils/motion';

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
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#f4f5f7] py-4 sm:py-6 px-3 sm:px-6 lg:px-8 flex justify-center items-start antialiased text-slate-900 selection:bg-[#006241]/10 selection:text-[#006241]">
      {/* Outer Rounded Container matching Pinterest layout */}
      <div className="w-full max-w-[1440px] bg-white rounded-[32px] p-5 sm:p-7 lg:p-8 shadow-card border border-slate-200/70 space-y-6">
        
        {/* Top App Header */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="h-10 w-10 rounded-2xl bg-[#006241] flex items-center justify-center text-white font-bold text-base shadow-pill tracking-tight cursor-pointer shrink-0"
              onClick={() => navigate('/dashboard')}
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 10 10" />
                <circle cx="12" cy="12" r="4" fill="white" />
              </svg>
            </motion.div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900 cursor-pointer" onClick={() => navigate('/dashboard')}>
                LedgerSense
              </span>
              <span className="hidden sm:inline-flex items-center text-[10px] uppercase font-semibold tracking-wider text-[#006241] bg-[#e6f7ef] px-2.5 py-0.5 rounded-full border border-[#c1ebd5] whitespace-nowrap shrink-0">
                FIN-11
              </span>
            </div>
          </div>

          {/* Segmented Navigation Pills with animated indicator */}
          <nav className="bg-[#f4f5f7] p-1 rounded-full flex items-center gap-1 text-xs font-medium overflow-x-auto max-w-full relative">
            {NAV_ITEMS.map(item => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="relative px-4 sm:px-5 py-2 rounded-full whitespace-nowrap z-10 transition-colors"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavPill"
                      className="absolute inset-0 bg-[#006241] rounded-full shadow-xs"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className={`relative z-10 font-medium ${isActive ? 'text-white font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Action Icons & User Avatar */}
          <div className="flex items-center gap-2.5">
            {/* Search Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              title="Search transactions"
              onClick={() => navigate('/timeline')}
              className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </motion.button>

            {/* Notification Bell with Mint Dot */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              title="Exception notifications"
              onClick={() => navigate('/exceptions')}
              className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors relative cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#00c070] ring-2 ring-white" />
            </motion.button>

            {/* User Profile Avatar with sign-out trigger */}
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
                className="text-xs text-slate-500 hover:text-rose-600 font-medium transition-colors hidden sm:block cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>

        </header>

        {/* Dynamic View Body with smooth animated page transitions */}
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.main>
        </AnimatePresence>

      </div>
    </div>
  );
};
