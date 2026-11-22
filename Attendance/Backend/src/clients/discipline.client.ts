import { env } from "../config/env";

type ApiEnvelope<T> = { success?: boolean; data?: T };

function disciplineBase() {
  const raw = env.STUDENT_DISCIPLINE_API_URL?.trim();
  if (!raw) return "";
  return raw.replace(/\/$/, "");
}

export function isDisciplineIntegrationEnabled() {
  return Boolean(disciplineBase());
}

async function servicePost<T>(
  path: string,
  organizationId: string,
  body: Record<string, unknown>
): Promise<T | null> {
  const base = disciplineBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-organization-id": organizationId,
        "x-source-service": "attendance",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as ApiEnvelope<T>;
    return payload.data ?? null;
  } catch {
    return null;
  }
}

async function serviceGet<T>(path: string): Promise<T | null> {
  const base = disciplineBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "attendance",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as ApiEnvelope<T>;
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export type AutoAbsenceOrg = {
  organizationId: string;
  absenceDeductionEnabled: boolean;
  autoAbsenceLastRunDate: string | null;
};

export async function listAutoAbsenceEnabledOrgs(): Promise<AutoAbsenceOrg[]> {
  return (await serviceGet<AutoAbsenceOrg[]>("/service/discipline/auto-absence/enabled")) ?? [];
}

export async function markAutoAbsenceRun(organizationId: string, date: string): Promise<boolean> {
  const base = disciplineBase();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/service/discipline/auto-absence/mark-run`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "attendance",
      },
      body: JSON.stringify({ organizationId, date }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function tryDisciplinePermissionExit(
  organizationId: string,
  input: { studentId?: string | null; studentCode?: string | null; gateLabel?: string | null }
): Promise<{ allowed: boolean; referenceNumber?: string }> {
  const data = await servicePost<{
    allowed: boolean;
    reason?: string;
    referenceNumber?: string;
  }>("/service/gate/rfid-permission-exit", organizationId, {
    studentId: input.studentId ?? undefined,
    studentCode: input.studentCode ?? undefined,
    gateLabel: input.gateLabel ?? undefined,
  });
  if (!data?.allowed) return { allowed: false };
  return { allowed: true, referenceNumber: data.referenceNumber };
}

export type DisciplineAttendanceEvent = "ABSENCE" | "LATE";

export type DisciplineAttendanceStudent = {
  studentId?: string;
  studentCode?: string;
  studentName: string;
  className?: string;
};

export type DisciplineAttendanceResult = {
  event: DisciplineAttendanceEvent;
  date: string;
  enabled: boolean;
  points: number;
  applied: number;
  skipped: number;
  total: number;
  markId?: string | null;
  markName?: string | null;
};

export async function tryDisciplineAttendanceEvent(
  organizationId: string,
  input: {
    event: DisciplineAttendanceEvent;
    date: string;
    students: DisciplineAttendanceStudent[];
    recordedBy?: string;
  }
): Promise<DisciplineAttendanceResult | null> {
  return servicePost<DisciplineAttendanceResult>(
    "/service/discipline/attendance-event",
    organizationId,
    {
      // requireServiceTenant reads organizationId from the body/query.
      organizationId,
      event: input.event,
      date: input.date,
      students: input.students,
      recordedBy: input.recordedBy,
    }
  );
}
