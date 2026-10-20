import { env } from '../config/env';
import type { HrEmployeeSyncPayload } from '../types/employee-sync';
import {
  extractAllowancesFromHrProfile,
  extractBankFromHrProfile,
  extractRssbFromHrProfile,
} from '../types/employee-sync';

const BASE = (env.PAYROLL_API_URL ?? '').replace(/\/$/, '');

export function buildHrEmployeeSyncPayload(employee: {
  id: string;
  payrollStaffId?: string | null;
  employeeNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender: string;
  dateOfBirth?: Date | string | null;
  email?: string | null;
  phone?: string | null;
  nationalId?: string | null;
  department?: string | null;
  position: string;
  contractType?: string | null;
  status: string;
  hireDate?: Date | string | null;
  basicSalary?: number | null;
  isProtected?: boolean;
  hrProfile?: unknown;
}): HrEmployeeSyncPayload {
  const bank = extractBankFromHrProfile(employee.hrProfile);
  const allowances = extractAllowancesFromHrProfile(employee.hrProfile);
  const rssb = extractRssbFromHrProfile(employee.hrProfile);

  return {
    hrEmployeeId: employee.id,
    payrollStaffId: employee.payrollStaffId ?? null,
    employeeNumber: employee.employeeNumber,
    firstName: employee.firstName,
    middleName: employee.middleName ?? null,
    lastName: employee.lastName,
    gender: employee.gender,
    dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString() : null,
    email: employee.email ?? null,
    phone: employee.phone ?? null,
    nationalId: employee.nationalId ?? null,
    rssbNumber: rssb,
    department: employee.department ?? null,
    position: employee.position,
    contractType: employee.contractType ?? null,
    status: employee.status,
    hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString() : null,
    bankName: bank.bankName,
    bankAccount: bank.bankAccount,
    basicSalary: employee.basicSalary ?? null,
    transportAllowance: allowances.transportAllowance,
    housingAllowance: allowances.housingAllowance,
    othersAllowance: allowances.othersAllowance,
    isProtected: employee.isProtected ?? false,
    hrProfile: employee.hrProfile ?? {},
  };
}

async function request<T>(path: string, body: unknown): Promise<T | null> {
  if (!env.PAYROLL_API_URL) return null;

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'HR',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[Payroll Client] ${path} failed: ${res.status} ${text}`);
      return null;
    }

    const json = (await res.json()) as { data?: T };
    return json.data as T;
  } catch (err) {
    console.warn('[Payroll Client] Unreachable — employee not synced to Payroll', err);
    return null;
  }
}

export const payrollClient = {
  isEnabled: () => Boolean(env.PAYROLL_API_URL),

  async syncEmployee(orgId: string, employee: Parameters<typeof buildHrEmployeeSyncPayload>[0]) {
    return request<{ payrollStaffId: string; created: boolean; updated: boolean }>('/staff/sync', {
      organizationId: orgId,
      employee: buildHrEmployeeSyncPayload(employee),
    });
  },
};
