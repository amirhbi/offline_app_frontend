import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

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
      // Demo auth: use admin / admin123
      if (username === 'admin' && password === 'admin123') {
        setToken('demo-token');
        return true;
      }
      return false;
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