import axios from "axios";
import {
  clearTokens,
  getRefreshToken,
  getToken,
  storeToken,
  UNIFORM_SESSION_EXPIRED_EVENT,
} from "@/shared/auth-token";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3051/api";
const IAM_API_URL =
  process.env.NEXT_PUBLIC_IAM_API_URL ?? "http://localhost:3001/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  failedQueue = [];
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post(`${IAM_API_URL}/auth/refresh`, {
      refreshToken,
    });
    const newToken = data?.data?.accessToken as string | undefined;
    if (!newToken) return null;
    storeToken(newToken);
    return newToken;
  } catch {
    clearTokens();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(UNIFORM_SESSION_EXPIRED_EVENT));
    }
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as {
      _retry?: boolean;
      headers: Record<string, string>;
    };
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(UNIFORM_SESSION_EXPIRED_EVENT));
      }
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
      const newToken = await refreshAccessToken();
      if (!newToken) {
        processQueue(error, null);
        return Promise.reject(error);
      }
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
  },
);
