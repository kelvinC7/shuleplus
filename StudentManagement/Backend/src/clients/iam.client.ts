import { env } from '../config/env';

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

type ApiList<T> = { success?: boolean; data?: T[] };

function baseUrl() {
  return env.IAM_API_URL.replace(/\/$/, '');
}

async function iamGet<T>(path: string) {
  const response = await fetch(`${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`, {
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

/** Users & Access teaching roster from Authentication (internal API). */
export async function fetchIamTeachingStaff(
  organizationId: string,
  search?: string
): Promise<IamTeachingStaffRow[]> {
  const qs = new URLSearchParams();
  if (search?.trim()) qs.set('search', search.trim());
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await iamGet<ApiList<IamTeachingStaffRow>>(
    `/internal/organizations/${encodeURIComponent(organizationId)}/teaching-staff${suffix}`
  );
  return Array.isArray(body?.data) ? body.data : [];
}
