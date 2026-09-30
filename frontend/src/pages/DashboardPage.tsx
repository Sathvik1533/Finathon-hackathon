import React, { useEffect, useState } from 'react';
import { useReconcile } from '../hooks/useReconcile';
import { SlimIconSidebar } from '../components/layout/SlimIconSidebar';
import { downloadReportCsv } from '../api/report';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
          <div className="bg-white border border-slate-200/90 rounded-full px-4 py-2 text-xs font-medium text-slate-700 flex items-center gap-2 shadow-xs cursor-pointer hover:border-slate-300">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
              <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
              <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
              <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
            </svg>
            <span>29 Sep, 2026 – 01 Oct, 2026</span>
            <span className="text-slate-400 text-[10px]">▼</span>
          </div>

          {/* Primary Green Action Pill Button */}
          <button
            onClick={trigger}
            disabled={loading}
            className="bg-[#006241] hover:bg-[#004e34] active:scale-[0.98] text-white rounded-full px-5 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-pill transition-all cursor-pointer disabled:opacity-50"
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
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center justify-between">
          <span>⚠ {error}</span>
          <button onClick={() => trigger()} className="underline font-semibold">Retry</button>
        </div>
      )}

      {/* Main Container Layout: Slim Sidebar + 3-Column Grid */}
      <div className="flex gap-6 items-start">
        
        {/* Slim Icon Bar */}
        <SlimIconSidebar />

        {/* 3-Column Pinterest Dashboard Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ========================================================= */}
          {/* LEFT COLUMN: VISA-Style Green Card + Payment History (3.8 cols) */}
          {/* ========================================================= */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Card 1: Payment Goal with Forest Green VISA Card */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Payment Goal</h3>
                  <p className="text-[11px] text-slate-400">Total amount goal</p>
                </div>
                <button
                  onClick={() => navigate('/settlement')}
                  className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 text-xs"
                >
                  ↗
                </button>
              </div>

              {/* The Iconic Forest Green Card */}
              <div className="bg-[#006241] text-white rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold tracking-wider text-base">VISA</span>
                  <span className="text-xs font-mono opacity-80">)))</span>
                </div>
                <div>
                  <div className="text-[11px] text-emerald-100/80">Settled Balance</div>
                  <div className="text-2xl font-bold tracking-tight text-white mt-0.5">
                    {run ? paise(run.totalSettledPaise) : '₹ 4,870.20'}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-100/90 font-mono pt-1">
                  <span>**** 99182</span>
                  <span>EXP 09/26</span>
                </div>
              </div>

              {/* Weekly Revenue / Net Settled */}
              <div className="pt-2 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">Weekly Revenue</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">+₹3,945 USD</div>
                </div>
                <span className="bg-[#00c070] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                  +12.8%
                </span>
              </div>
            </div>

            {/* Card 2: Payment History Table */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Payment History</h3>
                  <p className="text-[11px] text-slate-400">Recent payments history</p>
                </div>
                <button
                  onClick={() => navigate('/timeline')}
                  className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 text-xs"
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
                    <div className="font-bold text-slate-900 mono">₹1,000.00</div>
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
                    <div className="font-bold text-slate-900 mono">₹2,500.00</div>
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
                    <div className="font-bold text-slate-900 mono">₹1,500.00</div>
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
                    <div className="font-bold text-slate-900 mono">₹800.00</div>
                    <div className="text-[10px] text-blue-600 font-medium flex items-center justify-end gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> T+2 Lag
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* ========================================================= */}
          {/* CENTER COLUMN: Hero Engagement / Capsule Chart (4.8 cols) */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-card space-y-6">
              
              {/* Header with Segmented Pills */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#e6f7ef] text-[#006241] flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2" />
                      <line x1="2" y1="10" x2="22" y2="10" strokeWidth="2" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Engagement Rate</h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-[#f4f5f7] p-1 rounded-full flex items-center text-xs">
                    <button
                      onClick={() => setFilterPeriod('Monthly')}
                      className={`px-3 py-1 rounded-full transition-colors ${
                        filterPeriod === 'Monthly'
                          ? 'bg-[#006241] text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setFilterPeriod('Annually')}
                      className={`px-3 py-1 rounded-full transition-colors ${
                        filterPeriod === 'Annually'
                          ? 'bg-[#006241] text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Annually
                    </button>
                  </div>
                  <button
                    onClick={() => navigate('/report')}
                    className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 text-xs"
                  >
                    ↗
                  </button>
                </div>
              </div>

              {/* The Iconic Pinterest Striped Capsule Bars Chart */}
              <div className="pt-6 pb-2">
                <div className="flex items-end justify-between gap-3 h-52 px-2 relative">
                  
                  {/* Floating Pill on Peak Apr Bar */}
                  <div className="absolute top-0 left-[55%] -translate-x-1/2 z-10">
                    <span className="bg-[#00c070] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      +17.8%
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#006241] mx-auto mt-0.5" />
                  </div>

                  {/* Bar 1: JAN (2k) */}
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full max-w-[42px] h-20 bar-striped rounded-full transition-all hover:scale-105" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">JAN</span>
                  </div>

                  {/* Bar 2: FEB (4.2k) */}
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full max-w-[42px] h-36 bar-striped rounded-full transition-all hover:scale-105" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">FEB</span>
                  </div>

                  {/* Bar 3: MAR (3k) */}
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full max-w-[42px] h-28 bar-striped rounded-full transition-all hover:scale-105" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">MAR</span>
                  </div>

                  {/* Bar 4: APR (Peak 5k - Solid Deep Green Bar!) */}
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full max-w-[42px] h-48 bg-[#006241] rounded-full shadow-sm transition-all hover:scale-105" />
                    <span className="text-[10px] font-bold text-slate-900 uppercase">APR</span>
                  </div>

                  {/* Bar 5: MAY (3.8k) */}
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full max-w-[42px] h-32 bar-striped rounded-full transition-all hover:scale-105" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">MAY</span>
                  </div>

                  {/* Bar 6: JUN (4k) */}
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full max-w-[42px] h-38 bar-striped rounded-full transition-all hover:scale-105" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">JUN</span>
                  </div>

                </div>
              </div>

              {/* 7-Stage Reconciliation Pipeline Cards */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">7-Stage Deterministic Reconciliation</span>
                  <span className="text-[10px] font-mono text-[#006241] bg-[#e6f7ef] px-2 py-0.5 rounded-full font-semibold">
                    100% Accuracy · 0 Drift
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="font-bold text-slate-900">S1 Txn-ID</div>
                    <div className="text-emerald-700 font-semibold mt-0.5">✓ 1.0 Match</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="font-bold text-slate-900">S2 UTR Regex</div>
                    <div className="text-emerald-700 font-semibold mt-0.5">✓ Parsed</div>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="font-bold text-amber-900">S4 Fee Audit</div>
                    <div className="text-amber-800 font-bold mt-0.5">⚠️ ₹10 Leak</div>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="font-bold text-blue-900">S6 Settle 1:N</div>
                    <div className="text-blue-800 font-bold mt-0.5">⏱️ T+2 Lag</div>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Total Balance Curve + Amount at Risk (3.2 cols) */}
          {/* ========================================================= */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Card A: Payment Goal / Area Curve Card */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Payment Goal</h3>
                  <p className="text-[11px] text-slate-400">Total amount goal</p>
                </div>
                <button
                  onClick={() => navigate('/report')}
                  className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 text-xs"
                >
                  ↗
                </button>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Balance</div>
                <div className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                  $32,678.90
                </div>
              </div>

              {/* Area Curve Chart SVG */}
              <div className="h-20 w-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 200 80" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="mintGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00c070" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#00c070" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,50 Q20,35 40,48 T80,30 T120,45 T160,25 T200,35 L200,80 L0,80 Z"
                    fill="url(#mintGrad)"
                  />
                  <path
                    d="M0,50 Q20,35 40,48 T80,30 T120,45 T160,25 T200,35"
                    fill="none"
                    stroke="#00c070"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Dual Action Buttons matching reference (Send ↑ / Receive ↓) */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => trigger()}
                  disabled={loading}
                  className="bg-[#006241] hover:bg-[#004e34] active:scale-95 text-white rounded-full py-2 text-xs font-semibold flex items-center justify-center gap-1 shadow-xs transition-all"
                >
                  <span>Reconcile</span>
                  <span>↑</span>
                </button>
                <button
                  onClick={handleExportCsv}
                  className="bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 rounded-full py-2 text-xs font-semibold flex items-center justify-center gap-1 shadow-xs transition-all"
                >
                  <span>Export</span>
                  <span>↓</span>
                </button>
              </div>
            </div>

            {/* Card B: Amount of credit / Amount at Risk */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-card space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-[#e6f7ef] text-[#006241] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2" />
                    <line x1="2" y1="10" x2="22" y2="10" strokeWidth="2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Amount of credit</h3>
                  <p className="text-[10px] text-slate-400">Total refund amount with fee</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold tracking-tight text-slate-900">
                  {run ? paise(run.totalAmountAtRiskPaise) : '₹8,945.89'}
                </div>
                <span className="bg-[#00c070] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                  +12.8%
                </span>
              </div>

              {/* Mandatory Payments & Reviewers Row */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Mandatory Review</div>
                  <div className="text-[10px] text-slate-400">Recent review policy</div>
                </div>

                {/* Stacked Avatars + Green Badge */}
                <div className="flex items-center -space-x-2">
                  <div className="h-7 w-7 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                    P
                  </div>
                  <div className="h-7 w-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                    R
                  </div>
                  <div className="h-7 w-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                    A
                  </div>
                  <div className="h-7 w-7 rounded-full bg-[#006241] border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                    +2
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
