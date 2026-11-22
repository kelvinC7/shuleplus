import { env } from "../config/env";

export type ParentTransactionalSmsResult = {
  delivered: boolean;
  segmentsUsed?: number;
  reason?: string;
};

const BASE = (env.INTERNAL_CHAT_API_URL ?? "").replace(/\/$/, "");

export const internalChatSmsClient = {
  isEnabled: () => Boolean(BASE),

  async sendTransactionalParentSms(body: {
    organizationId: string;
    parentPhone: string;
    parentId?: string;
    studentId?: string | null;
    studentName?: string;
    messageBody: string;
    sourceModule?: string;
    referenceId?: string;
  }): Promise<ParentTransactionalSmsResult> {
    if (!BASE) return { delivered: false, reason: "INTERNAL_CHAT_API_URL not configured" };
    try {
      const res = await fetch(`${BASE}/service/parent-sms/send-transactional`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-service-key": env.SERVICE_API_KEY,
          "x-source-service": "transport",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      const json = (await res.json()) as { data?: ParentTransactionalSmsResult; message?: string };
      if (!res.ok) {
        return { delivered: false, reason: json.message ?? `HTTP ${res.status}` };
      }
      return json.data ?? { delivered: false, reason: "empty response" };
    } catch (err) {
      return { delivered: false, reason: err instanceof Error ? err.message : "send failed" };
    }
  },
};
