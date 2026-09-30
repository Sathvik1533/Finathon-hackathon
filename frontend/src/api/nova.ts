import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
export const syncNova = async () => axios.post(`${API_BASE}/nova/sync`);
export const fetchPayments = async () => axios.get(`${API_BASE}/nova/payments`);
export const fetchGateway = async () => axios.get(`${API_BASE}/nova/gateway-transactions`);
export const fetchBank = async () => axios.get(`${API_BASE}/nova/bank-transactions`);
export const fetchSettlements = async () => axios.get(`${API_BASE}/nova/settlements`);
