export interface HrEmployeeSyncPayload {
  hrEmployeeId: string;
  payrollStaffId?: string | null;
  employeeNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender: string;
  dateOfBirth?: string | null;
  email?: string | null;
  phone?: string | null;
  nationalId?: string | null;
  rssbNumber?: string | null;
  department?: string | null;
  position: string;
  contractType?: string | null;
  status: string;
  hireDate?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  basicSalary?: number | null;
  transportAllowance?: number | null;
  housingAllowance?: number | null;
  othersAllowance?: number | null;
  isProtected?: boolean;
  hrProfile?: unknown;
}

export interface PayrollStaffSyncPayload {
  payrollStaffId: string;
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
  contractType?: string | null;
  status: string;
  hireDate?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  basicSalary?: number | null;
  transportAllowance?: number | null;
  housingAllowance?: number | null;
  othersAllowance?: number | null;
  isProtected?: boolean;
}

export function extractRssbFromHrProfile(hrProfile: unknown): string | null {
  const p = (hrProfile ?? {}) as Record<string, unknown>;
  if (typeof p.rssbNumber === 'string' && p.rssbNumber.trim()) return p.rssbNumber.trim();
  const identification = (p.identification ?? {}) as Record<string, string>;
  return identification.socialSecurity?.trim() || identification.pensionNumber?.trim() || null;
}

export function extractBankFromHrProfile(hrProfile: unknown): { bankName: string | null; bankAccount: string | null } {
  const p = (hrProfile ?? {}) as Record<string, unknown>;
  const banking = (p.banking ?? p.bank ?? {}) as Record<string, string>;
  return {
    bankName: banking.bankName?.trim() || null,
    bankAccount: banking.accountNumber?.trim() || null,
  };
}

export function extractAllowancesFromHrProfile(hrProfile: unknown): {
  transportAllowance: number;
  housingAllowance: number;
  othersAllowance: number;
} {
  const p = (hrProfile ?? {}) as Record<string, unknown>;
  const allowances = (p.allowances ?? {}) as Record<string, number>;
  return {
    transportAllowance: Number(allowances.transport ?? 0) || 0,
    housingAllowance: Number(allowances.housing ?? 0) || 0,
    othersAllowance: Number(allowances.others ?? 0) || 0,
  };
}
