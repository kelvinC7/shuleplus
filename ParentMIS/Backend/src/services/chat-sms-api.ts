import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

const BASE = env.INTERNAL_CHAT_API_URL.replace(/\/$/, '');

async function chatFetch<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; data?: T; message?: string };
    if (!res.ok) {
      const msg = json.message ?? `SMS service responded with ${res.status}`;
      throw new AppError(res.status >= 500 ? 503 : res.status, msg);
    }
    return json.data as T;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      503,
      'SMS packages service is unreachable. Ensure Internal Chat (chat-api) is running and INTERNAL_CHAT_API_URL is set on Parent MIS.'
    );
  }
}

export const chatSmsApi = {
  config(organizationId: string, parentId: string, parentPhone: string) {
    const q = new URLSearchParams({ organizationId, parentId, parentPhone });
    return chatFetch<unknown>(`/service/parent-sms/config?${q}`);
  },
  summary(parentId: string, parentPhone: string, phones: string[]) {
    const q = new URLSearchParams({
      parentId,
      organizationId: 'multi',
      parentPhone,
      phones: phones.join(','),
    });
    return chatFetch<unknown>(`/service/parent-sms/summary?${q}`);
  },
  purchases(parentId: string, status?: string) {
    const q = new URLSearchParams({ parentId });
    if (status) q.set('status', status);
    return chatFetch<unknown[]>(`/service/parent-sms/purchases?${q}`);
  },
  messages(parentId: string, phones: string[], status?: string) {
    const q = new URLSearchParams({ parentId, phones: phones.join(',') });
    if (status) q.set('status', status);
    return chatFetch<unknown[]>(`/service/parent-sms/messages?${q}`);
  },
  createPurchase(body: Record<string, unknown>) {
    return chatFetch<{ purchase: unknown; payment: unknown }>(`/service/parent-sms/purchases`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  submitPayment(body: Record<string, unknown>) {
    return chatFetch<unknown>(`/service/parent-sms/purchases/submit-payment`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
