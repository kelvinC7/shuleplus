import { env } from '../config/env';

export type GateAttendanceRecord = {
  id: string;
  studentId?: string | null;
  studentCode?: string | null;
  studentName: string;
  className?: string | null;
  status: string;
  lessonDate: string;
  entryTime?: string | null;
  exitTime?: string | null;
  gateName?: string | null;
  deviceCode?: string | null;
  direction?: string;
};

type ApiPayload<T> = { success?: boolean; data?: T };

function baseUrl() {
  return env.ATTENDANCE_API_URL.replace(/\/$/, '');
}

type ServiceFetchResult<T> = { data: T; available: boolean };

async function attendanceGet<T>(
  path: string,
  organizationId: string,
  query?: Record<string, string | undefined>
): Promise<ServiceFetchResult<T>> {
  const qs = new URLSearchParams({ organizationId });
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v) qs.set(k, v);
    }
  }
  try {
    const response = await fetch(`${baseUrl()}${path.startsWith('/') ? path : `/${path}`}?${qs}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'teacher-portal',
      },
    });
    if (!response.ok) {
      return { data: [] as T, available: false };
    }
    const body = (await response.json()) as ApiPayload<T>;
    return { data: (Array.isArray(body.data) ? body.data : []) as T, available: true };
  } catch {
    return { data: [] as T, available: false };
  }
}

export async function fetchGateAttendance(
  organizationId: string,
  opts: { className: string; date?: string; from?: string; to?: string; q?: string }
): Promise<{ records: GateAttendanceRecord[]; serviceAvailable: boolean }> {
  const { data: rows, available } = await attendanceGet<Array<Record<string, unknown>>>(
    '/service/attendance',
    organizationId,
    {
      className: opts.className,
      date: opts.date,
      from: opts.from,
      to: opts.to,
      q: opts.q,
    }
  );

  const records = rows.map((r) => ({
    id: String(r.id ?? ''),
    studentId: (r.studentId as string | null) ?? null,
    studentCode: (r.studentCode as string | null) ?? null,
    studentName: String(r.studentName ?? ''),
    className: (r.className as string | null) ?? null,
    status: String(r.status ?? 'PRESENT'),
    lessonDate: r.lessonDate ? new Date(String(r.lessonDate)).toISOString().slice(0, 10) : '',
    entryTime: r.entryTime ? new Date(String(r.entryTime)).toISOString() : null,
    exitTime: r.exitTime ? new Date(String(r.exitTime)).toISOString() : null,
    gateName: (r.gateName as string | null) ?? null,
    deviceCode: (r.deviceCode as string | null) ?? null,
    direction: r.direction ? String(r.direction) : undefined,
  }));

  return { records, serviceAvailable: available };
}
