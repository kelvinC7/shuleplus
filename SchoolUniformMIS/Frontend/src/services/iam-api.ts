import axios from "axios";
import {
  getToken,
  getRefreshToken,
  storeToken,
  clearTokens,
} from "@/shared/auth-token";

const IAM_API_URL =
  process.env.NEXT_PUBLIC_IAM_API_URL ?? "http://localhost:3001/api/v1";

export const iamApi = axios.create({
  baseURL: IAM_API_URL,
  headers: { "Content-Type": "application/json" },
});

iamApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

iamApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as {
      _retry?: boolean;
      headers: Record<string, string>;
    };
    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }
    const refreshToken = getRefreshToken();
    if (!refreshToken) return Promise.reject(error);

    originalRequest._retry = true;
    try {
      const { data } = await axios.post(`${IAM_API_URL}/auth/refresh`, {
        refreshToken,
      });
      const newToken = data?.data?.accessToken as string | undefined;
      if (!newToken) {
        clearTokens();
        return Promise.reject(error);
      }
      storeToken(newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return iamApi(originalRequest);
    } catch (refreshError) {
      clearTokens();
      return Promise.reject(refreshError);
    }
  },
);
