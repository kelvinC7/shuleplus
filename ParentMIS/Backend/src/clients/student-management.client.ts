import { env } from '../config/env';

export type SmLinkedStudent = {
  studentId?: string;
  studentCode?: string | null;
  studentName?: string | null;
  className?: string | null;
  role?: string;
};

export type SmParentRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  students?: SmLinkedStudent[];
};

async function smFetch(path: string, params?: Record<string, string>) {
  const url = new URL(`${env.STUDENT_MANAGEMENT_API_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': env.SERVICE_API_KEY,
      'x-source-service': 'parentmis',
      'x-organization-id': params?.organizationId || '',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`StudentManagement ${res.status}: ${body}`);
  }
  const json: any = await res.json();
  return json.data ?? json;
}

export async function smListParents(
  organizationId: string,
  params?: { parentId?: string; phone?: string }
): Promise<SmParentRow[]> {
  const data = await smFetch('/service/parents', {
    organizationId,
    parentId: params?.parentId ?? '',
    phone: params?.phone ?? '',
  });
  return Array.isArray(data) ? data : [];
}
