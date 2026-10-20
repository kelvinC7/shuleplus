import axios, { type InternalAxiosRequestConfig } from 'axios';
import {
  clearToken,
  getRefreshToken,
  getToken,
  isTokenExpired,
  notifySessionExpired,
  setToken,
} from '@/shared/auth-token';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3064/api';
const IAM_API_URL = process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<{ data: { accessToken: string } }>(
      `${IAM_API_URL}/auth/refresh`,
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

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let token = getToken();
  if (token && isTokenExpired()) {
    if (!refreshPromise) refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
    token = await refreshPromise;
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      clearToken();
      notifySessionExpired();
    }
    return Promise.reject(error);
  }
);

export type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

export function unwrap<T>(payload: ApiEnvelope<T>): T {
  return payload.data;
}
