'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api, refreshAccessToken } from '@/services/api';
import {
  captureTokenFromUrl,
  getRefreshToken,
  getToken,
  isTokenExpired,
  PAYROLL_SESSION_EXPIRED_EVENT,
} from '@/shared/auth-token';
import { parseJwtPayload, type JwtUser } from '@/shared/jwt';

const AUTH_TIMEOUT_MS = 18_000;

interface AuthContextValue {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  summary: Record<string, unknown> | null;
  user: JwtUser | null;
  reloading: boolean;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isNetworkError(err: unknown): boolean {
  const axiosErr = err as { code?: string; message?: string; response?: { status?: number } };
  if (axiosErr.code === 'ECONNABORTED') return true;
  if (axiosErr.message?.toLowerCase().includes('timeout')) return true;
  if (!axiosErr.response && axiosErr.message?.toLowerCase().includes('network')) return true;
  return false;
}

function authErrorMessage(err: unknown, fallback: string): string {
  if (isNetworkError(err)) {
    return 'Could not reach the Payroll service. Make sure the Payroll backend is running, then try again.';
  }
  const status = (err as { response?: { status?: number } })?.response?.status;
  const message =
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
  if (status === 401) {
    return 'Session expired or invalid. Reopen Payroll from your organization dashboard.';
  }
  if (status === 403) {
    return message || 'Payroll is not licensed for your organization.';
  }
  return message;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('AUTH_TIMEOUT')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [user, setUser] = useState<JwtUser | null>(null);
  const [reloading, setReloading] = useState(false);

  const load = useCallback(async () => {
    setReloading(true);
    setReady(false);
    captureTokenFromUrl();
    let token = getToken();
    setUser(token ? parseJwtPayload(token) : null);

    if (!token) {
      setAuthorized(false);
      setError('Missing access token. Open this module from your organization dashboard.');
      setReady(true);
      setReloading(false);
      return;
    }

    try {
      if (isTokenExpired() && getRefreshToken()) {
        token = await withTimeout(refreshAccessToken(), AUTH_TIMEOUT_MS) ?? token;
        setUser(token ? parseJwtPayload(token) : null);
      }

      const { data } = await withTimeout(api.get('/dashboard'), AUTH_TIMEOUT_MS);
      setSummary(data.data);
      setAuthorized(true);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'AUTH_TIMEOUT') {
        setError('Connection timed out. The Payroll service may be offline or slow to respond.');
      } else {
        setError(authErrorMessage(err, 'Unable to access Payroll Module'));
      }
      setAuthorized(false);
    } finally {
      setReady(true);
      setReloading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onExpired = () => {
      setAuthorized(false);
      setError('Session expired or invalid. Reopen Payroll from your organization dashboard.');
    };
    window.addEventListener(PAYROLL_SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(PAYROLL_SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  return (
    <AuthContext.Provider value={{ ready, authorized, error, summary, user, reloading, reload: load }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
