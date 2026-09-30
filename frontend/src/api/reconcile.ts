import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
export const triggerRun = async () => axios.post(`${API_BASE}/reconcile`);
export const getRun = async () => axios.get(`${API_BASE}/reconcile/status`);
export const getRunById = async (id: string) => axios.get(`${API_BASE}/reconcile/${id}`);
