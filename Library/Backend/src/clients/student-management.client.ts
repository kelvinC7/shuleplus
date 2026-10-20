import { env } from '../config/env';

export type ServiceStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  firstName: string;
  lastName: string;
  className: string | null;
  classId: string | null;
  status: string;
  photoUrl?: string | null;
  sdmCode?: string | null;
};

async function serviceFetch<T>(
  organizationId: string,
  path: string,
  query?: Record<string, string | undefined>,
): Promise<T | null> {
  try {
    const base = env.STUDENT_MANAGEMENT_URL.replace(/\/$/, '');
    const url = new URL(`${base}${path}`);
    url.searchParams.set('organizationId', organizationId);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v) url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-organization-id': organizationId,
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T };
    return (json.data ?? json) as T;
  } catch {
    return null;
  }
}

export async function searchStudents(
  organizationId: string,
  search: string,
): Promise<ServiceStudent[]> {
  if (!search.trim()) return [];
  const rows = await serviceFetch<ServiceStudent[]>(organizationId, '/service/students', {
    search: search.trim(),
    status: 'ACTIVE',
  });
  return rows ?? [];
}

export const studentManagementClient = { searchStudents };
