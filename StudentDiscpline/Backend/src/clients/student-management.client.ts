import { env } from '../config/env';

export type SmClass = {
  id: string;
  name: string;
  stream?: string | null;
  label: string;
  category?: string | null;
};

export type SmStudent = {
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

export type SmParentStudent = {
  studentId?: string;
  studentCode?: string | null;
  studentName?: string | null;
  className?: string | null;
  role?: string;
};

export type SmParent = {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
  nationalId?: string | null;
  occupation?: string | null;
  address?: string | null;
  smsEnabled?: boolean;
  students?: SmParentStudent[];
};

type ApiList<T> = { success?: boolean; data?: T[]; meta?: Record<string, unknown> };

function baseUrl() {
  return (env.STUDENT_MANAGEMENT_API_URL ?? '').replace(/\/$/, '');
}

export function isStudentManagementEnabled() {
  return Boolean(baseUrl());
}

async function smGet<T>(path: string, organizationId: string, query?: Record<string, string | undefined>) {
  const urlBase = baseUrl();
  if (!urlBase) return { data: [] } as T;

  const qs = new URLSearchParams({ organizationId });
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v) qs.set(k, v);
    }
  }

  try {
    const res = await fetch(`${urlBase}${path.startsWith('/') ? path : `/${path}`}?${qs}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'student-discipline',
      },
    });
    if (!res.ok) return { data: [] } as T;
    return (await res.json()) as T;
  } catch {
    return { data: [] } as T;
  }
}

export async function fetchSmClasses(organizationId: string): Promise<SmClass[]> {
  const body = await smGet<ApiList<SmClass>>('/service/classes', organizationId);
  return Array.isArray(body.data) ? body.data : [];
}

export async function fetchSmStudents(
  organizationId: string,
  opts?: { classId?: string; className?: string; search?: string; academicYear?: string }
): Promise<SmStudent[]> {
  const body = await smGet<ApiList<SmStudent>>('/service/students', organizationId, {
    classId: opts?.classId,
    className: opts?.className,
    search: opts?.search,
    academicYear: opts?.academicYear,
    status: 'ACTIVE',
  });
  return Array.isArray(body.data) ? body.data : [];
}

export async function fetchSmStudentById(organizationId: string, studentId: string): Promise<SmStudent | null> {
  const students = await fetchSmStudents(organizationId, { search: studentId });
  return students.find((s) => s.id === studentId) ?? null;
}

export async function fetchSmParents(organizationId: string, studentId?: string): Promise<SmParent[]> {
  const body = await smGet<ApiList<SmParent>>('/service/parents', organizationId, {
    studentId,
  });
  return Array.isArray(body.data) ? body.data : [];
}
