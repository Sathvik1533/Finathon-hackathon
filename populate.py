import os

files = {
    "frontend/src/types/index.ts": """export interface NovaPayment {
  id: string;
  amount: number;
}
export interface DiscrepancyCase {
  id: string;
  type: string;
  amount: number;
}
export interface ReconRun {
  id: string;
  status: string;
}
""",
    "frontend/src/context/AuthContext.tsx": """import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<{ role: string, token: string } | null>(null);
  
  const login = (role: string, token: string) => setUser({ role, token });
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
""",
    "frontend/src/api/auth.ts": """export const login = async (user: string, pass: string) => {
  return { token: 'mock-jwt-token', role: 'admin' };
};
export const logout = async () => {};
""",
    "frontend/src/api/nova.ts": """import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
export const syncNova = async () => axios.post(`${API_BASE}/nova/sync`);
export const fetchPayments = async () => axios.get(`${API_BASE}/nova/payments`);
export const fetchGateway = async () => axios.get(`${API_BASE}/nova/gateway-transactions`);
export const fetchBank = async () => axios.get(`${API_BASE}/nova/bank-transactions`);
export const fetchSettlements = async () => axios.get(`${API_BASE}/nova/settlements`);
""",
    "frontend/src/api/reconcile.ts": """import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
export const triggerRun = async () => axios.post(`${API_BASE}/reconcile`);
export const getRun = async () => axios.get(`${API_BASE}/reconcile/status`);
export const getRunById = async (id: string) => axios.get(`${API_BASE}/reconcile/${id}`);
""",
    "frontend/src/api/cases.ts": """import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
export const getCases = async () => axios.get(`${API_BASE}/cases`);
export const getCase = async (id: string) => axios.get(`${API_BASE}/cases/${id}`);
export const submitDecision = async (id: string, decision: string) => axios.post(`${API_BASE}/cases/${id}/decision`, { decision });
""",
    "frontend/src/api/settlements.ts": """import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
export const getSettlements = async () => axios.get(`${API_BASE}/settlements`);
""",
    "frontend/src/api/audit.ts": """import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
export const getAuditLogs = async () => axios.get(`${API_BASE}/audit`);
""",
    "frontend/src/api/report.ts": """import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
export const getReport = async () => axios.get(`${API_BASE}/report`);
export const exportCsv = () => { window.location.href = `${API_BASE}/report?format=csv`; };
""",
    "frontend/src/hooks/useReconcile.ts": """import { useState } from 'react';
import { triggerRun } from '../api/reconcile';
export const useReconcile = () => {
  const [loading, setLoading] = useState(false);
  const trigger = async () => {
    setLoading(true);
    await triggerRun();
    setLoading(false);
  };
  return { loading, trigger };
};
""",
    "frontend/src/hooks/useCases.ts": """import { useState } from 'react';
import { getCases, submitDecision } from '../api/cases';
export const useCases = () => {
  const [cases, setCases] = useState([]);
  const fetch = async () => {
    const res = await getCases();
    setCases(res.data);
  };
  return { cases, fetch, submitDecision };
};
""",
    "frontend/src/hooks/useReport.ts": """import { useState } from 'react';
import { getReport } from '../api/report';
export const useReport = () => {
  const [report, setReport] = useState<any>(null);
  const fetch = async () => {
    const res = await getReport();
    setReport(res.data);
  };
  return { report, fetch };
};
""",
    "frontend/src/components/layout/Sidebar.tsx": """import React from 'react';
import { Link } from 'react-router-dom';
export const Sidebar = () => (
  <div className="w-64 border-r border-[#e2e8f0] h-screen p-4 flex flex-col gap-4">
    <Link to="/dashboard" className="text-[#0f172a] hover:bg-gray-100 p-2 rounded">Dashboard</Link>
    <Link to="/timeline" className="text-[#0f172a] hover:bg-gray-100 p-2 rounded">Timeline</Link>
    <Link to="/nova-explorer" className="text-[#0f172a] hover:bg-gray-100 p-2 rounded">Nova Explorer</Link>
    <Link to="/exceptions" className="text-[#0f172a] hover:bg-gray-100 p-2 rounded">Exceptions</Link>
    <Link to="/settlement" className="text-[#0f172a] hover:bg-gray-100 p-2 rounded">Settlement</Link>
    <Link to="/report" className="text-[#0f172a] hover:bg-gray-100 p-2 rounded">Report</Link>
  </div>
);
""",
    "frontend/src/components/layout/Header.tsx": """import React from 'react';
import { useAuth } from '../../context/AuthContext';
export const Header = () => {
  const { user } = useAuth();
  return (
    <div className="h-16 border-b border-[#e2e8f0] flex items-center justify-between px-6">
      <h1 className="text-xl font-bold text-[#0f172a]">LedgerSense</h1>
      {user && <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">Role: {user.role}</span>}
    </div>
  );
};
""",
    "frontend/src/components/layout/PageShell.tsx": """import React from 'react';
export const PageShell = ({ children, title }: { children: React.ReactNode, title: string }) => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-6 text-[#0f172a]">{title}</h2>
    {children}
  </div>
);
""",
    "frontend/src/components/ui/KpiCard.tsx": """import React from 'react';
export const KpiCard = ({ title, value, delta, color }: any) => (
  <div className={`p-4 bg-white border border-[#e2e8f0] rounded shadow-sm flex flex-col`}>
    <span className="text-sm text-gray-500">{title}</span>
    <span className="text-2xl font-bold text-[#0f172a] tabular-nums">{value}</span>
    <span className={`text-sm ${color}`}>{delta}</span>
  </div>
);
""",
    "frontend/src/components/ui/StatusBadge.tsx": """import React from 'react';
export const StatusBadge = ({ status }: { status: string }) => {
  let color = 'bg-gray-100 text-gray-800';
  if (status === 'OPEN' || status === 'PENDING') color = 'bg-amber-100 text-amber-800';
  if (status === 'APPROVED' || status === 'MATCHED') color = 'bg-emerald-100 text-emerald-800';
  if (status === 'REJECTED') color = 'bg-rose-100 text-rose-800';
  if (status === 'FEE_MISMATCH') color = 'bg-rose-100 text-rose-800';
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>{status}</span>;
};
""",
    "frontend/src/components/ui/DataTable.tsx": """import React from 'react';
export const DataTable = ({ data, columns }: any) => (
  <div className="overflow-x-auto border border-[#e2e8f0] rounded">
    <table className="min-w-full divide-y divide-[#e2e8f0]">
      <thead className="bg-gray-50">
        <tr>{columns.map((c: any) => <th key={c.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{c.label}</th>)}</tr>
      </thead>
      <tbody className="bg-white divide-y divide-[#e2e8f0]">
        {data.map((row: any, i: number) => (
          <tr key={i}>{columns.map((c: any) => <td key={c.key} className="px-4 py-3 whitespace-nowrap text-sm text-[#0f172a] tabular-nums">{row[c.key]}</td>)}</tr>
        ))}
      </tbody>
    </table>
  </div>
);
""",
    "frontend/src/components/ui/StageProgress.tsx": """import React from 'react';
export const StageProgress = ({ stage }: { stage: number }) => (
  <div className="w-full bg-gray-200 rounded-full h-2.5">
    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(stage / 7) * 100}%` }}></div>
  </div>
);
""",
    "frontend/src/components/ui/ExceptionDrawer.tsx": """import React from 'react';
export const ExceptionDrawer = ({ isOpen, onClose, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-[#e2e8f0] p-6 z-50">
      <button onClick={onClose} className="mb-4 text-gray-500">Close</button>
      {children}
    </div>
  );
};
""",
    "frontend/src/components/ui/NovaStreamCard.tsx": """import React from 'react';
export const NovaStreamCard = ({ title, data }: any) => (
  <div className="border border-[#e2e8f0] p-4 rounded bg-white shadow-sm">
    <h3 className="font-bold mb-2">{title}</h3>
    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">{JSON.stringify(data, null, 2)}</pre>
  </div>
);
""",
    "frontend/src/components/ui/ModuleCoverageRow.tsx": """import React from 'react';
export const ModuleCoverageRow = ({ moduleName, status }: any) => (
  <div className="flex justify-between border-b border-[#e2e8f0] py-2">
    <span className="text-sm font-medium">{moduleName}</span>
    <span className="text-sm text-emerald-600 font-bold">{status}</span>
  </div>
);
""",
    "frontend/src/components/forms/LoginForm.tsx": """import React, { useState } from 'react';
export const LoginForm = ({ onSubmit }: any) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(u, p); }} className="flex flex-col gap-4 max-w-sm mx-auto mt-20">
      <input className="border p-2 rounded" placeholder="Username" value={u} onChange={e => setU(e.target.value)} />
      <input className="border p-2 rounded" type="password" placeholder="Password" value={p} onChange={e => setP(e.target.value)} />
      <button className="bg-blue-600 text-white p-2 rounded font-bold" type="submit">Login</button>
    </form>
  );
};
""",
    "frontend/src/components/forms/DecisionForm.tsx": """import React, { useState } from 'react';
export const DecisionForm = ({ onSubmit }: any) => {
  const [decision, setDecision] = useState('APPROVE');
  return (
    <div className="flex flex-col gap-4 mt-4">
      <select className="border p-2 rounded" value={decision} onChange={e => setDecision(e.target.value)}>
        <option value="APPROVE">Approve</option>
        <option value="REJECT">Reject</option>
        <option value="ESCALATE">Escalate</option>
      </select>
      <button onClick={() => onSubmit(decision)} className="bg-blue-600 text-white p-2 rounded">Submit Decision</button>
    </div>
  );
};
""",
    "frontend/src/pages/LoginPage.tsx": """import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from '../components/forms/LoginForm';
import { login as apiLogin } from '../api/auth';
export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const handleLogin = async (u: string, p: string) => {
    const res = await apiLogin(u, p);
    login(res.role, res.token);
    navigate('/dashboard');
  };
  return <LoginForm onSubmit={handleLogin} />;
};
""",
    "frontend/src/pages/DashboardPage.tsx": """import React from 'react';
import { PageShell } from '../components/layout/PageShell';
import { KpiCard } from '../components/ui/KpiCard';
import { StageProgress } from '../components/ui/StageProgress';
import { useReconcile } from '../hooks/useReconcile';
export const DashboardPage = () => {
  const { loading, trigger } = useReconcile();
  return (
    <PageShell title="Dashboard">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Volume" value="₹120,000" delta="+5%" color="text-emerald-500" />
        <KpiCard title="Matched" value="₹118,500" delta="+2%" color="text-emerald-500" />
        <KpiCard title="Exceptions" value="15" delta="-3" color="text-rose-500" />
        <KpiCard title="At Risk" value="₹1,500" delta="" color="text-rose-500" />
      </div>
      <div className="mb-6">
        <h3 className="mb-2 font-bold">Pipeline Progress</h3>
        <StageProgress stage={4} />
      </div>
      <button onClick={trigger} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded font-bold">
        {loading ? 'Running...' : 'Trigger Reconciliation'}
      </button>
    </PageShell>
  );
};
""",
    "frontend/src/pages/TimelinePage.tsx": """import React from 'react';
import { PageShell } from '../components/layout/PageShell';
export const TimelinePage = () => (
  <PageShell title="Multi-Stream Timeline">
    <p>Select ORD-101 to see 4 data streams side by side.</p>
    <div className="grid grid-cols-4 gap-4 mt-4">
      <div className="border p-4 bg-gray-50">Internal Order</div>
      <div className="border p-4 bg-gray-50">Gateway Capture</div>
      <div className="border p-4 bg-gray-50">Refund/Reversal</div>
      <div className="border p-4 bg-gray-50">Bank Settlement</div>
    </div>
  </PageShell>
);
""",
    "frontend/src/pages/NovaExplorerPage.tsx": """import React from 'react';
import { PageShell } from '../components/layout/PageShell';
import { NovaStreamCard } from '../components/ui/NovaStreamCard';
export const NovaExplorerPage = () => (
  <PageShell title="Nova 4-Source Explorer">
    <div className="grid grid-cols-2 gap-4">
      <NovaStreamCard title="/payments" data={[]} />
      <NovaStreamCard title="/gateway-transactions" data={[]} />
      <NovaStreamCard title="/bank-transactions" data={[]} />
      <NovaStreamCard title="/settlements" data={[]} />
    </div>
  </PageShell>
);
""",
    "frontend/src/pages/ExceptionsPage.tsx": """import React, { useState } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { DataTable } from '../components/ui/DataTable';
import { ExceptionDrawer } from '../components/ui/ExceptionDrawer';
import { DecisionForm } from '../components/forms/DecisionForm';
export const ExceptionsPage = () => {
  const [open, setOpen] = useState(false);
  return (
    <PageShell title="Exceptions Queue">
      <DataTable columns={[{key: 'id', label: 'ID'}, {key: 'type', label: 'Type'}, {key: 'amount', label: 'Amount Risk'}]} data={[]} />
      <button onClick={() => setOpen(true)} className="mt-4 bg-gray-200 px-4 py-2 rounded">Open Drawer</button>
      <ExceptionDrawer isOpen={open} onClose={() => setOpen(false)}>
        <h3 className="font-bold text-lg">Review Case</h3>
        <DecisionForm onSubmit={(d: string) => { console.log(d); setOpen(false); }} />
      </ExceptionDrawer>
    </PageShell>
  );
};
""",
    "frontend/src/pages/SettlementPage.tsx": """import React from 'react';
import { PageShell } from '../components/layout/PageShell';
export const SettlementPage = () => (
  <PageShell title="Settlement Matcher">
    <p>1:N batch matching visualization here.</p>
  </PageShell>
);
""",
    "frontend/src/pages/ReportPage.tsx": """import React from 'react';
import { PageShell } from '../components/layout/PageShell';
import { ModuleCoverageRow } from '../components/ui/ModuleCoverageRow';
import { exportCsv } from '../api/report';
export const ReportPage = () => (
  <PageShell title="Reconciliation Report">
    <button onClick={exportCsv} className="bg-emerald-600 text-white px-4 py-2 rounded mb-6">Export CSV</button>
    <div className="bg-white border p-4 rounded shadow-sm">
      <h3 className="font-bold mb-4">Module Coverage 11/11</h3>
      <ModuleCoverageRow moduleName="M1 Internal Records" status="IMPLEMENTED" />
      <ModuleCoverageRow moduleName="M11 Recon Report" status="IMPLEMENTED" />
    </div>
  </PageShell>
);
""",
    "frontend/src/App.tsx": """import React from 'react';
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
""",
    "frontend/src/main.tsx": """import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
""",
    "frontend/index.html": """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LedgerSense FIN-11</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
""",
    "frontend/src/index.css": """@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'Inter', sans-serif;
  background-color: #ffffff;
  color: #0f172a;
}
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
"""
}

for path, content in files.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)

print("Created all frontend React files.")
