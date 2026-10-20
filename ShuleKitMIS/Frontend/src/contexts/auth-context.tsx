import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/services/api';
import { captureTokenFromUrl, getToken } from '@/shared/auth-token';
import { parseJwtPayload } from '@/shared/jwt';
import type { DashboardSummary, JwtUser } from '@/types';

interface AuthContextValue {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  summary: DashboardSummary | null;
  user: JwtUser | null;
  isOrgAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [user, setUser] = useState<JwtUser | null>(null);

  useEffect(() => {
    captureTokenFromUrl();
    const token = getToken();
    const parsed = token ? parseJwtPayload(token) : null;

    api
      .get('/dashboard')
      .then(({ data }) => {
        setUser(parsed);
        setSummary(data.data);
        setAuthorized(true);
        setError(null);
        setReady(true);
      })
      .catch((err: unknown) => {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Unable to access Student Kit MIS';
        if (!token) {
          setError('Missing access token. Open this module from your organization dashboard.');
        } else {
          setUser(parsed);
          setError(message);
        }
        setAuthorized(false);
        setReady(true);
      });
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
