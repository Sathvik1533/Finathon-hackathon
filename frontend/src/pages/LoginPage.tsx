import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { buttonPressProps, SPRING_SMOOTH } from '../utils/motion';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
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
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING_SMOOTH}
        className="w-full max-w-sm"
      >
        {/* Logo matching Pinterest green mark */}
        <div className="text-center mb-6">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="h-12 w-12 rounded-2xl bg-[#006241] mx-auto flex items-center justify-center text-white font-bold text-xl shadow-pill mb-3"
          >
            LS
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">LedgerSense</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">FIN-11 · Payment Reconciliation Engine</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-card p-8 space-y-5">
          <h2 className="text-base font-bold text-slate-900">Sign in to your console</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                placeholder="admin"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006241]/20 focus:border-[#006241] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006241]/20 focus:border-[#006241] transition-colors"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              {...buttonPressProps}
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#006241] hover:bg-[#004e34] text-white rounded-full text-xs font-semibold shadow-pill transition-colors cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign in to Console'}
            </motion.button>
          </form>
        </div>

        <div className="text-center mt-5 text-xs text-slate-400 space-y-1">
          <div>Admin demo: <span className="font-mono text-slate-600 font-semibold">admin / admin123</span></div>
          <div>Reviewer demo: <span className="font-mono text-slate-600 font-semibold">reviewer / reviewer123</span></div>
        </div>
      </motion.div>
    </div>
  );
};
