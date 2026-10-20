import axios from 'axios';
import { attachIamAuth } from './iamAuth';

/**
 * Same backend as BabyeyiSystem (MTN keys live in that server’s `.env`).
 * - Dev: leave `VITE_API_URL` unset or empty → use `/api` so Vite proxies to the backend (vite.config).
 * - Or set `VITE_API_URL=http://localhost:5100` (or your Babyeyi `PORT`) to call the API directly.
 */
function resolveRawApiUrl() {
  const v = import.meta.env.VITE_API_URL;
  if (v != null && String(v).trim() !== '') {
    return String(v).trim().replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return '';
  }
  return 'https://ticha-api.shuleplus.rw';
}

const rawBaseUrl = resolveRawApiUrl();
export const API_BASE_URL =
  rawBaseUrl === ''
    ? '/api'
    : rawBaseUrl.endsWith('/api')
      ? rawBaseUrl
      : `${rawBaseUrl}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

attachIamAuth(api, { redirectOnLostSession: true });

export default api;
