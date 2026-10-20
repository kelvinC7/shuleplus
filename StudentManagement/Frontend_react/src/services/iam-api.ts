import axios, { type InternalAxiosRequestConfig } from 'axios';
import {
  captureTokenFromUrl,
  clearToken,
  getRefreshToken,
  getToken,
  isTokenExpired,
  notifySessionExpired,
  setToken,
} from '@/shared/auth-token';

const IAM_API_URL = import.meta.env.VITE_IAM_API_URL ?? 'http://localhost:3001/api/v1';

export const iamApi = axios.create({
  baseURL: IAM_API_URL,
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<{ data: { accessToken: string } }>(
      `${IAM_API_URL}/auth/refresh`,
      { refreshToken },
      { timeout: 30_000 }
    );
    setToken(data.data.accessToken);
    return data.data.accessToken;
  } catch {
    clearToken();
    notifySessionExpired();
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
  return (await refreshPromise) ?? token ?? null;
}

iamApi.interceptors.request.use(async (config) => {
  captureTokenFromUrl();
  const token = await ensureFreshToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

iamApi.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return iamApi(original);
      }
    }
    return Promise.reject(error);
  }
);
