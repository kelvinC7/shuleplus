'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, refreshAccessToken } from '@/services/api';
import { transportApi } from '@/services/transport-api';
import {
  captureTokenFromUrl,
  getToken,
  isTokenExpired,
  getRefreshToken,
  SESSION_EXPIRED_EVENT,
} from '@/shared/auth-token';
import { parseJwtPayload } from '@/shared/jwt';
import type { JwtUser } from '@/types';
import { redirectToIamLogin } from '@/utils/iam-login-redirect';

interface AuthContextValue {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  user: JwtUser | null;
  organizationName: string | null;
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
  const [user, setUser] = useState<JwtUser | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  const load = useCallback(async () => {
    captureTokenFromUrl();
    let token = getToken();
    setUser(token ? parseJwtPayload(token) : null);

    if (!token) {
      setAuthorized(false);
      setError('Missing access token. Sign in to continue.');
      setReady(true);
      redirectToIamLogin({ reason: 'missing' });
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
          await transportApi.tenantEnsure();
          dashboardRes = await api.get('/dashboard');
        } else {
          throw err;
        }
      }
      const orgName =
        (dashboardRes?.data?.data as { organizationName?: string } | undefined)?.organizationName ??
        null;
      setOrganizationName(orgName);
      setAuthorized(true);
      setError(null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to access Smart Transport';
      if (status === 401) {
        setError('Session expired or invalid. Sign in again.');
        redirectToIamLogin({ reason: 'expired' });
      } else if (status === 403 && /suspend|suspend|not licensed|inactive/i.test(message)) {
        setError('Deactivated');
      } else if (status === 500) {
        setError(
          'Transport database or server error. Run `npx prisma db push` in Transport/Backend, restart the API, then reopen from Organization Admin with ?token=…'
        );
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
      setError('Session expired or invalid. Sign in again.');
      redirectToIamLogin({ reason: 'expired' });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  return (
    <AuthContext.Provider
      value={{ ready, authorized, error, user, organizationName, reload: load }}
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
