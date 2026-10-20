import { env } from '../config/env';

export type HrTeacherRow = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  department?: string | null;
  employeeNumber?: string | null;
};

export type IamTeachingStaffRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  employeeId: string | null;
  source: 'iam';
};

async function serviceGet<T>(
  baseUrl: string,
  path: string,
  organizationId: string,
  query?: Record<string, string | undefined>,
): Promise<T[]> {
  try {
    const url = new URL(`${baseUrl.replace(/\/$/, '')}${path}`);
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
        'x-source-service': 'library',
      },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: T[] };
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function fetchHrTeachers(
  organizationId: string,
  search?: string,
): Promise<HrTeacherRow[]> {
  const base = env.HR_API_URL.replace(/\/$/, '');
  const rows = await serviceGet<HrTeacherRow>(base, '/internal/teachers', organizationId);
  const q = search?.trim().toLowerCase() ?? '';
  if (!q) return rows;
  return rows.filter(
    (t) =>
      t.fullName.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.employeeNumber?.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q),
  );
}

export async function fetchIamTeachingStaff(
  organizationId: string,
  search?: string,
): Promise<IamTeachingStaffRow[]> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const url = new URL(`${base}/internal/organizations/${organizationId}/teaching-staff`);
  if (search?.trim()) url.searchParams.set('search', search.trim());

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'library',
      },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: IamTeachingStaffRow[] };
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

export const hrClient = { fetchHrTeachers };
export const iamClient = { fetchIamTeachingStaff };
