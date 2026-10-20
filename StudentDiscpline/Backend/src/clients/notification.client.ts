import { env } from '../config/env';

const BASE = (env.NOTIFICATION_SERVICE_URL ?? '').replace(/\/$/, '');

interface RequestOptions {
  method?: string;
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
  if (!env.NOTIFICATION_SERVICE_URL) return null;

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.NOTIFICATION_SERVICE_API_KEY,
        'x-source-service': 'Education',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[Discipline Notification] ${path} failed: ${res.status} ${text}`);
      return null;
    }

    const json = (await res.json()) as { data?: T };
    return (json.data ?? json) as T;
  } catch (err) {
    console.warn('[Discipline Notification] Service unreachable', err);
    return null;
  }
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
    return request<{ id: string; delivered: boolean }>('/email', { method: 'POST', body: params });
  },

  sendSms(params: { to: string; body: string; templateSlug?: string; metadata?: Record<string, unknown> }) {
    return request<{ id: string; delivered: boolean }>('/sms', { method: 'POST', body: params });
  },

  sendPush(params: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    return request<{ id: string; delivered: boolean }>('/push', { method: 'POST', body: params });
  },

  sendInApp(params: {
    userId: string;
    title: string;
    body: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }) {
    return request<{ id: string; delivered: boolean }>('/in-app', { method: 'POST', body: params });
  },
};
