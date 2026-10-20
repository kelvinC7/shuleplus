const TOKEN_KEY = 'discipline_module_token';
const REFRESH_KEY = 'discipline_module_refresh_token';
/** Legacy key from inventory template — cleared on bootstrap */
const LEGACY_TOKEN_KEY = 'InventoryMIS_module_token';
const LEGACY_REFRESH_KEY = 'InventoryMIS_module_refresh';

export function captureTokenFromUrl(): void {
  if (typeof window === 'undefined') return;

  // Drop stale tokens from the old inventory scaffold
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_KEY);

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const refresh = params.get('refresh');
  let changed = false;

  if (token) {
    setToken(token);
    params.delete('token');
    changed = true;
  }

  if (refresh) {
    setRefreshToken(refresh);
    params.delete('refresh');
    changed = true;
  }

  if (changed) {
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function storeToken(token: string): void {
  setToken(token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFRESH_KEY, token);
}

export function storeRefreshToken(token: string): void {
  setRefreshToken(token);
}

export function isTokenExpired(bufferSeconds = 30): boolean {
  const token = getToken();
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp !== 'number') return false;
    return Date.now() >= payload.exp * 1000 - bufferSeconds * 1000;
  } catch {
    return true;
  }
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_KEY);
}

export const DISCIPLINE_SESSION_EXPIRED_EVENT = 'discipline:session-expired';

export function notifySessionExpired(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DISCIPLINE_SESSION_EXPIRED_EVENT));
}
