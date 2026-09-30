import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
export const getReport = async () => axios.get(`${API_BASE}/report`);
export const exportCsv = () => { window.location.href = `${API_BASE}/report?format=csv`; };
