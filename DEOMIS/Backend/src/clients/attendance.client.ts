import { env } from '../config/env';

export type AttendanceDaySummary = {
  organizationName: string;
  studentRecordCount: number;
  firstAttendanceTime: string | null;
  lastDeviceSync: string | null;
  kpis: {
    present: number;
    late: number;
    absent: number;
    staffPresent: number;
    staffLate: number;
    staffTaps: number;
    devicesOnline: number;
    devicesOffline: number;
    securityAlerts: number;
    attendanceRate: number;
    staffAttendanceRate: number;
  };
  devices: {
    id: string;
    name: string;
    status: string;
    lastSeenAt: string | null;
    batteryPercent: number | null;
  }[];
};

export type SectorSnapshotRow = {
  organizationId: string;
  attendanceTenant: boolean;
  studentManagementHint: boolean;
  daySummary: AttendanceDaySummary | null;
  error?: string;
};

export type HistorySeries = {
  days: number;
  series: Array<{
    date: string;
    recordCount: number;
    present: number;
    late: number;
    absent: number;
    attendanceRate: number;
  }>;
};

export type SchoolAttendanceDetail = {
  classes: Array<{
    name: string;
    present: number;
    late: number;
    absent: number;
    records: number;
    attendancePct: number;
  }>;
  chronicAbsentees: Array<{
    studentCode: string;
    studentName: string;
    className: string | null;
    consecutiveDays: number;
  }>;
};

function attendanceBase() {
  return (env.ATTENDANCE_API_URL || '').replace(/\/$/, '');
}

function serviceHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-service-key': env.SERVICE_API_KEY,
    'x-source-service': 'deo-mis',
  };
}

async function postJson<T>(path: string, body: unknown): Promise<T | null> {
  const base = attendanceBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: serviceHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: T };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchBatchSnapshots(organizationIds: string[]): Promise<SectorSnapshotRow[]> {
  const data = await postJson<SectorSnapshotRow[]>('/service/sector/batch-snapshot', { organizationIds });
  return Array.isArray(data) ? data : [];
}

export async function fetchBatchHistory(organizationIds: string[], days: number): Promise<HistorySeries | null> {
  return postJson<HistorySeries>('/service/sector/history', { organizationIds, days });
}

export async function fetchSchoolAttendanceDetail(organizationId: string): Promise<SchoolAttendanceDetail | null> {
  const base = attendanceBase();
  if (!base) return null;
  const qs = new URLSearchParams({ organizationId });
  try {
    const res = await fetch(`${base}/service/school-attendance-detail?${qs}`, {
      headers: serviceHeaders(),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: SchoolAttendanceDetail };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchChronicAbsenceSummary(organizationIds: string[], minDays = 3) {
  return postJson<{ total: number; minConsecutiveDays: number; bySchool: unknown[] }>(
    '/service/sector/chronic-absence',
    { organizationIds, minDays }
  );
}

export async function fetchSectorDataQuality(organizationIds: string[]) {
  return postJson<{ unresolvedAlerts: number; manualCorrectionsToday: number }>(
    '/service/sector/data-quality',
    { organizationIds }
  );
}

export type SecurityAlertRow = {
  id: string;
  type: string;
  severity: string;
  message: string;
  createdAt: string;
  resolved: boolean;
};

export async function fetchSecurityAlerts(organizationId: string, limit = 20): Promise<SecurityAlertRow[]> {
  const base = attendanceBase();
  if (!base) return [];
  const qs = new URLSearchParams({ organizationId, limit: String(limit) });
  try {
    const res = await fetch(`${base}/service/security-alerts?${qs}`, {
      headers: serviceHeaders(),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { success?: boolean; data?: SecurityAlertRow[] };
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}

/** @deprecated Prefer fetchBatchSnapshots */
export async function fetchDaySummary(organizationId: string): Promise<AttendanceDaySummary | null> {
  const rows = await fetchBatchSnapshots([organizationId]);
  return rows[0]?.daySummary ?? null;
}
