const TOKEN_KEY = "kaziavance_access_token";
const REFRESH_KEY = "kaziavance_refresh_token";

export function storeToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem("accessToken", token);
}

export function storeRefreshToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REFRESH_KEY, token);
  localStorage.setItem("refreshToken", token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem("accessToken");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY) ?? localStorage.getItem("refreshToken");
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export function isTokenExpired(bufferSeconds = 30): boolean {
  const token = getToken();
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload.exp !== "number") return false;
    return Date.now() >= payload.exp * 1000 - bufferSeconds * 1000;
  } catch {
    return true;
  }
}

export function captureTokenFromUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const refresh = params.get("refresh");
  let changed = false;

  if (token) {
    storeToken(token);
    params.delete("token");
    changed = true;
  } else if (!localStorage.getItem(TOKEN_KEY)) {
    const iamToken = localStorage.getItem("accessToken");
    if (iamToken) storeToken(iamToken);
  }

  if (refresh) {
    storeRefreshToken(refresh);
    params.delete("refresh");
    changed = true;
  } else if (!localStorage.getItem(REFRESH_KEY)) {
    const iamRefresh = localStorage.getItem("refreshToken");
    if (iamRefresh) storeRefreshToken(iamRefresh);
  }

  if (changed) {
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);
  }
}

const IAM_API_URL =
  process.env.NEXT_PUBLIC_IAM_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api/v1";

export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${IAM_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });

    const json = (await res.json().catch(() => null)) as {
      data?: { accessToken?: string; refreshToken?: string };
      message?: string;
    } | null;

    if (!res.ok || !json?.data?.accessToken) return null;

    storeToken(json.data.accessToken);
    if (json.data.refreshToken) storeRefreshToken(json.data.refreshToken);
    return json.data.accessToken;
  } catch {
    // Network / CORS / IAM down — never throw into React render trees
    return null;
  }
}
