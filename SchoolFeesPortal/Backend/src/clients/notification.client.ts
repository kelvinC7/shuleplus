import { env } from '../config/env';

const BASE = (env.NOTIFICATION_SERVICE_URL ?? '').replace(/\/$/, '');
const IAM_NOTIFY = `${env.IAM_API_URL.replace(/\/$/, '')}/notifications`;

async function request<T>(
  path: string,
  body?: unknown,
  method = 'POST',
  fallbackToIam = false
): Promise<T | null> {
  if (env.NOTIFICATION_SERVICE_URL) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': env.NOTIFICATION_SERVICE_API_KEY,
          'x-source-service': 'school-fees',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: T };
        return (json.data ?? json) as T;
      }
      console.warn(`[Fees Notification] ${path} failed: ${res.status}`);
    } catch (err) {
      console.warn('[Fees Notification] unreachable', err);
    }
  }

  if (fallbackToIam) {
    try {
      const res = await fetch(`${IAM_NOTIFY}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': env.SERVICE_API_KEY,
          'x-source-service': 'school-fees',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        console.warn(`[Fees IAM notify] ${path} failed: ${res.status}`);
        return null;
      }
      const json = (await res.json()) as { data?: T };
      return (json.data ?? json) as T;
    } catch (err) {
      console.warn('[Fees IAM notify] unreachable', err);
    }
  }

  return null;
}

export const notificationClient = {
  isEnabled: () => Boolean(env.NOTIFICATION_SERVICE_URL),

  sendEmail(params: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    templateSlug?: string;
    templateVariables?: Record<string, string>;
    metadata?: Record<string, unknown>;
  }) {
    return request<{ id: string; delivered: boolean }>('/email', params);
  },

  sendSms(params: { to: string; body: string; templateSlug?: string; metadata?: Record<string, unknown> }) {
    return request<{ id: string; delivered: boolean }>('/sms', params, 'POST', true);
  },

  sendPush(params: { userId: string; title: string; body: string; data?: Record<string, unknown> }) {
    return request<{ id: string; delivered: boolean }>('/push', params);
  },

  sendInApp(params: {
    userId: string;
    title: string;
    body: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }) {
    return request<{ id: string; delivered: boolean }>('/in-app', params);
  },
};
