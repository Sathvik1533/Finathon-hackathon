import React, { useState, useEffect } from 'react';
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

const SEARCH_DIRECTORY = [
  { id: 'ORD-101', type: 'ORDER', title: 'ORD-101 · Aarav Patel', detail: '₹1,000.00 · gw_tx_001 · UTR CMS/NACH/901', status: 'MATCHED', route: '/timeline?order=ORD-101' },
  { id: 'ORD-102', type: 'ORDER', title: 'ORD-102 · Meera Iyer', detail: '₹2,500.00 · gw_tx_002 · High-Value Clean', status: 'MATCHED', route: '/timeline?order=ORD-102' },
  { id: 'ORD-103', type: 'EXCEPTION', title: 'ORD-103 · Vikram Malhotra', detail: '₹1,000.00 · FEE_MISMATCH (+₹11.80 leakage)', status: 'FEE_MISMATCH', route: '/exceptions' },
  { id: 'ORD-104', type: 'EXCEPTION', title: 'ORD-104 · Ananya Roy', detail: '₹800.00 · TIMING_LAG (T+2 In-flight)', status: 'TIMING_LAG', route: '/timeline?order=ORD-104' },
  { id: 'SETTLE-901', type: 'SETTLEMENT', title: 'SETTLE-901 · 1:N Batch Settlement', detail: '₹4,870.20 · 3 Orders · UTR: CMS/NACH/SETTL/901', status: 'MATCHED', route: '/settlement' },
];

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMerchantProfileOpen, setIsMerchantProfileOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(2);

  // Keyboard shortcut Cmd+K or Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
        setIsMerchantProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredSearch = SEARCH_DIRECTORY.filter(item =>
    item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.detail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] py-4 sm:py-6 px-3 sm:px-6 lg:px-8 flex justify-center items-start antialiased text-slate-900 selection:bg-[#006241]/10 selection:text-[#006241]">
      {/* Outer Rounded Container matching Pinterest layout */}
      <div className="w-full max-w-[1440px] bg-white rounded-[32px] p-5 sm:p-7 lg:p-8 shadow-card border border-slate-200/70 space-y-6">
        
        {/* Top App Header */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100 relative">
          
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
          <div className="flex items-center gap-2.5 relative">
            
            {/* Search Button (Global Command Palette) */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              title="Search transactions (Cmd+K)"
              onClick={() => setIsSearchOpen(true)}
              className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </motion.button>

            {/* Notification Bell with Mint Dot & Dropdown */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                title="Reconciliation alerts"
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsMerchantProfileOpen(false);
                }}
                className={`h-9 w-9 rounded-full border flex items-center justify-center transition-colors relative cursor-pointer ${
                  isNotificationsOpen ? 'border-[#006241] bg-[#e6f7ef] text-[#006241]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadAlerts > 0 && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#00c070] ring-2 ring-white" />
                )}
              </motion.button>

              {/* Notifications Dropdown Card */}
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-white rounded-3xl p-4 shadow-2xl border border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Reconciliation Alerts</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                        {unreadAlerts} Actionable
                      </span>
                    </div>
                    {unreadAlerts > 0 && (
                      <button
                        onClick={() => setUnreadAlerts(0)}
                        className="text-[10px] font-semibold text-[#006241] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {/* Notification 1 */}
                    <div
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        navigate('/exceptions');
                      }}
                      className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 hover:bg-amber-100/60 transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5">
                          <span>⚠️</span> Fee Leakage on ORD-103
                        </span>
                        <span className="text-[10px] font-mono text-amber-700">2m ago</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-snug">
                        Gateway charged ₹47.20 vs contract fee ₹35.40. ₹11.80 flagged for dispute.
                      </p>
                      <div className="text-[10px] font-bold text-[#006241] pt-1">Review in Exceptions Queue →</div>
                    </div>

                    {/* Notification 2 */}
                    <div
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        navigate('/timeline?order=ORD-104');
                      }}
                      className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 hover:bg-blue-100/60 transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-blue-900 flex items-center gap-1.5">
                          <span>⏳</span> Timing Lag on ORD-104
                        </span>
                        <span className="text-[10px] font-mono text-blue-700">14m ago</span>
                      </div>
                      <p className="text-[11px] text-blue-800 leading-snug">
                        Transaction authorized within T+2 banking window. In-flight pending clearing.
                      </p>
                      <div className="text-[10px] font-bold text-[#006241] pt-1">Inspect Timeline Trace →</div>
                    </div>

                    {/* Notification 3 */}
                    <div
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        navigate('/settlement');
                      }}
                      className="p-3 rounded-2xl bg-[#e6f7ef] border border-[#c1ebd5] hover:bg-emerald-100/60 transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#006241] flex items-center gap-1.5">
                          <span>✅</span> Batch SETTLE-901 Cleared
                        </span>
                        <span className="text-[10px] font-mono text-emerald-700">1h ago</span>
                      </div>
                      <p className="text-[11px] text-[#006241] leading-snug">
                        ₹4,870.20 credited by HDFC Bank UTR. Zero penny rounding drift verified.
                      </p>
                      <div className="text-[10px] font-bold text-[#006241] pt-1">View 1:N Settlement Matcher →</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* User Profile Avatar with Merchant Details Drawer / Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsMerchantProfileOpen(!isMerchantProfileOpen);
                  setIsNotificationsOpen(false);
                }}
                className="flex items-center gap-2 pl-1 cursor-pointer focus:outline-none"
              >
                <div className="h-9 w-9 rounded-full bg-[#006241] border-2 border-white shadow-xs overflow-hidden flex items-center justify-center text-white text-xs font-bold ring-2 ring-emerald-500/20">
                  {user?.username ? user.username.slice(0, 2).toUpperCase() : 'PS'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : 'Priya'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">Acme Retail ▼</div>
                </div>
              </button>

              {/* Merchant Details Popover */}
              {isMerchantProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="absolute right-0 top-12 z-50 w-80 bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4"
                >
                  {/* Merchant Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Merchant Account</div>
                      <div className="text-sm font-bold text-slate-900">Acme Retail India Pvt. Ltd.</div>
                      <div className="text-[10px] font-mono text-[#006241] font-semibold">MERCH_ACME_INDIA</div>
                    </div>
                    <button
                      onClick={() => setIsMerchantProfileOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Merchant Details Grid */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                      <span className="text-slate-500 text-[11px]">GSTIN</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px]">29ABCDE1234F1Z5</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                      <span className="text-slate-500 text-[11px]">Settlement Bank</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px]">HDFC Bank · ****4892</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                      <span className="text-slate-500 text-[11px]">Clearing Cycle</span>
                      <span className="font-mono font-bold text-[#006241] text-[11px]">T+2 Daily Net Sweep</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                      <span className="text-slate-500 text-[11px]">Current Role</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px]">
                        {user?.role ?? 'FINOPS_ADMIN'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#e6f7ef] border border-[#c1ebd5]">
                      <span className="text-[#006241] text-[11px] font-semibold">Audit Logging</span>
                      <span className="font-mono text-[#006241] text-[11px] font-bold">● SOC2 Immutable</span>
                    </div>
                  </div>

                  {/* Clean 1-Click Sign Out Button (No browser alert) */}
                  <button
                    onClick={handleSignOut}
                    className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out of LedgerSense</span>
                  </button>
                </motion.div>
              )}
            </div>

          </div>

        </header>

        {/* Global Search Dialog Modal (Cmd+K) */}
        <AnimatePresence>
          {isSearchOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-xl bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4"
              >
                {/* Search Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-1">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search Order ID (ORD-101), UTR, or Customer..."
                      className="w-full text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">ESC</span>
                </div>

                {/* Search Results */}
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {filteredSearch.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No matching financial records found for "{searchQuery}"
                    </div>
                  ) : (
                    filteredSearch.map(item => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          navigate(item.route);
                        }}
                        className="p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span>{item.title}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {item.type}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.detail}</div>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          item.status === 'MATCHED'
                            ? 'bg-[#e6f7ef] text-[#006241]'
                            : item.status === 'FEE_MISMATCH'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-100 flex items-center justify-between">
                  <span>Press <kbd className="font-mono bg-slate-100 px-1 rounded">ESC</kbd> to close</span>
                  <span className="font-mono text-[#006241]">5 indexed records</span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
