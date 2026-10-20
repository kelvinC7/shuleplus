const TOKEN_KEY = 'timetable_module_token';
const REFRESH_KEY = 'timetable_module_refresh';

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

export function captureTokenFromUrl(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const refresh = params.get('refresh');

  if (token) {
    storeToken(token);
    params.delete('token');
  }
  if (refresh) {
    storeRefreshToken(refresh);
    params.delete('refresh');
  }

  if (token || refresh) {
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }
}

/** @deprecated Use clearTokens */
export function clearToken(): void {
  clearTokens();
}
