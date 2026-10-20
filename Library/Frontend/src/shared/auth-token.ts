const TOKEN_KEY = 'Library_module_token';
const REFRESH_KEY = 'Library_module_refresh';
const SESSION_KEY = 'Library_parent_session';

export type LinkedStudent = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  studentCode: string | null;
  className?: string | null;
  photo?: string | null;
  role?: string;
  organizationId?: string;
  academicYear?: string | null;
  term?: string | null;
};

export type ParentSessionParent = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email?: string | null;
  organizationId: string;
};

export type ParentSession = {
  parent: ParentSessionParent;
  students: LinkedStudent[];
};

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

export function storeParentSession(session: ParentSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getParentSession(): ParentSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ParentSession;
  } catch {
    return null;
  }
}

export function clearParentSession() {
  if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY);
}

export function clearTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(SESSION_KEY);
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
