import { env } from '../config/env';
import { isAfroBulkConfigured, sendAfroBulkSms } from './afrobulk-sms.client';
import { embeddedNotificationsService } from '../services/embedded-notifications.service';
import {
  dispatchIamEmail,
  dispatchIamSms,
} from '../services/iam-notification-dispatch.service';
import { isIamEmbeddedNotificationHub } from '../utils/notification-hub';

const BASE = (env.NOTIFICATION_SERVICE_URL ?? '').replace(/\/$/, '');

interface RequestOptions {
  method?: string;
  body?: unknown;
}

const NOTIFICATION_TIMEOUT_MS = 8000;

async function request<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
  if (!env.NOTIFICATION_SERVICE_URL) return null;

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.NOTIFICATION_SERVICE_API_KEY || env.MODULE_PROVISIONING_KEY,
        'x-source-service': 'IAM',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(NOTIFICATION_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status !== 429) {
        console.warn(`[Notification Client] ${path} failed: ${res.status} ${text}`);
      }
      return null;
    }

    const json = (await res.json()) as { data?: T };
    return json.data as T;
  } catch (err) {
    if (!isIamEmbeddedNotificationHub()) {
      console.warn('[Notification Client] Unreachable — using local fallback', err);
    }
    return null;
  }
}

export const notificationClient = {
  isEnabled: () => Boolean(env.NOTIFICATION_SERVICE_URL) || isAfroBulkConfigured(),

  async sendEmail(params: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    templateSlug?: string;
    templateVariables?: Record<string, string>;
    metadata?: Record<string, unknown>;
  }) {
    if (isIamEmbeddedNotificationHub()) {
      return dispatchIamEmail({
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
    }
    return request<{ id: string; delivered: boolean; devMode?: boolean }>('/email', {
      method: 'POST',
      body: params,
    });
  },

  async sendSms(params: {
    to: string;
    body: string;
    templateSlug?: string;
    metadata?: Record<string, unknown>;
  }) {
    if (isAfroBulkConfigured()) {
      try {
        const direct = await sendAfroBulkSms(params.to, params.body);
        if (direct.delivered) {
          return {
            id: 'afrobulk',
            delivered: true,
            providerCode: direct.providerCode,
          };
        }
      } catch (err) {
        console.warn('[Notification Client] AfroBulk direct send failed', err);
      }
    }

    if (isIamEmbeddedNotificationHub()) {
      const result = await dispatchIamSms({ to: params.to, body: params.body });
      if (result.delivered) {
        return { id: result.id, delivered: true };
      }
      return null;
    }

    const externalOnly =
      env.NOTIFICATION_SERVICE_URL &&
      !env.NOTIFICATION_SERVICE_URL.includes('/api/v1/notifications');

    if (externalOnly) {
      const result = await request<{ id: string; delivered: boolean }>('/sms', {
        method: 'POST',
        body: params,
      });
      if (result?.delivered) {
        return { id: result.id ?? '', delivered: true };
      }
    }

    return null;
  },

  sendInApp(params: {
    userId: string;
    title: string;
    body: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    actionUrl?: string;
  }) {
    if (isIamEmbeddedNotificationHub()) {
      return Promise.resolve(embeddedNotificationsService.sendInApp(params));
    }
    return request('/in-app', { method: 'POST', body: params });
  },

  sendOtp(params: {
    purpose: string;
    recipient: string;
    channel: 'email' | 'sms' | 'both';
    name?: string;
  }) {
    return request('/otp/send', { method: 'POST', body: params });
  },

  verifyOtp(purpose: string, recipient: string, code: string) {
    return request<{ valid: boolean; reason?: string }>('/otp/verify', {
      method: 'POST',
      body: { purpose, recipient, code },
    });
  },

  listInApp(userId: string, filter: 'all' | 'unread' | 'archived' = 'all') {
    if (isIamEmbeddedNotificationHub()) {
      return Promise.resolve(embeddedNotificationsService.listInApp(userId, filter));
    }
    return request<unknown[]>(`/in-app?userId=${encodeURIComponent(userId)}&filter=${filter}`);
  },

  unreadCount(userId: string) {
    if (isIamEmbeddedNotificationHub()) {
      return Promise.resolve(embeddedNotificationsService.unreadCount(userId));
    }
    return request<{ count: number }>(`/in-app/unread-count?userId=${encodeURIComponent(userId)}`);
  },

  markInAppRead(id: string, userId: string) {
    if (isIamEmbeddedNotificationHub()) {
      embeddedNotificationsService.markRead(id, userId);
      return Promise.resolve(null);
    }
    return request(`/in-app/${id}/read`, { method: 'PATCH', body: { userId } });
  },

  markAllInAppRead(userId: string) {
    if (isIamEmbeddedNotificationHub()) {
      embeddedNotificationsService.markAllRead(userId);
      return Promise.resolve(null);
    }
    return request('/in-app/read-all', { method: 'PATCH', body: { userId } });
  },

  archiveInApp(id: string, userId: string) {
    if (isIamEmbeddedNotificationHub()) {
      embeddedNotificationsService.archive(id, userId);
      return Promise.resolve(null);
    }
    return request(`/in-app/${id}/archive`, { method: 'PATCH', body: { userId } });
  },
};
