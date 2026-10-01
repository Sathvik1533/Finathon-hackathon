import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNotifications, markNotificationsRead, NotificationItem } from '../../api/notifications';

interface AppLayoutProps {
  children: React.ReactNode;
}

const PRIMARY_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm11 0h7v7h-7v-7z' },
  { to: '/timeline', label: 'Timeline', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/nova', label: 'Source Feeds', icon: 'M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7zm0 4h16M9 4v16' },
  { to: '/exceptions', label: 'Exceptions Queue', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  { to: '/settlement', label: '1:N Settlement', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { to: '/report', label: 'Recon Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
];

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState<boolean>(false);

  const loadNotifications = async () => {
    if (!user?.token) {
      setNotifications([]);
      setUnreadAlerts(0);
      return;
    }
    try {
      setIsLoadingNotifications(true);
      const data = await getNotifications(user.token);
      setNotifications(data.notifications || []);
      setUnreadAlerts(data.unreadCount || 0);
    } catch {
      // Backend notifications unavailable or unconfigured
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.token]);

  const handleMarkAllRead = async () => {
    if (!user?.token) return;
    setUnreadAlerts(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await markNotificationsRead(undefined, user.token);
    } catch {
      // ignore
    }
  };

  const handleToggleNotifications = () => {
    const nextState = !isNotificationsOpen;
    setIsNotificationsOpen(nextState);
    if (nextState && unreadAlerts > 0) {
      handleMarkAllRead();
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.read && user?.token) {
      try {
        await markNotificationsRead(item.id, user.token);
        setNotifications(prev => prev.map(n => (n.id === item.id ? { ...n, read: true } : n)));
        setUnreadAlerts(prev => Math.max(0, prev - 1));
      } catch {
        // ignore
      }
    }
    setIsNotificationsOpen(false);
    navigate(item.target);
  };

  const handleSignOut = () => {
    setIsNotificationsOpen(false);
    setIsMobileMoreOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  // Keyboard shortcut Cmd+K or Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
        setIsMobileMoreOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col md:flex-row text-[#17211C]">
      
      {/* ============================================================== */}
      {/* DESKTOP PERSISTENT LEFT NAVIGATION RAIL */}
      {/* ============================================================== */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-[#E5E3DA] bg-[#F7F6F2] flex-col justify-between p-4 sticky top-0 h-screen select-none">
        <div className="space-y-6">
          
          {/* Brand Mark */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E5E3DA]">
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => navigate('/dashboard')}
            >
              <div className="h-7 w-7 rounded border border-[#17211C] bg-[#17211C] text-[#F7F6F2] flex items-center justify-center font-serif text-sm font-bold">
                L
              </div>
              <div>
                <span className="font-semibold text-sm tracking-tight text-[#17211C]">LedgerSense</span>
                <span className="ml-1.5 text-[10px] text-[#7E8C84] font-mono">FIN-11</span>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#7E8C84] px-2.5 mb-2">
              Workbench
            </div>
            {PRIMARY_NAV.map(item => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors min-h-[38px] ${
                    isActive
                      ? 'bg-white border border-[#E5E3DA] text-[#1B4332] font-semibold shadow-xs'
                      : 'text-[#526058] hover:text-[#17211C] hover:bg-[#EAE8E0]'
                  }`}
                >
                  <svg
                    className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1B4332]' : 'text-[#7E8C84]'}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Info & Sign Out */}
        <div className="pt-4 border-t border-[#E5E3DA] space-y-3">
          <div className="px-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#7E8C84]">
              Active Operator
            </div>
            <div className="text-xs font-medium text-[#17211C] mt-0.5 truncate">
              {user?.username || 'Operator'}
            </div>
            <div className="text-[11px] font-mono text-[#526058]">
              Role: {user?.role || 'Reviewer'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded border border-[#E5E3DA] bg-white hover:bg-[#FDF2F0] hover:border-[#F2C4BE] text-xs font-medium text-[#526058] hover:text-[#A34338] transition-colors cursor-pointer min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MOBILE COMPACT TOP BAR */}
      {/* ============================================================== */}
      <header className="md:hidden border-b border-[#E5E3DA] bg-[#F7F6F2] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          <div className="h-6 w-6 rounded border border-[#17211C] bg-[#17211C] text-[#F7F6F2] flex items-center justify-center font-serif text-xs font-bold">
            L
          </div>
          <span className="font-semibold text-xs tracking-tight text-[#17211C]">LedgerSense</span>
          <span className="text-[10px] text-[#7E8C84] font-mono">FIN-11</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications Button */}
          <button
            onClick={handleToggleNotifications}
            className="h-10 w-10 rounded border border-[#E5E3DA] bg-white flex items-center justify-center text-[#526058] relative cursor-pointer"
            aria-label="Notifications"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadAlerts > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#1B4332]" />
            )}
          </button>

          {/* Quick Sign Out */}
          <button
            onClick={handleSignOut}
            className="h-10 px-3 rounded border border-[#E5E3DA] bg-white text-xs font-medium text-[#526058] hover:text-[#A34338] flex items-center gap-1 cursor-pointer"
          >
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN WORK AREA */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        
        {/* Desktop Top Sub-Bar */}
        <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-[#E5E3DA] bg-[#F7F6F2]/80 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#526058]">Workspace:</span>
            <span className="text-xs font-medium text-[#17211C]">FIN-11 Operations</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[#E5E3DA] bg-white hover:bg-[#F7F6F2] text-xs text-[#526058] transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-[#7E8C84]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search orders & UTRs...</span>
              <kbd className="font-mono text-[10px] text-[#7E8C84] bg-[#F7F6F2] px-1 rounded border border-[#E5E3DA]">⌘K</kbd>
            </button>

            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={handleToggleNotifications}
                className="h-8 px-2.5 rounded border border-[#E5E3DA] bg-white hover:bg-[#F7F6F2] text-xs font-medium text-[#526058] flex items-center gap-1.5 cursor-pointer relative"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>Alerts</span>
                {unreadAlerts > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1B4332]" />
                )}
              </button>

              {/* Notifications Dropdown Card */}
              {isNotificationsOpen && (
                <div className="absolute right-0 top-10 z-50 w-80 bg-white rounded-lg p-4 shadow-sheet border border-[#E5E3DA] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5E3DA]">
                    <span className="text-xs font-semibold text-[#17211C]">Reconciliation Alerts</span>
                    {unreadAlerts > 0 ? (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-[#1B4332] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#7E8C84]">All read</span>
                    )}
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {isLoadingNotifications ? (
                      <div className="py-4 text-center text-xs text-[#7E8C84]">Loading alerts...</div>
                    ) : notifications.length === 0 ? (
                      <div className="py-4 text-center text-xs text-[#7E8C84]">
                        No notifications. Source streams reconciled.
                      </div>
                    ) : (
                      notifications.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`p-2.5 rounded border transition-colors cursor-pointer text-xs space-y-1 ${
                            item.read
                              ? 'bg-[#F7F6F2] border-[#E5E3DA] text-[#526058]'
                              : 'bg-white border-[#C8DFD1] text-[#17211C]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{item.title}</span>
                            {!item.read && <span className="h-1.5 w-1.5 rounded-full bg-[#1B4332]" />}
                          </div>
                          <p className="text-[11px] text-[#526058]">{item.detail}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Work Area Content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ============================================================== */}
      {/* MOBILE SAFE-AREA BOTTOM NAVIGATION BAR */}
      {/* ============================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F7F6F2] border-t border-[#E5E3DA] flex items-center justify-around h-16 safe-area-pb select-none">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-[10px] font-medium ${
            isActive ? 'text-[#1B4332] font-semibold' : 'text-[#7E8C84]'
          }`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm11 0h7v7h-7v-7z" />
          </svg>
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/timeline"
          className={({ isActive }) => `flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-[10px] font-medium ${
            isActive ? 'text-[#1B4332] font-semibold' : 'text-[#7E8C84]'
          }`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Timeline</span>
        </NavLink>

        <NavLink
          to="/exceptions"
          className={({ isActive }) => `flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-[10px] font-medium ${
            isActive ? 'text-[#1B4332] font-semibold' : 'text-[#7E8C84]'
          }`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Exceptions</span>
        </NavLink>

        <NavLink
          to="/report"
          className={({ isActive }) => `flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-[10px] font-medium ${
            isActive ? 'text-[#1B4332] font-semibold' : 'text-[#7E8C84]'
          }`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Reports</span>
        </NavLink>

        <button
          onClick={() => setIsMobileMoreOpen(true)}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-[10px] font-medium text-[#7E8C84] cursor-pointer"
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>More</span>
        </button>
      </nav>

      {/* MOBILE MORE SHEET */}
      {isMobileMoreOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-xl p-5 border-t border-[#E5E3DA] space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DA]">
              <span className="font-semibold text-sm text-[#17211C]">Workbench Navigation</span>
              <button
                onClick={() => setIsMobileMoreOpen(false)}
                className="text-xs text-[#526058] hover:text-[#17211C] p-1"
              >
                Close ✕
              </button>
            </div>

            <div className="space-y-1">
              <NavLink
                to="/nova"
                onClick={() => setIsMobileMoreOpen(false)}
                className="flex items-center gap-3 p-3 rounded text-xs font-medium text-[#17211C] hover:bg-[#F7F6F2]"
              >
                <svg className="w-4 h-4 text-[#7E8C84]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7zm0 4h16M9 4v16" />
                </svg>
                <span>Source Feeds</span>
              </NavLink>

              <NavLink
                to="/settlement"
                onClick={() => setIsMobileMoreOpen(false)}
                className="flex items-center gap-3 p-3 rounded text-xs font-medium text-[#17211C] hover:bg-[#F7F6F2]"
              >
                <svg className="w-4 h-4 text-[#7E8C84]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>1:N Settlement Matcher</span>
              </NavLink>
            </div>

            <div className="pt-3 border-t border-[#E5E3DA] space-y-2 text-xs">
              <div className="text-[11px] text-[#7E8C84]">
                Signed in as <span className="font-medium text-[#17211C]">{user?.username}</span> ({user?.role})
              </div>
              <button
                onClick={handleSignOut}
                className="w-full py-2.5 rounded border border-[#F2C4BE] bg-[#FDF2F0] text-[#A34338] font-medium text-xs text-center cursor-pointer min-h-[44px]"
              >
                Sign Out of Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH COMMAND PALETTE (CMD+K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E5E3DA] max-w-lg w-full p-4 shadow-sheet space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E3DA]">
              <div className="flex items-center gap-2 flex-1">
                <svg className="w-4 h-4 text-[#7E8C84]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Type an order ID or reference code..."
                  className="w-full text-xs text-[#17211C] placeholder-[#7E8C84] outline-none"
                />
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-[11px] font-mono text-[#7E8C84] hover:text-[#17211C]"
              >
                ESC
              </button>
            </div>

            <div className="py-2 text-xs text-[#526058] space-y-1">
              <div
                onClick={() => { setIsSearchOpen(false); navigate('/timeline'); }}
                className="p-2 rounded hover:bg-[#F7F6F2] cursor-pointer flex items-center justify-between"
              >
                <span>Navigate to Timeline Explorer</span>
                <span className="font-mono text-[10px] text-[#7E8C84]">/timeline</span>
              </div>
              <div
                onClick={() => { setIsSearchOpen(false); navigate('/exceptions'); }}
                className="p-2 rounded hover:bg-[#F7F6F2] cursor-pointer flex items-center justify-between"
              >
                <span>Navigate to Exceptions Queue</span>
                <span className="font-mono text-[10px] text-[#7E8C84]">/exceptions</span>
              </div>
              <div
                onClick={() => { setIsSearchOpen(false); navigate('/settlement'); }}
                className="p-2 rounded hover:bg-[#F7F6F2] cursor-pointer flex items-center justify-between"
              >
                <span>Navigate to 1:N Settlement Matcher</span>
                <span className="font-mono text-[10px] text-[#7E8C84]">/settlement</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
