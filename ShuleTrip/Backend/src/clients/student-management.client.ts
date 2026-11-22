import { env } from '../config/env';

export type SmStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  className?: string | null;
  stream?: string | null;
  educationLevel?: string | null;
  photoUrl?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  status?: string;
};

export type SmClass = {
  id: string;
  name: string;
  stream?: string | null;
  label: string;
};

type ApiList<T> = { success?: boolean; data?: T[] };

function baseUrl() {
  return (env.STUDENT_MANAGEMENT_API_URL ?? '').replace(/\/$/, '');
}

export function isStudentManagementConfigured() {
  return Boolean(baseUrl());
}

export async function fetchStudentsList(
  organizationId: string,
  opts?: { search?: string; className?: string; classId?: string; status?: string }
): Promise<SmStudent[]> {
  const urlBase = baseUrl();
  if (!urlBase) return [];

  const qs = new URLSearchParams({
    organizationId,
    status: opts?.status ?? 'ACTIVE',
  });
  if (opts?.search) qs.set('search', opts.search);
  if (opts?.className) qs.set('className', opts.className);
  if (opts?.classId) qs.set('classId', opts.classId);

  try {
    const res = await fetch(`${urlBase}/service/students?${qs}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'shule-trip',
        'x-organization-id': organizationId,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as ApiList<SmStudent>;
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}

export async function fetchClassesList(organizationId: string): Promise<SmClass[]> {
  const urlBase = baseUrl();
  if (!urlBase) return [];

  const qs = new URLSearchParams({ organizationId });
  try {
    const res = await fetch(`${urlBase}/service/classes?${qs}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'shule-trip',
        'x-organization-id': organizationId,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as ApiList<SmClass>;
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}
