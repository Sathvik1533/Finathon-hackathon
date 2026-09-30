import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
export const getAuditLogs = async () => axios.get(`${API_BASE}/audit`);
