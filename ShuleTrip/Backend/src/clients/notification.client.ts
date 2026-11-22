import { env } from '../config/env';

const BASE = (env.NOTIFICATION_SERVICE_URL ?? '').replace(/\/$/, '');

async function request<T>(path: string, body: unknown): Promise<T | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.NOTIFICATION_SERVICE_API_KEY,
        'x-source-service': 'shule-trip',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T };
    return json.data ?? (json as T);
  } catch {
    return null;
  }
}

export const notificationClient = {
  isEnabled: () => Boolean(BASE),

  async sendEmail(params: { to: string; subject: string; body: string; html?: string }) {
    return request<{ id?: string }>('/email', {
      to: params.to,
      subject: params.subject,
      body: params.body,
      html: params.html ?? params.body.replace(/\n/g, '<br/>'),
    });
  },
};
