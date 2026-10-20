'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { fetchAvanceAccess, fetchDashboard } from '@/services/teacher-api';
import { captureTokenFromUrl, getToken, getRefreshToken } from '@/shared/auth-token';
import { parseJwtPayload } from '@/shared/jwt';
import type { AvanceAccess, DashboardSummary, JwtUser } from '@/types';

interface AuthContextValue {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  summary: DashboardSummary | null;
  user: JwtUser | null;
  avanceAccess: AvanceAccess | null;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [user, setUser] = useState<JwtUser | null>(null);
  const [avanceAccess, setAvanceAccess] = useState<AvanceAccess | null>(null);

  async function load() {
    captureTokenFromUrl();
    const token = getToken();
    const parsedUser = token ? parseJwtPayload(token) : null;
    setUser(parsedUser);

    if (!token) {
      setError('Missing access token. Open this module from your organization dashboard.');
      setReady(true);
      return;
    }

    if (
      /^invigilator$/i.test((parsedUser?.position ?? '').trim())
      && !(parsedUser?.roles ?? []).includes('organization_admin')
    ) {
      const academic = (process.env.NEXT_PUBLIC_ACADEMIC_URL ?? 'http://localhost:3004').replace(/\/$/, '');
      const url = new URL('/exams/invigilator-desk', academic);
      url.searchParams.set('token', token);
      const refresh = getRefreshToken();
      if (refresh) url.searchParams.set('refresh', refresh);
      window.location.replace(url.toString());
      return;
    }

    try {
      const [dashboard, access] = await Promise.all([
        fetchDashboard(),
        fetchAvanceAccess().catch(() => null),
      ]);
      setSummary(dashboard);
      setAvanceAccess(access);
      setAuthorized(true);
      setError(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to access Teacher Portal';
      setError(message);
      setAuthorized(false);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ready,
        authorized,
        error,
        summary,
        user,
        avanceAccess,
        reload: load,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
