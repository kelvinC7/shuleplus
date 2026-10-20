'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/services/api';
import { captureTokenFromUrl, getToken } from '@/shared/auth-token';
import { parseJwtPayload, isPlatformAdmin } from '@/shared/jwt';
import type { CanteenProfile, JwtUser } from '@/types';

export type AppRole = 'superadmin' | 'operator' | 'supplier' | 'driver' | 'admin';

interface AuthContextValue {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  user: JwtUser | null;
  profile: CanteenProfile | null;
  role: AppRole;
  isPlatformAdmin: boolean;
  reload: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function deriveRole(user: JwtUser | null, profile: CanteenProfile | null): AppRole {
  if (!user) return 'admin';
  if (isPlatformAdmin(user)) return 'superadmin';
  const pRole = (profile?.role ?? '').toUpperCase();
  if (profile?.driverId || pRole === 'DRIVER') return 'driver';
  if (profile?.supplierId || pRole === 'SUPPLIER' || pRole === 'SUPPLIER_STAFF') return 'supplier';
  if (pRole === 'OPERATOR' || pRole === 'CANTEEN_ADMIN') return 'operator';
  return 'admin';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<JwtUser | null>(null);
  const [profile, setProfile] = useState<CanteenProfile | null>(null);

  async function load() {
    captureTokenFromUrl();
    const token = getToken();
    const decoded = token ? parseJwtPayload(token) : null;
    setUser(decoded);

    if (!token) {
      setError('Missing access token. Open this module from your ShulePlus dashboard.');
      setReady(true);
      return;
    }

    try {
      const { data } = await api.get('/me/profile');
      setProfile(data.data);
      setAuthorized(true);
      setError(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to reach the canteen service. Check your connection and try again.';
      setError(message);
      setAuthorized(false);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ready,
        authorized,
        error,
        user,
        profile,
        role: deriveRole(user, profile),
        isPlatformAdmin: isPlatformAdmin(user),
        reload: load,
        logout: () => {
          localStorage.removeItem('canteen_module_token');
          localStorage.removeItem('canteen_module_refresh');
          window.location.href = process.env.NEXT_PUBLIC_IAM_URL ?? 'http://localhost:3000';
        },
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
