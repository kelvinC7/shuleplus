import { env } from '../config/env';

type ServiceJson<T> = { success?: boolean; data?: T; message?: string };

export type StaffSource = 'hr' | 'iam' | 'timetable';

export type PrintCardSchool = {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  poBox?: string | null;
  website?: string | null;
  status: string;
  organizationCode?: string | null;
  logoUrl?: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  schoolCategory: string | null;
  schoolProgram: string | null;
  educationLevels?: string[];
  locationComplete?: boolean;
};

export type PrintCardStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  className?: string | null;
  educationLevel?: string | null;
  academicYear?: string | null;
  photoUrl?: string | null;
  photoId?: string | null;
  rfidUid?: string | null;
};

export type PrintCardClass = {
  id: string;
  name: string;
  stream?: string | null;
  category?: string | null;
  label: string;
};

export type PrintCardStaff = {
  id: string;
  source?: StaffSource;
  fullName: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  employeeNumber: string;
  position: string;
  email?: string | null;
  photoUrl?: string | null;
  rfidUid?: string | null;
};

async function moduleFetch<T>(
  baseUrl: string,
  path: string,
  organizationId: string,
  init?: RequestInit & { query?: Record<string, string | undefined> }
): Promise<T> {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`);
  url.searchParams.set('organizationId', organizationId);
  if (init?.query) {
    for (const [key, value] of Object.entries(init.query)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': env.SERVICE_API_KEY,
      'x-source-service': 'print-card',
      'x-organization-id': organizationId,
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => ({}))) as ServiceJson<T> & { message?: string };
  if (!response.ok) {
    const target = `${baseUrl.replace(/\/$/, '')}${path}`;
    throw new Error(
      body.message ??
        `Module request failed (${response.status}) for ${target} [org=${organizationId}]`
    );
  }
  return body.data as T;
}

async function moduleFetchSafe<T>(
  baseUrl: string,
  path: string,
  organizationId: string,
  init?: RequestInit & { query?: Record<string, string | undefined> }
): Promise<T[]> {
  try {
    const data = await moduleFetch<T[]>(baseUrl, path, organizationId, init);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export const upstreamClients = {
  listClasses(organizationId: string) {
    return moduleFetch<PrintCardClass[]>(env.STUDENT_MANAGEMENT_API_URL, '/service/classes', organizationId);
  },

  listStudents(
    organizationId: string,
    opts?: { search?: string; academicYear?: string; classId?: string; className?: string }
  ) {
    return moduleFetch<PrintCardStudent[]>(env.STUDENT_MANAGEMENT_API_URL, '/service/students', organizationId, {
      query: {
        status: 'ACTIVE',
        search: opts?.search,
        academicYear: opts?.academicYear,
        classId: opts?.classId,
        className: opts?.className,
      },
    });
  },

  applyStudentPhotos(
    organizationId: string,
    body: {
      existingPhotoPolicy: 'ONLY_MISSING' | 'REPLACE';
      items: Array<{
        studentId?: string;
        studentCode?: string;
        photoId?: string;
        fileName?: string;
        photoBase64: string;
      }>;
    }
  ) {
    return moduleFetch<{
      applied: number;
      skipped: number;
      failed: Array<{ studentId?: string; photoId?: string; message: string }>;
    }>(env.STUDENT_MANAGEMENT_API_URL, '/service/students/photos/apply', organizationId, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  listStaffFromHr(organizationId: string, opts?: { search?: string }) {
    return moduleFetchSafe<PrintCardStaff>(env.HR_API_URL, '/internal/staff', organizationId, {
      query: { search: opts?.search },
    });
  },

  listStaffFromTimetable(organizationId: string, opts?: { search?: string }) {
    return moduleFetchSafe<PrintCardStaff>(env.TIMETABLE_API_URL, '/internal/staff', organizationId, {
      query: { search: opts?.search },
    });
  },

  /** IAM Users & Access (organization admin / staff accounts). */
  listStaffFromIam(organizationId: string, opts?: { search?: string }) {
    return fetchIamStaffForCards(organizationId, opts);
  },
};

async function fetchIamStaffForCards(
  organizationId: string,
  opts?: { search?: string }
): Promise<PrintCardStaff[]> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const url = new URL(`${base}/internal/organizations/${organizationId}/staff-for-cards`);
  if (opts?.search) url.searchParams.set('search', opts.search);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'print-card',
        'x-organization-id': organizationId,
      },
    });
    const body = (await response.json().catch(() => ({}))) as ServiceJson<PrintCardStaff[]> & {
      message?: string;
    };
    if (!response.ok) {
      throw new Error(body.message ?? `IAM staff request failed (${response.status})`);
    }
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}

export async function fetchIamSchoolProfile(organizationId: string): Promise<PrintCardSchool | null> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const url = `${base}/internal/organizations/${organizationId}/profile`;
  try {
    const response = await fetch(url, {
      headers: {
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'print-card',
      },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      success?: boolean;
      data?: {
        organizationId: string;
        organizationCode?: string | null;
        schoolName: string;
        email?: string | null;
        phone?: string | null;
        poBox?: string | null;
        website?: string | null;
        logoUrl?: string | null;
      };
    };
    const profile = body.data;
    if (!profile) return null;
    return {
      id: profile.organizationId,
      name: profile.schoolName,
      email: profile.email ?? null,
      phone: profile.phone ?? null,
      poBox: profile.poBox ?? null,
      website: profile.website ?? null,
      status: 'ACTIVE',
      organizationCode: profile.organizationCode ?? null,
      logoUrl: profile.logoUrl ?? null,
      province: null,
      district: null,
      sector: null,
      schoolCategory: null,
      schoolProgram: null,
      educationLevels: [],
      locationComplete: false,
    };
  } catch {
    return null;
  }
}

export async function fetchIamOrganizations(filters?: {
  provinceId?: string;
  districtId?: string;
  sectorId?: string;
  search?: string;
}): Promise<PrintCardSchool[]> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const url = new URL(`${base}/internal/organizations`);
  if (filters?.search) url.searchParams.set('search', filters.search);
  if (filters?.provinceId) url.searchParams.set('provinceId', filters.provinceId);
  if (filters?.districtId) url.searchParams.set('districtId', filters.districtId);
  if (filters?.sectorId) url.searchParams.set('sectorId', filters.sectorId);

  const response = await fetch(url.toString(), {
    headers: {
      'x-service-key': env.SERVICE_API_KEY,
      'x-source-service': 'print-card',
    },
  });

  const body = (await response.json().catch(() => ({}))) as ServiceJson<
    Array<{
      id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
      poBox?: string | null;
      website?: string | null;
      status: string;
      organizationCode?: string | null;
      logoUrl?: string | null;
      province?: string | null;
      district?: string | null;
      sector?: string | null;
      schoolCategory?: string | null;
      schoolProgram?: string | null;
      educationLevels?: string[];
    }>
  > & { message?: string };

  if (!response.ok) {
    throw new Error(body.message ?? `IAM organizations request failed (${response.status})`);
  }

  return (body.data ?? []).map((org) => ({
    id: org.id,
    name: org.name,
    email: org.email ?? null,
    phone: org.phone ?? null,
    poBox: org.poBox ?? null,
    website: org.website ?? null,
    status: org.status,
    organizationCode: org.organizationCode ?? null,
    logoUrl: org.logoUrl ?? null,
    province: org.province ?? null,
    district: org.district ?? null,
    sector: org.sector ?? null,
    schoolCategory: org.schoolCategory ?? null,
    schoolProgram: org.schoolProgram ?? null,
    educationLevels: org.educationLevels ?? [],
    locationComplete: Boolean(org.province && org.district && org.sector),
  }));
}

export async function proxyIamSmartAccess<T>(
  bearerToken: string,
  path: string,
  query?: Record<string, string | undefined>
): Promise<T> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
  });

  const body = (await response.json().catch(() => ({}))) as ServiceJson<T> & { message?: string };
  if (!response.ok) {
    throw new Error(body.message ?? `IAM request failed (${response.status})`);
  }
  return body.data as T;
}
