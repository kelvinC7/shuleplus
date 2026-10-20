"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch, isNetworkError } from "@/lib/api";
import {
  captureTokenFromUrl,
  getToken,
  getRefreshToken,
  isTokenExpired,
  refreshAccessToken,
} from "@/shared/auth-token";
import {
  hasKaziAdvanceAccess,
  isOrgOrPlatformAdmin,
  parseJwtPayload,
  type JwtUser,
} from "@/shared/jwt";

type SessionUser = {
  id: string;
  employeeCode: string;
  email: string;
  fullName: string;
  department: string;
  position: string;
  organizationId?: string | null;
};

type SessionResponse = {
  portal?: "org-admin" | "employee";
  user: SessionUser | null;
  iam: JwtUser;
};

type AuthContextValue = {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  apiOffline: boolean;
  portal: "org-admin" | "employee" | null;
  user: JwtUser | null;
  employee: SessionUser | null;
  reload: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function portalFromJwt(user: JwtUser | null): "org-admin" | "employee" | null {
  if (!user) return null;
  return isOrgOrPlatformAdmin(user) ? "org-admin" : "employee";
}

function authorizeFromJwt(user: JwtUser | null): boolean {
  if (!user || isTokenExpired()) return false;
  return hasKaziAdvanceAccess(user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiOffline, setApiOffline] = useState(false);
  const [portal, setPortal] = useState<"org-admin" | "employee" | null>(null);
  const [user, setUser] = useState<JwtUser | null>(null);
  const [employee, setEmployee] = useState<SessionUser | null>(null);

  async function load() {
    setReady(false);
    setApiOffline(false);
    captureTokenFromUrl();
    let token = getToken();

    if ((!token || isTokenExpired()) && getRefreshToken()) {
      try {
        token = (await refreshAccessToken()) ?? token;
      } catch {
        // keep existing token; session call / offline fallback will handle auth
      }
    }

    const jwtUser = token ? parseJwtPayload(token) : null;
    setUser(jwtUser);

    if (!token) {
      setError("Missing access token. Open KaziAdvance from your organization dashboard.");
      setAuthorized(false);
      setEmployee(null);
      setPortal(null);
      setReady(true);
      return;
    }

    if (!authorizeFromJwt(jwtUser)) {
      setError("Module Not Licensed. Ask your organization admin to assign KaziAdvance.");
      setAuthorized(false);
      setEmployee(null);
      setPortal(null);
      setReady(true);
      return;
    }

    try {
      const session = await apiFetch<SessionResponse>("/api/auth/session");
      setPortal(session.portal ?? portalFromJwt(jwtUser));
      setEmployee(session.user);
      setAuthorized(true);
      setError(null);
      setApiOffline(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to access KaziAdvance";

      // Backend unreachable — allow entry when JWT is valid (org admin or licensed employee).
      if (isNetworkError(err) && authorizeFromJwt(jwtUser)) {
        setPortal(portalFromJwt(jwtUser));
        setEmployee(null);
        setAuthorized(true);
        setError(null);
        setApiOffline(true);
        setReady(true);
        return;
      }

      // Token rejected — try IAM refresh once, then session again.
      if (message.toLowerCase().includes("invalid") || message.toLowerCase().includes("expired")) {
        let refreshed: string | null = null;
        try {
          refreshed = await refreshAccessToken();
        } catch {
          refreshed = null;
        }
        if (refreshed) {
          const refreshedUser = parseJwtPayload(refreshed);
          setUser(refreshedUser);
          try {
            const session = await apiFetch<SessionResponse>("/api/auth/session");
            setPortal(session.portal ?? portalFromJwt(refreshedUser));
            setEmployee(session.user);
            setAuthorized(true);
            setError(null);
            setApiOffline(false);
            setReady(true);
            return;
          } catch (retryErr) {
            if (isNetworkError(retryErr) && authorizeFromJwt(refreshedUser)) {
              setPortal(portalFromJwt(refreshedUser));
              setAuthorized(true);
              setApiOffline(true);
              setReady(true);
              return;
            }
          }
        }
      }

      setError(message);
      setAuthorized(false);
      setEmployee(null);
      setPortal(null);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <AuthContext.Provider
      value={{ ready, authorized, error, apiOffline, portal, user, employee, reload: load }}
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
