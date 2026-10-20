import axios from 'axios';

const IAM_API_URL = (
  import.meta.env.VITE_IAM_API_URL ||
  (import.meta.env.PROD ? 'https://shuleplus.rw/api/v1' : 'http://localhost:3001/api/v1')
).replace(/\/$/, '');

const ACCESS_KEY = 'ticha_access_token';
const REFRESH_KEY = 'ticha_refresh_token';
const TEACHER_KEY = 'ticha_teacher';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function storeSession({ accessToken, refreshToken, teacher }) {
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  if (teacher) localStorage.setItem(TEACHER_KEY, JSON.stringify(teacher));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(TEACHER_KEY);
  localStorage.removeItem('teacher_logged_in');
}

/** IAM module launch: `/dashboard?token=...&refresh=...` (or `/login?token=`). */
export function captureTokenFromUrl() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const refresh = params.get('refresh');
  if (!token && !refresh) return false;

  if (token) {
    localStorage.setItem(ACCESS_KEY, token);
    params.delete('token');
  }
  if (refresh) {
    localStorage.setItem(REFRESH_KEY, refresh);
    params.delete('refresh');
  }
  localStorage.setItem('teacher_logged_in', 'true');
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash || ''}`;
  window.history.replaceState({}, '', next);
  return true;
}

export function loadStoredTeacher() {
  try {
    const raw = localStorage.getItem(TEACHER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function decodeJwt(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(token = getAccessToken(), bufferSeconds = 30) {
  if (!token) return true;
  const payload = decodeJwt(token);
  if (typeof payload?.exp !== 'number') return false;
  return Date.now() >= payload.exp * 1000 - bufferSeconds * 1000;
}

export function mapIamUserToTeacher(user) {
  const first = user?.firstName || '';
  const last = user?.lastName || '';
  const full = `${first} ${last}`.trim();
  return {
    id: user.id,
    email: user.email,
    first_name: first,
    last_name: last,
    name: full || user.email,
    full_name: full || user.email,
    phone: user.phone ?? null,
    photo: user.avatarUrl || user.photo || null,
    position: user.position ?? 'Teacher',
    department: user.department ?? null,
    role: { code: 'TEACHER' },
    role_code: 'TEACHER',
    force_password_change: Boolean(user.mustChangePassword),
    school_id: user.organization?.id ?? null,
    school_name: user.organization?.name ?? null,
    school: {
      id: user.organization?.id,
      name: user.organization?.name,
      slug: user.organization?.slug,
      pro_access_effective: true,
    },
    modules: user.modules ?? [],
    roles: user.roles ?? [],
  };
}

export function canUseTeacherPortal(user) {
  const roles = user?.roles ?? [];
  if (roles.includes('root_admin') || roles.includes('super_admin')) return false;
  return (user?.modules ?? []).includes('teacher-portal');
}

export async function iamRequestPasswordResetOtp(email) {
  const { data } = await axios.post(`${IAM_API_URL}/auth/forgot-password-otp`, {
    email: String(email || '').trim(),
  });
  return data;
}

export async function iamResetPasswordWithOtp(email, code, password) {
  const { data } = await axios.post(`${IAM_API_URL}/auth/reset-password-otp`, {
    email: String(email || '').trim(),
    code: String(code || '').trim(),
    password,
  });
  return data;
}

export async function iamLogin(identifier, password, rememberMe = false) {
  const { data } = await axios.post(`${IAM_API_URL}/auth/login`, {
    email: String(identifier || '').trim(),
    password,
    rememberMe,
  });
  return data.data;
}

export async function iamRefresh(refreshToken) {
  const { data } = await axios.post(`${IAM_API_URL}/auth/refresh`, { refreshToken });
  return data.data;
}

let refreshInFlight = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const refreshed = await iamRefresh(refreshToken);
      const next = refreshed?.accessToken;
      if (!next) {
        clearSession();
        return null;
      }
      storeSession({
        accessToken: next,
        refreshToken: refreshed.refreshToken ?? refreshToken,
      });
      return next;
    } catch {
      clearSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function ensureFreshAccessToken() {
  const token = getAccessToken();
  if (token && !isAccessTokenExpired(token)) return token;
  return refreshAccessToken();
}

/** Attach IAM access-token refresh to an axios client (Ticha, Kazi, BFF). */
export function attachIamAuth(client, { redirectOnLostSession = false } = {}) {
  client.interceptors.request.use(async (config) => {
    const token = await ensureFreshAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config;
      if (error.response?.status === 401 && original && !original._iamRetry) {
        original._iamRetry = true;
        const next = await refreshAccessToken();
        if (next) {
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${next}`;
          return client(original);
        }
      }
      if (
        redirectOnLostSession &&
        error.response?.status === 401 &&
        !getAccessToken() &&
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login'
      ) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
}

export async function iamLogout(accessToken) {
  if (!accessToken) return;
  await axios.post(
    `${IAM_API_URL}/auth/logout`,
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

export async function restoreIamSession() {
  captureTokenFromUrl();
  const token = await ensureFreshAccessToken();
  if (!token) {
    clearSession();
    return null;
  }

  const stored = loadStoredTeacher();
  if (stored) return stored;

  const payload = decodeJwt(token);
  if (!payload) {
    clearSession();
    return null;
  }

  const mapped = mapIamUserToTeacher({
    id: payload.sub,
    email: payload.email,
    firstName: '',
    lastName: '',
    position: payload.position,
    modules: payload.modules,
    roles: payload.roles,
    organization: { id: payload.organizationId },
  });
  storeSession({ teacher: mapped });
  return mapped;
}
