import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login } from '../api/auth';

type RoleType = 'l2' | 'l3' | 'super_admin';
type UserData = {
  token: string;
  role?: RoleType | string;
  username?: string | null;
  nickname?: string | null;
  forms?: string[];
  forms_view?: string[];
  reports?: string[];
  logs?: string[];
};

type AuthContextType = {
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<{ ok: boolean; role: RoleType | null }>;
  signOut: () => void;
  userData: UserData | null;
  role: RoleType | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'app_token';
const USER_KEY = 'app_user_data';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [userData, setUserData] = useState<UserData | null>(() => {
    try {
      
      const raw = localStorage.getItem(USER_KEY);
      if (raw) return JSON.parse(raw) as UserData;
    } catch {}
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) return null;
    const p = (() => {
      try {
        const seg = t.split('.')[1];
        if (!seg) return null;
        const b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
        const pad = b64.length % 4 === 2 ? '==' : b64.length % 4 === 3 ? '=' : '';
        const json = atob(b64 + pad);
        return JSON.parse(json);
      } catch { return null; }
    })();
    if (!p) return null;
    const rawRole = p.role ?? p.user?.role;
    const role = rawRole === 'super_admin' ? 'super_admin' : (rawRole === 'admin' || rawRole === 'l2') ? 'l2' : (rawRole === 'L3' || rawRole === 'l3') ? 'l3' : rawRole;
    return {
      token: t,
      role,
      username: p.username ?? p.user?.username ?? null,
      nickname: p.nickname ?? p.user?.nickname ?? null,
      forms: p.forms ?? p.user?.forms ?? [],
      forms_view: p.forms_view ?? p.user?.forms_view ?? [],
      reports: p.reports ?? p.user?.reports ?? [],
      logs: p.logs ?? p.user?.logs ?? [],
    };
  });
  const [role, setRole] = useState<RoleType | null>(null);

  const decodePayload = (t?: string | null): any | null => {
    if (!t) return null;
    try {
      const seg = t.split('.')[1];
      if (!seg) return null;
      const b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4 === 2 ? '==' : b64.length % 4 === 3 ? '=' : '';
      const json = atob(b64 + pad);
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  const extractRole = (p: any | null): RoleType | null => {
    if (!p) return null;
    const raw = p.role ?? p.user?.role;
    if (raw === 'super_admin') return 'super_admin';
    if (raw === 'admin' || raw === 'l2') return 'l2';
    if (raw === 'L3' || raw === 'l3') return 'l3';
    return null;
  };


  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    setRole(extractRole(decodePayload(token)));
  }, [token]);

  useEffect(() => {
    if (userData) localStorage.setItem(USER_KEY, JSON.stringify(userData));
    else localStorage.removeItem(USER_KEY);
  }, [userData]);

  const value = useMemo<AuthContextType>(() => ({
    isAuthenticated: !!token,
    signIn: async (username, password) => {
      try {
        const res = await login({ username, password });
        setToken(res.token);
        const payload = decodePayload(res.token);
        const r = extractRole(payload);
        setUserData(res.userData);
        setRole(r);
        return { ok: true, role: r };
      } catch {
        return { ok: false, role: null };
      }
    },
    signOut: () => { setToken(null); setUserData(null); setRole(null); },
    userData,
    role,
  }), [token, userData, role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
