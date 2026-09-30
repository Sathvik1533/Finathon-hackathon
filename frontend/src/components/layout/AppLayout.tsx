import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNovaStatus, type NovaStatus } from '../../api/nova';

interface AppLayoutProps { children: React.ReactNode }
type IconName = 'overview' | 'timeline' | 'exception' | 'source' | 'settlement' | 'report' | 'search' | 'user' | 'logout' | 'close' | 'more';

const NAV_ITEMS: Array<{ to: string; label: string; icon: IconName }> = [
  { to: '/dashboard', label: 'Overview', icon: 'overview' },
  { to: '/timeline', label: 'Transaction trace', icon: 'timeline' },
  { to: '/exceptions', label: 'Exceptions', icon: 'exception' },
  { to: '/settlement', label: 'Settlements', icon: 'settlement' },
  { to: '/nova', label: 'Data feeds', icon: 'source' },
  { to: '/report', label: 'Reports', icon: 'report' },
];

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  const paths: Record<IconName, React.ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    timeline: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/><circle cx="10" cy="18" r="1.5" fill="currentColor"/></>,
    exception: <><path d="M12 3 2.9 19h18.2L12 3Z"/><path d="M12 9v4m0 3h.01"/></>,
    source: <><path d="M4 6h6m4 0h6M4 12h3m4 0h9M4 18h8m4 0h4"/><circle cx="12" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="14" cy="18" r="2"/></>,
    settlement: <><path d="M4 8h14m0 0-3-3m3 3-3 3M20 16H6m0 0 3-3m-3 3 3 3"/></>,
    report: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6m-6 4h6"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></>,
    logout: <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="m16 16 4-4-4-4m4 4H9"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function Brand() {
  return (
    <span className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center border border-ink rounded-sm text-forest" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 5.5h14M5 10.5h9M5 15.5h14M5 20.5h9"/><path d="m15.5 11.5 2.2 2.2 3.8-4"/>
        </svg>
      </span>
      <span className="text-base font-semibold tracking-[-0.04em] text-ink">LedgerSense</span>
    </span>
  );
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [novaStatus, setNovaStatus] = useState<NovaStatus | null>(null);
  const [statusUnavailable, setStatusUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    getNovaStatus().then(status => { if (active) setNovaStatus(status); }).catch(() => { if (active) setStatusUnavailable(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setSearchOpen(value => !value);
      }
      if (event.key === 'Escape') { setSearchOpen(false); setAccountOpen(false); setMoreOpen(false); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const title = NAV_ITEMS.find(item => item.to === location.pathname)?.label ?? 'Workspace';
  const destinations = useMemo(() => NAV_ITEMS.filter(item => item.label.toLowerCase().includes(search.trim().toLowerCase())), [search]);
  const mobileItems = NAV_ITEMS.filter(item => ['/dashboard', '/timeline', '/exceptions'].includes(item.to));

  const signOut = () => {
    setAccountOpen(false);
    setMoreOpen(false);
    setSearchOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-[252px] shrink-0 border-r border-line bg-white px-5 py-6 lg:flex lg:flex-col">
          <button type="button" onClick={() => navigate('/dashboard')} className="mb-10 text-left" aria-label="Open workspace overview"><Brand /></button>
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Workspace</p>
          <nav className="space-y-1" aria-label="Workspace navigation">
            {NAV_ITEMS.map(item => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex min-h-11 items-center gap-3 border-l-2 px-3 text-sm transition-colors ${isActive ? 'border-forest bg-[#f2f7f4] font-semibold text-forest' : 'border-transparent text-muted hover:bg-paper hover:text-ink'}`}>
                <Icon name={item.icon} /><span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto border-t border-line pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Current dataset</p>
            {novaStatus?.dataMode === 'simulated' ? (
              <p className="mt-3 border-l-2 border-amber px-3 py-2 text-xs leading-5 text-muted"><strong className="block font-semibold text-ink">Demonstration records</strong>Embedded sample data; not a live Nova feed.</p>
            ) : novaStatus?.dataMode === 'unconfigured' ? (
              <p className="mt-3 border-l-2 border-rust px-3 py-2 text-xs leading-5 text-muted"><strong className="block font-semibold text-ink">No live source</strong>Provider ingestion is not configured in this build.</p>
            ) : statusUnavailable ? (
              <p className="mt-3 border-l-2 border-line px-3 py-2 text-xs leading-5 text-muted">Data-source mode could not be verified.</p>
            ) : (
              <p className="mt-3 px-3 py-2 text-xs leading-5 text-muted">Checking data-source mode…</p>
            )}
            <div className="relative mt-5">
              <button type="button" onClick={() => setAccountOpen(value => !value)} className="flex min-h-12 w-full items-center gap-3 border-t border-line pt-4 text-left">
                <span className="grid h-9 w-9 shrink-0 place-items-center bg-paper text-sm font-semibold text-forest">{user?.username?.slice(0, 1).toUpperCase() ?? 'U'}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{user?.username ?? 'Account'}</span><span className="block truncate text-xs text-muted">{user?.role ?? 'Signed in'}</span></span>
                <Icon name="more" size={16} />
              </button>
              {accountOpen && <AccountMenu user={user} onSignOut={signOut} />}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur-sm sm:px-7 lg:px-10">
            <div className="flex items-center gap-3 lg:hidden"><button type="button" onClick={() => navigate('/')} aria-label="LedgerSense home"><Brand /></button></div>
            <div className="hidden lg:block"><p className="text-xs text-muted">Workspace</p><h1 className="text-sm font-semibold text-ink">{title}</h1></div>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={() => { setSearchOpen(true); setSearch(''); }} className="touch-target inline-flex items-center gap-2 border border-line bg-white px-3 text-sm text-muted transition-colors hover:border-ink hover:text-ink" aria-label="Open workspace navigation search">
                <Icon name="search" size={17} /><span className="hidden sm:inline">Find a page</span><kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline">⌘K</kbd>
              </button>
              <div className="relative lg:hidden">
                <button type="button" onClick={() => setAccountOpen(value => !value)} className="touch-target grid place-items-center border border-line bg-white px-3 text-sm font-semibold" aria-label="Open account menu">{user?.username?.slice(0, 1).toUpperCase() ?? 'U'}</button>
                {accountOpen && <AccountMenu user={user} onSignOut={signOut} />}
              </div>
            </div>
          </header>

          {novaStatus?.dataMode === 'simulated' && (
            <div className="border-b border-[#e6d5b0] bg-[#f6f0e3] px-4 py-2.5 text-xs leading-5 text-ink sm:px-7 lg:px-10" role="status">
              <strong className="mr-2 font-semibold">DEMO DATA</strong><span className="text-muted">The current Nova adapter returns embedded sample records. Do not treat these values as live merchant or bank data.</span>
            </div>
          )}
          {novaStatus?.dataMode === 'unconfigured' && (
            <div className="border-b border-[#e3c9c0] bg-[#faf2ee] px-4 py-2.5 text-xs leading-5 text-ink sm:px-7 lg:px-10" role="status">
              <strong className="mr-2 font-semibold text-rust">NO LIVE SOURCE</strong><span className="text-muted">The current backend has no live Nova importer configured. Data requests remain unavailable; no sample rows are used as a fallback.</span>
            </div>
          )}
          {statusUnavailable && (
            <div className="border-b border-line bg-white px-4 py-2.5 text-xs text-muted sm:px-7 lg:px-10" role="status">Data-source mode could not be verified. Check source status before relying on any displayed record.</div>
          )}

          <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-28 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pb-10">
            {children}
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden" aria-label="Mobile navigation">
        <div className="mx-auto grid max-w-xl grid-cols-4">
          {mobileItems.map(item => {
            const active = location.pathname === item.to;
            return <NavLink key={item.to} to={item.to} className={`flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 text-[11px] font-medium ${active ? 'border-forest text-forest' : 'border-transparent text-muted'}`}><Icon name={item.icon} size={19}/><span>{item.label === 'Transaction trace' ? 'Trace' : item.label}</span></NavLink>;
          })}
          <button type="button" onClick={() => setMoreOpen(value => !value)} className={`flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 text-[11px] font-medium ${moreOpen ? 'border-forest text-forest' : 'border-transparent text-muted'}`} aria-expanded={moreOpen}><Icon name={moreOpen ? 'close' : 'more'} size={19}/><span>More</span></button>
        </div>
      </nav>

      {moreOpen && <div className="fixed inset-0 z-50 bg-ink/30 lg:hidden" onClick={() => setMoreOpen(false)}>
        <section className="absolute inset-x-0 bottom-0 border-t border-line bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-5" onClick={event => event.stopPropagation()} aria-label="More workspace pages">
          <div className="mx-auto max-w-xl">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-2xl">More</h2><button type="button" className="touch-target grid place-items-center" onClick={() => setMoreOpen(false)} aria-label="Close more menu"><Icon name="close"/></button></div>
            {NAV_ITEMS.filter(item => !mobileItems.some(primary => primary.to === item.to)).map(item => <NavLink key={item.to} to={item.to} onClick={() => setMoreOpen(false)} className="flex min-h-12 items-center gap-3 border-t border-line text-sm"><Icon name={item.icon}/>{item.label}</NavLink>)}
            <button type="button" onClick={signOut} className="mt-3 flex min-h-12 w-full items-center gap-3 border-t border-line pt-2 text-sm font-semibold text-rust"><Icon name="logout"/>Sign out</button>
          </div>
        </section>
      </div>}

      {searchOpen && <div className="fixed inset-0 z-[60] grid place-items-start bg-ink/35 px-4 pt-[12vh]" onClick={() => setSearchOpen(false)}>
        <section className="mx-auto w-full max-w-xl border border-line bg-white shadow-soft" onClick={event => event.stopPropagation()} aria-label="Find a workspace page">
          <div className="flex items-center gap-3 border-b border-line px-4"><Icon name="search"/><input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a workspace page" className="h-14 min-w-0 flex-1 text-sm outline-none"/><button type="button" className="touch-target grid place-items-center text-muted" onClick={() => setSearchOpen(false)} aria-label="Close search"><Icon name="close"/></button></div>
          <div className="p-2">
            {destinations.length ? destinations.map(item => <button key={item.to} type="button" onClick={() => { setSearchOpen(false); navigate(item.to); }} className="flex min-h-12 w-full items-center gap-3 px-3 text-left text-sm transition-colors hover:bg-paper"><Icon name={item.icon}/>{item.label}</button>) : <p className="px-3 py-5 text-sm text-muted">No workspace page matches that search.</p>}
          </div>
          <p className="border-t border-line px-4 py-3 text-xs text-muted">This finds pages only; transaction search is not connected to a server search endpoint.</p>
        </section>
      </div>}
    </div>
  );
};

function AccountMenu({ user, onSignOut }: { user: { username?: string; role?: string; merchantId?: string } | null; onSignOut: () => void }) {
  return (
    <div className="absolute bottom-full right-0 z-50 mb-2 w-72 border border-line bg-white p-4 shadow-soft lg:bottom-auto lg:top-full lg:mt-2">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Signed-in account</p>
      <p className="mt-2 text-base font-semibold text-ink">{user?.username ?? 'Unknown user'}</p>
      {user?.role && <p className="mt-1 text-sm text-muted">Role · {user.role}</p>}
      {user?.merchantId && <p className="mt-2 break-all font-mono text-xs text-muted">Merchant ID · {user.merchantId}</p>}
      <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">Merchant name, tax number, and bank details are not provided by the current account API.</p>
      <button type="button" onClick={onSignOut} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 border border-[#e3c9c0] bg-[#faf2ee] px-4 text-sm font-semibold text-rust transition-colors hover:bg-[#f5e6de]"><Icon name="logout" size={17}/>Sign out</button>
    </div>
  );
}
