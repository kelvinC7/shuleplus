import type { AdvanceRequest, Employee, OrgPolicy, PayrollRecord } from "../generated/prisma";

export type AdvanceEligibilityStatus =
  | "Eligible"
  | "Salary Missing"
  | "Net Salary Missing"
  | "Payroll Sync Required"
  | "Not Eligible"
  | "Advance Outstanding"
  | "Employment Too Short"
  | "Disabled";

export type SalarySourceKind = "payroll" | "kaziavance" | "missing" | "invalid";

export const ACTIVE_ADVANCE_STATUSES = new Set(["Approved", "Disbursed"]);

export function employmentMonths(employee: Pick<Employee, "hireDate" | "yearsOfService">) {
  if (employee.hireDate) {
    const start = new Date(employee.hireDate).getTime();
    if (Number.isFinite(start) && start > 0) {
      return Math.max(0, Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24 * 30)));
    }
  }
  if ((employee.yearsOfService ?? 0) > 0) return employee.yearsOfService * 12;
  return null;
}

export function outstandingFromAdvances(advances: AdvanceRequest[] | undefined) {
  return (advances ?? [])
    .filter((a) => ACTIVE_ADVANCE_STATUSES.has(a.status))
    .reduce((sum, a) => sum + (a.remainingBalance ?? a.amount), 0);
}

export function activeAdvanceCount(advances: AdvanceRequest[] | undefined) {
  return (advances ?? []).filter((a) => ACTIVE_ADVANCE_STATUSES.has(a.status) && (a.remainingBalance ?? a.amount) > 0)
    .length;
}

export function deriveSalarySource(
  employee: Pick<Employee, "grossSalary" | "netSalary" | "salarySource">,
  latestPayroll?: Pick<PayrollRecord, "source" | "netSalary"> | null
): SalarySourceKind {
  const net = employee.netSalary ?? 0;
  const gross = employee.grossSalary ?? 0;
  if (gross <= 0 && net <= 0) return "missing";
  if (gross > 0 && net <= 0) return "invalid";
  if (latestPayroll?.source === "payroll-api" && (latestPayroll.netSalary ?? 0) > 0) return "payroll";
  if (employee.salarySource === "payroll" || employee.salarySource === "kaziavance") {
    return employee.salarySource;
  }
  return net > 0 ? "kaziavance" : "missing";
}

export function computeAdvanceSnapshot(args: {
  employee: Employee;
  policy: OrgPolicy;
  outstanding: number;
  activeCount: number;
  payrollEnabled: boolean;
  salarySource: SalarySourceKind;
}) {
  const { employee, policy, outstanding, salarySource } = args;
  const pct = employee.maxSalaryPercent ?? policy.maxAdvancePercent ?? 50;
  const net = employee.netSalary ?? 0;
  const gross = employee.grossSalary ?? 0;
  const capFromNet = Math.round(net * (pct / 100));
  const maxAdvance =
    employee.maxAdvanceAmount && employee.maxAdvanceAmount > 0
      ? capFromNet > 0
        ? Math.min(employee.maxAdvanceAmount, capFromNet)
        : employee.maxAdvanceAmount
      : capFromNet;
  const availableAdvance = Math.max(0, maxAdvance - outstanding);
  const hasMaxAmount = employee.maxAdvanceAmount && employee.maxAdvanceAmount > 0;
  const ruleLabel = hasMaxAmount
    ? `Maximum ${maxAdvance.toLocaleString()} RWF`
    : `Up to ${pct}% of Net Salary`;

  let status: AdvanceEligibilityStatus = "Eligible";
  const blocked =
    !employee.allowAdvance ||
    employee.eligibilityStatus === "Blocked" ||
    employee.eligibilityStatus === "Suspended" ||
    employee.eligibilityStatus === "Disabled";

  if (blocked) {
    status = "Disabled";
  } else if (!/active/i.test(employee.employmentStatus || "")) {
    status = "Not Eligible";
  }

  if (status === "Eligible" && (gross <= 0 && net <= 0)) {
    status = "Salary Missing";
  } else if (status === "Eligible" && (net <= 0 || salarySource === "invalid")) {
    status = "Net Salary Missing";
  } else if (status === "Eligible" && outstanding > 0 && availableAdvance <= 0) {
    status = "Advance Outstanding";
  }

  return {
    status,
    maxAdvance,
    availableAdvance,
    outstanding,
    ruleLabel,
    percent: pct,
    maxAdvanceAmount: employee.maxAdvanceAmount ?? 0,
    maxSalaryPercent: pct,
  };
}
