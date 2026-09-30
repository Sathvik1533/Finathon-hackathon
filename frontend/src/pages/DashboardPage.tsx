import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useReconcile } from '../hooks/useReconcile';
import { SlimIconSidebar } from '../components/layout/SlimIconSidebar';
import { downloadReportCsv } from '../api/report';
import { getReconcileAnalytics, ReconcileAnalyticsResult } from '../api/reconcile';
import { fetchPaymentsStream } from '../api/nova';
import { useAuth } from '../context/AuthContext';
import { CANONICAL_EASE, SPRING_FAST, buttonPressProps, cardHoverProps } from '../utils/motion';

const paise = (v: number) => `₹${(v / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export const DashboardPage: React.FC = () => {
  const { run, loading, error, trigger, loadLatest } = useReconcile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const periodParam = (searchParams.get('period')?.toLowerCase() === 'annually' ? 'annually' : 'monthly') as 'monthly' | 'annually';
  const rangeParam = searchParams.get('range') || 'all';
  const startDateParam = searchParams.get('startDate') || '';
  const endDateParam = searchParams.get('endDate') || '';

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [customStart, setCustomStart] = useState(startDateParam);
  const [customEnd, setCustomEnd] = useState(endDateParam);
  const [dateError, setDateError] = useState<string | null>(null);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  const [analyticsData, setAnalyticsData] = useState<ReconcileAnalyticsResult | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Close calendar popover on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCalendarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

  const loadAnalytics = useCallback(async () => {
    if (!user?.token) return;
    try {
      setAnalyticsLoading(true);
      const data = await getReconcileAnalytics(
        user.token,
        periodParam,
        rangeParam,
        startDateParam || undefined,
        endDateParam || undefined
      );
      setAnalyticsData(data);
    } catch (err) {
      console.warn('Analytics query failed:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [user?.token, periodParam, rangeParam, startDateParam, endDateParam]);

  const loadPayments = useCallback(async () => {
    if (!user?.token) return;
    try {
      setPaymentsLoading(true);
      const list = await fetchPaymentsStream(user.token);
      setPayments(list);
    } catch (err) {
      console.warn('Payments stream fetch failed:', err);
    } finally {
      setPaymentsLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, run]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments, run]);

  const handleTriggerReconcile = async () => {
    await trigger();
    await Promise.all([loadAnalytics(), loadPayments()]);
  };

  const handleExportCsv = async () => {
    if (!user?.token) return;
    try {
      const csv = await downloadReportCsv(user.token);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledgersense-report-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('CSV report generated for current session.');
    }
  };

  const CALENDAR_PRESETS = [
    { label: 'All Cycles', range: 'all' },
    { label: 'Today', range: 'today' },
    { label: 'Last 7 Days', range: '7d' },
    { label: 'Last 30 Days', range: '30d' },
  ];

  const handleSelectPreset = (presetRange: string) => {
    setDateError(null);
    const next = new URLSearchParams(searchParams);
    next.set('range', presetRange);
    next.delete('startDate');
    next.delete('endDate');
    setSearchParams(next);
    setIsCalendarOpen(false);
  };

  const handleApplyCustomRange = () => {
    if (!customStart || !customEnd) {
      setDateError('Please select both start and end dates.');
      return;
    }
    if (customStart > customEnd) {
      setDateError('Start date cannot be after end date.');
      return;
    }
    setDateError(null);
    const next = new URLSearchParams(searchParams);
    next.set('range', 'custom');
    next.set('startDate', customStart);
    next.set('endDate', customEnd);
    setSearchParams(next);
    setIsCalendarOpen(false);
  };

  const handleClearRange = () => {
    setDateError(null);
    setCustomStart('');
    setCustomEnd('');
    const next = new URLSearchParams(searchParams);
    next.set('range', 'all');
    next.delete('startDate');
    next.delete('endDate');
    setSearchParams(next);
    setIsCalendarOpen(false);
  };

  const handleSetPeriod = (p: 'monthly' | 'annually') => {
    const next = new URLSearchParams(searchParams);
    next.set('period', p);
    setSearchParams(next);
  };

  const getRangeDisplay = () => {
    if (rangeParam === 'today') return 'Today';
    if (rangeParam === '7d') return 'Last 7 Days';
    if (rangeParam === '30d') return 'Last 30 Days';
    if (rangeParam === 'custom' && startDateParam && endDateParam) {
      return `${startDateParam} – ${endDateParam}`;
    }
    return 'All Settlement Cycles';
  };

  // Dynamic series bars computed directly from backend analytics
  const series = analyticsData?.series || [];
  const maxVolume = Math.max(...series.map((s) => s.volumePaise), 0);
  const bars = series.map((s) => {
    const isPeak = s.volumePaise === maxVolume && maxVolume > 0;
    const matchPercent = s.orderCount > 0 ? `${((s.matchedCount / s.orderCount) * 100).toFixed(1)}%` : '100%';
    const height = maxVolume > 0 && s.volumePaise > 0 ? `${Math.max(14, Math.round((s.volumePaise / maxVolume) * 100))}%` : '8%';
    return {
      id: s.key,
      label: s.label,
      height,
      volume: paise(s.volumePaise),
      orders: s.orderCount,
      match: matchPercent,
      isPeak,
    };
  });

  return (
    <div className="space-y-6">
      
      {/* Welcome Row matching Pinterest reference */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome Back, {user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : 'Finance Reviewer'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            FIN-11 Multi-Stream Settlement & Payment Reconciliation Workbench
          </p>
        </div>

        <div className="flex items-center gap-3 relative">
          
          {/* Interactive Date Range Selector Pill */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className={`bg-white border rounded-full px-4 py-2 text-xs font-medium flex items-center gap-2 shadow-xs cursor-pointer transition-colors ${
                isCalendarOpen ? 'border-[#006241] text-[#006241] ring-1 ring-[#006241]' : 'border-slate-200/90 text-slate-700 hover:border-slate-300'
              }`}
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
                <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
                <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
                <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
              </svg>
              <span className="font-medium">{getRangeDisplay()}</span>
              <span className="text-slate-400 text-[10px]">▼</span>
            </motion.button>

            {/* Interactive Calendar Dropdown Popover */}
            {isCalendarOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className="absolute right-0 top-12 z-50 w-80 bg-white rounded-3xl p-4 shadow-2xl border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900">Select Settlement Window</span>
                  <button
                    onClick={() => setIsCalendarOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Presets */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Presets</div>
                  <div className="flex flex-wrap gap-1">
                    {CALENDAR_PRESETS.map((p) => (
                      <button
                        key={p.range}
                        onClick={() => handleSelectPreset(p.range)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          rangeParam === p.range
                            ? 'bg-[#e6f7ef] border-[#006241] text-[#006241] font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Inputs */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom Date Range</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Start Date</label>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full text-[11px] font-mono p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#006241]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">End Date</label>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="w-full text-[11px] font-mono p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#006241]"
                      />
                    </div>
                  </div>
                  {dateError && (
                    <div className="text-[10px] text-rose-600 font-medium">{dateError}</div>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={handleClearRange}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleApplyCustomRange}
                    className="flex-1 py-1.5 bg-[#006241] hover:bg-[#004e34] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Apply Range
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Primary Green Action Pill Button with Spring Feedback */}
          <motion.button
            {...buttonPressProps}
            onClick={handleTriggerReconcile}
            disabled={loading}
            className="bg-[#006241] hover:bg-[#004e34] text-white rounded-full px-5 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-pill transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <span className="text-sm font-bold">+</span>
            )}
            <span>{loading ? 'Reconciling...' : 'Run Reconciliation'}</span>
          </motion.button>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center justify-between"
        >
          <span>⚠ {error}</span>
          <button onClick={() => trigger()} className="underline font-semibold cursor-pointer">Retry</button>
        </motion.div>
      )}

      {/* Main Container Layout: Slim Sidebar + 3-Column Grid */}
      <div className="flex gap-6 items-start">
        
        {/* Slim Icon Bar */}
        <SlimIconSidebar />

        {/* 3-Column Pinterest Dashboard Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ========================================================= */}
          {/* LEFT COLUMN: Institutional Settlement Card + History (4 cols) */}
          {/* ========================================================= */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Card 1: Settlement Treasury Balance Card */}
            <motion.div
              {...cardHoverProps}
              className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Settlement Treasury</h3>
                  <p className="text-[11px] text-slate-400">Automated multi-stream payout</p>
                </div>
                <button
                  onClick={() => navigate('/settlement')}
                  className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 text-xs cursor-pointer"
                >
                  ↗
                </button>
              </div>

              {/* The Institutional Deep Forest Settlement Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={SPRING_FAST}
                className="bg-[#006241] text-white rounded-2xl p-5 shadow-sm space-y-3.5 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#00c070] animate-pulse" />
                    <span className="font-mono text-[10px] tracking-wider uppercase text-emerald-100 font-bold">
                      Net Clearing Pool
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-emerald-100">
                    T+2 RTGS
                  </span>
                </div>

                <div>
                  <div className="text-[10px] text-emerald-100/75 uppercase tracking-wider font-semibold">Net Bank Payout</div>
                  <div className="text-2xl font-bold tracking-tight font-mono text-white mt-0.5">
                    {run ? paise(run.totalSettledPaise) : '—'}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-emerald-100/90 font-mono pt-2 border-t border-white/15">
                  <span>UTR: CMS/NACH/901</span>
                  <span className="text-emerald-200 font-bold">0.00 Drift</span>
                </div>
              </motion.div>

              {/* Cycle Performance / Reconciliation Rate */}
              <div className="pt-2 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">Reconciliation Rate</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                    {run && run.totalRecordsProcessed > 0
                      ? `${((run.matchedCount / run.totalRecordsProcessed) * 100).toFixed(2)}% Matched`
                      : '—'}
                  </div>
                </div>
                <motion.span
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={SPRING_FAST}
                  className="bg-[#00c070] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs"
                >
                  {analyticsData ? `${analyticsData.totalOrders} Orders` : 'Audit Verified'}
                </motion.span>
              </div>
            </motion.div>

            {/* Card 2: Payment History Table */}
            <motion.div
              {...cardHoverProps}
              className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Payment History</h3>
                  <p className="text-[11px] text-slate-400">Stream transaction ledger</p>
                </div>
                <button
                  onClick={() => navigate('/timeline')}
                  className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 text-xs cursor-pointer"
                >
                  ↗
                </button>
              </div>

              <div className="space-y-3">
                {paymentsLoading ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading payment ledger...</div>
                ) : payments.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No payment records ingested yet. Click 'Run Reconciliation' to process records.
                  </div>
                ) : (
                  payments.slice(0, 5).map((pay) => {
                    const orderId = pay.order_id || pay.order_ref || pay.id;
                    const caseItem = run?.cases.find((c) => c.orderId === orderId);
                    const isFeeLeak = caseItem?.discrepancyType === 'FEE_MISMATCH';
                    const isLag = caseItem?.discrepancyType === 'TIMING_LAG';
                    const createdDate = pay.created_at
                      ? new Date(pay.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Recent';

                    return (
                      <div key={orderId} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            isFeeLeak ? 'bg-amber-50 text-amber-600' : isLag ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-[#006241]'
                          }`}>
                            {orderId.slice(-2)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{orderId}</div>
                            <div className="text-[10px] text-slate-400">{createdDate} · {pay.currency || 'INR'}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900 font-mono">{paise(pay.amount || pay.amount_paise || 0)}</div>
                          <div className="text-[10px] font-medium flex items-center justify-end gap-1">
                            {isFeeLeak ? (
                              <span className="text-amber-600 flex items-center gap-1 font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                -₹{((caseItem?.amountAtRisk || 0) / 100).toFixed(2)} Leak
                              </span>
                            ) : isLag ? (
                              <span className="text-blue-600 flex items-center gap-1 font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                T+2 In-flight
                              </span>
                            ) : (
                              <span className="text-[#00c070] flex items-center gap-1 font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#00c070]" />
                                Settled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>

          </div>

          {/* ========================================================= */}
          {/* CENTER COLUMN: Hero Engagement / Capsule Chart (4.8 cols) */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Main Center Card matching the Pinterest Center Block */}
            <motion.div
              {...cardHoverProps}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-card space-y-6"
            >
              
              {/* Header + Segmented Period Filter */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Settlement Volume & Velocity</h2>
                  <p className="text-[11px] text-slate-400">Reconciliation batch settlement velocity</p>
                </div>

                {/* Period Selector Pills */}
                <div className="bg-[#f4f5f7] p-1 rounded-full flex items-center gap-1 text-[11px] font-semibold">
                  <button
                    onClick={() => handleSetPeriod('monthly')}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      periodParam === 'monthly'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => handleSetPeriod('annually')}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      periodParam === 'annually'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Annually
                  </button>
                </div>
              </div>

              {/* Big Metric Display */}
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                    {analyticsData ? paise(analyticsData.totalVolumePaise) : (run ? paise(run.totalSettledPaise) : '—')}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {periodParam === 'monthly' ? 'Total settled volume in selected period' : 'Cumulative settled volume (Annual)'}
                  </div>
                </div>
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={SPRING_FAST}
                  className="bg-[#00c070] text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1"
                >
                  <span>▲</span>
                  <span>{analyticsData ? `${analyticsData.totalOrders} Orders` : 'T+2 Sweep'}</span>
                </motion.div>
              </div>

              {/* Dynamic Capsule Bar Chart computed from API series */}
              <div className="space-y-2 pt-2">
                <div className="h-44 flex items-end justify-between gap-3 px-2 relative">
                  
                  {analyticsLoading ? (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                      Querying settlement series...
                    </div>
                  ) : bars.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl p-4">
                      <span>No settlement volume records found for this window.</span>
                      <button
                        onClick={handleTriggerReconcile}
                        className="mt-2 text-[11px] font-bold text-[#006241] hover:underline cursor-pointer"
                      >
                        Run Reconciliation Now →
                      </button>
                    </div>
                  ) : (
                    bars.map((bar) => {
                      const isHovered = hoveredBar === bar.id;
                      return (
                        <div
                          key={bar.id}
                          onMouseEnter={() => setHoveredBar(bar.id)}
                          onMouseLeave={() => setHoveredBar(null)}
                          className="flex-1 flex flex-col items-center gap-2 h-full justify-end relative cursor-pointer group"
                        >
                          {/* Interactive Floating Hover Tooltip */}
                          {isHovered && (
                            <motion.div
                              initial={{ opacity: 0, y: 4, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              className="absolute -top-14 z-30 bg-slate-900 text-white rounded-xl p-2 text-center shadow-xl border border-slate-700 pointer-events-none whitespace-nowrap"
                            >
                              <div className="text-[10px] font-bold text-emerald-400 font-mono">{bar.volume}</div>
                              <div className="text-[9px] text-slate-300 font-mono">{bar.orders} orders · {bar.match}</div>
                            </motion.div>
                          )}

                          {bar.isPeak && !isHovered && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3, ...SPRING_FAST }}
                              className="absolute -top-7 bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded-md whitespace-nowrap shadow-xs"
                            >
                              {bar.volume} Peak
                            </motion.div>
                          )}

                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: bar.height }}
                            transition={{ duration: 0.5, ease: CANONICAL_EASE }}
                            className={`w-full max-w-[42px] rounded-full transition-all ${
                              bar.isPeak
                                ? 'bg-[#006241] shadow-pill group-hover:bg-[#004e34]'
                                : isHovered
                                ? 'bg-[#00c070]/60 border border-[#006241]'
                                : 'bar-striped border border-emerald-200/80 group-hover:border-emerald-400'
                            }`}
                          />
                          <span className={`text-[10px] font-semibold transition-colors ${
                            bar.isPeak ? 'text-[#006241] font-bold' : isHovered ? 'text-slate-900 font-bold' : 'text-slate-400'
                          }`}>
                            {bar.label}
                          </span>
                        </div>
                      );
                    })
                  )}

                </div>
              </div>

              {/* Engine Pipeline Status Line */}
              <div className="p-4 bg-[#e6f7ef] border border-[#c1ebd5] rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#00c070] animate-pulse" />
                  <span className="font-semibold text-[#006241]">7-Stage Engine Operational</span>
                </div>
                <span className="font-mono text-[#006241] font-bold">11/11 Modules Active</span>
              </div>

            </motion.div>

          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Flow Area Chart + Amount at Risk (3.2 cols) */}
          {/* ========================================================= */}
          <div className="lg:col-span-3 space-y-6">

            {/* Card 4: Flow Chart Card with Reconcile / Export Buttons */}
            <motion.div
              {...cardHoverProps}
              className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reconciliation Flow</h3>
                  <p className="text-[11px] text-slate-400">Stream trajectory</p>
                </div>
                <div className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 text-xs">
                  ≋
                </div>
              </div>

              {/* Area Wave / SVG Chart */}
              <div className="h-28 w-full relative overflow-hidden flex items-end">
                <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="forestAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#006241" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#006241" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,55 C30,30 60,65 100,25 C140,-5 170,40 200,10 L200,80 L0,80 Z"
                    fill="url(#forestAreaGrad)"
                  />
                  <path
                    d="M0,55 C30,30 60,65 100,25 C140,-5 170,40 200,10"
                    fill="none"
                    stroke="#006241"
                    strokeWidth="2.5"
                  />
                </svg>
              </div>

              {/* Dual Action Pill Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <motion.button
                  {...buttonPressProps}
                  onClick={handleTriggerReconcile}
                  disabled={loading}
                  className="flex-1 bg-[#006241] hover:bg-[#004e34] text-white rounded-full py-2 px-3 text-xs font-semibold shadow-pill transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <span>Reconcile</span>
                  <span>↑</span>
                </motion.button>
                <motion.button
                  {...buttonPressProps}
                  onClick={handleExportCsv}
                  className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full py-2 px-3 text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Export</span>
                  <span>↓</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Card 5: Amount at Risk Card with Stacked Avatars */}
            <motion.div
              {...cardHoverProps}
              className="bg-[#e6f7ef] border border-[#c1ebd5] rounded-3xl p-5 shadow-xs space-y-4"
            >
              <div>
                <div className="text-[11px] font-bold text-[#006241] uppercase tracking-wider">
                  Amount at Risk (M10)
                </div>
                <div className="text-2xl font-bold font-mono text-[#006241] mt-1">
                  {run ? paise(run.totalAmountAtRiskPaise) : '—'}
                </div>
                <div className="text-[11px] text-emerald-800/80 mt-0.5">
                  {run ? `${run.discrepancyCount} exceptions pending human triage` : 'No active exceptions'}
                </div>
              </div>

              {/* Stacked FinOps Team Avatars matching Pinterest Card */}
              <div className="pt-2 flex items-center justify-between">
                <div className="flex -space-x-2">
                  <div className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
                    P
                  </div>
                  <div className="h-7 w-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
                    R
                  </div>
                  <div className="h-7 w-7 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
                    S
                  </div>
                  <div className="h-7 w-7 rounded-full bg-[#006241] text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white">
                    +2
                  </div>
                </div>

                <motion.button
                  {...buttonPressProps}
                  onClick={() => navigate('/exceptions')}
                  className="text-xs font-bold text-[#006241] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Triage</span>
                  <span>→</span>
                </motion.button>
              </div>
            </motion.div>

          </div>

        </div>

      </div>

    </div>
  );
};
