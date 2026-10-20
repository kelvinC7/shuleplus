import { env } from '../config/env';

export type ParentContact = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  smsEnabled: boolean;
  students: Array<{
    studentId: string;
    studentCode: string;
    studentName: string | null;
    className: string | null;
  }>;
};

export type OrganizationClass = {
  id: string;
  name: string;
  label?: string | null;
};

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

type PublicLookupStudent = {
  id: string;
  organizationId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  studentUid: string;
  studentCode: string | null;
  sdmCode: string | null;
  className: string | null;
  classLabel: string | null;
  classId: string | null;
  academicYear: string | null;
  term: string | null;
  status: string;
  photoUrl?: string | null;
};

function mapPublicStudent(row: PublicLookupStudent): ServiceStudent {
  return {
    id: row.id,
    studentCode: row.studentCode ?? row.studentUid,
    fullName: row.fullName,
    firstName: row.firstName,
    lastName: row.lastName,
    className: row.className ?? row.classLabel,
    classId: row.classId,
    status: row.status,
    photoUrl: row.photoUrl ?? null,
    sdmCode: row.sdmCode,
  };
}

async function serviceFetch<T>(
  organizationId: string,
  path: string,
  opts?: { query?: Record<string, string | undefined> }
): Promise<T | null> {
  try {
    const base = env.STUDENT_MANAGEMENT_API_URL.replace(/\/$/, '');
    const url = new URL(`${base}${path}`);
    url.searchParams.set('organizationId', organizationId);
    if (opts?.query) {
      for (const [k, v] of Object.entries(opts.query)) {
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
    if (!res.ok) {
      console.warn(`[student-management] GET ${path} → ${res.status} (base=${base})`);
      return null;
    }
    const json = (await res.json()) as { data?: T };
    return (json.data ?? json) as T;
  } catch (err) {
    console.warn(`[student-management] GET ${path} failed: ${(err as Error)?.message ?? err}`);
    return null;
  }
}

/** Same lookup as Authentication landing page — supports ShuleCode, student code, SDMS code. */
export async function publicLookupStudent(code: string): Promise<PublicLookupStudent | null> {
  const q = code.trim();
  if (!q) return null;
  try {
    const base = env.STUDENT_MANAGEMENT_API_URL.replace(/\/$/, '');
    const res = await fetch(`${base}/public/students/lookup?code=${encodeURIComponent(q)}`);
    if (!res.ok) {
      console.warn(`[student-management] public lookup → ${res.status} (base=${base})`);
      return null;
    }
    const json = (await res.json()) as { data?: PublicLookupStudent };
    return json.data ?? null;
  } catch (err) {
    console.warn(`[student-management] public lookup failed: ${(err as Error)?.message ?? err}`);
    return null;
  }
}

export async function fetchOrganizationClasses(organizationId: string): Promise<OrganizationClass[]> {
  const rows = await serviceFetch<OrganizationClass[]>(organizationId, '/service/classes');
  return rows ?? [];
}

export async function searchStudents(
  organizationId: string,
  query: Record<string, string | undefined>
): Promise<ServiceStudent[]> {
  const rows = await serviceFetch<ServiceStudent[]>(organizationId, '/service/students', { query });
  return rows ?? [];
}

export async function lookupStudentByCode(organizationId: string, code: string): Promise<ServiceStudent | null> {
  const q = code.trim();
  if (!q) return null;

  const publicRow = await publicLookupStudent(q);
  if (publicRow && publicRow.organizationId === organizationId) {
    return mapPublicStudent(publicRow);
  }

  const rows = await searchStudents(organizationId, { search: q, status: 'ALL' });
  if (!rows.length) return null;

  const lower = q.toLowerCase();
  const exact =
    rows.find((s) => s.studentCode?.toLowerCase() === lower) ??
    rows.find((s) => s.sdmCode?.toLowerCase() === lower) ??
    rows.find((s) => s.id?.toLowerCase() === lower);
  return exact ?? rows[0];
}

export const studentManagementClient = {
  listParents(organizationId: string, studentId?: string) {
    return serviceFetch<ParentContact[]>(organizationId, '/service/parents', {
      query: studentId ? { studentId } : undefined,
    });
  },

  async parentsForStudent(organizationId: string, studentId: string) {
    const rows = await this.listParents(organizationId, studentId);
    return rows ?? [];
  },

  searchStudents,
  lookupStudentByCode,
  publicLookupStudent,
};
