import { API_BASE } from './headers';

export interface LoginResponse {
  token: string;
  user: { username: string; role: string; userId: string; merchantId: string };
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch (err: any) {
    throw new Error(`Authentication server unreachable (${API_BASE || 'origin'}). Please verify backend connection.`);
  }

  if (!response.ok) {
    let errMessage = 'Invalid username or password.';
    try {
      const errData = await response.json();
      if (errData && errData.error) {
        errMessage = errData.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }

  const data = await response.json();
  if (!data || !data.token) {
    throw new Error('Authentication failed: Missing JWT token in response.');
  }

  return data;
}
