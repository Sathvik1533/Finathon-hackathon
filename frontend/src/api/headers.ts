export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export const authHeader = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});
