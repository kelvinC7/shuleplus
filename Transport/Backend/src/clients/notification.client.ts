import { env } from "../config/env";

const BASE = (env.NOTIFICATION_SERVICE_URL ?? "").replace(/\/$/, "");

async function request<T>(path: string, body: unknown): Promise<T | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.NOTIFICATION_SERVICE_API_KEY || env.SERVICE_API_KEY,
        "x-source-service": "transport",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[Transport Notification] ${path} failed: ${res.status} ${text}`);
      return null;
    }
    const json = (await res.json()) as { data?: T };
    return (json.data ?? json) as T;
  } catch (err) {
    console.warn("[Transport Notification] unreachable", err);
    return null;
  }
}

export const notificationClient = {
  isEnabled: () => Boolean(BASE),

  async sendSms(params: { to: string; body: string; metadata?: Record<string, unknown> }) {
    const path = BASE.includes("/notifications") ? "/sms" : "/notifications/sms";
    const result = await request<{ delivered?: boolean; id?: string }>(path, params);
    return { delivered: Boolean(result?.delivered ?? result), id: result?.id ?? "" };
  },
};
