import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
export const getCases = async () => axios.get(`${API_BASE}/cases`);
export const getCase = async (id: string) => axios.get(`${API_BASE}/cases/${id}`);
export const submitDecision = async (id: string, decision: string) => axios.post(`${API_BASE}/cases/${id}/decision`, { decision });
