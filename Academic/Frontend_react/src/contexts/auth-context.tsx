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
  /** true = module head / organization user: sees the whole organization. */
  seeAll: boolean;
  accessLevel: 'USER' | 'HEAD';
  deskOnly: boolean;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACADEMIC_SLUGS = ['academic', 'academic-1', 'academics'];

function claimSeeAll(user: JwtUser | null): boolean {
  if (!user) return false;
  if ((user.roles ?? []).includes('organization_admin')) return true;
  for (const slug of ACADEMIC_SLUGS) {
    const access = user.moduleAccess?.[slug];
    if (access) return access.accessLevel === 'HEAD';
  }
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [user, setUser] = useState<JwtUser | null>(null);
  const [deskOnly, setDeskOnly] = useState(false);
  const [seeAll, setSeeAll] = useState(false);
  const [accessLevel, setAccessLevel] = useState<'USER' | 'HEAD'>('USER');

  async function load() {
    captureTokenFromUrl();
    const token = getToken();
    const parsed = token ? parseJwtPayload(token) : null;
    setUser(parsed);
    setSeeAll(claimSeeAll(parsed));
    setAccessLevel(claimSeeAll(parsed) ? 'HEAD' : 'USER');

    if (!token) {
      setError('Missing access token. Open this module from your organization dashboard.');
      setReady(true);
      return;
    }

    // IAM is the source of truth; the JWT claim is only a fast first guess for
    // sessions issued before the moduleAccess claim existed.
    async function loadScope() {
      try {
        const { data } = await api.get('/me/scope');
        const scope = data?.data as { seeAll?: boolean; accessLevel?: 'USER' | 'HEAD' } | undefined;
        if (scope) {
          setSeeAll(!!scope.seeAll);
          setAccessLevel(scope.accessLevel === 'HEAD' ? 'HEAD' : 'USER');
        }
      } catch {
        // Keep the JWT-derived value when the endpoint is unavailable.
      }
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
      await loadScope();
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
        seeAll,
        accessLevel,
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
