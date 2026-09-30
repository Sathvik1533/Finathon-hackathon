import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TimelinePage } from './pages/TimelinePage';
import { NovaExplorerPage } from './pages/NovaExplorerPage';
import { ExceptionsPage } from './pages/ExceptionsPage';
import { SettlementPage } from './pages/SettlementPage';
import { ReportPage } from './pages/ReportPage';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard"  element={<AppLayout><DashboardPage /></AppLayout>} />
        <Route path="/timeline"   element={<AppLayout><TimelinePage /></AppLayout>} />
        <Route path="/nova"       element={<AppLayout><NovaExplorerPage /></AppLayout>} />
        <Route path="/exceptions" element={<AppLayout><ExceptionsPage /></AppLayout>} />
        <Route path="/settlement" element={<AppLayout><SettlementPage /></AppLayout>} />
        <Route path="/report"     element={<AppLayout><ReportPage /></AppLayout>} />
        <Route path="*"           element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
