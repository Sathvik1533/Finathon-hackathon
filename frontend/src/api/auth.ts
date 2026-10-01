import { API_BASE, authHeader } from './headers';

export interface LoginResponse {
  token: string;
  user: { username: string; role: string; userId: string; merchantId: string };
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const cleanUser = (username || '').trim();
  const cleanPass = (password || '').trim();

  if (!cleanUser || !cleanPass) {
    throw new Error('Username and password are required.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUser, password: cleanPass }),
    });
  } catch (err: any) {
    throw new Error('Authentication service unavailable');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Authentication service unavailable');
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error('Authentication service unavailable');
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Invalid username or password.');
  }

  if (!data || !data.token) {
    throw new Error('Authentication failed: Missing token in response.');
  }

  return data;
}

export async function logout(token?: string): Promise<void> {
  if (!token) return;
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: authHeader(token),
    });
  } catch {
    // ignore network errors during logout
  }
}

export async function getMe(token: string): Promise<{ user: any }> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    method: 'GET',
    headers: authHeader(token),
  });
  if (!res.ok) {
    throw new Error('Session invalid or expired');
  }
  return res.json();
}
