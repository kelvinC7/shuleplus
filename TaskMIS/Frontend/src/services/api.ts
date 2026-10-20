import axios from 'axios';
import { getToken } from '@/shared/auth-token';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
