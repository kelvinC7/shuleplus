'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { api, refreshAccessToken } from '@/services/api';
import {
  captureTokenFromUrl,
  DEVICE_SESSION_EXPIRED_EVENT,
  getRefreshToken,
  getToken,
  isTokenExpired,
} from '@/shared/auth-token';
import { parseJwtPayload } from '@/shared/jwt';
import type { DashboardSummary, JwtUser } from '@/types';

interface AuthContextValue {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  summary: DashboardSummary | null;
  user: JwtUser | null;
  isOrgAdmin: boolean;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [user, setUser] = useState<JwtUser | null>(null);

  const load = useCallback(async () => {
    captureTokenFromUrl();
    let token = getToken();
    setUser(token ? parseJwtPayload(token) : null);

    if (!token) {
      setError('Missing access token. Open this module from your organization dashboard.');
      setAuthorized(false);
      setReady(true);
      return;
    }

    if (isTokenExpired() && getRefreshToken()) {
      token = (await refreshAccessToken()) ?? token;
      setUser(token ? parseJwtPayload(token) : null);
    }

    try {
      const { data } = await api.get('/dashboard');
      setSummary(data.data);
      setAuthorized(true);
      setError(null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to access Digital Attendance devices';
      if (status === 401) {
        setError('Session expired or invalid. Reopen Digital Attendance from your organization dashboard.');
      } else {
        setError(message);
      }
      setAuthorized(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onExpired = () => {
      setAuthorized(false);
      setError('Session expired or invalid. Reopen Digital Attendance from your organization dashboard.');
    };
    window.addEventListener(DEVICE_SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(DEVICE_SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void load();
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [load]);

  return (
    <AuthContext.Provider
      value={{
        ready,
        authorized,
        error,
        summary,
        user,
        isOrgAdmin: user?.roles?.includes('organization_admin') ?? false,
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
