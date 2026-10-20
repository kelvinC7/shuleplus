import { env } from "../config/env";
import { isAfroBulkConfigured, sendAfroBulkSms } from "./afrobulk-sms.client";

const BASE = (env.NOTIFICATION_SERVICE_URL ?? "").replace(/\/$/, "");

interface RequestOptions {
  method?: string;
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
  if (!env.NOTIFICATION_SERVICE_URL) return null;

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.NOTIFICATION_SERVICE_API_KEY,
        "x-source-service": "attendance",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[Attendance Notification] ${path} failed: ${res.status} ${text}`);
      return null;
    }

    const json = (await res.json()) as { data?: T; success?: boolean };
    return (json.data ?? json) as T;
  } catch (err) {
    console.warn("[Attendance Notification] Service unreachable", err);
    return null;
  }
}

export const notificationClient = {
  isEnabled: () => Boolean(env.NOTIFICATION_SERVICE_URL) || isAfroBulkConfigured(),

  async sendSms(params: { to: string; body: string; metadata?: Record<string, unknown> }) {
    if (isAfroBulkConfigured()) {
      try {
        const direct = await sendAfroBulkSms(params.to, params.body);
        if (direct.delivered) {
          return { id: "afrobulk", delivered: true, providerCode: direct.providerCode };
        }
      } catch (err) {
        console.warn("[Attendance Notification] AfroBulk direct send failed", err);
      }
    }

    const externalOnly =
      env.NOTIFICATION_SERVICE_URL &&
      !env.NOTIFICATION_SERVICE_URL.includes("/api/v1/notifications");

    if (externalOnly) {
      const result = await request<{ id: string; delivered: boolean }>("/sms", {
        method: "POST",
        body: params,
      });
      if (result?.delivered) {
        return { id: result.id ?? "", delivered: true };
      }
    }

    return { id: "", delivered: false };
  },
};
