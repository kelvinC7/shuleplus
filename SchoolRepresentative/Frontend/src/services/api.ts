import axios from 'axios';
import {
  clearTokens,
  getRefreshToken,
  getToken,
  isTokenExpired,
  storeTokens,
} from '@/shared/auth-token';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3080/api/director';
const IAM_API_BASE_URL =
  process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    try {
      const { data } = await axios.post(`${IAM_API_BASE_URL}/auth/refresh`, { refreshToken });
      const accessToken = data?.data?.accessToken as string | undefined;
      if (!accessToken) return null;
      storeTokens(accessToken, (data?.data?.refreshToken as string | undefined) ?? null);
      return accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function ensureFreshToken(): Promise<string | null> {
  let token = getToken();
  if (token && isTokenExpired(token) && getRefreshToken()) {
    token = (await refreshAccessToken()) ?? token;
  }
  return token;
}

api.interceptors.request.use(async (config) => {
  const token = await ensureFreshToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function isSessionFailure(error: any): boolean {
  const status = error?.response?.status;
  const code = error?.response?.data?.code;
  const message = String(error?.response?.data?.message ?? '');
  if (status !== 401) return false;
  return (
    code === 'AUTH_REQUIRED' ||
    /sign in through shule/i.test(message) ||
    /jwt|token|session|unauthori/i.test(message) ||
    (!code && !error?.response?.data?.data)
  );
}

// Only clear the session on a true Director/IAM session failure. Upstream
// module integration errors are returned as 502 and must not log the user out.
// Attempts a single token refresh on 401 before giving up.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config as any;
    if (error?.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }
    if (isSessionFailure(error)) {
      clearTokens();
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const message =
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    (err as { message?: string })?.message;

  if ((err as { code?: string })?.code === 'ERR_NETWORK' || /network|failed to fetch/i.test(message ?? '')) {
    return 'We could not reach the server. Check your connection and try again.';
  }

  if (!message) {
    if (status === 404) return 'This feature is not available yet.';
    if (status && status >= 500) return 'The server had a problem. Please try again in a moment.';
    return fallback;
  }

  // Sanitize technical backend / routing noise
  if (/route not found/i.test(message) || /GET \/api|POST \/api|PATCH \/api|DELETE \/api/i.test(message)) {
    return 'This feature is not available yet or could not be found.';
  }
  if (/status code 404|\b404\b/i.test(message)) {
    return 'This feature is not available yet.';
  }
  if (/status code 5\d\d|\b50[0-9]\b/i.test(message)) {
    return 'The server had a problem. Please try again in a moment.';
  }

  return message;
}

/** Map any raw error string into a short user-facing line. */
export function friendlyErrorMessage(raw: string | null | undefined, fallback = 'We could not load this right now.'): string {
  if (!raw?.trim()) return fallback;
  if (/route not found|GET \/api|POST \/api|PATCH \/api|status code 404|\b404\b/i.test(raw)) {
    return 'This feature is not available yet or could not be found.';
  }
  if (/network|failed to fetch|ERR_NETWORK/i.test(raw)) {
    return 'We could not reach the server. Check your connection and try again.';
  }
  if (/status code 5|\b50[0-9]\b/i.test(raw)) {
    return 'The server had a problem. Please try again in a moment.';
  }
  if (/jwt|token|session|unauthori|sign in through shule/i.test(raw)) {
    return raw; // session handler still detects these
  }
  // Drop long stack-ish tails
  const first = raw.split('\n')[0].trim();
  return first.length > 160 ? `${first.slice(0, 157)}…` : first;
}
