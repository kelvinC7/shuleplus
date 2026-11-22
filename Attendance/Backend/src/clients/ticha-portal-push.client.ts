import { env } from "../config/env";

function portalBase() {
  const raw = env.TICHA_PORTAL_API_URL?.trim();
  if (!raw) return "";
  return raw.replace(/\/$/, "");
}

export function isAttendancePushEnabled() {
  return Boolean(portalBase());
}

export type StaffAttendancePushInput = {
  organizationId: string;
  direction: "ENTRY" | "EXIT" | string;
  staffName?: string | null;
  timeLabel?: string | null;
  iamUserId?: string | null;
  email?: string | null;
  employeeCode?: string | null;
  employeeId?: string | null;
};

export async function notifyStaffAttendanceTap(input: StaffAttendancePushInput): Promise<void> {
  const base = portalBase();
  if (!base) return;

  const dir = String(input.direction || "").toUpperCase();
  const isIn = dir === "ENTRY" || dir === "IN";
  const name = (input.staffName || "Teacher").trim() || "Teacher";
  const time = (input.timeLabel || "").trim();
  const title = isIn ? "Checked in" : "Checked out";
  const body = time
    ? `${name}, your ${isIn ? "check-in" : "check-out"} was recorded at ${time}.`
    : `${name}, your ${isIn ? "check-in" : "check-out"} was recorded.`;

  try {
    const res = await fetch(`${base}/service/push/notify`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "attendance",
      },
      body: JSON.stringify({
        organizationId: input.organizationId,
        iamUserId: input.iamUserId ?? undefined,
        email: input.email ?? undefined,
        employeeCode: input.employeeCode ?? undefined,
        title,
        body,
        tag: `attendance-${isIn ? "in" : "out"}-${Date.now()}`,
        url: "/my-attendance",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[Attendance] Push notify failed: ${res.status} ${text}`.slice(0, 240));
    }
  } catch (err) {
    console.warn("[Attendance] Push notify unreachable", err);
  }
}
