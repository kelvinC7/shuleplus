'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/services/api';
import { disciplineApi } from '@/services/discipline-api';
import { captureTokenFromUrl, clearTokens, getToken } from '@/shared/auth-token';
import { parseJwtPayload } from '@/shared/jwt';
import { canAccessFullDiscipline } from '@/config/discipline-nav';
import type { DashboardSummary, GateOfficer, JwtUser } from '@/types/discipline';

interface AuthContextValue {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  summary: DashboardSummary | null;
  user: JwtUser | null;
  gateOfficer: GateOfficer | null;
  isGateOnlyUser: boolean;
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
  const [gateOfficer, setGateOfficer] = useState<GateOfficer | null>(null);

  async function load() {
    captureTokenFromUrl();
    const token = getToken();
    const parsedUser = token ? parseJwtPayload(token) : null;
    setUser(parsedUser);
    setGateOfficer(null);

    if (!token) {
      setError('Missing access token. Open this module from your organization dashboard.');
      setReady(true);
      return;
    }

    try {
      const [dashboardRes, gateMeRes] = await Promise.all([
        api.get('/dashboard'),
        disciplineApi.gateMe().catch(() => ({ data: { data: null } })),
      ]);
      setSummary(dashboardRes.data.data);
      setGateOfficer(gateMeRes.data.data ?? null);
      setAuthorized(true);
      setError(null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to access Student Discipline. Please check your network connection and try again.';

      if (status === 401) {
        clearTokens();
        setError(
          message.includes('token') || message.includes('Authentication')
            ? 'Your session expired or is invalid. Open Student Discipline again from the organization dashboard.'
            : message
        );
      } else {
        setError(message);
      }
      setAuthorized(false);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isGateOnlyUser =
    Boolean(gateOfficer) &&
    !canAccessFullDiscipline(user?.roles?.map((r) => r.toLowerCase()));

  return (
    <AuthContext.Provider
      value={{
        ready,
        authorized,
        error,
        summary,
        user,
        gateOfficer,
        isGateOnlyUser,
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
