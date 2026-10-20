import { ensureAccessToken, refreshAccessToken } from './api';
import { clearSession } from './auth';

function resolveShulekitApi(): string {
  const raw =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SHULEKIT_API_URL) ||
    'http://localhost:3038/api';
  let base = raw.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (
      /(^|\.)shuleplus\.rw$/i.test(host) &&
      /localhost|127\.0\.0\.1/i.test(base)
    ) {
      return 'https://materials-api.shuleplus.rw/api';
    }
  }
  return base;
}

const SHULEKIT_API = resolveShulekitApi();

function redirectToLogin(): void {
  clearSession();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const token = await ensureAccessToken();
  const res = await fetch(`${SHULEKIT_API.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: T;
    message?: string;
  };

  if (res.status === 401 && !retried) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, init, true);
    }
    redirectToLogin();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) {
    throw new Error(body.message || `ShuleKit API error ${res.status}`);
  }
  return body.data as T;
}

export const shulekitAdminApi = {
  dashboard: () => request<Record<string, unknown>>('/platform/dashboard'),
  listCategories: () => request<Array<Record<string, unknown>>>('/platform/categories'),
  createCategory: (data: Record<string, unknown>) =>
    request('/platform/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Record<string, unknown>) =>
    request(`/platform/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => request(`/platform/categories/${id}`, { method: 'DELETE' }),

  listProducts: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request<Array<Record<string, unknown>>>(`/platform/products${qs}`);
  },
  createProduct: (data: Record<string, unknown>) =>
    request('/platform/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Record<string, unknown>) =>
    request(`/platform/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request(`/platform/products/${id}`, { method: 'DELETE' }),

  listPricing: () => request<Array<Record<string, unknown>>>('/platform/pricing-rules'),
  upsertPricing: (data: Record<string, unknown>) =>
    request('/platform/pricing-rules', { method: 'POST', body: JSON.stringify(data) }),
  deletePricing: (id: string) => request(`/platform/pricing-rules/${id}`, { method: 'DELETE' }),

  listStandardKits: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request<Array<Record<string, unknown>>>(`/platform/standard-kits${qs}`);
  },
  getStandardKit: (id: string) => request<Record<string, unknown>>(`/platform/standard-kits/${id}`),
  updateStandardKit: (id: string, data: Record<string, unknown>) =>
    request(`/platform/standard-kits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStandardKit: (id: string) =>
    request(`/platform/standard-kits/${id}`, { method: 'DELETE' }),

  districtOptions: (academicYear?: string) => {
    const qs = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : '';
    return request<{ districts: string[]; totalCirculars: number }>(`/platform/district-kits/districts${qs}`);
  },
  districtSchools: (district: string, academicYear?: string) => {
    const qs = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : '';
    return request<Array<Record<string, unknown>>>(
      `/platform/district-kits/districts/${encodeURIComponent(district)}/schools${qs}`
    );
  },
  schoolCirculars: (organizationId: string, params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request<Array<Record<string, unknown>>>(
      `/platform/district-kits/schools/${organizationId}/circulars${qs}`
    );
  },
  previewCircular: (circularId: string) =>
    request<Record<string, unknown>>(`/platform/district-kits/circulars/${circularId}/preview`),
  importCircular: (
    circularId: string,
    items?: Array<{ sourceItemKey: string; unitPrice: number; imageUrl?: string | null }>
  ) =>
    request(`/platform/district-kits/import`, {
      method: 'POST',
      body: JSON.stringify({ circularId, items }),
    }),
  uploadImage: (payload: { contentBase64: string; fileName?: string; mimeType?: string }) =>
    request<{ url: string; path: string; fileName: string }>('/upload/image', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listOrders: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request<{ total: number; orders: Array<Record<string, unknown>> }>(`/platform/orders${qs}`);
  },
  getOrder: (id: string) => request<Record<string, unknown>>(`/platform/orders/${id}`),
  updateOrderStatus: (id: string, status: string) =>
    request(`/platform/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  refundOrder: (id: string) =>
    request(`/platform/orders/${id}/refund`, { method: 'POST', body: '{}' }),

  listDeliveries: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request<Array<Record<string, unknown>>>(`/platform/deliveries${qs}`);
  },
  updateDelivery: (id: string, data: Record<string, unknown>) =>
    request(`/platform/deliveries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getSettings: () => request<Record<string, unknown>>('/platform/settings'),
  updateSettings: (data: Record<string, unknown>) =>
    request('/platform/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
