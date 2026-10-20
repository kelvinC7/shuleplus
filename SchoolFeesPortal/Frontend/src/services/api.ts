import axios, { type InternalAxiosRequestConfig, isAxiosError } from 'axios';
import { resolveFeesApiUrl, resolveIamApiUrl } from '@/lib/resolve-api-url';
import {
  clearToken,
  captureTokenFromUrl,
  getRefreshToken,
  getToken,
  isTokenExpired,
  notifySessionExpired,
  setToken,
} from '@/shared/auth-token';

export const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post<{ data: { accessToken: string } }>(
      `${resolveIamApiUrl()}/auth/refresh`,
      { refreshToken }
    );
    const accessToken = data.data.accessToken;
    setToken(accessToken);
    return accessToken;
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      clearToken();
      notifySessionExpired();
    }
    return null;
  }
}

async function ensureFreshToken(): Promise<string | null> {
  const token = getToken();
  if (token && !isTokenExpired()) return token;
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  const refreshed = await refreshPromise;
  return refreshed ?? token ?? null;
}

api.interceptors.request.use(async (config) => {
  config.baseURL = resolveFeesApiUrl();
  captureTokenFromUrl();
  const token = await ensureFreshToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      notifySessionExpired();
    }
    return Promise.reject(error);
  }
);

export function formatSchoolFeesApiError(err: unknown): string {
  if (isAxiosError(err)) {
    if (!err.response) {
      return 'Cannot reach School Fees API. Ask your admin to redeploy fees-api on the server.';
    }
    const message = (err.response.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  return 'Unable to access School Fees Module';
}
