import { env } from '../config/env';

const BASE = env.NOTIFICATION_SERVICE_URL.replace(/\/$/, '');

function resolveSmsUrl() {
  if (!BASE) return '';
  return /\/notifications$/i.test(BASE) ? `${BASE}/sms` : `${BASE}/notifications/sms`;
}

export async function sendTransactionalSms(to: string, body: string): Promise<boolean> {
  const url = resolveSmsUrl();
  const key = env.NOTIFICATION_SERVICE_API_KEY;
  if (!url || !key) {
    console.warn('[ParentMIS] SMS reset is not configured (notification URL or service key missing)');
    return false;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': key,
        'x-source-service': 'parentmis',
      },
      body: JSON.stringify({ to, body, metadata: { type: 'transactional' } }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      console.warn(`[ParentMIS] SMS gateway returned HTTP ${response.status}`);
      return false;
    }
    const result = (await response.json()) as { success?: boolean; data?: { delivered?: boolean } };
    return Boolean(result.data?.delivered ?? result.success ?? true);
  } catch (error) {
    console.warn('[ParentMIS] SMS gateway request failed:', error instanceof Error ? error.message : 'unknown error');
    return false;
  }
}