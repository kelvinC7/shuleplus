import { env } from "../config/env";

export type AttendanceNotificationPayload = {
  organizationId: string;
  studentCode?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  title: string;
  body: string;
  eventType: "RFID_ENTRY" | "RFID_EXIT" | "ABSENT";
  priority?: "NORMAL" | "IMPORTANT" | "URGENT";
  link?: string;
  metadata?: Record<string, unknown>;
};

async function request<T>(path: string, body: unknown): Promise<T | null> {
  const base = (env.PARENT_MIS_API_URL ?? "").replace(/\/$/, "");
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "attendance",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[Attendance ParentMIS] ${path} failed: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { data?: T };
    return (json.data ?? json) as T;
  } catch (err) {
    console.warn("[Attendance ParentMIS] unreachable", err);
    return null;
  }
}

export const parentMisClient = {
  isEnabled: () => Boolean(env.PARENT_MIS_API_URL),

  ingestAttendanceEvent(payload: AttendanceNotificationPayload) {
    return request<{ matched: number }>("/webhooks/attendance", payload);
  },
};
