import { env } from '../config/env';

export type SmsSendResult = {
  delivered: boolean;
  error?: string;
};

const BASE = (env.NOTIFICATION_SERVICE_URL ?? '').replace(/\/$/, '');

function notificationServiceKey(): string {
  return (
    env.NOTIFICATION_SERVICE_API_KEY ||
    env.SERVICE_API_KEY ||
    process.env.PLATFORM_SERVICE_KEY ||
    ''
  ).trim();
}

/** IAM proxy: POST {NOTIFICATION_SERVICE_URL}/sms with x-service-key (not /notifications/sms). */
export function resolveNotificationSmsUrl(base: string = BASE): string {
  const b = base.replace(/\/$/, '');
  if (!b) return '';
  if (/\/notifications$/i.test(b)) return `${b}/sms`;
  return `${b}/notifications/sms`;
}

export function smsProviderConfigured(): boolean {
  return Boolean(BASE && notificationServiceKey());
}

function friendlyError(status: number, raw: string): string {
  const text = raw.trim();
  try {
    const j = JSON.parse(text) as { message?: string };
    const msg = j.message ?? '';
    if (msg === 'Authentication required') {
      return 'SMS gateway rejected the request (wrong notification URL or API key on server).';
    }
    if (msg === 'Invalid or missing service API key') {
      return 'SMS gateway API key mismatch — sync NOTIFICATION_SERVICE_API_KEY with IAM MODULE_PROVISIONING_KEY.';
    }
    if (msg) return msg;
  } catch {
    /* plain text */
  }
  if (status === 401 || status === 403) {
    return 'SMS gateway authentication failed.';
  }
  return text || `HTTP ${status}`;
}

export async function sendSmsViaNotification(to: string, body: string): Promise<SmsSendResult> {
  const url = resolveNotificationSmsUrl();
  const key = notificationServiceKey();
  if (!url) {
    return { delivered: false, error: 'Notification service not configured (NOTIFICATION_SERVICE_URL)' };
  }
  if (!key) {
    return { delivered: false, error: 'Notification service API key not configured' };
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': key,
        'x-source-service': 'internal-chat',
      },
      body: JSON.stringify({ to, body, metadata: { type: 'school_campaign' } }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { delivered: false, error: friendlyError(res.status, text) };
    }
    const json = (await res.json()) as { data?: { delivered?: boolean }; success?: boolean };
    const delivered = Boolean(json.data?.delivered ?? json.success ?? true);
    return { delivered };
  } catch (err) {
    return { delivered: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}
