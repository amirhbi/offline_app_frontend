import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login } from '../api/auth';

type AuthContextType = {
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<boolean>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'app_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  const value = useMemo<AuthContextType>(() => ({
    isAuthenticated: !!token,
    signIn: async (username, password) => {
      try {
        const res = await login({ username, password });
        setToken(res.token);
        return true;
      } catch {
        return false;
      }
    },
    signOut: () => setToken(null),
  }), [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}