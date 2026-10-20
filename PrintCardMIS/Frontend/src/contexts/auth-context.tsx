'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  captureTokenFromUrl,
  getRefreshToken,
  getToken,
  isTokenExpired,
  SESSION_EXPIRED_EVENT,
} from '@/shared/auth-token';
import { refreshAccessToken } from '@/services/api';
import { fetchSession, type SessionSummary } from '@/services/print-card-api';
import { redirectToLogin } from '@/utils/auth-login';

interface AuthContextValue {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  session: SessionSummary | null;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionSummary | null>(null);

  async function load() {
    captureTokenFromUrl();
    let token = getToken();

    if (!token) {
      setError('Missing access token. Open Print Card from your organization dashboard.');
      setAuthorized(false);
      setReady(true);
      return;
    }

    if (isTokenExpired() && getRefreshToken()) {
      token = (await refreshAccessToken()) ?? token;
    }

    try {
      const data = await fetchSession();
      setSession(data);
      setAuthorized(true);
      setError(null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to access Print Card module';
      if (status === 401) {
        setError('Session expired or invalid. Reopen Print Card from your organization dashboard.');
      } else {
        setError(message);
      }
      setAuthorized(false);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    function onSessionExpired() {
      void redirectToLogin('Your session has expired. Please log in again.');
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  return (
    <AuthContext.Provider value={{ ready, authorized, error, session, reload: load }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
