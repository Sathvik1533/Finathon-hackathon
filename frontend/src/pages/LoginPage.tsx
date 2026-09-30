import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { buttonPressProps, CANONICAL_EASE, SPRING_FAST, SPRING_SMOOTH } from '../utils/motion';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<'admin' | 'reviewer' | 'custom'>('admin');

  const setRolePreset = (role: 'admin' | 'reviewer') => {
    setActivePreset(role);
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('reviewer');
      setPassword('reviewer123');
    }
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center p-3 sm:p-6 lg:p-10 antialiased selection:bg-[#006241]/20 selection:text-[#006241]">
      
      {/* Outer Rounded Container matching Pinterest Geometry */}
      <div className="w-full max-w-5xl bg-white rounded-[32px] shadow-card border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Premium Forest Green Showcase (5 Cols)        */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 bg-[#006241] p-8 sm:p-10 flex flex-col justify-between text-white relative overflow-hidden">
          
          {/* Ambient Radial Lights */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/15 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10" />

          {/* Top Brand Mark */}
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 10, scale: 1.05 }}
                transition={SPRING_FAST}
                className="h-10 w-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-white shadow-sm"
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                  <circle cx="12" cy="12" r="4" fill="white" />
                </svg>
              </motion.div>
              <div>
                <div className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                  <span>LedgerSense</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/20 border border-white/30 font-bold">
                    FIN-11
                  </span>
                </div>
                <div className="text-[11px] text-emerald-100/70 font-medium">Payment Reconciliation Engine</div>
              </div>
            </div>
          </div>

          {/* Center Floating Glass VISA Card */}
          <div className="relative z-10 py-6 my-auto space-y-4">
            
            {/* The Luxury Card */}
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: CANONICAL_EASE }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="rounded-3xl p-6 bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-xl border border-white/30 shadow-2xl space-y-5 text-white relative overflow-hidden"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <span className="font-extrabold tracking-widest text-lg text-white">VISA</span>
                <span className="text-sm font-mono opacity-80">)))</span>
              </div>

              {/* Card Chip & Balance */}
              <div className="space-y-1">
                <div className="h-6 w-9 rounded-md bg-amber-300/80 border border-amber-200/90 shadow-xs mb-2" />
                <div className="text-[10px] text-emerald-100/80 uppercase tracking-wider font-semibold">Active Settled Balance</div>
                <div className="text-2xl font-bold tracking-tight font-mono text-white">₹ 48,702.00</div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between text-xs font-mono text-emerald-100/90 pt-1 border-t border-white/15">
                <span>PRIYA SHARMA</span>
                <span>EXP 09/28</span>
              </div>
            </motion.div>

            {/* Live Balanced Status Pill */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00c070] animate-pulse" />
                <span className="font-semibold text-white">7-Stage Engine Operational</span>
              </div>
              <span className="font-mono text-emerald-200 font-bold">Zero Drift</span>
            </div>

          </div>

          {/* Bottom Security Assurance */}
          <div className="relative z-10 pt-4 border-t border-white/15 space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-emerald-100/80 font-medium">
              <span>🛡️ Bank-grade 256-bit encryption</span>
              <span>·</span>
              <span>J.P. Morgan synthetic feeds</span>
            </div>
            <p className="text-[11px] text-emerald-100/60 leading-relaxed">
              Deterministic multi-stream verification balancing ERP, Payment Gateway, and Bank statement records.
            </p>
          </div>

        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Interactive Login Console (7 Cols)           */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between bg-white">
          
          {/* Top Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Operator Sign In</span>
              <button
                onClick={() => navigate('/neuform')}
                className="text-xs font-semibold text-[#006241] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Neuform AI Specs</span>
                <span>→</span>
              </button>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Welcome to FinOps Console
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Access live discrepancy queues, 1:N settlement batches, and mathematical audit logs.
            </p>
          </div>

          {/* Quick 1-Click Role Presets */}
          <div className="my-6 space-y-2">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Quick 1-Click Demo Profiles (For Evaluator):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              <button
                type="button"
                onClick={() => setRolePreset('admin')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  activePreset === 'admin'
                    ? 'bg-[#e6f7ef] border-[#006241] text-[#006241] ring-1 ring-[#006241]'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>👑 Priya Sharma</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-white border border-[#c1ebd5]">Admin</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">admin / admin123</div>
                </div>
                {activePreset === 'admin' && <span className="text-sm font-bold text-[#006241]">✓</span>}
              </button>

              <button
                type="button"
                onClick={() => setRolePreset('reviewer')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  activePreset === 'reviewer'
                    ? 'bg-[#e6f7ef] border-[#006241] text-[#006241] ring-1 ring-[#006241]'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>🔍 Rahul Verma</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-white border border-[#c1ebd5]">Reviewer</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">reviewer / reviewer123</div>
                </div>
                {activePreset === 'reviewer' && <span className="text-sm font-bold text-[#006241]">✓</span>}
              </button>

            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Username or ID</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    setActivePreset('custom');
                  }}
                  required
                  placeholder="admin"
                  className="w-full border border-slate-200 rounded-2xl pl-10 pr-3.5 py-3 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#006241]/20 focus:border-[#006241] transition-all bg-slate-50/50 hover:bg-white"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <span className="text-[10px] text-slate-400 font-mono">Demo: admin123</span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setActivePreset('custom');
                  }}
                  required
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#006241]/20 focus:border-[#006241] transition-all bg-slate-50/50 hover:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Error Message with AnimatePresence */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2"
                >
                  <span>⚠️</span>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              {...buttonPressProps}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#006241] hover:bg-[#004e34] text-white rounded-full text-xs font-semibold shadow-pill transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Authenticating session...</span>
                </>
              ) : (
                <>
                  <span>Sign in to FinOps Console</span>
                  <span className="text-sm font-bold">→</span>
                </>
              )}
            </motion.button>

          </form>

          {/* Bottom Help Text */}
          <div className="pt-4 text-center text-[11px] text-slate-400 border-t border-slate-100 flex items-center justify-between">
            <span>FIN-11 Jury Evaluation Build</span>
            <span className="font-mono text-[#006241] font-semibold">100% Operational</span>
          </div>

        </div>

      </div>

    </div>
  );
};
