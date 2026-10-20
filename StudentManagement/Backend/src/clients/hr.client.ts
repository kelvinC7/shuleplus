import { env } from '../config/env';

export type HrTeacherCandidate = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  employeeNumber?: string | null;
};

type ApiList<T> = { success?: boolean; data?: T[] };

function baseUrl() {
  return env.HR_API_URL.replace(/\/$/, '');
}

async function hrGet<T>(path: string, organizationId: string) {
  const qs = new URLSearchParams({ organizationId });
  const response = await fetch(`${baseUrl()}${path.startsWith('/') ? path : `/${path}`}?${qs}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': env.SERVICE_API_KEY,
      'x-source-service': 'student-management',
    },
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as T;
}

export async function fetchHrTeachers(organizationId: string): Promise<HrTeacherCandidate[]> {
  const body = await hrGet<ApiList<HrTeacherCandidate>>('/internal/teachers', organizationId);
  return Array.isArray(body?.data) ? body.data : [];
}
