import React, { createContext, useContext, useState } from 'react';
import { login as apiLogin } from '../api/auth';

export interface AuthUser {
  token: string;
  username: string;
  role: string;
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

  const login = async (username: string, password: string) => {
    const data = await apiLogin(username, password);
    const u: AuthUser = {
      token: data.token,
      username: data.user?.username ?? username,
      role: data.user?.role ?? 'admin',
    };
    setUser(u);
    localStorage.setItem('ledgersense_auth', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ledgersense_auth');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
