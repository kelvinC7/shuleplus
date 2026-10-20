import axios from 'axios';
import { clearSession, getAccessToken, getRefreshToken, isAccessTokenExpired } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

function redirectToLogin(): void {
  clearSession();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

function isPreAuthRoute(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/mfa/') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/public/')
  );
}

export async function ensureAccessToken(): Promise<string | null> {
  let token = getAccessToken();
  if (token && isAccessTokenExpired() && getRefreshToken()) {
    token = (await refreshAccessToken()) ?? token;
  }
  return token ?? null;
}

/** Single in-flight refresh so parallel 401s share one token refresh. */
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      const accessToken = data.data.accessToken as string;
      localStorage.setItem('accessToken', accessToken);
      return accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined' && !isPreAuthRoute(config.url)) {
    let token = getAccessToken();
    if (token && isAccessTokenExpired() && getRefreshToken()) {
      token = (await refreshAccessToken()) ?? token;
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPreAuthRoute(originalRequest.url)
    ) {
      originalRequest._retry = true;

      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      redirectToLogin();
    }

    return Promise.reject(error);
  }
);
