import type { PayrollStaff } from '@/services/payroll-api';

export type RegisterRow = Record<string, unknown> & {
  staffId: string;
  employeeNumber: string;
  employeeName: string;
  department?: string | null;
  position?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  basicSalary: number;
  others: number;
  housing: number;
  transport: number;
  meal: number;
  base: number;
  gross: number;
  paye: number;
  rssbEmployee: number;
  rssbEmployer: number;
  ramaEmployee: number;
  ramaEmployer: number;
  maternityEmployee: number;
  maternityEmployer: number;
  occupationalHazardEmployer: number;
  cbhi: number;
  netSalary: number;
  finalPayable: number;
  employeeDeductionTotal: number;
  templateDeductionTotal: number;
  employerCost: number;
};

export type EnrichedRegisterRow = RegisterRow & {
  firstName: string;
  lastName: string;
  gender: string;
  rssbNumber: string | null;
  status: string;
  email: string | null;
};

export function enrichRegisterRows(
  rows: RegisterRow[],
  staffMap: Map<string, PayrollStaff>
): EnrichedRegisterRow[] {
  return rows.map((row) => {
    const staff = staffMap.get(row.staffId);
    const nameParts = String(row.employeeName).split(' ');
    const firstName = staff?.firstName ?? nameParts[0] ?? '';
    const lastName = staff?.lastName ?? nameParts.slice(1).join(' ') ?? '';
    return {
      ...row,
      firstName,
      lastName,
      gender: staff?.gender ?? '—',
      rssbNumber: staff?.rssbNumber ?? null,
      status: staff?.status ?? 'ACTIVE',
      email: staff?.email ?? null,
    };
  });
}

export function registerTotals(rows: EnrichedRegisterRow[]) {
  return rows.reduce(
    (acc, r) => ({
      gross: acc.gross + r.gross,
      paye: acc.paye + r.paye,
      netSalary: acc.netSalary + r.netSalary,
      finalPayable: acc.finalPayable + r.finalPayable,
      rssbEmployee: acc.rssbEmployee + r.rssbEmployee,
      rssbEmployer: acc.rssbEmployer + r.rssbEmployer,
      ramaEmployee: acc.ramaEmployee + r.ramaEmployee,
      ramaEmployer: acc.ramaEmployer + r.ramaEmployer,
      maternityEmployee: acc.maternityEmployee + r.maternityEmployee,
      maternityEmployer: acc.maternityEmployer + r.maternityEmployer,
      occupationalHazardEmployer: acc.occupationalHazardEmployer + r.occupationalHazardEmployer,
      cbhi: acc.cbhi + r.cbhi,
      allowances:
        acc.allowances + r.housing + r.transport + r.others + r.meal,
      deductions: acc.deductions + (r.gross - r.netSalary),
      employeeDeductionTotal: acc.employeeDeductionTotal + r.employeeDeductionTotal,
    }),
    {
      gross: 0,
      paye: 0,
      netSalary: 0,
      finalPayable: 0,
      rssbEmployee: 0,
      rssbEmployer: 0,
      ramaEmployee: 0,
      ramaEmployer: 0,
      maternityEmployee: 0,
      maternityEmployer: 0,
      occupationalHazardEmployer: 0,
      cbhi: 0,
      allowances: 0,
      deductions: 0,
      employeeDeductionTotal: 0,
    }
  );
}
