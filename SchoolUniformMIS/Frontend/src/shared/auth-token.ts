const TOKEN_KEY = "school_uniform_module_token";
const REFRESH_KEY = "school_uniform_module_refresh";

export const UNIFORM_SESSION_EXPIRED_EVENT = "uniform-session-expired";

export function storeToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function storeRefreshToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(REFRESH_KEY, token);
    // Shared key used by some platform launchers
    localStorage.setItem("refreshToken", token);
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(REFRESH_KEY) ?? localStorage.getItem("refreshToken")
  );
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
}

export function clearTokens() {
  clearToken();
}

export function isTokenExpired(token?: string | null): boolean {
  const value = token ?? getToken();
  if (!value) return true;
  try {
    const segment = value.split(".")[1];
    if (!segment) return true;
    const payload = JSON.parse(
      atob(segment.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    if (!payload.exp) return false;
    // Refresh 60s before actual expiry
    return payload.exp * 1000 <= Date.now() + 60_000;
  } catch {
    return true;
  }
}

export function captureTokenFromUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const refresh = params.get("refresh");

  if (token) {
    storeToken(token);
    params.delete("token");
  }
  if (refresh) {
    storeRefreshToken(refresh);
    params.delete("refresh");
  }

  if (token || refresh) {
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);
  }
}
