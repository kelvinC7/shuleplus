import { ensureAccessToken, refreshAccessToken } from './api';
import { clearSession } from './auth';

function resolveKaziApi(): string {
  const raw =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_KAZI_API_URL) ||
    'http://localhost:4400';
  return raw.replace(/\/$/, '');
}

function redirectToLogin(): void {
  clearSession();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const token = await ensureAccessToken();
  const res = await fetch(`${resolveKaziApi()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & { success?: boolean; message?: string };

  if (res.status === 401 && !retried) {
    const newToken = await refreshAccessToken();
    if (newToken) return request<T>(path, init, true);
    redirectToLogin();
    throw new Error('Session expired. Please sign in again.');
  }
  if (!res.ok) {
    throw new Error((body as { message?: string }).message || `KaziAdvance error ${res.status}`);
  }
  return body;
}

export type PlatformRequestRow = {
  id: string;
  requestNumber: string;
  school: string;
  teacher: string;
  employeeCode: string;
  amount: number;
  months: number;
  status: string;
  purpose: string;
  submittedAt: string;
  profitPercent: number;
  income: number;
  totalPaid: number;
  remainingBalance: number;
};

export type PlatformDeal = {
  id: string;
  name: string;
  shortDescription?: string;
  description?: string;
  imageUrl?: string | null;
  image_url?: string | null;
  price_rwf: number;
};

export const kaziPlatformApi = {
  getPolicy: () => request<{ data: { profitPercent: number } }>('/api/platform/policy'),
  setPolicy: (profitPercent: number) =>
    request<{ data: { profitPercent: number } }>('/api/platform/policy', {
      method: 'PUT',
      body: JSON.stringify({ profitPercent }),
    }),
  getRequests: (school?: string) => {
    const q = school && school !== 'All' ? `?school=${encodeURIComponent(school)}` : '';
    return request<{
      schools: string[];
      summary: { total: number; pending: number; active: number; incomeTotal: number };
      data: PlatformRequestRow[];
    }>(`/api/platform/requests${q}`);
  },
  getDeals: () => request<{ data: PlatformDeal[] }>('/api/platform/deals'),
  createDeal: (body: Record<string, unknown>) =>
    request<{ data: PlatformDeal }>('/api/platform/deals', { method: 'POST', body: JSON.stringify(body) }),
  updateDeal: (id: string, body: Record<string, unknown>) =>
    request<{ data: PlatformDeal }>(`/api/platform/deals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteDeal: (id: string) =>
    request<{ success: boolean }>(`/api/platform/deals/${id}`, { method: 'DELETE' }),
};
