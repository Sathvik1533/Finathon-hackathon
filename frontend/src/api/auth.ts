import { API_BASE, authHeader } from './headers';

export interface AuthIdentity {
  username: string;
  role: string;
  userId?: string;
  merchantId?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthIdentity;
}

async function apiError(response: Response, fallback: string): Promise<Error> {
  try {
    const data = await response.json();
    return new Error(typeof data?.error === 'string' ? data.error : fallback);
  } catch {
    return new Error(`${fallback} (HTTP ${response.status})`);
  }
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error('Could not reach the LedgerSense API. Check the connection and try again.');
  }

  if (!response.ok) throw await apiError(response, 'Sign-in failed. Check your credentials and try again.');
  const data = await response.json() as LoginResponse;
  if (!data?.token || !data?.user?.username) throw new Error('The API returned an incomplete sign-in response.');
  return data;
}

export async function getCurrentUser(token: string): Promise<{ user: AuthIdentity }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeader(token) });
  } catch {
    throw new Error('Could not verify the saved session.');
  }
  if (!response.ok) throw await apiError(response, 'Saved session is invalid or expired.');
  const data = await response.json() as { user: AuthIdentity };
  if (!data?.user?.username) throw new Error('The API returned an incomplete session response.');
  return data;
}
