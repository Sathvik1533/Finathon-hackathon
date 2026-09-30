const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  window.location.port !== '4000' &&
  window.location.port !== '';

const queryApi = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('api') : null;
if (queryApi && typeof window !== 'undefined') {
  localStorage.setItem('FINATHON_API_BASE', queryApi);
}

export const API_BASE =
  queryApi ||
  (typeof window !== 'undefined' && localStorage.getItem('FINATHON_API_BASE')) ||
  import.meta.env.VITE_API_BASE ||
  (isLocalhost ? 'http://localhost:4000' : '');

export const authHeader = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});
