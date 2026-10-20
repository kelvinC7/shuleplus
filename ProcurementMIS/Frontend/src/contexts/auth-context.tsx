'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/services/api';
import { captureTokenFromUrl, getToken } from '@/shared/auth-token';
import { parseJwtPayload } from '@/shared/jwt';
import type { DashboardData, JwtUser } from '@/types';
import { fetchProcurementModuleVisibility, type ModuleAccessLevel } from '@/services/iam-api';
import { isProcurementManageUser, isProcurementSupervisor, resolveModuleAccessLevel } from '@/utils/permissions';

interface AuthContextValue {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  summary: DashboardData | null;
  user: JwtUser | null;
  moduleAccessLevel: ModuleAccessLevel | null;
  isOrgAdmin: boolean;
  isSupervisor: boolean;
  isManageUser: boolean;
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
  const [summary, setSummary] = useState<DashboardData | null>(null);
  const [user, setUser] = useState<JwtUser | null>(null);
  const [moduleAccessLevel, setModuleAccessLevel] = useState<ModuleAccessLevel | null>(null);

  async function load() {
    captureTokenFromUrl();
    const token = getToken();
    const parsedUser = token ? parseJwtPayload(token) : null;
    setUser(parsedUser);

    if (!token) {
      setError('Missing access token. Open this module from your organization dashboard.');
      setAuthorized(false);
      setReady(true);
      return;
    }

    try {
      const visibility = await fetchProcurementModuleVisibility();
      const roles = parsedUser?.roles ?? [];
      const accessLevel = resolveModuleAccessLevel(
        visibility,
        roles,
        parsedUser?.sub,
      );
      setModuleAccessLevel(accessLevel);

      const supervisor = isProcurementSupervisor(roles, accessLevel);
      const manageUser = isProcurementManageUser(roles, accessLevel);

      if (!supervisor && manageUser) {
        try {
          await api.post('/tenant/ensure', { organizationName: 'Organization' });
        } catch {
          /* tenant may already exist */
        }
        setSummary(null);
        setAuthorized(true);
        setError(null);
        return;
      }

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
      setSummary(dashboardRes.data.data);
      setAuthorized(true);
      setError(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to access Procurement MIS. Please check your network connection and try again.';
      setError(message);
      setAuthorized(false);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ready,
        authorized,
        error,
        summary,
        user,
        moduleAccessLevel,
        isOrgAdmin: user?.roles?.some((r) => r.toLowerCase().includes('organization_admin')) ?? false,
        isSupervisor: isProcurementSupervisor(user?.roles ?? [], moduleAccessLevel),
        isManageUser: isProcurementManageUser(user?.roles ?? [], moduleAccessLevel),
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
