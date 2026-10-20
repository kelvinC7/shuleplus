import { clearToken, getToken } from '@/shared/auth-token';

const IAM_API_URL = process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';

function iamLoginUrl(message?: string): string {
  const base = (process.env.NEXT_PUBLIC_IAM_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const url = new URL(`${base}/login`);
  if (message) url.searchParams.set('message', message);
  url.searchParams.set('redirect', typeof window !== 'undefined' ? window.location.origin : '');
  return url.toString();
}

/** Clear Print Card + IAM tokens and redirect to IAM login (no back-button access). */
export async function redirectToLogin(message = 'Your session has expired. Please log in again.'): Promise<void> {
  if (typeof window === 'undefined') return;

  const token = getToken();
  try {
    if (token) {
      await fetch(`${IAM_API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    /* still clear local session */
  }

  clearToken();
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('print-card:selected-school-id');

  window.location.replace(iamLoginUrl(message));
}
