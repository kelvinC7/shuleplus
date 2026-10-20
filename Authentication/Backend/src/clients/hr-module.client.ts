import { env } from '../config/env';

export type HrDepartmentOption = {
  id: string;
  name: string;
  code: string | null;
};

type ApiList<T> = { success?: boolean; data?: T };

function hrHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-service-key': env.PLATFORM_SERVICE_KEY,
    'x-source-service': 'iam',
  };
}

function hrUrl(path: string, organizationId: string) {
  const base = env.HR_API_URL.replace(/\/$/, '');
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  url.searchParams.set('organizationId', organizationId);
  return url.toString();
}

async function hrGet<T>(path: string, organizationId: string): Promise<T | null> {
  try {
    const response = await fetch(hrUrl(path, organizationId), { headers: hrHeaders() });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function hrMutate<T>(
  method: 'POST' | 'DELETE',
  path: string,
  organizationId: string,
  body?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(hrUrl(path, organizationId), {
    method,
    headers: hrHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: T;
  };
  if (!response.ok) {
    throw new Error(payload.message ?? `HR request failed (${response.status})`);
  }
  return (payload.data ?? payload) as T;
}

export async function fetchHrDepartments(organizationId: string): Promise<HrDepartmentOption[]> {
  const body = await hrGet<ApiList<HrDepartmentOption>>('/departments/for-sync', organizationId);
  return Array.isArray(body?.data) ? body.data : [];
}

export async function createHrDepartment(
  organizationId: string,
  input: {
    name: string;
    branch?: string;
    departmentHead?: string;
    departmentType?: string;
    status?: string;
  }
): Promise<HrDepartmentOption> {
  const created = await hrMutate<HrDepartmentOption & { id: string; name: string; code: string | null }>(
    'POST',
    '/internal/departments',
    organizationId,
    input
  );
  return { id: created.id, name: created.name, code: created.code ?? null };
}

export async function deleteHrDepartment(organizationId: string, departmentId: string): Promise<void> {
  await hrMutate<{ success: boolean }>('DELETE', `/internal/departments/${departmentId}`, organizationId);
}

export type HrTeacherRow = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  employeeNumber?: string | null;
};

export async function fetchHrTeachers(organizationId: string): Promise<HrTeacherRow[]> {
  const body = await hrGet<ApiList<HrTeacherRow>>('/internal/teachers', organizationId);
  return Array.isArray(body?.data) ? body.data : [];
}
