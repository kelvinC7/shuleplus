import axios from 'axios';
import { getToken, clearTokens } from '@/shared/auth-token';

const IAM_API_URL = process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';
const IAM_URL = process.env.NEXT_PUBLIC_IAM_URL ?? 'http://localhost:3000';

export const iamApi = axios.create({
  baseURL: IAM_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

iamApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function logout() {
  try {
    const token = getToken();
    if (token) {
      await iamApi.post('/auth/logout', {});
    }
  } catch {
    /* ignore */
  }
  clearTokens();
  window.location.href = IAM_URL;
}
