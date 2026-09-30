import { API_BASE } from './headers';

export interface LoginResponse {
  token: string;
  user: { username: string; role: string; userId: string; merchantId: string };
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Invalid credentials');
  }
  return res.json();
}
