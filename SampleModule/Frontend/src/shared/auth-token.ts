const TOKEN_KEY = 'sample_module_token';

export function storeToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
}

export function captureTokenFromUrl() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) {
    storeToken(token);
    params.delete('token');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', next);
  }
}
