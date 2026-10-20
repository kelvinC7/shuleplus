'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { captureTokenFromUrl, clearToken, getToken } from '@/shared/auth-token';

export interface NesaUser {
  name: string;
  email: string;
  roles: string[];
}

export interface NesaSummary {
  organizationName: string;
}

interface AuthContextValue {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  summary: NesaSummary | null;
  user: NesaUser | null;
  reload: () => Promise<void>;
  logout: () => void;
}

function parseJwtUser(token: string): NesaUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const email = typeof payload.email === 'string' ? payload.email : '';
    const modules: string[] = Array.isArray(payload.modules) ? payload.modules : [];
    if (!modules.includes('nesa')) {
      return null;
    }
    return {
      email,
      name: email ? email.split('@')[0] : 'NESA User',
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    };
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<NesaSummary | null>(null);
  const [user, setUser] = useState<NesaUser | null>(null);

  const load = useCallback(async () => {
    captureTokenFromUrl();
    const token = getToken();
    if (!token) {
      setUser(null);
      setSummary(null);
      setAuthorized(false);
      setError('Missing access token. Open NESA from login (Users & Access) or Organization Admin.');
      setReady(true);
      return;
    }

    const parsed = parseJwtUser(token);
    if (!parsed) {
      setUser(null);
      setSummary(null);
      setAuthorized(false);
      setError('This account is not assigned to the NESA module.');
      setReady(true);
      return;
    }

    setUser(parsed);
    setSummary({ organizationName: 'NESA' });
    setAuthorized(true);
    setError(null);
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAuthorized(false);
    setUser(null);
    setSummary(null);
    window.location.href = process.env.NEXT_PUBLIC_IAM_LOGIN_URL ?? 'http://localhost:3000/login';
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AuthContext.Provider value={{ ready, authorized, error, summary, user, reload: load, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
