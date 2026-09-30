import React from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { TimelinePage } from './pages/TimelinePage';
import { NovaExplorerPage } from './pages/NovaExplorerPage';
import { ExceptionsPage } from './pages/ExceptionsPage';
import { SettlementPage } from './pages/SettlementPage';
import { ReportPage } from './pages/ReportPage';

const RouteLoading: React.FC = () => (
  <main className="grid min-h-screen place-items-center bg-paper px-6 text-muted" aria-live="polite">
    <p className="text-sm">Restoring your session…</p>
  </main>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, ready } = useAuth();
  if (!ready) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const LoginRoute: React.FC = () => {
  const { user, ready } = useAuth();
  if (!ready) return <RouteLoading />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <LoginPage />;
};

const NotFound: React.FC = () => (
  <main className="grid min-h-screen place-items-center bg-paper px-6 text-center text-ink">
    <div className="max-w-md">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-forest">404 · Page not found</p>
      <h1 className="mt-4 font-display text-4xl tracking-[-0.03em]">That route does not exist.</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Use the LedgerSense home page or sign in to reach the workspace.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/" className="inline-flex min-h-11 items-center border border-line px-4 text-sm font-semibold">Home</Link>
        <Link to="/login" className="inline-flex min-h-11 items-center bg-forest px-4 text-sm font-semibold text-white">Sign in</Link>
      </div>
    </div>
  </main>
);

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/timeline" element={<ProtectedRoute><TimelinePage /></ProtectedRoute>} />
        <Route path="/nova" element={<ProtectedRoute><NovaExplorerPage /></ProtectedRoute>} />
        <Route path="/exceptions" element={<ProtectedRoute><ExceptionsPage /></ProtectedRoute>} />
        <Route path="/settlement" element={<ProtectedRoute><SettlementPage /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
