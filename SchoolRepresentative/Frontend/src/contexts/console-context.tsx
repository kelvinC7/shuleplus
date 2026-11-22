'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { consoleApi } from '@/services/console-api';
import {
  AUTH_CHANGE_EVENT,
  captureTokenFromUrl,
  getRefreshToken,
  getToken,
  getTokenExpiryMs,
} from '@/shared/auth-token';
import type { ConsoleContext, ConsoleUser } from '@/types';

const SCOPE_KEY = 'DirectorConsole_scope';

export interface Scope {
  organizationId: string; // 'all' or branch id
  academicYear: string;
  term: string;
}

interface ConsoleContextValue {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  /** true when there is no valid session (missing, expired or rejected token) */
  sessionExpired: boolean;
  ctx: ConsoleContext | null;
  user: ConsoleUser | null;
  scope: Scope;
  setBranch: (organizationId: string) => void;
  setAcademicYear: (academicYear: string) => void;
  setTerm: (term: string) => void;
  /** bump to make every page refetch (after decisions, broadcasts, etc.) */
  refreshKey: number;
  refresh: () => void;
  reload: () => Promise<void>;
}

const ConsoleContext = createContext<ConsoleContextValue | null>(null);

function loadScope(): Scope {
  if (typeof window === 'undefined') {
    return { organizationId: 'all', academicYear: '2026-2027', term: 'Term 3' };
  }
  try {
    const raw = localStorage.getItem(SCOPE_KEY);
    if (raw) return JSON.parse(raw) as Scope;
  } catch {
    /* ignore corrupt scope */
  }
  return { organizationId: 'all', academicYear: '2026-2027', term: 'Term 3' };
}

function saveScope(scope: Scope) {
  if (typeof window !== 'undefined') localStorage.setItem(SCOPE_KEY, JSON.stringify(scope));
}

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [ctx, setCtx] = useState<ConsoleContext | null>(null);
  const [scope, setScope] = useState<Scope>({ organizationId: 'all', academicYear: '2026-2027', term: 'Term 3' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setScope(loadScope());
  }, []);

  const load = useCallback(async () => {
    captureTokenFromUrl();

    // No token, or an expired one we cannot refresh: skip the network call and
    // go straight to the session screen.
    const token = getToken();
    const expiresAt = getTokenExpiryMs(token);
    const expiredBeyondRepair = Boolean(token) && expiresAt !== null && expiresAt <= Date.now() && !getRefreshToken();
    if (!token || expiredBeyondRepair) {
      setCtx(null);
      setAuthorized(false);
      setError(null);
      setSessionExpired(true);
      setReady(true);
      return;
    }

    try {
      const context = await consoleApi.context();
      setCtx(context);
      setAuthorized(true);
      setError(null);
      setSessionExpired(false);
      // keep scope valid when branches/periods change
      setScope((current) => {
        const scope: Scope = {
          organizationId:
            current.organizationId !== 'all' &&
            !context.branches.some((b) => b.id === current.organizationId)
              ? 'all'
              : current.organizationId,
          academicYear:
            context.academicYears.some((y) => y.id === current.academicYear) || !context.academicYears.length
              ? current.academicYear
              : (context.academicYears[0]?.id ?? current.academicYear),
          term:
            context.terms.some((t) => t.id === current.term) || !context.terms.length
              ? current.term
              : (context.terms[0]?.id ?? current.term),
        };
        saveScope(scope);
        return scope;
      });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || !getToken()) {
        setSessionExpired(true);
        setError(null);
        setAuthorized(false);
        return;
      }
      setSessionExpired(false);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to open the Director Console. Check that the backend is running on port 3080.';
      setError(message);
      setAuthorized(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // If the session is lost while the app is open (token cleared after a 401,
  // sign-out in another tab…), switch to the session screen right away.
  useEffect(() => {
    const onAuthChange = () => {
      if (!getToken()) {
        setCtx(null);
        setAuthorized(false);
        setSessionExpired(true);
        setReady(true);
      }
    };
    window.addEventListener(AUTH_CHANGE_EVENT, onAuthChange);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, onAuthChange);
  }, []);

  const setBranch = useCallback((organizationId: string) => {
    setScope((current) => {
      const next = { ...current, organizationId };
      saveScope(next);
      return next;
    });
    setRefreshKey((k) => k + 1);
  }, []);

  const setAcademicYear = useCallback((academicYear: string) => {
    setScope((current) => {
      const next = { ...current, academicYear };
      saveScope(next);
      return next;
    });
    setRefreshKey((k) => k + 1);
  }, []);

  const setTerm = useCallback((term: string) => {
    setScope((current) => {
      const next = { ...current, term };
      saveScope(next);
      return next;
    });
    setRefreshKey((k) => k + 1);
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const value = useMemo<ConsoleContextValue>(
    () => ({
      ready,
      authorized,
      error,
      sessionExpired,
      ctx,
      user: ctx?.user ?? null,
      scope,
      setBranch,
      setAcademicYear,
      setTerm,
      refreshKey,
      refresh,
      reload: load,
    }),
    [ready, authorized, error, sessionExpired, ctx, scope, setBranch, setAcademicYear, setTerm, refreshKey, refresh, load]
  );

  return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>;
}

export function useConsole() {
  const ctxValue = useContext(ConsoleContext);
  if (!ctxValue) throw new Error('useConsole must be used within ConsoleProvider');
  return ctxValue;
}

export function useIsDemoMode() {
  const { user } = useConsole();
  return user?.mode === 'demo';
}
