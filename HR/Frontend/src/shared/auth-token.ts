const TOKEN_KEY = 'hr_module_token';
const REFRESH_KEY = 'hr_module_refresh_token';

export function captureTokenFromUrl(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const refresh = params.get('refresh');
  let changed = false;

  if (token) {
    setToken(token);
    params.delete('token');
    changed = true;
  } else if (!localStorage.getItem(TOKEN_KEY)) {
    const iamToken = localStorage.getItem('accessToken');
    if (iamToken) setToken(iamToken);
  }

  if (refresh) {
    setRefreshToken(refresh);
    params.delete('refresh');
    changed = true;
  } else if (!localStorage.getItem(REFRESH_KEY)) {
    const iamRefresh = localStorage.getItem('refreshToken');
    if (iamRefresh) setRefreshToken(iamRefresh);
  }

  if (changed) {
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem('accessToken');
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem('accessToken', token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY) ?? localStorage.getItem('refreshToken');
}

export function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFRESH_KEY, token);
  localStorage.setItem('refreshToken', token);
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

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export const HR_SESSION_EXPIRED_EVENT = 'hr:session-expired';

export function notifySessionExpired(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(HR_SESSION_EXPIRED_EVENT));
}
