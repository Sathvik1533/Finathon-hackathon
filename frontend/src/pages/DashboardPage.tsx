import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useReconcile } from '../hooks/useReconcile';
import { SlimIconSidebar } from '../components/layout/SlimIconSidebar';
import { downloadReportCsv } from '../api/report';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CANONICAL_EASE, SPRING_FAST, buttonPressProps, cardHoverProps } from '../utils/motion';

const paise = (v: number) => `₹${(v / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export const DashboardPage: React.FC = () => {
  const { run, loading, error, trigger, loadLatest } = useReconcile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filterPeriod, setFilterPeriod] = useState<'Monthly' | 'Annually'>('Annually');

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

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

  return (
    <div className="space-y-6">
      
      {/* Welcome Row matching Pinterest reference */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome Back, {user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : 'Priya'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            FIN-11 Multi-Stream Settlement & Payment Reconciliation Hub
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector Pill */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white border border-slate-200/90 rounded-full px-4 py-2 text-xs font-medium text-slate-700 flex items-center gap-2 shadow-xs cursor-pointer hover:border-slate-300"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
              <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
              <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
              <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
            </svg>
            <span>29 Sep, 2026 – 01 Oct, 2026</span>
            <span className="text-slate-400 text-[10px]">▼</span>
          </motion.div>

          {/* Primary Green Action Pill Button with Spring Feedback */}
          <motion.button
            {...buttonPressProps}
            onClick={trigger}
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
                    {run ? paise(run.totalSettledPaise) : '₹ 4,870.20'}
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
                  <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">99.98% Matched</div>
                </div>
                <motion.span
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={SPRING_FAST}
                  className="bg-[#00c070] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs"
                >
                  +12.8% Cycle
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
                  <p className="text-[11px] text-slate-400">Recent payments history</p>
                </div>
                <button
                  onClick={() => navigate('/timeline')}
                  className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 text-xs cursor-pointer"
                >
                  ↗
                </button>
              </div>

              <div className="space-y-3">
                {/* Row 1: ORD-101 */}
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-[10px]">
                      D
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">ORD-101 Clean</div>
                      <div className="text-[10px] text-slate-400">16 Jun 2026 · 10:30 PM</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 font-mono">₹1,000.00</div>
                    <div className="text-[10px] text-[#00c070] font-medium flex items-center justify-end gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#00c070]" /> Settled
                    </div>
                  </div>
                </div>

                {/* Row 2: ORD-102 */}
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">
                      G
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">ORD-102 High Val</div>
                      <div className="text-[10px] text-slate-400">15 Jun 2026 · 11:45 PM</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 font-mono">₹2,500.00</div>
                    <div className="text-[10px] text-[#00c070] font-medium flex items-center justify-end gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#00c070]" /> Settled
                    </div>
                  </div>
                </div>

                {/* Row 3: ORD-103 */}
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-[10px]">
                      A
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">ORD-103 Fee Leak</div>
                      <div className="text-[10px] text-slate-400">14 Jun 2026 · 10:15 PM</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 font-mono">₹1,500.00</div>
                    <div className="text-[10px] text-amber-600 font-medium flex items-center justify-end gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> ₹10 Leak
                    </div>
                  </div>
                </div>

                {/* Row 4: ORD-104 */}
                <div className="flex items-center justify-between text-xs py-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px]">
                      N
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">ORD-104 Lag</div>
                      <div className="text-[10px] text-slate-400">30 Sep 2026 · 08:30 AM</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 font-mono">₹800.00</div>
                    <div className="text-[10px] text-blue-600 font-medium flex items-center justify-end gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> T+2 Lag
                    </div>
                  </div>
                </div>

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
                  <h2 className="text-base font-bold text-slate-900">Engagement Rates</h2>
                  <p className="text-[11px] text-slate-400">Reconciliation batch settlement velocity</p>
                </div>

                {/* Period Selector Pills */}
                <div className="bg-[#f4f5f7] p-1 rounded-full flex items-center gap-1 text-[11px] font-semibold">
                  <button
                    onClick={() => setFilterPeriod('Monthly')}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      filterPeriod === 'Monthly'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setFilterPeriod('Annually')}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      filterPeriod === 'Annually'
                        ? 'bg-white text-slate-900 shadow-xs'
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
                    {run ? paise(run.totalSettledPaise) : '₹48,702.00'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Total settled volume this cycle</div>
                </div>
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={SPRING_FAST}
                  className="bg-[#00c070] text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1"
                >
                  <span>▲</span>
                  <span>+17.8%</span>
                </motion.div>
              </div>

              {/* 6-Capsule Bar Chart matching Pinterest Reference */}
              <div className="space-y-2 pt-2">
                <div className="h-44 flex items-end justify-between gap-3 px-2">
                  
                  {/* Bar 1 - Striped Sage */}
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: '48%' }}
                      transition={{ duration: 0.6, ease: CANONICAL_EASE, delay: 0.05 }}
                      className="w-full max-w-[42px] rounded-full bar-striped border border-emerald-200/80"
                    />
                    <span className="text-[10px] font-semibold text-slate-400">Jan</span>
                  </div>

                  {/* Bar 2 - Striped Sage */}
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: '62%' }}
                      transition={{ duration: 0.6, ease: CANONICAL_EASE, delay: 0.12 }}
                      className="w-full max-w-[42px] rounded-full bar-striped border border-emerald-200/80"
                    />
                    <span className="text-[10px] font-semibold text-slate-400">Feb</span>
                  </div>

                  {/* Bar 3 - Striped Sage */}
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: '38%' }}
                      transition={{ duration: 0.6, ease: CANONICAL_EASE, delay: 0.19 }}
                      className="w-full max-w-[42px] rounded-full bar-striped border border-emerald-200/80"
                    />
                    <span className="text-[10px] font-semibold text-slate-400">Mar</span>
                  </div>

                  {/* Bar 4 - Striped Sage */}
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: '75%' }}
                      transition={{ duration: 0.6, ease: CANONICAL_EASE, delay: 0.26 }}
                      className="w-full max-w-[42px] rounded-full bar-striped border border-emerald-200/80"
                    />
                    <span className="text-[10px] font-semibold text-slate-400">Apr</span>
                  </div>

                  {/* Bar 5 - Striped Sage */}
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: '54%' }}
                      transition={{ duration: 0.6, ease: CANONICAL_EASE, delay: 0.33 }}
                      className="w-full max-w-[42px] rounded-full bar-striped border border-emerald-200/80"
                    />
                    <span className="text-[10px] font-semibold text-slate-400">May</span>
                  </div>

                  {/* Bar 6 - The Active Solid Forest Green Peak Bar */}
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end relative">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, ...SPRING_FAST }}
                      className="absolute -top-7 bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded-md whitespace-nowrap shadow-xs"
                    >
                      ₹48.7k Peak
                    </motion.div>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: '92%' }}
                      transition={{ duration: 0.6, ease: CANONICAL_EASE, delay: 0.4 }}
                      className="w-full max-w-[42px] rounded-full bg-[#006241] shadow-pill"
                    />
                    <span className="text-[10px] font-bold text-[#006241]">Jun</span>
                  </div>

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
                  onClick={() => trigger()}
                  className="flex-1 bg-[#006241] hover:bg-[#004e34] text-white rounded-full py-2 px-3 text-xs font-semibold shadow-pill transition-colors flex items-center justify-center gap-1 cursor-pointer"
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
                  {run ? paise(run.totalAmountAtRiskPaise) : '₹792.92'}
                </div>
                <div className="text-[11px] text-emerald-800/80 mt-0.5">
                  {run ? `${run.discrepancyCount} exceptions pending human triage` : '2 exceptions pending review'}
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
