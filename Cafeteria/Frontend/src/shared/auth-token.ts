const TOKEN_KEY = 'CafeteriaMIS_module_token';
const REFRESH_KEY = 'CafeteriaMIS_module_refresh';

export function storeToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function storeRefreshToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem(REFRESH_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function clearTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
}

export function captureTokenFromUrl() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) {
    storeToken(token);
    params.delete('token');
  }
  const refresh = params.get('refresh');
  if (refresh) {
    storeRefreshToken(refresh);
    params.delete('refresh');
  }
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
  if (token || refresh) {
    window.history.replaceState({}, '', next);
  }
}
