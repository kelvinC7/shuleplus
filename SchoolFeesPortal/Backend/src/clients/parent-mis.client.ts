import { env } from '../config/env';

export type FeeNotificationPayload = {
  organizationId: string;
  studentCode: string;
  studentId?: string;
  studentName?: string;
  title: string;
  body: string;
  eventType: string;
  priority?: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  link?: string;
  metadata?: Record<string, unknown>;
};

async function request<T>(path: string, body: unknown): Promise<T | null> {
  if (!env.PARENT_MIS_API_URL) return null;
  try {
    const base = env.PARENT_MIS_API_URL.replace(/\/$/, '');
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`[Fees ParentMIS] ${path} failed: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { data?: T };
    return (json.data ?? json) as T;
  } catch (err) {
    console.warn('[Fees ParentMIS] unreachable', err);
    return null;
  }
}

export const parentMisClient = {
  isEnabled: () => Boolean(env.PARENT_MIS_API_URL),

  ingestFeeEvent(payload: FeeNotificationPayload) {
    return request<{ matched: number }>('/webhooks/fees', payload);
  },

  ingestExamEvent(payload: FeeNotificationPayload) {
    return request<{ matched: number }>('/webhooks/exams', payload);
  },
};
