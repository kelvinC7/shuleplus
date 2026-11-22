const TOKEN_KEY = 'DirectorConsole_module_token';
const REFRESH_TOKEN_KEY = 'DirectorConsole_module_refresh_token';

export const AUTH_CHANGE_EVENT = 'director-auth-change';

function notifyAuthChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

/**
 * Module integration guide §3.5: the platform opens the module at
 * `/dashboard?token=JWT` (see app/dashboard/page.tsx). Capture the token
 * from the URL once, then keep it in localStorage for subsequent requests.
 * Also accepts an optional refresh token for automatic session refresh.
 */
export function storeToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    notifyAuthChange();
  }
}

export function storeRefreshToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    notifyAuthChange();
  }
}

export function storeTokens(token: string, refreshToken?: string | null) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  notifyAuthChange();
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  notifyAuthChange();
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

/** Access-token expiry as an epoch timestamp (ms), or null if unknown. */
export function getTokenExpiryMs(token: string | null): number | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
}

/** Decode JWT exp without verification (client-side expiry hint only). */
export function isTokenExpired(token: string | null, bufferSeconds = 30): boolean {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  if (typeof payload.exp !== 'number') return false;
  return Date.now() >= payload.exp * 1000 - bufferSeconds * 1000;
}

export function captureTokenFromUrl() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const refreshToken = params.get('refresh_token') ?? params.get('refreshToken');
  if (token) {
    storeTokens(token, refreshToken);
    params.delete('token');
    params.delete('refresh_token');
    params.delete('refreshToken');
  }
  const focus = params.get('focus');
  if (token && !focus) {
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', next);
  }
}
