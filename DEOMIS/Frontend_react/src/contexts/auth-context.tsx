import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, refreshAccessToken } from '@/services/api';
import { captureTokenFromUrl, getRefreshToken, getToken } from '@/shared/auth-token';
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

  async function load() {
    captureTokenFromUrl();
    const token = getToken();
    setUser(token ? parseJwtPayload(token) : null);

    if (!token) {
      setError('Missing access token. Open this module from your organization dashboard.');
      setReady(true);
      return;
    }

    try {
      const { data } = await api.get('/dashboard');
      setSummary(data.data);
      setAuthorized(true);
      setError(null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403 && getRefreshToken()) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          setUser(parseJwtPayload(newToken));
          try {
            const { data } = await api.get('/dashboard');
            setSummary(data.data);
            setAuthorized(true);
            setError(null);
            return;
          } catch {
            /* use message from original or retry failure below */
          }
        }
      }

      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to access Sector MIS';
      const hint =
        message === 'Module Not Licensed'
          ? ' Sign out at the organization dashboard, sign in again, then open Sector MIS from your licensed apps.'
          : message.includes('Tenant not provisioned')
            ? ' Ask a Super Admin to provision Sector MIS (Super Admin → Provisioning).'
            : '';
      setError(`${message}${hint}`);
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
