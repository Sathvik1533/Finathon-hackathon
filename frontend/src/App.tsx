import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TimelinePage } from './pages/TimelinePage';
import { NovaExplorerPage } from './pages/NovaExplorerPage';
import { ExceptionsPage } from './pages/ExceptionsPage';
import { SettlementPage } from './pages/SettlementPage';
import { ReportPage } from './pages/ReportPage';

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return (
    <div className="flex h-screen bg-[#ffffff]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-gray-50/50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedLayout><Navigate to="/dashboard" /></ProtectedLayout>} />
          <Route path="/dashboard" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
          <Route path="/timeline" element={<ProtectedLayout><TimelinePage /></ProtectedLayout>} />
          <Route path="/nova-explorer" element={<ProtectedLayout><NovaExplorerPage /></ProtectedLayout>} />
          <Route path="/exceptions" element={<ProtectedLayout><ExceptionsPage /></ProtectedLayout>} />
          <Route path="/settlement" element={<ProtectedLayout><SettlementPage /></ProtectedLayout>} />
          <Route path="/report" element={<ProtectedLayout><ReportPage /></ProtectedLayout>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
