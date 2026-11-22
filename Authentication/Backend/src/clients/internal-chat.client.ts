import { env } from '../config/env';

/** Production loopback default matches redeploy-module.sh InternalChat port 4029. */
const BASE = (
  env.INTERNAL_CHAT_API_URL ||
  process.env.CHAT_API_URL ||
  'http://127.0.0.1:4029/api'
).replace(/\/$/, '');

async function chatFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': env.MODULE_PROVISIONING_KEY,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as { success?: boolean; data?: T; message?: string };
  if (!res.ok) throw new Error(json.message ?? `Chat API ${res.status}`);
  return json.data as T;
}

export type ChatSchoolSmsRow = {
  organizationId: string;
  organizationName: string;
  organizationCode: string | null;
  smsEnabled: boolean;
  maxSegments: number;
  segmentsUsed: number;
  remaining: number;
  quotaPeriod: string;
  parentPackagesEnabled?: boolean;
  momoPayeeNumber?: string | null;
};

export const internalChatClient = {
  listSchoolSmsSettings: () => chatFetch<ChatSchoolSmsRow[]>('/internal/sms/schools'),
  updateSchoolSmsSettings: (
    organizationId: string,
    body: {
      smsEnabled?: boolean;
      maxSegments?: number;
      quotaPeriod?: 'MONTHLY' | 'TERM' | 'ANNUAL' | 'ONE_TIME';
      segmentsUsed?: number;
      updatedBy?: string;
      parentPackagesEnabled?: boolean;
      momoPayeeNumber?: string | null;
      momoUssdTemplate?: string | null;
      defaultAllocation?: 'CHILD' | 'FAMILY';
    }
  ) => chatFetch<unknown>(`/internal/sms/schools/${encodeURIComponent(organizationId)}`, { method: 'PATCH', body: JSON.stringify(body) }),

  parentPurchaseStats: () => chatFetch<Record<string, number>>('/internal/sms/parent-purchases/stats'),

  listParentPurchases: (params?: { bucket?: string; search?: string; organizationId?: string }) => {
    const q = new URLSearchParams();
    if (params?.bucket) q.set('bucket', params.bucket);
    if (params?.search) q.set('search', params.search);
    if (params?.organizationId) q.set('organizationId', params.organizationId);
    const qs = q.toString();
    return chatFetch<unknown[]>(`/internal/sms/parent-purchases${qs ? `?${qs}` : ''}`);
  },

  activateParentPurchase: (purchaseId: string, adminId?: string) =>
    chatFetch<{ activated: boolean; purchaseId: string }>(
      `/internal/sms/parent-purchases/${encodeURIComponent(purchaseId)}/activate`,
      { method: 'POST', body: JSON.stringify({ adminId }) }
    ),

  rejectParentPurchase: (purchaseId: string, reason: string, adminId?: string) =>
    chatFetch<unknown>(`/internal/sms/parent-purchases/${encodeURIComponent(purchaseId)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, adminId }),
    }),
};
