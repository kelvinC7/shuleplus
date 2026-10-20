'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, refreshAccessToken } from '@/services/api';
import {
  captureTokenFromUrl,
  getToken,
  isTokenExpired,
  getRefreshToken,
  SESSION_EXPIRED_EVENT,
} from '@/shared/auth-token';
import { parseJwtPayload } from '@/shared/jwt';
import type { DashboardSummary, JwtUser, OrganizationProfile } from '@/types';

interface AuthContextValue {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  summary: DashboardSummary | null;
  orgProfile: OrganizationProfile | null;
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
  const [orgProfile, setOrgProfile] = useState<OrganizationProfile | null>(null);
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
      let dashboardRes;
      try {
        dashboardRes = await api.get('/dashboard');
      } catch (err: unknown) {
        if (isTenantNotProvisioned(err)) {
          await api.post('/tenant/ensure', { organizationName: 'Organization' });
          dashboardRes = await api.get('/dashboard');
        } else {
          throw err;
        }
      }
      const [profileRes] = await Promise.all([
        api.get('/organization/profile').catch(() => null),
      ]);
      setSummary(dashboardRes.data.data);
      setOrgProfile(profileRes?.data?.data ?? null);
      setAuthorized(true);
      setError(null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to access Action Plans Module';
      if (status === 401) {
        setError('Session expired or invalid. Reopen Action Plans from your organization dashboard.');
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
      setError('Session expired or invalid. Reopen Action Plans from your organization dashboard.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  return (
    <AuthContext.Provider value={{ ready, authorized, error, summary, orgProfile, user, reload: load }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
