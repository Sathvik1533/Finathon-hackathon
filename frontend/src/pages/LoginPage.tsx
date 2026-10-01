import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    } catch (err: any) {
      if (err.message && (err.message.toLowerCase().includes('unavailable') || err.message.toLowerCase().includes('failed to fetch') || err.message.toLowerCase().includes('unreachable'))) {
        setError('Authentication service unavailable');
      } else {
        setError(err instanceof Error ? err.message : 'Invalid credentials. Please verify your username and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-[#17211C]">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto pt-4 sm:pt-8 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs text-[#526058] hover:text-[#17211C] transition-colors cursor-pointer"
        >
          <span>←</span>
          <span>Return to product overview</span>
        </button>
        <span className="font-mono text-xs text-[#7E8C84]">FIN-11</span>
      </header>

      {/* Main Form Work Surface */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white border border-[#E5E3DA] rounded-lg p-6 sm:p-8 shadow-xs space-y-6">
          
          {/* Header */}
          <div className="space-y-2 border-b border-[#E5E3DA] pb-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded border border-[#17211C] bg-[#17211C] text-[#F7F6F2] flex items-center justify-center font-serif text-xs font-bold">
                L
              </div>
              <span className="font-semibold text-sm tracking-tight text-[#17211C]">LedgerSense</span>
            </div>
            <h1 className="font-editorial text-2xl text-[#17211C] font-normal pt-1">
              Sign in to LedgerSense
            </h1>
            <p className="text-xs text-[#526058] leading-relaxed">
              Enter authorized operator credentials to access the three-way reconciliation engine, exception queue, and audit logs.
            </p>
          </div>

          {/* Quick Operator / Dynamic Access Presets */}
          <div className="p-3 bg-[#F0F5F2] border border-[#C5DACF] rounded text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#1B4332] text-xs">Operator & Dynamic Access</span>
              <span className="text-[10px] font-mono bg-[#1B4332] text-white px-1.5 py-0.5 rounded">Dynamic Auth</span>
            </div>
            <p className="text-[11px] text-[#3D5A4C] leading-relaxed">
              Select standard credentials below or sign in with any custom username and password for dynamic evaluation.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => { setUsername('admin'); setPassword('Admin@Ledger2026!'); setError(''); }}
                className="px-2 py-1 bg-white border border-[#A7C8B8] hover:bg-[#E2EDE7] text-[11px] text-[#1B4332] rounded font-medium cursor-pointer transition-colors"
              >
                Fill Admin
              </button>
              <button
                type="button"
                onClick={() => { setUsername('reviewer'); setPassword('reviewer123'); setError(''); }}
                className="px-2 py-1 bg-white border border-[#A7C8B8] hover:bg-[#E2EDE7] text-[11px] text-[#1B4332] rounded font-medium cursor-pointer transition-colors"
              >
                Fill Reviewer
              </button>
              <button
                type="button"
                onClick={() => { setUsername('auditor'); setPassword('auditor123'); setError(''); }}
                className="px-2 py-1 bg-white border border-[#A7C8B8] hover:bg-[#E2EDE7] text-[11px] text-[#1B4332] rounded font-medium cursor-pointer transition-colors"
              >
                Fill Auditor
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#17211C] mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="e.g. admin, reviewer, or any dynamic username"
                className="w-full bg-white border border-[#DCD8CD] focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332] rounded px-3 py-2 text-xs text-[#17211C] placeholder-[#7E8C84] outline-none transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#17211C]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-[#526058] hover:text-[#17211C] cursor-pointer"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="e.g. Admin@Ledger2026! or any password"
                className="w-full bg-white border border-[#DCD8CD] focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332] rounded px-3 py-2 text-xs text-[#17211C] placeholder-[#7E8C84] outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-[#FDF2F0] border border-[#F2C4BE] rounded text-xs text-[#A34338] flex items-start gap-2">
                <svg className="w-4 h-4 text-[#A34338] shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm0-10.5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 018 4.5zm0 8a.9.9 0 100-1.8.9.9 0 000 1.8z" clipRule="evenodd" />
                </svg>
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#1B4332] hover:bg-[#143225] disabled:opacity-50 text-white rounded text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          {/* Diagnostic Note */}
          <div className="pt-3 border-t border-[#E5E3DA] text-[11px] text-[#7E8C84] flex items-center justify-between">
            <span>Role-Based Authentication</span>
            <span className="font-mono">JWT Bearer Session</span>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto pb-4 sm:pb-8 text-center text-xs text-[#7E8C84]">
        <span>LedgerSense Reconciliation Platform · Deterministic Operations</span>
      </footer>
    </div>
  );
};
