import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="LedgerSense home">
          <span className="grid h-9 w-9 place-items-center border border-ink rounded-sm text-forest" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5.5h14M5 10.5h9M5 15.5h14M5 20.5h9"/><path d="m15.5 11.5 2.2 2.2 3.8-4"/></svg>
          </span>
          <span className="text-base font-semibold tracking-[-0.04em]">LedgerSense</span>
        </Link>
        <Link to="/" className="inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-ink">Back to home</Link>
      </header>

      <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-8 sm:px-8 sm:pt-14 lg:grid-cols-[1fr_0.82fr] lg:gap-20 lg:pb-24">
        <section className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest">LedgerSense workspace</p>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-[-0.04em] sm:text-5xl">A clearer view of the close.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted">Sign in to trace payment records, review exceptions, and inspect settlement results returned by the configured LedgerSense API.</p>
          <div className="mt-10 border-y border-line py-5">
            <div className="grid grid-cols-3 gap-3 text-xs font-medium text-ink">
              {['Order record', 'Gateway record', 'Bank record'].map((item, index) => <div key={item} className="relative border-l-2 border-forest pl-3 py-2">{item}<span className="mt-1 block font-mono text-[11px] font-normal text-muted">0{index + 1}</span></div>)}
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">Compare the records, follow their references, and see the items that need human review.</p>
          </div>
          <p className="mt-6 border-l-2 border-amber bg-white px-4 py-3 text-sm leading-6 text-muted"><strong className="font-semibold text-ink">Prototype note.</strong> Live Nova ingestion is not implemented in the current backend. Demonstration records may appear only when an explicit non-production demo mode is selected.</p>
        </section>

        <section className="self-start border border-line bg-white p-6 sm:p-8">
          <div className="mb-7 border-b border-line pb-5">
            <h2 className="font-display text-3xl tracking-[-0.03em]">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Use an account provisioned by your LedgerSense API administrator.</p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-semibold text-ink">Username</label>
              <input id="username" name="username" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} required className="min-h-12 w-full border border-line bg-white px-3.5 text-base text-ink placeholder:text-[#8a928d] focus:border-forest focus:outline-none" placeholder="Enter your username" />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-ink">Password</label>
              <div className="flex border border-line focus-within:border-forest">
                <input id="password" name="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} required className="min-h-12 min-w-0 flex-1 bg-white px-3.5 text-base text-ink placeholder:text-[#8a928d] focus:outline-none" placeholder="Enter your password" />
                <button type="button" onClick={() => setShowPassword(value => !value)} className="touch-target px-3 text-xs font-semibold text-muted hover:text-ink" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            {error && <p role="alert" className="border-l-2 border-rust bg-[#faf2ee] px-4 py-3 text-sm leading-6 text-rust">{error}</p>}
            <button type="submit" disabled={loading} className="min-h-12 w-full bg-forest px-5 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:cursor-wait disabled:opacity-60">{loading ? 'Signing in…' : 'Continue to workspace'}</button>
          </form>
          <p className="mt-5 text-xs leading-5 text-muted">Authentication and available records depend on the configured API service.</p>
        </section>
      </div>
    </main>
  );
};
