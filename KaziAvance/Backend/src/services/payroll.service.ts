import { prisma } from "../config/prisma";
import { env } from "../config/env";

export type KaziSyncStaff = {
  employeeNumber?: string;
  email?: string | null;
  phone?: string | null;
  fullName?: string;
  department?: string | null;
  position?: string | null;
  grossSalary?: number;
  taxAmount?: number;
  deductions?: number;
  allowances?: number;
  netSalary?: number;
  paye?: number;
};

export function isPayrollConfigured() {
  return Boolean(env.PAYROLL_API_URL);
}

async function fetchPayrollStaff(organizationId: string, bearerToken?: string): Promise<KaziSyncStaff[]> {
  if (!env.PAYROLL_API_URL) return [];
  const base = env.PAYROLL_API_URL.replace(/\/$/, "").replace(/\/api$/, "");
  const url = `${base}/api/staff/for-kazi-sync?organizationId=${encodeURIComponent(organizationId)}`;
  const serviceKey = env.PAYROLL_API_KEY || env.SERVICE_API_KEY;
  const response = await fetch(url, {
    headers: {
      ...(bearerToken ? { Authorization: bearerToken } : {}),
      ...(serviceKey ? { "x-service-key": serviceKey } : {}),
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { data?: KaziSyncStaff[] } | KaziSyncStaff[];
  return Array.isArray(payload) ? payload : (payload.data ?? []);
}

function matchPayrollRow(rows: KaziSyncStaff[], employee: { employeeCode: string; email?: string | null; phone?: string | null }) {
  const email = employee.email?.toLowerCase();
  const phone = employee.phone?.replace(/\s+/g, "");
  return rows.find((row) => {
    if (row.employeeNumber && row.employeeNumber === employee.employeeCode) return true;
    if (email && row.email?.toLowerCase() === email) return true;
    if (phone && row.phone?.replace(/\s+/g, "") === phone) return true;
    return false;
  });
}

async function applyPayrollMatch(employeeId: string, match: KaziSyncStaff) {
  const grossSalary = Math.round(Number(match.grossSalary ?? 0));
  const taxAmount = Math.round(Number(match.taxAmount ?? match.paye ?? 0));
  const deductions = Math.round(Number(match.deductions ?? 0));
  const allowances = Math.round(Number(match.allowances ?? 0));
  const netSalary = Math.round(Number(match.netSalary ?? 0));
  const now = new Date();

  const current = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { salarySource: true, netSalary: true },
  });
  // Do not wipe a salary the org admin just set in Kazi when Payroll has no amount.
  if (
    netSalary <= 0 &&
    current?.salarySource === "kaziavance" &&
    (current.netSalary ?? 0) > 0
  ) {
    return {
      grossSalary: current.netSalary,
      taxAmount: 0,
      deductions: 0,
      allowances: 0,
      netSalary: current.netSalary,
      phone: match.phone ?? null,
    };
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      grossSalary,
      taxAmount,
      deductions,
      allowances,
      netSalary,
      salarySource: netSalary > 0 ? "payroll" : grossSalary > 0 ? "invalid" : "missing",
      salaryUpdatedAt: now,
      salaryUpdateReason: "Synced from Payroll",
      ...(match.phone ? { phone: match.phone } : {}),
      ...(match.department ? { department: match.department } : {}),
      ...(match.position ? { position: match.position } : {}),
    },
  });

  const monthLabel = now.toLocaleString("en-US", { month: "short", year: "numeric" });
  const existing = await prisma.payrollRecord.findFirst({
    where: { employeeId, monthLabel, source: "payroll-api" },
  });

  const recordData = {
    grossSalary,
    taxAmount,
    deductions,
    allowances,
    netSalary,
    payrollDate: now,
    status: "Approved",
    reason: "Payroll sync",
  };

  if (existing) {
    await prisma.payrollRecord.update({ where: { id: existing.id }, data: recordData });
  } else {
    await prisma.payrollRecord.create({
      data: { employeeId, monthLabel, source: "payroll-api", ...recordData },
    });
  }

  return { grossSalary, taxAmount, deductions, allowances, netSalary, phone: match.phone ?? null };
}

/**
 * Pull latest salary (and phone when available) from Payroll module.
 * Uses GET /api/staff/for-kazi-sync?organizationId=… with service key.
 */
export async function syncEmployeePayroll(
  employeeId: string,
  employeeCode: string,
  options?: {
    organizationId?: string | null;
    email?: string | null;
    phone?: string | null;
    bearerToken?: string;
  }
) {
  if (!env.PAYROLL_API_URL) return null;
  const orgId = options?.organizationId;
  if (!orgId) return null;

  try {
    const rows = await fetchPayrollStaff(orgId, options?.bearerToken);
    const match = matchPayrollRow(rows, {
      employeeCode,
      email: options?.email,
      phone: options?.phone,
    });
    if (!match) return null;
    return applyPayrollMatch(employeeId, match);
  } catch {
    return null;
  }
}

export async function syncOrganizationPayroll(organizationId: string, bearerToken?: string) {
  if (!env.PAYROLL_API_URL) return { updated: 0, matched: 0 };
  try {
    const rows = await fetchPayrollStaff(organizationId, bearerToken);
    if (!rows.length) return { updated: 0, matched: 0 };
    const employees = await prisma.employee.findMany({
      where: { organizationId },
      select: { id: true, employeeCode: true, email: true, phone: true },
    });
    let updated = 0;
    for (const employee of employees) {
      const match = matchPayrollRow(rows, employee);
      if (!match) continue;
      await applyPayrollMatch(employee.id, match);
      updated += 1;
    }
    return { updated, matched: rows.length };
  } catch {
    return { updated: 0, matched: 0 };
  }
}
