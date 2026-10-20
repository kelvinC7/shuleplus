import { env } from '../config/env';
import type { PayrollStaffSyncPayload } from '../types/employee-sync';

const BASE = (env.HR_API_URL ?? '').replace(/\/$/, '');
const warnedKeys = new Set<string>();

function hrIntegrationEnabled() {
  return env.HR_INTEGRATION_ENABLED && Boolean(env.HR_API_URL);
}

function warnOnce(key: string, message: string, err?: unknown) {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message, err ?? '');
}

export function buildPayrollStaffSyncPayload(staff: {
  id: string;
  hrEmployeeId?: string | null;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  email?: string | null;
  phone?: string | null;
  nationalId?: string | null;
  rssbNumber?: string | null;
  department?: string | null;
  position?: string | null;
  status: string;
  hireDate?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  basicSalary?: number;
  isProtected?: boolean;
  hrProfile?: unknown;
  profile?: {
    transportAllowance?: unknown;
    housingAllowance?: unknown;
    othersAllowance?: unknown;
  } | null;
}): PayrollStaffSyncPayload {
  const hrProfile = (staff.hrProfile ?? {}) as Record<string, string>;
  return {
    payrollStaffId: staff.id,
    hrEmployeeId: staff.hrEmployeeId ?? null,
    employeeNumber: staff.employeeNumber,
    firstName: staff.firstName,
    lastName: staff.lastName,
    gender: staff.gender ?? null,
    dateOfBirth: staff.dateOfBirth ?? null,
    email: staff.email ?? null,
    phone: staff.phone ?? null,
    nationalId: staff.nationalId ?? null,
    rssbNumber: staff.rssbNumber ?? null,
    department: staff.department ?? null,
    position: staff.position ?? null,
    contractType: hrProfile.contractType ?? null,
    status: staff.status,
    hireDate: staff.hireDate ?? null,
    bankName: staff.bankName ?? null,
    bankAccount: staff.bankAccount ?? null,
    basicSalary: staff.basicSalary ?? null,
    transportAllowance: staff.profile ? Number(staff.profile.transportAllowance ?? 0) : 0,
    housingAllowance: staff.profile ? Number(staff.profile.housingAllowance ?? 0) : 0,
    othersAllowance: staff.profile ? Number(staff.profile.othersAllowance ?? 0) : 0,
    isProtected: staff.isProtected ?? false,
  };
}

async function getRequest<T>(path: string): Promise<T | null> {
  if (!hrIntegrationEnabled()) return null;

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'GET',
      headers: {
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'PAYROLL',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[HR Client] GET ${path} failed: ${res.status} ${text}`);
      return null;
    }

    const json = (await res.json()) as { data?: T };
    return json.data ?? null;
  } catch (err) {
    warnOnce('hr-get', '[HR Client] GET unreachable (HR integration disabled or HR API not running)', err);
    return null;
  }
}

async function request<T>(path: string, body: unknown): Promise<T | null> {
  if (!hrIntegrationEnabled()) return null;

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'PAYROLL',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[HR Client] ${path} failed: ${res.status} ${text}`);
      return null;
    }

    const json = (await res.json()) as { data?: T };
    return json.data ?? null;
  } catch (err) {
    warnOnce('hr-post', '[HR Client] Unreachable — staff not synced to HR', err);
    return null;
  }
}

export const hrClient = {
  isEnabled: hrIntegrationEnabled,

  async syncStaff(orgId: string, staff: Parameters<typeof buildPayrollStaffSyncPayload>[0]) {
    return request<{ hrEmployeeId: string; created: boolean; updated: boolean }>('/employees/sync', {
      organizationId: orgId,
      staff: buildPayrollStaffSyncPayload(staff),
    });
  },

  async listEmployeesForSync(orgId: string) {
    return getRequest<import('../types/employee-sync').HrEmployeeSyncPayload[]>(
      `/employees/for-payroll-sync?organizationId=${encodeURIComponent(orgId)}`
    );
  },

  async listDepartments(orgId: string) {
    return getRequest<{ id: string; name: string; code?: string }[]>(
      `/departments/for-sync?organizationId=${encodeURIComponent(orgId)}`
    );
  },
};
