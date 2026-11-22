import { env } from '../config/env';

export type ParentMisAcademicEvent = {
  organizationId: string;
  studentCode?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  title: string;
  body: string;
  eventType: string;
  priority?: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  link?: string;
  metadata?: Record<string, unknown>;
};

async function post(path: string, body: unknown) {
  const base = (env.PARENT_MIS_API_URL || '').replace(/\/$/, '');
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.PARENT_MIS_SERVICE_API_KEY,
        'x-source-service': 'academic',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[Academic ParentMIS] ${path} failed: ${res.status} ${text}`);
      return null;
    }
    const json = await res.json().catch(() => ({}));
    return (json as any).data ?? json;
  } catch (err) {
    console.warn('[Academic ParentMIS] unreachable', err);
    return null;
  }
}

export const parentMisAcademicClient = {
  isEnabled: () => Boolean(env.PARENT_MIS_API_URL),

  async notifyAcademicEvent(payload: ParentMisAcademicEvent) {
    // ParentMIS ingests exam/academic notifications via /webhooks/exams
    return post('/webhooks/exams', payload);
  },

  async notifyMany(events: ParentMisAcademicEvent[]) {
    const results = await Promise.allSettled(events.map((e) => this.notifyAcademicEvent(e)));
    return results;
  },
};
