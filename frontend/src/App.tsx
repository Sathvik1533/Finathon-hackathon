import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TimelinePage } from './pages/TimelinePage';
import { NovaExplorerPage } from './pages/NovaExplorerPage';
import { ExceptionsPage } from './pages/ExceptionsPage';
import { SettlementPage } from './pages/SettlementPage';
import { ReportPage } from './pages/ReportPage';
import { NotFoundPage } from './pages/NotFoundPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/"           element={<Navigate to="/dashboard" replace />} />
        <Route path="/login"      element={<LoginPage />} />
        <Route path="/dashboard"  element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/timeline"   element={<ProtectedRoute><TimelinePage /></ProtectedRoute>} />
        <Route path="/nova"       element={<ProtectedRoute><NovaExplorerPage /></ProtectedRoute>} />
        <Route path="/exceptions" element={<ProtectedRoute><ExceptionsPage /></ProtectedRoute>} />
        <Route path="/settlement" element={<ProtectedRoute><SettlementPage /></ProtectedRoute>} />
        <Route path="/report"     element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
        <Route path="*"           element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
