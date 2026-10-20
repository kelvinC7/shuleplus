import { env } from '../config/env';

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

export type AcademicClass = {
  id: string;
  name: string;
  stream?: string | null;
  category?: string | null;
  label: string;
};

type ApiList<T> = { success?: boolean; data?: T[]; meta?: Record<string, unknown> };

function baseUrl(): string {
  return env.ACADEMIC_API_URL.replace(/\/$/, '');
}

async function academicGet<T>(
  path: string,
  organizationId: string,
  query?: Record<string, string | undefined>
): Promise<T> {
  const qs = new URLSearchParams({ organizationId });
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v) qs.set(k, v);
    }
  }
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}?${qs}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': env.SERVICE_API_KEY,
      'x-source-service': 'canteen',
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Academic API ${response.status}: ${text || response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function fetchAcademicClasses(organizationId: string): Promise<AcademicClass[]> {
  const body = await academicGet<ApiList<AcademicClass>>('/service/classes', organizationId);
  return Array.isArray(body.data) ? body.data : [];
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
