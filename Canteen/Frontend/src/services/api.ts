import axios from 'axios';
import { getToken, storeToken, getRefreshToken, clearTokens } from '@/shared/auth-token';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3051/api';
const IAM_API_URL = process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  failedQueue = [];
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(`${IAM_API_URL}/auth/refresh`, { refreshToken });
      const newToken = data.data.accessToken;
      storeToken(newToken);
      processQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearTokens();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

/** Small typed wrapper: unwraps `{ success: true, data }` responses. */
export async function getData<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await api.get(url, { params });
  return data.data as T;
}

export async function postData<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.post(url, body);
  return data.data as T;
}

export async function patchData<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.patch(url, body);
  return data.data as T;
}

export async function putData<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.put(url, body);
  return data.data as T;
}

export async function deleteData<T>(url: string): Promise<T> {
  const { data } = await api.delete(url);
  return data.data as T;
}
