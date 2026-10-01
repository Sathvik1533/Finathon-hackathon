const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  window.location.port !== '4000' &&
  window.location.port !== '';

// In production, prohibit arbitrary query param / localStorage overrides to prevent token leakage
const isDev = import.meta.env.DEV;
const queryApi = (isDev && typeof window !== 'undefined') ? new URLSearchParams(window.location.search).get('api') : null;
if (isDev && queryApi && typeof window !== 'undefined') {
  localStorage.setItem('FINATHON_API_BASE', queryApi);
}

export const API_BASE =
  (isDev ? queryApi : null) ||
  (isDev && typeof window !== 'undefined' ? localStorage.getItem('FINATHON_API_BASE') : null) ||
  import.meta.env.VITE_API_BASE ||
  (isLocalhost ? 'http://localhost:4000' : '');

export const authHeader = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});
