'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, ensureFreshAccessToken } from '@/services/api';
import { captureTokenFromUrl, getToken } from '@/shared/auth-token';
import { parseJwtPayload } from '@/shared/jwt';
import type { DashboardSummary, JwtUser } from '@/types';

interface AuthContextValue {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  summary: DashboardSummary | null;
  user: JwtUser | null;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [user, setUser] = useState<JwtUser | null>(null);

  async function load() {
    captureTokenFromUrl();

    let token = await ensureFreshAccessToken();

    setUser(token ? parseJwtPayload(token) : null);

    if (!token) {
      setError('Missing access token. Open this module from your organization dashboard.');
      setAuthorized(false);
      setReady(true);
      return;
    }

    try {
      const { data } = await api.get('/dashboard');
      setSummary(data.data);
      setAuthorized(true);
      setError(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to access Timetable module';
      setError(message);
      setAuthorized(false);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <AuthContext.Provider value={{ ready, authorized, error, summary, user, reload: load }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
