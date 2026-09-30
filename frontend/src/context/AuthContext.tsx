import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getCurrentUser, login as apiLogin } from '../api/auth';

export interface AuthUser {
  token: string;
  username: string;
  role: string;
  userId?: string;
  merchantId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  login(username: string, password: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue>(null!);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      let saved: AuthUser | null = null;
      try {
        const raw = window.localStorage.getItem('ledgersense_auth');
        if (raw) saved = JSON.parse(raw) as AuthUser;
      } catch {
        window.localStorage.removeItem('ledgersense_auth');
      }

      if (!saved?.token) {
        if (active) setReady(true);
        return;
      }

      try {
        const response = await getCurrentUser(saved.token);
        const restored: AuthUser = {
          token: saved.token,
          username: response.user.username,
          role: response.user.role,
          userId: response.user.userId,
          merchantId: response.user.merchantId,
        };
        if (active) {
          setUser(restored);
          window.localStorage.setItem('ledgersense_auth', JSON.stringify(restored));
        }
      } catch {
        window.localStorage.removeItem('ledgersense_auth');
        if (active) setUser(null);
      } finally {
        if (active) setReady(true);
      }
    };

    void restoreSession();
    return () => { active = false; };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiLogin(username, password);
    const nextUser: AuthUser = {
      token: data.token,
      username: data.user.username,
      role: data.user.role,
      userId: data.user.userId,
      merchantId: data.user.merchantId,
    };
    window.localStorage.setItem('ledgersense_auth', JSON.stringify(nextUser));
    setUser(nextUser);
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem('ledgersense_auth');
    setUser(null);
    setReady(true);
  }, []);

  return <AuthContext.Provider value={{ user, ready, login, logout }}>{children}</AuthContext.Provider>;
};
