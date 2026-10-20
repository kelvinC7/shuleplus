import { env } from '../config/env';

export type DisciplineCaseRow = {
  id: string;
  incidentDate?: string | Date | null;
  createdAt?: string | Date | null;
  markName?: string | null;
  description?: string | null;
  incidentNotes?: string | null;
  appliedPoints?: number | null;
  status?: string | null;
  studentCode?: string | null;
};

async function disciplineFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${env.DISCIPLINE_API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': env.SERVICE_API_KEY,
      'x-source-service': 'parentmis',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discipline module ${res.status}: ${text}`);
  }
  const json: any = await res.json();
  return (json.data ?? json) as T;
}

export async function listDisciplineCases(
  organizationId: string,
  studentCode: string
): Promise<DisciplineCaseRow[]> {
  const data = await disciplineFetch<DisciplineCaseRow[]>(
    `/service/discipline/cases?organizationId=${encodeURIComponent(organizationId)}&studentCode=${encodeURIComponent(studentCode)}`
  );
  return Array.isArray(data) ? data : [];
}

export type DisciplinePermissionRow = {
  id: string;
  referenceNumber?: string | null;
  permissionType?: string | null;
  customType?: string | null;
  reason?: string | null;
  destination?: string | null;
  status?: string | null;
  departureDate?: string | Date | null;
  departureTime?: string | null;
  expectedReturnDate?: string | Date | null;
  expectedReturnTime?: string | null;
  actualDepartureAt?: string | Date | null;
  actualReturnAt?: string | Date | null;
  isOverdue?: boolean;
  isCurrentlyOut?: boolean;
  createdAt?: string | Date | null;
};

export async function listPermissions(
  organizationId: string,
  studentCode: string
): Promise<DisciplinePermissionRow[]> {
  const data = await disciplineFetch<DisciplinePermissionRow[]>(
    `/service/permissions?organizationId=${encodeURIComponent(organizationId)}&studentCode=${encodeURIComponent(studentCode)}`
  );
  return Array.isArray(data) ? data : [];
}
