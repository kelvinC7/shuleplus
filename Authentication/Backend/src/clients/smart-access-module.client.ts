import { env } from '../config/env';
import { throwModuleClientError, throwModuleUnavailable } from './module-client.util';

type ServiceJson<T> = { success?: boolean; data?: T; message?: string };

export type StaffSource = 'hr' | 'iam' | 'timetable';

async function moduleFetch<T>(
  baseUrl: string,
  path: string,
  organizationId: string,
  init?: RequestInit & { query?: Record<string, string | undefined>; serviceLabel?: string }
): Promise<T> {
  const serviceLabel = init?.serviceLabel ?? 'Module service';
  const url = new URL(`${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`);
  url.searchParams.set('organizationId', organizationId);
  if (init?.query) {
    for (const [key, value] of Object.entries(init.query)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.PLATFORM_SERVICE_KEY,
        'x-source-service': 'iam-super-admin',
        'x-organization-id': organizationId,
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throwModuleUnavailable(serviceLabel);
  }

  const body = (await response.json().catch(() => ({}))) as ServiceJson<T> & { message?: string };
  if (!response.ok) {
    throwModuleClientError(response, body, serviceLabel);
  }
  return body.data as T;
}

async function moduleFetchSafe<T>(
  baseUrl: string,
  path: string,
  organizationId: string,
  init?: RequestInit & { query?: Record<string, string | undefined>; serviceLabel?: string }
): Promise<T[]> {
  try {
    const data = await moduleFetch<T[]>(baseUrl, path, organizationId, init);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export type SmartAccessStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  className?: string | null;
  /** Class category from Student Management (NURSERY, PRIMARY, SECONDARY, TVET). */
  educationLevel?: string | null;
  academicYear?: string | null;
  photoUrl?: string | null;
  rfidUid?: string | null;
  fingerprintId?: string | null;
};

export type SmartAccessStaff = {
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
  fingerprintId?: string | null;
};

export type SmartAccessClass = {
  id: string;
  label: string;
  name: string;
  stream?: string | null;
};

export type SmartAccessParentStudent = {
  studentId: string | null;
  studentCode: string | null;
  studentName: string | null;
  className: string | null;
  role: string;
};

export type SmartAccessParent = {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  nationalId?: string | null;
  occupation?: string | null;
  address?: string | null;
  students: SmartAccessParentStudent[];
};

export const smartAccessModuleClient = {
  listClasses(organizationId: string) {
    return moduleFetch<SmartAccessClass[]>(env.STUDENT_MANAGEMENT_API_URL, '/service/classes', organizationId, {
      serviceLabel: 'Student Management',
    });
  },

  listStudents(
    organizationId: string,
    opts?: { search?: string; academicYear?: string; classId?: string; className?: string }
  ) {
    return moduleFetch<SmartAccessStudent[]>(env.STUDENT_MANAGEMENT_API_URL, '/service/students', organizationId, {
      serviceLabel: 'Student Management',
      query: {
        status: 'ACTIVE',
        search: opts?.search,
        academicYear: opts?.academicYear,
        classId: opts?.classId,
        className: opts?.className,
      },
    });
  },

  updateStudentIdentity(
    organizationId: string,
    studentId: string,
    body: { rfidUid?: string | null; fingerprintId?: string | null; identityRemarks?: string | null }
  ) {
    return moduleFetch<{ id: string; rfidUid: string | null }>(
      env.STUDENT_MANAGEMENT_API_URL,
      `/service/students/${studentId}/identity`,
      organizationId,
      { method: 'PUT', body: JSON.stringify(body), serviceLabel: 'Student Management' }
    );
  },

  listParents(organizationId: string, opts?: { studentId?: string }) {
    return moduleFetch<SmartAccessParent[]>(env.STUDENT_MANAGEMENT_API_URL, '/service/parents', organizationId, {
      serviceLabel: 'Student Management',
      query: { studentId: opts?.studentId },
    });
  },

  toggleParentSms(organizationId: string, parentId: string, enabled: boolean) {
    return moduleFetch<{ id: string; smsEnabled: boolean }>(
      env.STUDENT_MANAGEMENT_API_URL,
      `/service/parents/${parentId}/sms-toggle`,
      organizationId,
      { method: 'PATCH', body: JSON.stringify({ enabled }), serviceLabel: 'Student Management' }
    );
  },

  bulkParentSms(organizationId: string, enabled: boolean, onlyWithPhone = true) {
    return moduleFetch<{
      updated: number;
      total: number;
      withPhone: number;
      enabledCount: number;
      enabled: boolean;
    }>(env.STUDENT_MANAGEMENT_API_URL, '/service/parents/sms-bulk', organizationId, {
      method: 'PATCH',
      body: JSON.stringify({ enabled, onlyWithPhone }),
      serviceLabel: 'Student Management',
    });
  },

  listStaffFromHr(organizationId: string, opts?: { search?: string }) {
    return moduleFetchSafe<SmartAccessStaff>(env.HR_API_URL, '/internal/staff', organizationId, {
      serviceLabel: 'HR',
      query: { search: opts?.search },
    });
  },

  listStaffFromTimetable(organizationId: string, opts?: { search?: string }) {
    return moduleFetchSafe<SmartAccessStaff>(env.TIMETABLE_API_URL, '/internal/staff', organizationId, {
      serviceLabel: 'Timetable',
      query: { search: opts?.search },
    });
  },

  async updateStaffIdentity(
    organizationId: string,
    staffId: string,
    body: { rfidUid?: string | null; fingerprintId?: string | null; identityRemarks?: string | null },
    source?: StaffSource
  ) {
    const targets =
      source === 'timetable'
        ? [{ base: env.TIMETABLE_API_URL, path: `/internal/staff/${staffId}/identity` }]
        : source === 'hr'
          ? [{ base: env.HR_API_URL, path: `/internal/staff/${staffId}/identity` }]
          : source === 'iam'
            ? []
            : [
                { base: env.HR_API_URL, path: `/internal/staff/${staffId}/identity` },
                { base: env.TIMETABLE_API_URL, path: `/internal/staff/${staffId}/identity` },
              ];

    let lastError: Error | null = null;
    for (const target of targets) {
      try {
        return await moduleFetch<{ id: string; rfidUid: string | null }>(
          target.base,
          target.path,
          organizationId,
          {
            method: 'PUT',
            body: JSON.stringify(body),
            serviceLabel: target.base === env.HR_API_URL ? 'HR' : 'Timetable',
          }
        );
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (/not found|404/i.test(lastError.message)) continue;
        throw lastError;
      }
    }
    throw lastError ?? new Error('Staff member not found');
  },

  async lookupStudentByRfid(rfidUid: string) {
    try {
      return await moduleFetch<{
        kind?: 'student';
        id?: string;
        studentId?: string;
        name?: string;
        studentName?: string;
        code?: string;
        studentCode?: string;
        organizationName?: string | null;
        rfidUid?: string;
      } | null>(env.STUDENT_MANAGEMENT_API_URL, '/service/rfid-lookup', 'global', {
        serviceLabel: 'Student Management',
        query: { rfidUid },
      });
    } catch {
      return null;
    }
  },

  async lookupHrStaffByRfid(rfidUid: string) {
    try {
      return await moduleFetch<{
        kind?: 'staff';
        source?: 'hr';
        id: string;
        name: string;
        code: string;
        organizationName?: string | null;
        rfidUid?: string;
      } | null>(env.HR_API_URL, '/internal/staff/rfid-lookup', 'global', {
        serviceLabel: 'HR',
        query: { rfidUid },
      });
    } catch {
      return null;
    }
  },

  async lookupTimetableStaffByRfid(rfidUid: string) {
    try {
      return await moduleFetch<{
        kind?: 'staff';
        source?: 'timetable';
        id: string;
        name: string;
        code: string;
        organizationName?: string | null;
        rfidUid?: string;
      } | null>(env.TIMETABLE_API_URL, '/internal/staff/rfid-lookup', 'global', {
        serviceLabel: 'Timetable',
        query: { rfidUid },
      });
    } catch {
      return null;
    }
  },
};
