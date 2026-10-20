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
  deskOnly: boolean;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [user, setUser] = useState<JwtUser | null>(null);
  const [deskOnly, setDeskOnly] = useState(false);

  async function load() {
    captureTokenFromUrl();
    const token = getToken();
    const parsed = token ? parseJwtPayload(token) : null;
    setUser(parsed);

    if (!token) {
      setError('Missing access token. Open this module from your organization dashboard.');
      setReady(true);
      return;
    }

    const isInvigilator =
      /^invigilator$/i.test((parsed?.position ?? '').trim())
      && !(parsed?.roles ?? []).includes('organization_admin');

    async function openDesk() {
      const { data } = await api.get('/exam-invigilator/me');
      const desk = data.data as { organizationName?: string };
      setSummary({
        organizationId: parsed?.organizationId || '',
        organizationName: desk.organizationName || 'School',
        studentCount: 0,
        classCount: 0,
        activeEnrollments: 0,
        status: 'ACTIVE',
      });
      setDeskOnly(true);
      setAuthorized(true);
      setError(null);
    }

    try {
      if (isInvigilator) {
        await openDesk();
      } else {
        try {
          const { data } = await api.get('/dashboard');
          setSummary(data.data);
          setDeskOnly(false);
          setAuthorized(true);
          setError(null);
        } catch {
          await openDesk();
        }
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Unable to access Academic';
      setError(message);
      setAuthorized(false);
      setDeskOnly(false);
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
        deskOnly,
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
