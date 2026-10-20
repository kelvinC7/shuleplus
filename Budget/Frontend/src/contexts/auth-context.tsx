'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api, refreshAccessToken } from '@/services/api';
import { budgetApi } from '@/services/budget-api';
import {
  captureTokenFromUrl,
  getToken,
  isTokenExpired,
  getRefreshToken,
  BUDGET_SESSION_EXPIRED_EVENT,
} from '@/shared/auth-token';
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

function isTenantNotProvisioned(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const message =
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '';
  return status === 403 && /tenant not provisioned/i.test(message);
}

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
      setAuthorized(false);
      setError('Missing access token. Open this module from your organization dashboard.');
      setReady(true);
      return;
    }

    if (isTokenExpired() && getRefreshToken()) {
      token = (await refreshAccessToken()) ?? token;
      setUser(token ? parseJwtPayload(token) : null);
    }

    try {
      let dashRes;
      try {
        dashRes = await api.get('/dashboard');
      } catch (err: unknown) {
        if (isTenantNotProvisioned(err)) {
          await budgetApi.tenantEnsure();
          dashRes = await api.get('/dashboard');
        } else {
          throw err;
        }
      }
      setSummary(dashRes.data.data);
      setAuthorized(true);
      setError(null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to access School Budget';
      if (status === 401) {
        setError(
          message.includes('Authentication required') || message.includes('Invalid or expired')
            ? 'Your login token could not be verified. Reopen School Budget from your organization dashboard.'
            : message
        );
      } else if (status === 403 && /not licensed/i.test(message)) {
        setError('School Budget is not licensed for your organization. Contact your administrator.');
      } else if (status === 403 && /tenant not provisioned/i.test(message)) {
        setError('School Budget is not set up for your organization yet. Try again from Organization Admin.');
      } else if (!status) {
        setError('Cannot reach School Budget API. Ensure the backend is running on port 3022.');
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
      setError('Session expired or invalid. Reopen School Budget from your organization dashboard.');
    };
    window.addEventListener(BUDGET_SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(BUDGET_SESSION_EXPIRED_EVENT, onExpired);
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
