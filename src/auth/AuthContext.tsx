import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login } from '../api/auth';

type AuthContextType = {
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<{ ok: boolean; role: string | null }>;
  signOut: () => void;
  role: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'app_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [role, setRole] = useState<string | null>(null);

  const decodeRole = (t?: string | null): string | null => {
    if (!t) return null;
    try {
      const parts = t.split('.');
      if (parts.length < 2) return null;
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4 === 2 ? '==' : b64.length % 4 === 3 ? '=' : '';
      const json = atob(b64 + pad);
      const payload = JSON.parse(json);
      return payload.role ?? payload.user?.role ?? null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    setRole(decodeRole(token));
  }, [token]);

  const value = useMemo<AuthContextType>(() => ({
    isAuthenticated: !!token,
    signIn: async (username, password) => {
      try {
        const res = await login({ username, password });
        setToken(res.token);
        setRole(decodeRole(res.token));
        return { ok: true, role: decodeRole(res.token) };
      } catch {
        return { ok: false, role: null };
      }
    },
    signOut: () => { setToken(null); setRole(null); },
    role,
  }), [token, role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
