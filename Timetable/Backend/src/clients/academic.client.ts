import { env } from '../config/env';

export type AcademicClass = {
  id: string;
  name: string;
  stream?: string | null;
  category?: string | null;
  label: string;
  grade?: { name?: string | null } | null;
};

export type AcademicStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  gender?: string | null;
  photoUrl?: string | null;
  classId?: string | null;
  className?: string | null;
  stream?: string | null;
  rollNumber?: string | null;
  status?: string;
};

type ApiList<T> = { success?: boolean; data?: T[]; meta?: Record<string, unknown> };

function baseUrl(): string {
  return env.STUDENT_MANAGEMENT_API_URL.replace(/\/$/, '');
}

function candidateApiBases() {
  const primary = baseUrl();
  const fallbacks = [
    'http://localhost:4024/api',
    'http://127.0.0.1:4024/api',
    'http://localhost:3052/api',
  ];
  return [...new Set([primary, ...fallbacks])];
}

async function academicGet<T>(path: string, organizationId: string, query?: Record<string, string | undefined>) {
  const qs = new URLSearchParams({ organizationId });
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v) qs.set(k, v);
    }
  }
  const suffix = `${path.startsWith('/') ? path : `/${path}`}?${qs}`;
  let lastError: Error | null = null;
  for (const root of candidateApiBases()) {
    const url = `${root.replace(/\/$/, '')}${suffix}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': env.SERVICE_API_KEY,
          'x-source-service': 'timetable',
          'x-organization-id': organizationId,
        },
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        lastError = new Error(`Student Management API ${response.status}: ${text || response.statusText}`);
        continue;
      }
      return (await response.json()) as T;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastError ?? new Error('Student Management API unavailable');
}

/** Display label: no stream → "N1"; with stream → "P1 A". */
export function formatClassLabel(name: string, stream?: string | null): string {
  const base = name.trim();
  const st = stream?.trim();
  return st ? `${base} ${st}`.trim() : base;
}

export function normalizeAcademicClass(c: AcademicClass): AcademicClass {
  const label = formatClassLabel(c.name, c.stream);
  return { ...c, label };
}

export async function fetchAcademicClasses(organizationId: string): Promise<AcademicClass[]> {
  const body = await academicGet<ApiList<AcademicClass>>('/service/classes', organizationId);
  const raw = Array.isArray(body.data) ? body.data : [];
  return raw.map(normalizeAcademicClass);
}

export function normalizeClassLabel(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

function classLabel(c: AcademicClass): string {
  return formatClassLabel(c.name, c.stream) || c.label || c.name;
}

/** Match timetable class name (e.g. "S2 A", "N1") to Student Management class row. */
export function matchAcademicClass(classes: AcademicClass[], className: string): AcademicClass | undefined {
  const target = normalizeClassLabel(className);
  if (!target) return undefined;
  const compact = target.replace(/\s+/g, '');

  const exact = classes.find((c) => normalizeClassLabel(classLabel(c)) === target);
  if (exact) return exact;

  const byCompact = classes.find(
    (c) => normalizeClassLabel(classLabel(c)).replace(/\s+/g, '') === compact
  );
  if (byCompact) return byCompact;

  const byLabel = classes.find((c) => c.label && normalizeClassLabel(c.label) === target);
  if (byLabel) return byLabel;

  const byName = classes.find(
    (c) =>
      !c.stream &&
      (normalizeClassLabel(c.name) === target || normalizeClassLabel(c.name).replace(/\s+/g, '') === compact)
  );
  if (byName) return byName;

  const parts = className.trim().split(/\s+/);
  if (parts.length >= 2) {
    const streamPart = parts[parts.length - 1]!;
    const namePart = parts.slice(0, -1).join(' ');
    const byNameStream = classes.find(
      (c) =>
        normalizeClassLabel(c.name) === normalizeClassLabel(namePart) &&
        normalizeClassLabel(c.stream ?? '') === normalizeClassLabel(streamPart)
    );
    if (byNameStream) return byNameStream;
  }

  return undefined;
}

/** Upper bound when classId is resolved — guards bad API responses, not real large classes. */
const MATCHED_CLASS_ROSTER_MAX = 2000;

export async function fetchStudentsForClass(
  organizationId: string,
  className: string,
  academicYear?: string
): Promise<{
  students: AcademicStudent[];
  meta: { classId: string | null; classLabel: string; matched: boolean; source: string };
}> {
  let classes: AcademicClass[] = [];
  try {
    classes = await fetchAcademicClasses(organizationId);
  } catch {
    classes = [];
  }

  const matched = matchAcademicClass(classes, className);

  const attempts: Array<{
    classId?: string;
    className?: string;
    academicYear?: string;
    tag: string;
  }> = [
    ...(matched && academicYear
      ? [{ classId: matched.id, academicYear, tag: 'classId+year' }]
      : []),
    ...(matched ? [{ classId: matched.id, tag: 'classId' }] : []),
    ...(academicYear ? [{ className, academicYear, tag: 'className+year' }] : []),
    { className, tag: 'className' },
  ];

  for (const attempt of attempts) {
    try {
      const { students, meta } = await fetchAcademicStudents(organizationId, {
        classId: attempt.classId,
        className: attempt.className,
        academicYear: attempt.academicYear,
      });
      if (students.length > 0 && students.length <= MATCHED_CLASS_ROSTER_MAX) {
        return {
          students,
          meta: {
            classId: (meta?.classId as string) ?? matched?.id ?? null,
            classLabel: (meta?.classLabel as string) ?? (matched ? classLabel(matched) : className),
            matched: true,
            source: `student-management:${attempt.tag}`,
          },
        };
      }
    } catch {
      // try next strategy
    }
  }

  return {
    students: [],
    meta: {
      classId: matched?.id ?? null,
      classLabel: matched ? classLabel(matched) : className,
      matched: Boolean(matched),
      source: matched ? 'student-management:none' : 'student-management:no-class-match',
    },
  };
}

export type ClassMonitorLookup = {
  id: string;
  slot: number;
  qrCode: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  studentCode: string | null;
  monitorSlot?: number;
};

export type ClassMonitorLookupResult = {
  monitor: ClassMonitorLookup | null;
  hint?: string;
  message?: string;
};

export async function lookupClassMonitorByQr(
  organizationId: string,
  rawQr: string
): Promise<ClassMonitorLookupResult> {
  try {
    const body = await academicGet<{
      success?: boolean;
      data?: ClassMonitorLookup | null;
      meta?: { hint?: string; message?: string };
    }>('/service/class-monitors/lookup', organizationId, { qrCode: rawQr });
    return {
      monitor: body.data ?? null,
      hint: body.meta?.hint,
      message: body.meta?.message,
    };
  } catch {
    return { monitor: null };
  }
}

export async function fetchAcademicStudents(
  organizationId: string,
  opts: { classId?: string; className?: string; academicYear?: string; status?: string } = {}
): Promise<{ students: AcademicStudent[]; meta?: Record<string, unknown> }> {
  const body = await academicGet<ApiList<AcademicStudent>>('/service/students', organizationId, {
    classId: opts.classId,
    className: opts.className,
    academicYear: opts.academicYear,
    status: opts.status ?? 'ACTIVE',
  });
  return {
    students: Array.isArray(body.data) ? body.data : [],
    meta: body.meta,
  };
}
