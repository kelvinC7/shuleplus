"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, refreshAccessToken } from "@/services/api";
import {
  captureTokenFromUrl,
  getRefreshToken,
  getToken,
  isTokenExpired,
  UNIFORM_SESSION_EXPIRED_EVENT,
} from "@/shared/auth-token";
import { parseJwtPayload } from "@/shared/jwt";
import type { DashboardSummary, JwtUser } from "@/types";

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

  const load = useCallback(async () => {
    captureTokenFromUrl();
    let token = getToken();
    setUser(token ? parseJwtPayload(token) : null);

    if (!token) {
      setAuthorized(false);
      setError(
        "Missing access token. Open this module from your organization dashboard.",
      );
      setReady(true);
      return;
    }

    if (isTokenExpired(token) && getRefreshToken()) {
      token = (await refreshAccessToken()) ?? token;
      setUser(token ? parseJwtPayload(token) : null);
    }

    try {
      const { data } = await api.get("/dashboard");
      setSummary(data.data);
      setAuthorized(true);
      setError(null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Unable to access School Uniform";
      if (status === 401) {
        // One more refresh attempt if interceptor couldn't recover
        if (getRefreshToken()) {
          const renewed = await refreshAccessToken();
          if (renewed) {
            try {
              const { data } = await api.get("/dashboard");
              setSummary(data.data);
              setUser(parseJwtPayload(renewed));
              setAuthorized(true);
              setError(null);
              return;
            } catch {
              /* fall through */
            }
          }
        }
        setError(
          "Session expired. Reopen Uniforms from your organization dashboard.",
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
      setError(
        "Session expired. Reopen Uniforms from your organization dashboard.",
      );
    };
    window.addEventListener(UNIFORM_SESSION_EXPIRED_EVENT, onExpired);
    return () =>
      window.removeEventListener(UNIFORM_SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ready,
        authorized,
        error,
        summary,
        user,
        isOrgAdmin: user?.roles?.includes("organization_admin") ?? false,
        reload: load,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
