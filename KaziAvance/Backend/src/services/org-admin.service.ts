import type { AdvanceRequest, Employee, OrgPolicy, PayrollRecord } from "../generated/prisma";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../middleware/error";
import { ensureTenant } from "./tenant.service";
import {
  createIamUser,
  findIamUserByEmail,
  resetIamPassword,
  updateIamUserStatus,
} from "./iam.service";
import { parseDirectorySources, syncStaffDirectory } from "./staff-directory.service";
import { isPayrollConfigured, syncEmployeePayroll, syncOrganizationPayroll } from "./payroll.service";
import { notifyEmployeeSafe } from "./web-push.service";
import {
  activeAdvanceCount,
  computeAdvanceSnapshot,
  deriveSalarySource,
  outstandingFromAdvances,
} from "./advance-eligibility.service";

const PENDING_STATUSES = new Set(["Pending", "Submitted", "Under Review"]);
const APPROVED_STATUSES = new Set(["Approved", "Disbursed", "Completed"]);
const ACTIVE_STATUSES = new Set(["Approved", "Disbursed"]);
const REJECTED_STATUSES = new Set(["Rejected"]);

function orgEmployeeFilter(organizationId: string) {
  return { organizationId };
}

function calcMonthlyDeduction(amount: number, months: number) {
  const interest = Math.round(amount * 0.025);
  const fee = Math.round(amount * 0.01);
  return Math.round((amount + interest + fee) / months);
}

function availableLimit(employee: Employee, policy: OrgPolicy) {
  const pct = employee.maxSalaryPercent ?? policy.maxAdvancePercent;
  const cap = employee.maxAdvanceAmount ?? Math.round(employee.netSalary * (pct / 100));
  const activeTotal = 0;
  return Math.max(0, cap - activeTotal);
}

function mapEmployeeRow(
  employee: Employee & { advances?: AdvanceRequest[]; payrollRecords?: PayrollRecord[] },
  policy: OrgPolicy,
  payrollEnabled = isPayrollConfigured()
) {
  const outstanding = outstandingFromAdvances(employee.advances);
  const activeCount = activeAdvanceCount(employee.advances);
  const latestPayroll = employee.payrollRecords?.[0] ?? null;
  const salarySource = deriveSalarySource(employee, latestPayroll);
  const snapshot = computeAdvanceSnapshot({
    employee,
    policy,
    outstanding,
    activeCount,
    payrollEnabled,
    salarySource,
  });

  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    department: employee.department,
    position: employee.position,
    phone: employee.phone ?? null,
    photoUrl: employee.photoUrl ?? null,
    netSalary: employee.netSalary,
    eligibilityStatus: employee.eligibilityStatus,
    advanceEligibility: snapshot.status,
    activeAdvance: outstanding,
    accountStatus: /active/i.test(employee.employmentStatus) ? "Active" : "Inactive",
    employmentStatus: employee.employmentStatus,
    hasLogin: Boolean(employee.iamUserId),
    maxAdvanceAmount: snapshot.maxAdvance,
    maxSalaryPercent: snapshot.percent,
    maxActiveAdvances: employee.maxActiveAdvances,
    repaymentPeriod: employee.repaymentPeriodMonths,
    waitingPeriod: employee.waitingPeriodDays,
    requireDocuments: employee.requireDocuments,
    allowAdvance: employee.allowAdvance,
    email: employee.email,
    iamUserId: employee.iamUserId,
    grossSalary: employee.grossSalary,
    allowances: employee.allowances,
    deductions: employee.deductions,
    taxAmount: employee.taxAmount,
    yearsOfService: employee.yearsOfService,
    hireDate: employee.hireDate?.toISOString() ?? null,
    lastLoginAt: employee.lastLoginAt?.toISOString() ?? null,
    directorySources: parseDirectorySources(employee.directorySources),
    salarySource,
    salaryUpdatedAt: employee.salaryUpdatedAt?.toISOString() ?? latestPayroll?.payrollDate.toISOString() ?? null,
    salaryUpdateReason: employee.salaryUpdateReason ?? null,
    payrollStatus: latestPayroll?.status ?? (salarySource === "payroll" ? "Approved" : null),
    availableAdvance: snapshot.availableAdvance,
    eligibilityRule: snapshot.ruleLabel,
    payrollEnabled,
  };
}

export async function getOrCreatePolicy(organizationId: string): Promise<OrgPolicy> {
  return prisma.orgPolicy.upsert({
    where: { organizationId },
    update: {},
    create: { organizationId },
  });
}

async function ensureOrgData(organizationId: string) {
  await ensureTenant(organizationId);
  await getOrCreatePolicy(organizationId);
  try {
    await syncStaffDirectory(organizationId);
  } catch (err) {
    console.warn("[kaziavance] staff directory sync skipped", err);
  }
}

export async function getDashboard(organizationId: string) {
  await ensureOrgData(organizationId);
  const tenant = await ensureTenant(organizationId);
  const employees = await prisma.employee.findMany({
    where: orgEmployeeFilter(organizationId),
    include: { advances: true },
  });

  const requests = await prisma.advanceRequest.findMany({
    where: { employee: orgEmployeeFilter(organizationId) },
    include: { employee: true },
    orderBy: { createdAt: "desc" },
  });

  const repayments = await prisma.advanceRepayment.findMany({
    where: { employee: orgEmployeeFilter(organizationId) },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const outstandingBalance = requests
    .filter((r) => ACTIVE_STATUSES.has(r.status))
    .reduce((sum, r) => sum + (r.remainingBalance ?? r.amount), 0);
  const disbursedAllTime = requests
    .filter((r) => r.disbursedAt || ACTIVE_STATUSES.has(r.status) || r.status === "Completed")
    .reduce((sum, r) => sum + r.amount, 0);
  const recoveredAllTime = repayments.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
  const recoveredThisMonth = repayments
    .filter((r) => r.paidAt && r.paidAt >= monthStart)
    .reduce((sum, r) => sum + r.paidAmount, 0);
  const disbursedThisMonth = requests
    .filter((r) => r.disbursedAt && r.disbursedAt >= monthStart)
    .reduce((sum, r) => sum + r.amount, 0);
  const overduePayments = repayments.filter(
    (r) => r.status !== "Paid" && !r.paidAt && r.dueDate < now
  ).length;
  const recoveryDenom = recoveredAllTime + outstandingBalance;
  const recoveryRate =
    recoveryDenom > 0 ? Math.round((recoveredAllTime / recoveryDenom) * 100) : 100;

  const kpis = {
    totalEmployees: employees.length,
    eligibleEmployees: employees.filter((e) => e.eligibilityStatus === "Eligible" && e.allowAdvance).length,
    approvedAccessEmployees: employees.filter((e) => e.allowAdvance).length,
    blockedEmployees: employees.filter((e) => e.eligibilityStatus === "Blocked" || !e.allowAdvance).length,
    pendingRequests: requests.filter((r) => PENDING_STATUSES.has(r.status)).length,
    approvedRequests: requests.filter((r) => APPROVED_STATUSES.has(r.status)).length,
    rejectedRequests: requests.filter((r) => REJECTED_STATUSES.has(r.status)).length,
    activeAdvances: requests.filter((r) => ACTIVE_STATUSES.has(r.status) && (r.remainingBalance ?? r.amount) > 0).length,
    completedAdvances: requests.filter((r) => r.status === "Completed").length,
    cancelledRequests: requests.filter((r) => r.status === "Cancelled").length,
    outstandingBalance,
    disbursedThisMonth,
    recoveredThisMonth,
    disbursedAllTime,
    recoveredAllTime,
    remainingBalance: outstandingBalance,
    recoveryRate,
    payrollSuccessRate: recoveryRate,
    failedRecoveries: overduePayments,
    overduePayments,
    requestsToday: requests.filter((r) => r.createdAt >= dayStart).length,
    requestsThisWeek: requests.filter((r) => r.createdAt >= weekStart).length,
    requestsThisMonth: requests.filter((r) => r.createdAt >= monthStart).length,
    requestsLastMonth: requests.filter(
      (r) => r.createdAt >= lastMonthStart && r.createdAt <= lastMonthEnd
    ).length,
  };

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyRequests = monthLabels.map((label, idx) => ({
    label,
    value: requests.filter((r) => r.createdAt.getMonth() === idx && r.createdAt.getFullYear() === now.getFullYear()).length,
  }));

  const approvalRate = {
    approved: monthLabels.map((label, idx) => ({
      label,
      value: requests.filter(
        (r) => APPROVED_STATUSES.has(r.status) && r.createdAt.getMonth() === idx && r.createdAt.getFullYear() === now.getFullYear()
      ).length,
    })),
    rejected: monthLabels.map((label, idx) => ({
      label,
      value: requests.filter(
        (r) => REJECTED_STATUSES.has(r.status) && r.createdAt.getMonth() === idx && r.createdAt.getFullYear() === now.getFullYear()
      ).length,
    })),
  };

  const outstandingTrend = monthLabels.map((label, idx) => ({
    label,
    value: requests
      .filter((r) => ACTIVE_STATUSES.has(r.status) && r.createdAt.getMonth() <= idx)
      .reduce((sum, r) => sum + (r.remainingBalance ?? r.amount), 0),
  }));

  const deptMap = new Map<string, number>();
  for (const req of requests.filter((r) => ACTIVE_STATUSES.has(r.status))) {
    const dept = req.employee.department;
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
  }
  const colors = ["#fcb038", "#14b8a6", "#a78bfa", "#000435", "#f59e0b", "#ef4444"];
  const departmentUsage = [...deptMap.entries()].map(([label, value], i) => ({
    label,
    value,
    color: colors[i % colors.length],
  }));

  return {
    organizationName: tenant.organizationName,
    kpis,
    monthlyRequests,
    approvalRate,
    outstandingTrend,
    departmentUsage,
    hasHrIntegration: Boolean(env.HR_API_URL),
    hasPayrollIntegration: Boolean(env.PAYROLL_API_URL),
  };
}

const lastOrgPayrollSync = new Map<string, number>();

export async function listEmployees(organizationId: string, search?: string) {
  await ensureOrgData(organizationId);
  if (isPayrollConfigured()) {
    const last = lastOrgPayrollSync.get(organizationId) ?? 0;
    if (Date.now() - last > 60_000) {
      lastOrgPayrollSync.set(organizationId, Date.now());
      try {
        await syncOrganizationPayroll(organizationId);
      } catch (err) {
        console.warn("[kaziavance] payroll salary sync skipped", err);
      }
    }
  }
  const employees = await prisma.employee.findMany({
    where: {
      ...orgEmployeeFilter(organizationId),
      ...(search
        ? {
            OR: [
              { id: search },
              { iamUserId: search },
              { fullName: { contains: search } },
              { employeeCode: { contains: search } },
              { department: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      advances: { where: { status: { in: [...ACTIVE_STATUSES] } } },
      payrollRecords: { take: 1, orderBy: { payrollDate: "desc" } },
    },
    orderBy: { fullName: "asc" },
  });

  const policy = await getOrCreatePolicy(organizationId);
  return employees.map((employee) => mapEmployeeRow(employee, policy));
}

export type EmployeeLookupFilters = {
  q?: string;
  id?: string;
  employeeCode?: string;
  email?: string;
  iamUserId?: string;
  phone?: string;
};

/** Search staff by Kazi employee id, employee code, email, IAM user id, phone, or name. */
export async function lookupEmployees(organizationId: string, filters: EmployeeLookupFilters) {
  await ensureOrgData(organizationId);

  const id = filters.id?.trim();
  const employeeCode = filters.employeeCode?.trim();
  const email = filters.email?.trim();
  const iamUserId = filters.iamUserId?.trim();
  const phone = filters.phone?.trim();
  const q = filters.q?.trim();

  if (!id && !employeeCode && !email && !iamUserId && !phone && !q) {
    throw new AppError(400, "Provide at least one lookup parameter: q, id, employeeCode, email, iamUserId, or phone");
  }

  const orConditions: Record<string, unknown>[] = [];
  if (id) orConditions.push({ id });
  if (iamUserId) orConditions.push({ iamUserId });
  if (employeeCode) {
    orConditions.push({ employeeCode });
    orConditions.push({ employeeCode: { contains: employeeCode } });
  }
  if (email) {
    orConditions.push({ email: { equals: email, mode: "insensitive" } });
    orConditions.push({ email: { contains: email, mode: "insensitive" } });
  }
  if (phone) orConditions.push({ phone: { contains: phone } });
  if (q) {
    orConditions.push(
      { id: q },
      { iamUserId: q },
      { fullName: { contains: q } },
      { employeeCode: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { department: { contains: q } },
      { position: { contains: q } }
    );
  }

  const employees = await prisma.employee.findMany({
    where: {
      ...orgEmployeeFilter(organizationId),
      OR: orConditions,
    },
    include: {
      advances: { where: { status: { in: [...ACTIVE_STATUSES] } } },
      payrollRecords: { take: 1, orderBy: { payrollDate: "desc" } },
    },
    orderBy: { fullName: "asc" },
    take: 25,
  });

  const policy = await getOrCreatePolicy(organizationId);
  return employees.map((employee) => mapEmployeeRow(employee, policy));
}

/**
 * Set salary and enable TichaAvance eligibility in one step (used before teachers request advances).
 */
export async function setupEmployeeForAdvance(
  organizationId: string,
  employeeId: string,
  data: {
    grossSalary: number;
    netSalary?: number;
    allowances?: number;
    deductions?: number;
    allowAdvance?: boolean;
    eligibilityStatus?: string;
    maxAdvanceAmount?: number;
    maxSalaryPercent?: number;
    maxActiveAdvances?: number;
    repaymentPeriodMonths?: number;
    waitingPeriodDays?: number;
    requireDocuments?: boolean;
    reason?: string;
    effectiveDate?: string;
  }
) {
  const allowAdvance = data.allowAdvance ?? true;
  const eligibilityStatus = data.eligibilityStatus ?? (allowAdvance ? "Eligible" : "Blocked");

  await updateEmployeeSalary(organizationId, employeeId, {
    grossSalary: data.grossSalary,
    netSalary: data.netSalary,
    allowances: data.allowances,
    deductions: data.deductions,
    reason: data.reason ?? "Salary set for TichaAvance via API",
    effectiveDate: data.effectiveDate,
  });

  await updateEmployeeEligibility(organizationId, employeeId, {
    allowAdvance,
    eligibilityStatus,
    ...(data.maxAdvanceAmount != null ? { maxAdvanceAmount: data.maxAdvanceAmount } : {}),
    ...(data.maxSalaryPercent != null ? { maxSalaryPercent: data.maxSalaryPercent } : {}),
    ...(data.maxActiveAdvances != null ? { maxActiveAdvances: data.maxActiveAdvances } : {}),
    ...(data.repaymentPeriodMonths != null ? { repaymentPeriodMonths: data.repaymentPeriodMonths } : {}),
    ...(data.waitingPeriodDays != null ? { waitingPeriodDays: data.waitingPeriodDays } : {}),
    ...(data.requireDocuments != null ? { requireDocuments: data.requireDocuments } : {}),
  });

  const employee = await getEmployee(organizationId, employeeId);
  return {
    ...employee,
    readyForAdvanceRequest:
      employee.allowAdvance &&
      employee.advanceEligibility === "Eligible" &&
      employee.netSalary > 0,
    message:
      employee.netSalary > 0 && employee.allowAdvance
        ? "Employee can now request a salary advance in TichaPortal / TichaAvance."
        : "Employee updated — verify salary and eligibility before they request an advance.",
  };
}

export async function refreshStaffDirectory(organizationId: string) {
  await ensureTenant(organizationId);
  return syncStaffDirectory(organizationId);
}

export async function getEmployee(organizationId: string, employeeId: string) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...orgEmployeeFilter(organizationId) },
    include: { advances: true, payrollRecords: { take: 1, orderBy: { payrollDate: "desc" } } },
  });
  if (!employee) throw new AppError(404, "Employee not found");
  const policy = await getOrCreatePolicy(organizationId);
  return mapEmployeeRow(employee, policy);
}

export async function getEmployeeProfile(
  organizationId: string,
  employeeId: string,
  bearerToken?: string
) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...orgEmployeeFilter(organizationId) },
    include: { advances: { orderBy: { createdAt: "desc" } }, payrollRecords: { take: 3, orderBy: { payrollDate: "desc" } } },
  });
  if (!employee) throw new AppError(404, "Employee not found");

  let account: {
    iamUserId: string | null;
    email: string;
    status: string;
    lastLoginAt: string | null;
    modules: string[];
    hasLogin: boolean;
  } | null = null;

  if (bearerToken) {
    try {
      const iamUser =
        (employee.iamUserId
          ? (await findIamUserByEmail(bearerToken, employee.email))
          : await findIamUserByEmail(bearerToken, employee.email)) ?? null;

      if (iamUser) {
        if (!employee.iamUserId) {
          await prisma.employee.update({
            where: { id: employee.id },
            data: { iamUserId: iamUser.id },
          });
        }
        account = {
          iamUserId: iamUser.id,
          email: iamUser.email,
          status: iamUser.status,
          lastLoginAt: iamUser.lastLoginAt,
          modules: iamUser.modules.map((m) => m.slug),
          hasLogin: true,
        };
      }
    } catch {
      // IAM unreachable — profile still loads from local data
    }
  }

  if (!account) {
    account = {
      iamUserId: employee.iamUserId,
      email: employee.email,
      status: employee.iamUserId ? "ACTIVE" : "NO_ACCOUNT",
      lastLoginAt: employee.lastLoginAt?.toISOString() ?? null,
      modules: employee.iamUserId ? [env.MODULE_SLUG] : [],
      hasLogin: Boolean(employee.iamUserId),
    };
  }

  const policy = await getOrCreatePolicy(organizationId);

  return {
    employee: mapEmployeeRow(employee, policy),
    account,
    advances: employee.advances.map((a) => ({
      id: a.id,
      requestNumber: a.requestNumber,
      amount: a.amount,
      status: a.status,
      purpose: a.purpose,
      requestDate: a.createdAt.toISOString().slice(0, 10),
      remainingBalance: a.remainingBalance,
    })),
    payrollRecords: employee.payrollRecords.map((p) => ({
      monthLabel: p.monthLabel,
      netSalary: p.netSalary,
      grossSalary: p.grossSalary,
      deductions: p.deductions,
      allowances: p.allowances,
      source: p.source,
      status: p.status,
      payrollDate: p.payrollDate.toISOString(),
      reason: p.reason,
    })),
    hasHrIntegration: Boolean(env.HR_API_URL),
    hasPayrollIntegration: isPayrollConfigured(),
  };
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "Employee";
  const lastName = parts.slice(1).join(" ") || firstName;
  return { firstName, lastName };
}

export async function createEmployeeLogin(
  organizationId: string,
  employeeId: string,
  bearerToken: string,
  options?: { password?: string; sendCredentialsEmail?: boolean }
) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...orgEmployeeFilter(organizationId) },
  });
  if (!employee) throw new AppError(404, "Employee not found");

  const existing = await findIamUserByEmail(bearerToken, employee.email);
  if (existing) {
    await prisma.employee.update({
      where: { id: employee.id },
      data: { iamUserId: existing.id },
    });
    return {
      iamUserId: existing.id,
      email: existing.email,
      message: "Login already exists for this employee.",
      tempPassword: null as string | null,
    };
  }

  const { firstName, lastName } = splitName(employee.fullName);
  const created = await createIamUser(bearerToken, {
    email: employee.email,
    firstName,
    lastName,
    department: employee.department,
    position: employee.position,
    employeeId: employee.employeeCode,
    password: options?.password,
    sendCredentialsEmail: options?.sendCredentialsEmail ?? true,
  });

  await prisma.employee.update({
    where: { id: employee.id },
    data: { iamUserId: created.id },
  });

  return {
    iamUserId: created.id,
    email: created.email,
    tempPassword: created.tempPassword ?? null,
    message: "Employee login created successfully.",
  };
}

export async function resetEmployeeLogin(
  organizationId: string,
  employeeId: string,
  bearerToken: string,
  options?: { password?: string; sendEmail?: boolean }
) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...orgEmployeeFilter(organizationId) },
  });
  if (!employee) throw new AppError(404, "Employee not found");

  const iamUserId =
    employee.iamUserId ?? (await findIamUserByEmail(bearerToken, employee.email))?.id;
  if (!iamUserId) throw new AppError(400, "Employee does not have a login account yet.");

  const result = await resetIamPassword(bearerToken, iamUserId, {
    password: options?.password,
    sendEmail: options?.sendEmail ?? true,
  });

  return {
    iamUserId,
    tempPassword: result.tempPassword,
    emailSent: result.emailSent,
    message: "Password reset successfully.",
  };
}

export async function disableEmployeeLogin(
  organizationId: string,
  employeeId: string,
  bearerToken: string
) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...orgEmployeeFilter(organizationId) },
  });
  if (!employee) throw new AppError(404, "Employee not found");

  const iamUserId =
    employee.iamUserId ?? (await findIamUserByEmail(bearerToken, employee.email))?.id;
  if (!iamUserId) throw new AppError(400, "Employee does not have a login account.");

  await updateIamUserStatus(bearerToken, iamUserId, "INACTIVE");
  return { message: "Employee login disabled.", iamUserId };
}

export async function enableEmployeeLogin(
  organizationId: string,
  employeeId: string,
  bearerToken: string
) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...orgEmployeeFilter(organizationId) },
  });
  if (!employee) throw new AppError(404, "Employee not found");

  const iamUserId =
    employee.iamUserId ?? (await findIamUserByEmail(bearerToken, employee.email))?.id;
  if (!iamUserId) throw new AppError(400, "Employee does not have a login account.");

  await updateIamUserStatus(bearerToken, iamUserId, "ACTIVE");
  return { message: "Employee login enabled.", iamUserId };
}

export async function updateEmployeeEligibility(
  organizationId: string,
  employeeId: string,
  data: Partial<{
    eligibilityStatus: string;
    allowAdvance: boolean;
    maxAdvanceAmount: number;
    maxSalaryPercent: number;
    maxActiveAdvances: number;
    repaymentPeriodMonths: number;
    waitingPeriodDays: number;
    requireDocuments: boolean;
  }>
) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...orgEmployeeFilter(organizationId) },
  });
  if (!employee) throw new AppError(404, "Employee not found");

  await prisma.employee.update({
    where: { id: employeeId },
    data,
  });
  return getEmployee(organizationId, employeeId);
}

export async function updateEmployeeProfile(
  organizationId: string,
  employeeId: string,
  data: Partial<{
    fullName: string;
    department: string;
    position: string;
    phone: string | null;
    employmentStatus: string;
    hireDate: string | null;
  }>
) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...orgEmployeeFilter(organizationId) },
  });
  if (!employee) throw new AppError(404, "Employee not found");

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      ...(data.fullName !== undefined ? { fullName: data.fullName.trim() } : {}),
      ...(data.department !== undefined ? { department: data.department.trim() } : {}),
      ...(data.position !== undefined ? { position: data.position.trim() } : {}),
      ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
      ...(data.employmentStatus !== undefined ? { employmentStatus: data.employmentStatus } : {}),
      ...(data.hireDate !== undefined
        ? { hireDate: data.hireDate ? new Date(data.hireDate) : null }
        : {}),
    },
  });
  return getEmployee(organizationId, employeeId);
}

export async function updateEmployeeSalary(
  organizationId: string,
  employeeId: string,
  data: {
    grossSalary: number;
    allowances?: number;
    deductions?: number;
    netSalary?: number;
    effectiveDate?: string;
    reason?: string;
  }
) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...orgEmployeeFilter(organizationId) },
  });
  if (!employee) throw new AppError(404, "Employee not found");

  const grossSalary = Math.round(Number(data.grossSalary ?? 0));
  const allowances = Math.round(Number(data.allowances ?? 0));
  const deductions = Math.round(Number(data.deductions ?? 0));
  const computedNet = grossSalary + allowances - deductions;
  const netSalary = Math.round(Number(data.netSalary ?? computedNet));
  if (grossSalary <= 0) throw new AppError(400, "Monthly/Gross salary is required");
  if (netSalary <= 0) {
    throw new AppError(400, "Net salary must be greater than zero after verification");
  }

  const effective = data.effectiveDate ? new Date(data.effectiveDate) : new Date();
  const reason = data.reason?.trim() || "Manual salary update in KaziAvance";

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      grossSalary,
      allowances,
      deductions,
      taxAmount: deductions,
      netSalary,
      salarySource: "kaziavance",
      salaryUpdatedAt: effective,
      salaryUpdateReason: reason,
    },
  });

  const monthLabel = effective.toLocaleString("en-US", { month: "short", year: "numeric" });
  await prisma.payrollRecord.create({
    data: {
      employeeId,
      monthLabel,
      grossSalary,
      taxAmount: deductions,
      deductions,
      allowances,
      netSalary,
      payrollDate: effective,
      source: "kaziavance",
      status: "Verified",
      reason,
    },
  });

  return getEmployee(organizationId, employeeId);
}

export async function fetchEmployeeSalaryFromPayroll(
  organizationId: string,
  employeeId: string,
  bearerToken?: string
) {
  if (!isPayrollConfigured()) {
    throw new AppError(400, "Payroll is not enabled for this organization");
  }
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...orgEmployeeFilter(organizationId) },
  });
  if (!employee) throw new AppError(404, "Employee not found");

  const synced = await syncEmployeePayroll(employee.id, employee.employeeCode, {
    organizationId,
    email: employee.email,
    phone: employee.phone,
    bearerToken,
  });
  if (!synced || synced.netSalary <= 0) {
    throw new AppError(
      404,
      "No approved payroll salary was found for this employee. Set salary manually or confirm they exist in Payroll."
    );
  }
  return getEmployee(organizationId, employeeId);
}

export async function refreshOrgPayrollSalaries(organizationId: string, bearerToken?: string) {
  if (!isPayrollConfigured()) {
    throw new AppError(400, "Payroll is not enabled for this organization");
  }
  return syncOrganizationPayroll(organizationId, bearerToken);
}

function purposeTypeOf(purpose: string) {
  if (purpose.toLowerCase().startsWith("others")) return "Other";
  return purpose.split(":")[0]?.trim() || purpose;
}

function relativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export async function listRequests(organizationId: string, status?: string) {
  const policy = await getOrCreatePolicy(organizationId);
  const requests = await prisma.advanceRequest.findMany({
    where: {
      employee: orgEmployeeFilter(organizationId),
      ...(status && status !== "All" ? { status } : {}),
    },
    include: { employee: true },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) => ({
    id: r.id,
    requestNumber: r.requestNumber,
    employeeName: r.employee.fullName,
    employeeCode: r.employee.employeeCode,
    employeePhone: r.employee.phone ?? null,
    department: r.employee.department,
    position: r.employee.position,
    amount: r.amount,
    repaymentMonths: r.repaymentMonths,
    purpose: r.purpose,
    purposeType: purposeTypeOf(r.purpose),
    description: r.description ?? null,
    signatureFile: r.signatureFile ?? null,
    signatureName: r.signature ?? null,
    requestDate: r.createdAt.toISOString().slice(0, 10),
    createdAt: r.createdAt.toISOString(),
    netSalary: r.employee.netSalary,
    availableLimit: availableLimit(r.employee, policy),
    monthlyDeduction: r.monthlyDeduction,
    remainingBalance: r.remainingBalance,
    status: r.status,
    reviewComment: r.reviewComment,
    approvedAt: r.approvedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
    disbursedAt: r.disbursedAt?.toISOString() ?? null,
  }));
}

export async function getRequestsWorkspace(organizationId: string) {
  const policy = await getOrCreatePolicy(organizationId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const requests = await prisma.advanceRequest.findMany({
    where: { employee: orgEmployeeFilter(organizationId) },
    include: {
      employee: true,
      repayments: { orderBy: { installmentNumber: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = requests.filter((r) => PENDING_STATUSES.has(r.status));
  const approved = requests.filter((r) => r.status === "Approved");
  const active = requests.filter(
    (r) => ACTIVE_STATUSES.has(r.status) && (r.remainingBalance ?? r.amount) > 0
  );
  const completed = requests.filter((r) => r.status === "Completed");
  const rejected = requests.filter((r) => REJECTED_STATUSES.has(r.status));
  const cancelled = requests.filter((r) => r.status === "Cancelled");
  const thisMonth = requests.filter((r) => r.createdAt >= monthStart);

  const overdueRecoveries = requests.filter((r) =>
    ACTIVE_STATUSES.has(r.status) &&
    r.repayments.some((p) => p.status !== "Paid" && !p.paidAt && p.dueDate < now)
  );

  const decided = requests.filter(
    (r) => APPROVED_STATUSES.has(r.status) || REJECTED_STATUSES.has(r.status)
  );
  const approvalRate =
    decided.length > 0
      ? Math.round((requests.filter((r) => APPROVED_STATUSES.has(r.status)).length / decided.length) * 100)
      : 100;

  const recovered = requests.reduce(
    (s, r) => s + r.repayments.reduce((a, p) => a + (p.paidAmount || 0), 0),
    0
  );
  const outstanding = active.reduce((s, r) => s + (r.remainingBalance ?? r.amount), 0);
  const recoveryDenom = recovered + outstanding;
  const recoveryRate =
    recoveryDenom > 0 ? Math.round((recovered / recoveryDenom) * 100) : 100;
  const averageAmount =
    requests.length > 0
      ? Math.round(requests.reduce((s, r) => s + r.amount, 0) / requests.length)
      : 0;

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyRequests = monthLabels.map((label, idx) => ({
    label,
    value: requests.filter(
      (r) => r.createdAt.getMonth() === idx && r.createdAt.getFullYear() === now.getFullYear()
    ).length,
  }));

  const activities: { id: string; text: string; at: string; relative: string }[] = [];
  for (const r of requests.slice(0, 40)) {
    activities.push({
      id: `${r.id}-created`,
      text: `${r.employee.fullName} requested ${r.amount.toLocaleString()} RWF`,
      at: r.createdAt.toISOString(),
      relative: relativeTime(r.createdAt),
    });
    if (r.approvedAt) {
      activities.push({
        id: `${r.id}-approved`,
        text: `Finance approved ${r.employee.fullName}'s request`,
        at: r.approvedAt.toISOString(),
        relative: relativeTime(r.approvedAt),
      });
    }
    if (r.rejectedAt) {
      activities.push({
        id: `${r.id}-rejected`,
        text: `Request rejected for ${r.employee.fullName}`,
        at: r.rejectedAt.toISOString(),
        relative: relativeTime(r.rejectedAt),
      });
    }
    if (r.disbursedAt) {
      activities.push({
        id: `${r.id}-disbursed`,
        text: `Disbursed ${r.amount.toLocaleString()} RWF to ${r.employee.fullName}`,
        at: r.disbursedAt.toISOString(),
        relative: relativeTime(r.disbursedAt),
      });
    }
    for (const p of r.repayments.filter((x) => x.paidAt).slice(-1)) {
      activities.push({
        id: `${p.id}-paid`,
        text: `Payroll deducted ${p.paidAmount.toLocaleString()} RWF from ${r.employee.fullName}`,
        at: p.paidAt!.toISOString(),
        relative: relativeTime(p.paidAt!),
      });
    }
  }
  activities.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const upcomingRecoveries = active
    .map((r) => {
      const next = r.repayments.find((p) => p.status !== "Paid" && !p.paidAt);
      if (!next) return null;
      return {
        id: r.id,
        employeeName: r.employee.fullName,
        amount: next.amount,
        dueDate: next.dueDate.toISOString().slice(0, 10),
        requestNumber: r.requestNumber,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a!.dueDate < b!.dueDate ? -1 : 1))
    .slice(0, 6);

  const nearCompletion = active
    .filter((r) => {
      const rem = r.remainingBalance ?? r.amount;
      return rem > 0 && rem <= (r.monthlyDeduction ?? rem) * 1.5;
    })
    .map((r) => ({
      id: r.id,
      employeeName: r.employee.fullName,
      remainingBalance: r.remainingBalance ?? r.amount,
      requestNumber: r.requestNumber,
    }))
    .slice(0, 6);

  const overdueList = overdueRecoveries.slice(0, 6).map((r) => ({
    id: r.id,
    employeeName: r.employee.fullName,
    remainingBalance: r.remainingBalance ?? r.amount,
    requestNumber: r.requestNumber,
  }));

  const data = requests.map((r) => ({
    id: r.id,
    requestNumber: r.requestNumber,
    employeeName: r.employee.fullName,
    employeeCode: r.employee.employeeCode,
    employeePhone: r.employee.phone ?? null,
    employeeEmail: r.employee.email ?? null,
    department: r.employee.department,
    position: r.employee.position,
    amount: r.amount,
    repaymentMonths: r.repaymentMonths,
    purpose: r.purpose,
    purposeType: purposeTypeOf(r.purpose),
    description: r.description ?? null,
    signatureFile: r.signatureFile ?? null,
    signatureName: r.signature ?? null,
    requestDate: r.createdAt.toISOString().slice(0, 10),
    createdAt: r.createdAt.toISOString(),
    netSalary: r.employee.netSalary,
    availableLimit: availableLimit(r.employee, policy),
    monthlyDeduction: r.monthlyDeduction,
    remainingBalance: r.remainingBalance,
    status: r.status,
    reviewComment: r.reviewComment,
    approvedAt: r.approvedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
    disbursedAt: r.disbursedAt?.toISOString() ?? null,
  }));

  const departments = [...new Set(requests.map((r) => r.employee.department).filter(Boolean))].sort();
  const purposeTypes = [...new Set(data.map((r) => r.purposeType))].sort();

  return {
    summary: {
      total: requests.length,
      pending: pending.length,
      approved: approved.length,
      active: active.length,
      rejected: rejected.length,
      cancelled: cancelled.length,
      completed: completed.length,
      thisMonth: thisMonth.length,
      overdue: overdueRecoveries.length,
      approvalRate,
      recoveryRate,
      averageAmount,
    },
    monthlyRequests,
    activities: activities.slice(0, 12),
    upcomingRecoveries,
    nearCompletion,
    overdueList,
    departments,
    purposeTypes,
    data,
  };
}

export async function createManualRequest(
  organizationId: string,
  input: {
    employeeId: string;
    amount: number;
    months: number;
    purpose: string;
    description?: string;
  }
) {
  const employee = await prisma.employee.findFirst({
    where: { id: input.employeeId, ...orgEmployeeFilter(organizationId) },
  });
  if (!employee) throw new AppError(404, "Employee not found");
  if (!input.amount || !input.months || !input.purpose?.trim()) {
    throw new AppError(400, "amount, months and purpose are required");
  }

  const requestNumber = `ADV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  return prisma.advanceRequest.create({
    data: {
      requestNumber,
      employeeId: employee.id,
      amount: Math.round(input.amount),
      repaymentMonths: Math.round(input.months),
      purpose: input.purpose.trim(),
      description: input.description?.trim() || null,
      status: "Pending",
    },
  });
}

export async function getRequestDetail(organizationId: string, requestId: string) {
  const policy = await getOrCreatePolicy(organizationId);
  const r = await prisma.advanceRequest.findFirst({
    where: { id: requestId, employee: orgEmployeeFilter(organizationId) },
    include: { employee: true },
  });
  if (!r) throw new AppError(404, "Request not found");

  const monthly =
    r.monthlyDeduction ??
    Math.round((r.amount + Math.round(r.amount * 0.025) + Math.round(r.amount * 0.01)) / Math.max(1, r.repaymentMonths));

  const timeline = [
    { step: "Submitted", date: r.createdAt.toISOString(), done: true },
    {
      step: "HR Verified",
      date: (r.approvedAt ?? r.rejectedAt ?? r.createdAt).toISOString(),
      done: Boolean(r.approvedAt || r.rejectedAt || r.disbursedAt),
    },
    {
      step: "Approved",
      date: r.approvedAt?.toISOString() ?? null,
      done: Boolean(r.approvedAt || r.disbursedAt),
    },
    {
      step: "Finance Approved",
      date: r.approvedAt?.toISOString() ?? null,
      done: Boolean(r.approvedAt || r.disbursedAt),
    },
    {
      step: "Disbursed Successfully",
      date: r.disbursedAt?.toISOString() ?? null,
      done: Boolean(r.disbursedAt),
    },
    {
      step: "Completed",
      date: r.status === "Completed" ? r.updatedAt.toISOString() : null,
      done: r.status === "Completed",
    },
  ];

  return {
    id: r.id,
    requestNumber: r.requestNumber,
    employeeName: r.employee.fullName,
    employeeCode: r.employee.employeeCode,
    employeePhone: r.employee.phone ?? null,
    employeeEmail: r.employee.email ?? null,
    department: r.employee.department,
    position: r.employee.position,
    amount: r.amount,
    repaymentMonths: r.repaymentMonths,
    purpose: r.purpose,
    purposeType: purposeTypeOf(r.purpose),
    description: r.description ?? null,
    signatureFile: r.signatureFile ?? null,
    signatureName: r.signature ?? null,
    signatureMimeType: r.signatureMimeType ?? null,
    requestDate: r.createdAt.toISOString().slice(0, 10),
    createdAt: r.createdAt.toISOString(),
    netSalary: r.employee.netSalary,
    availableLimit: availableLimit(r.employee, policy),
    monthlyDeduction: monthly,
    remainingBalance: r.remainingBalance,
    status: r.status,
    reviewComment: r.reviewComment,
    approvedAt: r.approvedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
    disbursedAt: r.disbursedAt?.toISOString() ?? null,
    timeline,
  };
}

export async function getRequestForReceipt(organizationId: string, requestId: string) {
  const request = await prisma.advanceRequest.findFirst({
    where: { id: requestId, employee: orgEmployeeFilter(organizationId) },
    include: {
      employee: true,
      repayments: { orderBy: { installmentNumber: "asc" } },
    },
  });
  if (!request) throw new AppError(404, "Request not found");
  return request;
}

export async function updateRequest(
  organizationId: string,
  requestId: string,
  action: "approve" | "reject" | "review" | "disburse",
  payload: { amount?: number; comment?: string }
) {
  const request = await prisma.advanceRequest.findFirst({
    where: { id: requestId, employee: orgEmployeeFilter(organizationId) },
    include: { employee: true },
  });
  if (!request) throw new AppError(404, "Request not found");

  const now = new Date();
  const amount = payload.amount ?? request.amount;
  const monthlyDeduction = calcMonthlyDeduction(amount, request.repaymentMonths);

  if (action === "approve") {
    const updated = await prisma.advanceRequest.update({
      where: { id: requestId },
      data: {
        status: "Approved",
        amount,
        approvedAt: now,
        remainingBalance: amount,
        monthlyDeduction,
        reviewComment: payload.comment,
      },
    });
    await createRepaymentSchedule(updated.id, request.employeeId, amount, request.repaymentMonths, monthlyDeduction);
    notifyEmployeeSafe(request.employeeId, {
      title: "Advance approved",
      body: `${updated.requestNumber} for ${amount.toLocaleString()} Frw was approved.`,
      tag: `avance-${updated.id}-approved`,
      url: "/repayment-schedule",
    });
    return updated;
  }

  if (action === "reject") {
    const rejected = await prisma.advanceRequest.update({
      where: { id: requestId },
      data: { status: "Rejected", rejectedAt: now, reviewComment: payload.comment },
    });
    notifyEmployeeSafe(request.employeeId, {
      title: "Advance rejected",
      body: payload.comment
        ? `${rejected.requestNumber} was not approved. ${payload.comment}`
        : `${rejected.requestNumber} was not approved.`,
      tag: `avance-${rejected.id}-rejected`,
      url: "/repayment-schedule",
    });
    return rejected;
  }

  if (action === "review") {
    return prisma.advanceRequest.update({
      where: { id: requestId },
      data: { status: "Under Review", reviewComment: payload.comment },
    });
  }

  if (action === "disburse") {
    const disbursed = await prisma.advanceRequest.update({
      where: { id: requestId },
      data: { status: "Disbursed", disbursedAt: now, remainingBalance: amount, monthlyDeduction },
    });
    notifyEmployeeSafe(request.employeeId, {
      title: "Advance disbursed",
      body: `${disbursed.requestNumber} of ${amount.toLocaleString()} Frw has been disbursed.`,
      tag: `avance-${disbursed.id}-disbursed`,
      url: "/repayment-schedule",
    });
    return disbursed;
  }

  throw new AppError(400, "Invalid action");
}

async function createRepaymentSchedule(
  advanceRequestId: string,
  employeeId: string,
  amount: number,
  months: number,
  monthlyDeduction: number
) {
  const rows = [];
  const start = new Date();
  start.setMonth(start.getMonth() + 1);

  for (let i = 0; i < months; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);
    const installmentAmount = i === months - 1 ? amount - monthlyDeduction * (months - 1) : monthlyDeduction;
    rows.push({
      advanceRequestId,
      employeeId,
      installmentNumber: i + 1,
      amount: installmentAmount,
      dueDate,
      status: "Pending",
    });
  }

  await prisma.advanceRepayment.createMany({ data: rows });
}

export async function listActiveAdvances(organizationId: string) {
  const requests = await prisma.advanceRequest.findMany({
    where: {
      employee: orgEmployeeFilter(organizationId),
      status: { in: [...ACTIVE_STATUSES] },
      OR: [{ remainingBalance: { gt: 0 } }, { remainingBalance: null }],
    },
    include: { employee: true },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) => {
    const approved = r.amount;
    const remaining = r.remainingBalance ?? r.amount;
    const progressPercent = approved > 0 ? Math.round(((approved - remaining) / approved) * 100) : 0;
    const startDate = (r.approvedAt ?? r.createdAt).toISOString().slice(0, 10);
    const end = new Date(r.approvedAt ?? r.createdAt);
    end.setMonth(end.getMonth() + r.repaymentMonths);

    return {
      id: r.id,
      employeeName: r.employee.fullName,
      employeeCode: r.employee.employeeCode,
      approvedAmount: approved,
      remainingBalance: remaining,
      monthlyDeduction: r.monthlyDeduction ?? calcMonthlyDeduction(r.amount, r.repaymentMonths),
      startDate,
      endDate: end.toISOString().slice(0, 10),
      progressPercent,
      requestNumber: r.requestNumber,
    };
  });
}

function mapRepaymentStatus(
  remainingAmount: number,
  repayments: { status: string; paidAt: Date | null; dueDate: Date; paidAmount: number }[],
  now: Date
) {
  if (remainingAmount <= 0) return "Completed";
  const overdue = repayments.some(
    (r) =>
      (r.status !== "Paid" && !r.paidAt && r.dueDate < now) || r.status === "Overdue"
  );
  if (overdue) return "Overdue";
  const hasPaid = repayments.some((r) => r.status === "Paid" || r.paidAt || r.paidAmount > 0);
  const next = repayments.find((r) => r.status !== "Paid" && !r.paidAt);
  if (!hasPaid && next && next.dueDate > now) return "Upcoming";
  if (hasPaid && remainingAmount > 0) return "Active";
  return "Active";
}

export async function listRepayments(organizationId: string) {
  const workspace = await getRepaymentsWorkspace(organizationId);
  return workspace.data;
}

export async function getRepaymentsWorkspace(organizationId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const advances = await prisma.advanceRequest.findMany({
    where: {
      employee: orgEmployeeFilter(organizationId),
      status: { in: [...ACTIVE_STATUSES, "Completed", "Approved"] },
    },
    include: {
      employee: true,
      repayments: { orderBy: { installmentNumber: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = advances.map((adv) => {
    const paidAmount = adv.repayments.reduce((s, r) => s + (r.paidAmount || 0), 0);
    const remainingAmount = Math.max(0, adv.remainingBalance ?? adv.amount - paidAmount);
    const next = adv.repayments.find((r) => r.status !== "Paid" && !r.paidAt);
    const monthly =
      adv.monthlyDeduction ??
      next?.amount ??
      calcMonthlyDeduction(adv.amount, adv.repaymentMonths);
    const status = mapRepaymentStatus(remainingAmount, adv.repayments, now);
    const progressPercent =
      adv.amount > 0 ? Math.min(100, Math.round((paidAmount / adv.amount) * 100)) : status === "Completed" ? 100 : 0;
    const purposeType = purposeTypeOf(adv.purpose);

    const schedule = adv.repayments.map((r) => ({
      installmentNumber: r.installmentNumber,
      amount: r.amount,
      dueDate: r.dueDate.toISOString(),
      status:
        r.status === "Paid" || r.paidAt || r.paidAmount >= r.amount
          ? "Completed"
          : r.dueDate < now
            ? "Overdue"
            : "Upcoming",
      monthLabel: r.dueDate.toLocaleString("en-US", { month: "long", year: "numeric" }),
      paidAmount: r.paidAmount,
    }));

    return {
      id: adv.id,
      requestNumber: adv.requestNumber,
      employeeName: adv.employee.fullName,
      employeeCode: adv.employee.employeeCode,
      department: adv.employee.department,
      purpose: adv.purpose,
      purposeType,
      advanceAmount: adv.amount,
      paidAmount,
      remainingAmount,
      monthlyDeduction: monthly,
      installmentAmount: next?.amount ?? monthly,
      nextDeductionDate: next?.dueDate.toISOString().slice(0, 10) ?? (status === "Completed" ? "Completed" : "—"),
      status,
      progressPercent,
      paymentMethod: paidAmount > 0 ? "Payroll Deducted" : "Pending",
      schedule,
    };
  });

  const active = data.filter((r) => r.status === "Active" || r.status === "Upcoming" || r.status === "Overdue");
  const completed = data.filter((r) => r.status === "Completed");
  const overdue = data.filter((r) => r.status === "Overdue");
  const upcoming = data.filter((r) => {
    if (r.status === "Completed") return false;
    if (r.nextDeductionDate === "—" || r.nextDeductionDate === "Completed") return false;
    const due = new Date(r.nextDeductionDate);
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);
    return due >= now && due <= in30;
  });

  const outstandingBalance = active.reduce((s, r) => s + r.remainingAmount, 0);
  const recoveredThisMonth = advances.reduce((sum, adv) => {
    return (
      sum +
      adv.repayments
        .filter((r) => r.paidAt && r.paidAt >= monthStart)
        .reduce((a, r) => a + (r.paidAmount || 0), 0)
    );
  }, 0);
  const recoveredAll = data.reduce((s, r) => s + r.paidAmount, 0);
  const recoveryDenom = recoveredAll + outstandingBalance;
  const recoveryRate = recoveryDenom > 0 ? Math.round((recoveredAll / recoveryDenom) * 100) : 100;

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyRecovery = monthLabels.map((label, idx) => ({
    label,
    value: advances.reduce((sum, adv) => {
      return (
        sum +
        adv.repayments
          .filter(
            (r) =>
              r.paidAt &&
              r.paidAt.getMonth() === idx &&
              r.paidAt.getFullYear() === now.getFullYear()
          )
          .reduce((a, r) => a + (r.paidAmount || 0), 0)
      );
    }, 0),
  }));

  const deptMap = new Map<string, number>();
  for (const row of active) {
    const dept = row.department || "Other";
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + row.remainingAmount);
  }
  const colors = ["#fcb038", "#14b8a6", "#a78bfa", "#000435", "#f59e0b", "#ef4444"];
  const departmentOutstanding = [...deptMap.entries()].map(([label, value], i) => ({
    label,
    value,
    color: colors[i % colors.length],
  }));

  const activities: { id: string; text: string; amount?: number; relative: string; at: string }[] = [];
  for (const adv of advances) {
    for (const r of adv.repayments.filter((p) => p.paidAt)) {
      activities.push({
        id: `${r.id}-paid`,
        text: `Payroll deducted from ${adv.employee.fullName}`,
        amount: r.paidAmount,
        at: r.paidAt!.toISOString(),
        relative: relativeTime(r.paidAt!),
      });
    }
    if (adv.status === "Completed") {
      activities.push({
        id: `${adv.id}-done`,
        text: `Repayment completed · ${adv.employee.fullName}`,
        at: adv.updatedAt.toISOString(),
        relative: relativeTime(adv.updatedAt),
      });
    }
  }
  for (const row of overdue.slice(0, 5)) {
    activities.push({
      id: `${row.id}-overdue`,
      text: `Overdue recovery · ${row.employeeName}`,
      amount: row.remainingAmount,
      at: now.toISOString(),
      relative: "Needs attention",
    });
  }
  activities.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const upcomingList = upcoming
    .slice()
    .sort((a, b) => a.nextDeductionDate.localeCompare(b.nextDeductionDate))
    .slice(0, 8)
    .map((r) => ({
      id: r.id,
      employeeName: r.employeeName,
      amount: r.installmentAmount,
      dueDate: r.nextDeductionDate,
      requestNumber: r.requestNumber,
    }));

  const failedList = overdue.slice(0, 8).map((r) => ({
    id: r.id,
    employeeName: r.employeeName,
    reason: "Payroll deduction missed / overdue",
    remainingAmount: r.remainingAmount,
    requestNumber: r.requestNumber,
  }));

  const departments = [...new Set(data.map((r) => r.department).filter(Boolean))].sort() as string[];
  const purposeTypes = [...new Set(data.map((r) => r.purposeType))].sort();

  return {
    summary: {
      totalActive: active.length,
      outstandingBalance,
      recoveredThisMonth,
      upcomingCount: upcoming.length,
      overdueCount: overdue.length,
      recoveryRate,
      completedCount: completed.length,
      payrollRecoveries: data.filter((r) => r.paidAmount > 0).length,
      manualRecoveries: 0,
      failedRecoveries: overdue.length,
    },
    monthlyRecovery,
    departmentOutstanding,
    activities: activities.slice(0, 12),
    upcomingList,
    failedList,
    departments,
    purposeTypes,
    data,
  };
}

export async function getPolicies(organizationId: string) {
  return getOrCreatePolicy(organizationId);
}

export async function updatePolicies(organizationId: string, data: Partial<OrgPolicy>) {
  await getOrCreatePolicy(organizationId);
  return prisma.orgPolicy.update({
    where: { organizationId },
    data: {
      maxAdvancePercent: data.maxAdvancePercent,
      defaultRepaymentPeriod: data.defaultRepaymentPeriod,
      minEmploymentMonths: data.minEmploymentMonths,
      waitingPeriodDays: data.waitingPeriodDays,
      maxActiveAdvances: data.maxActiveAdvances,
      autoApprove: data.autoApprove,
      requireManagerApproval: data.requireManagerApproval,
      requireFinanceApproval: data.requireFinanceApproval,
      requireDocuments: data.requireDocuments,
    },
  });
}

function auditCategory(action: string) {
  const a = action.toLowerCase();
  if (a.includes("reject") || a.includes("block") || a.includes("disable")) return "danger";
  if (a.includes("approv") || a.includes("disburse") || a.includes("enable") || a.includes("create"))
    return "success";
  if (a.includes("policy") || a.includes("eligib") || a.includes("reset") || a.includes("login"))
    return "warning";
  return "info";
}

export async function listAuditLogs(
  organizationId: string,
  filters?: { search?: string; action?: string; user?: string }
) {
  const search = filters?.search?.trim();
  const action = filters?.action?.trim();
  const user = filters?.user?.trim();

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      ...(action ? { action: { contains: action } } : {}),
      ...(user ? { userEmail: { contains: user } } : {}),
      ...(search
        ? {
            OR: [
              { userEmail: { contains: search } },
              { action: { contains: search } },
              { target: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return logs.map((l) => ({
    id: l.id,
    user: l.userEmail,
    action: l.action,
    target: l.target,
    category: auditCategory(l.action) as "info" | "warning" | "success" | "danger",
    timestamp: l.createdAt.toISOString().replace("T", " ").slice(0, 16),
    createdAt: l.createdAt.toISOString(),
  }));
}

export async function getAuditWorkspace(organizationId: string) {
  const logs = await listAuditLogs(organizationId);
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const today = logs.filter((l) => new Date(l.createdAt) >= dayStart).length;
  const thisWeek = logs.filter((l) => new Date(l.createdAt) >= weekStart).length;
  const users = [...new Set(logs.map((l) => l.user))].sort();
  const actions = [...new Set(logs.map((l) => l.action))].sort();

  const actionCounts = new Map<string, number>();
  for (const l of logs) actionCounts.set(l.action, (actionCounts.get(l.action) ?? 0) + 1);
  const topActions = [...actionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  const daily = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(dayStart);
    d.setDate(d.getDate() - (13 - i));
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const value = logs.filter((l) => {
      const t = new Date(l.createdAt);
      return (
        t.getFullYear() === d.getFullYear() &&
        t.getMonth() === d.getMonth() &&
        t.getDate() === d.getDate()
      );
    }).length;
    return { label, value };
  });

  return {
    summary: {
      total: logs.length,
      today,
      thisWeek,
      uniqueUsers: users.length,
      approvals: logs.filter((l) => l.action.toLowerCase().includes("approv")).length,
      policyChanges: logs.filter((l) => l.action.toLowerCase().includes("policy")).length,
    },
    topActions,
    daily,
    users,
    actions,
    data: logs,
  };
}

export async function listNotifications(organizationId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [pending, overdue, approvedThisMonth, rejectedThisMonth, activeAdvances, recentLogs, employeesBlocked] =
    await Promise.all([
      prisma.advanceRequest.count({
        where: { employee: orgEmployeeFilter(organizationId), status: { in: [...PENDING_STATUSES] } },
      }),
      prisma.advanceRepayment.count({
        where: {
          employee: orgEmployeeFilter(organizationId),
          status: { in: ["Overdue", "Pending"] },
          dueDate: { lt: now },
          paidAt: null,
        },
      }),
      prisma.advanceRequest.count({
        where: {
          employee: orgEmployeeFilter(organizationId),
          status: { in: [...APPROVED_STATUSES] },
          approvedAt: { gte: monthStart },
        },
      }),
      prisma.advanceRequest.count({
        where: {
          employee: orgEmployeeFilter(organizationId),
          status: "Rejected",
          rejectedAt: { gte: monthStart },
        },
      }),
      prisma.advanceRequest.count({
        where: {
          employee: orgEmployeeFilter(organizationId),
          status: { in: [...ACTIVE_STATUSES] },
          remainingBalance: { gt: 0 },
        },
      }),
      prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.employee.count({
        where: { organizationId, eligibilityStatus: { in: ["Blocked", "Suspended"] } },
      }),
    ]);

  type Notif = {
    id: string;
    title: string;
    message: string;
    type: "info" | "warning" | "success" | "danger";
    read: boolean;
    href: string;
    createdAt: string;
    sortAt: number;
  };

  const alerts: Notif[] = [];

  if (pending > 0) {
    alerts.push({
      id: "alert-pending-requests",
      title: "Requests awaiting approval",
      message: `${pending} advance request${pending > 1 ? "s" : ""} need your review.`,
      type: "info",
      read: false,
      href: "/org-admin/requests",
      createdAt: now.toISOString().replace("T", " ").slice(0, 16),
      sortAt: now.getTime() + 3,
    });
  }
  if (overdue > 0) {
    alerts.push({
      id: "alert-overdue-repayments",
      title: "Repayment overdue",
      message: `${overdue} repayment installment${overdue > 1 ? "s are" : " is"} past due.`,
      type: "danger",
      read: false,
      href: "/org-admin/repayments",
      createdAt: now.toISOString().replace("T", " ").slice(0, 16),
      sortAt: now.getTime() + 2,
    });
  }
  if (employeesBlocked > 0) {
    alerts.push({
      id: "alert-blocked-employees",
      title: "Employees blocked from advances",
      message: `${employeesBlocked} employee${employeesBlocked > 1 ? "s are" : " is"} blocked or suspended.`,
      type: "warning",
      read: false,
      href: "/org-admin/eligibility",
      createdAt: now.toISOString().replace("T", " ").slice(0, 16),
      sortAt: now.getTime() + 1,
    });
  }
  if (approvedThisMonth > 0) {
    alerts.push({
      id: "alert-approved-month",
      title: "Approvals this month",
      message: `${approvedThisMonth} request${approvedThisMonth > 1 ? "s were" : " was"} approved this month. ${activeAdvances} advance${activeAdvances !== 1 ? "s are" : " is"} currently active.`,
      type: "success",
      read: true,
      href: "/org-admin/active-advances",
      createdAt: monthStart.toISOString().replace("T", " ").slice(0, 16),
      sortAt: monthStart.getTime(),
    });
  }
  if (rejectedThisMonth > 0) {
    alerts.push({
      id: "alert-rejected-month",
      title: "Rejections this month",
      message: `${rejectedThisMonth} request${rejectedThisMonth > 1 ? "s were" : " was"} rejected this month.`,
      type: "warning",
      read: true,
      href: "/org-admin/requests",
      createdAt: monthStart.toISOString().replace("T", " ").slice(0, 16),
      sortAt: monthStart.getTime() - 1,
    });
  }

  const activity: Notif[] = recentLogs.map((l) => ({
    id: l.id,
    title: l.action,
    message: `${l.target} — by ${l.userEmail}`,
    type: auditCategory(l.action) as Notif["type"],
    read: true,
    href: "/org-admin/audit",
    createdAt: l.createdAt.toISOString().replace("T", " ").slice(0, 16),
    sortAt: l.createdAt.getTime(),
  }));

  return [...alerts, ...activity]
    .sort((a, b) => b.sortAt - a.sortAt)
    .map(({ sortAt: _s, ...rest }) => rest);
}

export async function getNotificationsWorkspace(organizationId: string) {
  const data = await listNotifications(organizationId);
  const unread = data.filter((n) => !n.read).length;
  const critical = data.filter((n) => n.type === "danger" || n.type === "warning").length;
  return {
    summary: {
      total: data.length,
      unread,
      critical,
      activity: data.filter((n) => !n.id.startsWith("alert-")).length,
    },
    data,
  };
}

export async function getReportsWorkspace(organizationId: string) {
  await ensureOrgData(organizationId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const [requests, employees] = await Promise.all([
    prisma.advanceRequest.findMany({
      where: { employee: orgEmployeeFilter(organizationId) },
      include: {
        employee: true,
        repayments: { orderBy: { installmentNumber: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({ where: { organizationId } }),
  ]);

  const fmt = (d: Date | null | undefined) =>
    d ? d.toISOString().replace("T", " ").slice(0, 10) : "—";

  const requestRows = requests.map((r) => ({
    id: r.id,
    requestNumber: r.requestNumber,
    employeeName: r.employee.fullName,
    employeeCode: r.employee.employeeCode,
    department: r.employee.department,
    amount: r.amount,
    repaymentMonths: r.repaymentMonths,
    purpose: r.purpose,
    status: r.status,
    requestDate: fmt(r.createdAt),
    reviewComment: r.reviewComment ?? "",
    createdAt: r.createdAt.toISOString(),
  }));

  const approvedRows = requests
    .filter((r) => APPROVED_STATUSES.has(r.status))
    .map((r) => ({
      id: r.id,
      requestNumber: r.requestNumber,
      employeeName: r.employee.fullName,
      department: r.employee.department,
      amount: r.amount,
      status: r.status,
      approvedAt: fmt(r.approvedAt),
      disbursedAt: fmt(r.disbursedAt),
      monthlyDeduction: r.monthlyDeduction ?? calcMonthlyDeduction(r.amount, r.repaymentMonths),
      remainingBalance: r.remainingBalance ?? (ACTIVE_STATUSES.has(r.status) ? r.amount : 0),
    }));

  const rejectedRows = requests
    .filter((r) => REJECTED_STATUSES.has(r.status))
    .map((r) => ({
      id: r.id,
      requestNumber: r.requestNumber,
      employeeName: r.employee.fullName,
      department: r.employee.department,
      amount: r.amount,
      purpose: r.purpose,
      rejectedAt: fmt(r.rejectedAt),
      reason: r.reviewComment || "No reason provided",
    }));

  const activeRows = requests
    .filter((r) => ACTIVE_STATUSES.has(r.status) && (r.remainingBalance ?? r.amount) > 0)
    .map((r) => {
      const remaining = r.remainingBalance ?? r.amount;
      const paid = Math.max(0, r.amount - remaining);
      return {
        id: r.id,
        requestNumber: r.requestNumber,
        employeeName: r.employee.fullName,
        department: r.employee.department,
        approvedAmount: r.amount,
        remainingBalance: remaining,
        monthlyDeduction: r.monthlyDeduction ?? calcMonthlyDeduction(r.amount, r.repaymentMonths),
        progressPercent: r.amount > 0 ? Math.round((paid / r.amount) * 100) : 0,
        status: r.status,
        startDate: fmt(r.disbursedAt ?? r.approvedAt ?? r.createdAt),
      };
    });

  const repaymentRows = requests.flatMap((r) =>
    r.repayments.map((p) => ({
      id: p.id,
      requestNumber: r.requestNumber,
      employeeName: r.employee.fullName,
      department: r.employee.department,
      installmentNumber: p.installmentNumber,
      amount: p.amount,
      paidAmount: p.paidAmount,
      dueDate: fmt(p.dueDate),
      paidAt: fmt(p.paidAt),
      status:
        p.paidAt || p.status === "Paid"
          ? "Paid"
          : p.dueDate < now
            ? "Overdue"
            : p.status || "Pending",
    }))
  );

  const usageRows = employees.map((e) => {
    const empReqs = requests.filter((r) => r.employeeId === e.id);
    const totalRequested = empReqs.reduce((s, r) => s + r.amount, 0);
    const active = empReqs
      .filter((r) => ACTIVE_STATUSES.has(r.status))
      .reduce((s, r) => s + (r.remainingBalance ?? r.amount), 0);
    const completed = empReqs.filter((r) => r.status === "Completed").length;
    return {
      id: e.id,
      employeeName: e.fullName,
      employeeCode: e.employeeCode,
      department: e.department,
      eligibilityStatus: e.eligibilityStatus,
      requestCount: empReqs.length,
      totalRequested,
      activeBalance: active,
      completedCount: completed,
      netSalary: e.netSalary,
    };
  });

  const recovered = requests.reduce(
    (s, r) => s + r.repayments.reduce((a, p) => a + (p.paidAmount || 0), 0),
    0
  );
  const outstanding = activeRows.reduce((s, r) => s + r.remainingBalance, 0);
  const disbursedThisMonth = requests
    .filter((r) => r.disbursedAt && r.disbursedAt >= monthStart)
    .reduce((s, r) => s + r.amount, 0);
  const recoveredThisMonth = requests.reduce(
    (s, r) =>
      s +
      r.repayments
        .filter((p) => p.paidAt && p.paidAt >= monthStart)
        .reduce((a, p) => a + (p.paidAmount || 0), 0),
    0
  );

  const monthlyTrend = monthLabels.map((label, idx) => ({
    label,
    requests: requests.filter(
      (r) => r.createdAt.getMonth() === idx && r.createdAt.getFullYear() === now.getFullYear()
    ).length,
    disbursed: requests
      .filter(
        (r) =>
          r.disbursedAt &&
          r.disbursedAt.getMonth() === idx &&
          r.disbursedAt.getFullYear() === now.getFullYear()
      )
      .reduce((s, r) => s + r.amount, 0),
  }));

  const deptMap = new Map<string, number>();
  for (const r of requests) {
    const d = r.employee.department || "Other";
    deptMap.set(d, (deptMap.get(d) ?? 0) + r.amount);
  }
  const colors = ["#000435", "#FCB038", "#0ea5e9", "#10b981", "#f43f5e", "#8b5cf6"];
  const departmentUsage = [...deptMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));

  const decided = requests.filter(
    (r) => APPROVED_STATUSES.has(r.status) || REJECTED_STATUSES.has(r.status)
  );
  const approvalRate =
    decided.length > 0
      ? Math.round(
          (requests.filter((r) => APPROVED_STATUSES.has(r.status)).length / decided.length) * 100
        )
      : 100;
  const recoveryDenom = recovered + outstanding;
  const recoveryRate =
    recoveryDenom > 0 ? Math.round((recovered / recoveryDenom) * 100) : 100;

  return {
    summary: {
      totalRequests: requests.length,
      pending: requests.filter((r) => PENDING_STATUSES.has(r.status)).length,
      approved: approvedRows.length,
      rejected: rejectedRows.length,
      active: activeRows.length,
      outstanding,
      disbursedThisMonth,
      recoveredThisMonth,
      approvalRate,
      recoveryRate,
      employees: employees.length,
    },
    monthlyTrend,
    departmentUsage,
    catalogs: {
      requests: {
        id: "requests",
        title: "Advance Requests Report",
        description: "All submitted requests with status and amounts",
        rowCount: requestRows.length,
      },
      approved: {
        id: "approved",
        title: "Approved Advances Report",
        description: "Approved and disbursed advances for the period",
        rowCount: approvedRows.length,
      },
      rejected: {
        id: "rejected",
        title: "Rejected Requests Report",
        description: "Rejected applications with reasons",
        rowCount: rejectedRows.length,
      },
      active: {
        id: "active",
        title: "Active Advances Report",
        description: "Currently running advances and balances",
        rowCount: activeRows.length,
      },
      repayment: {
        id: "repayment",
        title: "Repayment Report",
        description: "Deduction schedules and payment history",
        rowCount: repaymentRows.length,
      },
      usage: {
        id: "usage",
        title: "Employee Usage Report",
        description: "Per-employee advance utilization",
        rowCount: usageRows.length,
      },
    },
    datasets: {
      requests: requestRows,
      approved: approvedRows,
      rejected: rejectedRows,
      active: activeRows,
      repayment: repaymentRows,
      usage: usageRows,
    },
  };
}

export async function createEmployee(
  organizationId: string,
  input: {
    fullName: string;
    email: string;
    department: string;
    position: string;
    phone?: string;
    netSalary: number;
    grossSalary?: number;
  }
) {
  const code = `EMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  return prisma.employee.create({
    data: {
      organizationId,
      employeeCode: code,
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      department: input.department,
      position: input.position,
      phone: input.phone?.trim() || null,
      companyName: "Organization",
      employmentStatus: "Active",
      yearsOfService: 0,
      netSalary: input.netSalary,
      grossSalary: input.grossSalary ?? input.netSalary,
      salarySource: input.netSalary > 0 ? "kaziavance" : "missing",
      salaryUpdatedAt: input.netSalary > 0 ? new Date() : null,
      eligibilityStatus: "Eligible",
      allowAdvance: true,
    },
  });
}

export async function updateEmployeePhone(
  organizationId: string,
  employeeId: string,
  phone: string | null
) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId },
  });
  if (!employee) throw new AppError(404, "Employee not found");
  return prisma.employee.update({
    where: { id: employeeId },
    data: { phone: phone?.trim() || null },
  });
}
