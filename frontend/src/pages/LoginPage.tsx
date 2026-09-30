import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { buttonPressProps } from '../utils/motion';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 sm:p-6 lg:p-8 antialiased selection:bg-[#006241]/20 selection:text-[#006241]">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-card border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
        
        {/* Left Column: Institutional Brand & Reconciliation Purpose (5 cols) */}
        <div className="md:col-span-5 bg-[#006241] p-8 flex flex-col justify-between text-white relative">
          
          {/* Header Mark */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-white shadow-xs shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                  <circle cx="12" cy="12" r="4" fill="white" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                  <span>LedgerSense</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/20 border border-white/30 font-bold">
                    FIN-11
                  </span>
                </div>
                <div className="text-[11px] text-emerald-100/80 font-medium">Reconciliation & Settlement Engine</div>
              </div>
            </div>

            <p className="text-xs text-emerald-100/90 leading-relaxed pt-2">
              Automated 4-stream reconciliation cross-referencing internal ERP orders, payment processor captures, bank clearing statements, and 1:N lump-sum settlement batches.
            </p>
          </div>

          {/* Institutional Compliance Indicators */}
          <div className="space-y-3 py-6">
            <div className="border border-white/15 rounded-2xl p-4 bg-white/5 space-y-2.5 text-xs">
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-200 font-semibold">
                Engine Specification
              </div>
              <ul className="space-y-1.5 text-[11px] text-emerald-50">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shrink-0" />
                  <span>Sub-120ms deterministic 7-stage pipeline</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shrink-0" />
                  <span>Exact integer paise precision (Zero penny drift)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shrink-0" />
                  <span>Cryptographic append-only audit trail</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shrink-0" />
                  <span>MDR fee & 18% GST tax schedule recomputation</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="pt-4 border-t border-white/15 text-[11px] text-emerald-100/70 font-mono flex items-center justify-between">
            <span>Role-Based Access Control</span>
            <span>JWT Secure Session</span>
          </div>

        </div>

        {/* Right Column: Clean Credentials Form (7 cols) */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between bg-white">
          
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#006241]">
              FinOps Portal
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Sign In to LedgerSense
            </h1>
            <p className="text-xs text-slate-500">
              Enter your authorized operator credentials to access discrepancy review and settlement queues.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="my-6 space-y-4">
            
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Operator Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="e.g. admin or reviewer"
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#006241]/20 focus:border-[#006241] transition-all bg-slate-50/50 hover:bg-white"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="w-full border border-slate-200 rounded-2xl pl-4 pr-12 py-3 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#006241]/20 focus:border-[#006241] transition-all bg-slate-50/50 hover:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer text-xs font-medium"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2"
                >
                  <span className="font-bold">⚠️</span>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
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
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="font-bold">→</span>
                </>
              )}
            </motion.button>

          </form>

          {/* Test / Evaluation Notice */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Evaluation Accounts: admin / reviewer</span>
            <span className="font-mono text-[#006241] font-semibold">Active Engine</span>
          </div>

        </div>

      </div>
    </div>
  );
};
