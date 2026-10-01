import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, getMe } from '../api/auth';

export interface AuthUser {
  token: string;
  username: string;
  role: string;
  userId?: string;
  merchantId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login(username: string, password: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue>(null!);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('ledgersense_auth');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return null;
  });

  // Validate stored session on initial mount
  useEffect(() => {
    if (user?.token) {
      getMe(user.token).catch(() => {
        // Token invalid or revoked - clear immediately
        setUser(null);
        localStorage.removeItem('ledgersense_auth');
        sessionStorage.removeItem('ledgersense_auth');
      });
    }
  }, []);

  const login = async (username: string, password: string) => {
    const data = await apiLogin(username, password);
    const u: AuthUser = {
      token: data.token,
      username: data.user?.username ?? username,
      role: data.user?.role ?? 'admin',
      userId: data.user?.userId,
      merchantId: data.user?.merchantId,
    };
    setUser(u);
    localStorage.setItem('ledgersense_auth', JSON.stringify(u));
  };

  const logout = () => {
    const currentToken = user?.token;
    setUser(null);
    localStorage.removeItem('ledgersense_auth');
    sessionStorage.removeItem('ledgersense_auth');
    if (currentToken) {
      apiLogout(currentToken).catch(() => {});
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
