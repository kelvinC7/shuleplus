import type { AdvanceRequest, AdvanceRepayment, Employee, OrgPolicy } from "../generated/prisma";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error";
import { buildAdvanceReceiptHtml, type ReceiptExtras } from "./advance-receipt.service";

const MUTABLE_STATUSES = new Set(["Pending", "Submitted", "Under Review", "Rejected"]);
const LOCKED_STATUSES = new Set(["Approved", "Disbursed", "Completed", "Cancelled"]);

const interestRateByMonths: Record<number, number> = {
  3: 2.5,
  6: 4.5,
  9: 6.5,
  12: 8.0,
};

export function canEmployeeMutate(status: string) {
  return MUTABLE_STATUSES.has(status) && !LOCKED_STATUSES.has(status);
}

function availableLimit(employee: Employee, policy: OrgPolicy, outstanding = 0) {
  const pct = employee.maxSalaryPercent ?? policy.maxAdvancePercent ?? 50;
  const maxEligible =
    employee.maxAdvanceAmount ?? Math.round(employee.netSalary * (pct / 100));
  return {
    maxEligibleAmount: maxEligible,
    availableLimit: Math.max(0, maxEligible - outstanding),
    utilizedPercent:
      maxEligible > 0
        ? Math.min(100, Math.round((outstanding / maxEligible) * 100))
        : 0,
  };
}

async function getPolicy(organizationId: string | null | undefined) {
  if (!organizationId) {
    return {
      maxAdvancePercent: 50,
      maxActiveAdvances: 1,
      minEmploymentMonths: 0,
    } as OrgPolicy;
  }
  return prisma.orgPolicy.upsert({
    where: { organizationId },
    update: {},
    create: { organizationId },
  });
}

export async function getReceiptExtrasForEmployee(employee: Employee, outstanding = 0) {
  const policy = await getPolicy(employee.organizationId);
  return availableLimit(employee, policy, outstanding);
}

export async function buildReceiptForRequest(
  request: AdvanceRequest & {
    employee: Employee;
    repayments?: AdvanceRepayment[];
  }
) {
  const outstanding =
    request.remainingBalance ??
    (request.status === "Disbursed" || request.status === "Approved"
      ? request.amount
      : 0);
  const limits = await getReceiptExtrasForEmployee(request.employee, outstanding);
  const extras: ReceiptExtras = {
    ...limits,
    interestRate: interestRateByMonths[request.repaymentMonths] ?? 0,
  };
  return buildAdvanceReceiptHtml(
    {
      ...request,
      repayments: request.repayments,
    },
    extras
  );
}

export function mapAdvanceHistoryItem(
  item: AdvanceRequest & { repayments: AdvanceRepayment[] },
  limits?: { availableLimit: number; maxEligibleAmount: number }
) {
  const paid = item.repayments.filter((r) => r.status === "Paid" || r.paidAt);
  const totalPaid = paid.reduce((s, r) => s + r.amount, 0);
  const outstanding =
    item.remainingBalance ??
    (["Approved", "Disbursed"].includes(item.status)
      ? Math.max(0, item.amount - totalPaid)
      : 0);
  const progress =
    item.amount > 0
      ? Math.min(100, Math.round(((item.amount - outstanding) / item.amount) * 100))
      : item.status === "Completed"
        ? 100
        : 0;

  const purposeType = item.purpose.startsWith("Others:")
    ? "Other"
    : item.purpose.split(":")[0]?.trim() || item.purpose;

  const timeline = [
    { step: "Submitted", date: item.createdAt.toISOString(), done: true },
    {
      step: "HR Verified",
      date: (item.approvedAt ?? item.createdAt).toISOString(),
      done: Boolean(item.approvedAt || item.disbursedAt),
    },
    {
      step: "Approved",
      date: item.approvedAt?.toISOString() ?? null,
      done: Boolean(item.approvedAt || item.disbursedAt),
    },
    {
      step: "Finance Approved",
      date: item.approvedAt?.toISOString() ?? null,
      done: Boolean(item.approvedAt || item.disbursedAt),
    },
    {
      step: "Disbursed",
      date: item.disbursedAt?.toISOString() ?? null,
      done: Boolean(item.disbursedAt),
    },
    {
      step: "Completed",
      date: item.status === "Completed" ? item.updatedAt.toISOString() : null,
      done: item.status === "Completed",
    },
  ];

  const freqMatch = /Frequency:\s*(Daily|Weekly|Monthly)/i.exec(item.description || "");
  const frequency = freqMatch ? capitalizeFreq(freqMatch[1]) : "Monthly";
  const now = Date.now();
  const overdue = item.repayments.some(
    (r) => !(r.status === "Paid" || r.paidAt) && r.dueDate.getTime() < now
  );

  return {
    id: item.id,
    requestNo: item.requestNumber,
    requestNumber: item.requestNumber,
    amount: item.amount,
    purpose: item.purpose,
    purposeType,
    description: item.description ?? null,
    months: item.repaymentMonths,
    frequency,
    date: item.createdAt.toISOString().slice(0, 10),
    submittedAt: item.createdAt.toISOString(),
    approvedAt: item.approvedAt?.toISOString() ?? null,
    disbursedAt: item.disbursedAt?.toISOString() ?? null,
    startDate: (item.disbursedAt ?? item.approvedAt)?.toISOString() ?? null,
    rejectedAt: item.rejectedAt?.toISOString() ?? null,
    completedAt: item.status === "Completed" ? item.updatedAt.toISOString() : null,
    status: item.status,
    monthlyDeduction: item.monthlyDeduction,
    remainingBalance: outstanding,
    progressPercent: progress,
    installmentsLeft: Math.max(0, item.repayments.length - paid.length),
    totalPaid,
    overdue,
    signatureFile: item.signatureFile ?? null,
    canEdit: canEmployeeMutate(item.status),
    canDelete: canEmployeeMutate(item.status),
    availableLimit: limits?.availableLimit ?? null,
    maxEligibleAmount: limits?.maxEligibleAmount ?? null,
    repayments: item.repayments
      .sort((a, b) => a.installmentNumber - b.installmentNumber)
      .map((r) => {
        const isPaid = r.status === "Paid" || Boolean(r.paidAt) || r.paidAmount >= r.amount;
        const dueMs = r.dueDate.getTime();
        let status = r.status || "Pending";
        if (isPaid) status = "Paid";
        else if (dueMs < now) status = "Overdue";
        else status = "Upcoming";
        return {
          id: r.id,
          installmentNumber: r.installmentNumber,
          amount: r.amount,
          paidAmount: isPaid ? r.paidAmount || r.amount : r.paidAmount || 0,
          dueDate: r.dueDate.toISOString(),
          paidAt: r.paidAt?.toISOString() ?? null,
          status,
          method: "Payroll",
          reference: `PAY-${String(r.installmentNumber).padStart(4, "0")}`,
          monthLabel: r.dueDate.toLocaleString("en-US", { month: "long", year: "numeric" }),
        };
      }),
    timeline,
    notifications: buildNotifications(item),
  };
}

function capitalizeFreq(value: string) {
  const v = value.toLowerCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function buildNotifications(item: AdvanceRequest) {
  const rows: { title: string; date: string }[] = [
    { title: "Advance Submitted", date: item.createdAt.toISOString() },
  ];
  if (item.approvedAt) rows.push({ title: "Advance Approved", date: item.approvedAt.toISOString() });
  if (item.rejectedAt) rows.push({ title: "Advance Rejected", date: item.rejectedAt.toISOString() });
  if (item.disbursedAt) rows.push({ title: "Advance Disbursed", date: item.disbursedAt.toISOString() });
  if (item.status === "Completed") {
    rows.push({ title: "Advance Completed", date: item.updatedAt.toISOString() });
  }
  return rows;
}

export async function listEmployeeAdvanceHistory(employeeId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new AppError(404, "Employee not found");

  const policy = await getPolicy(employee.organizationId);
  const requests = await prisma.advanceRequest.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
    include: { repayments: { orderBy: { installmentNumber: "asc" } } },
  });

  const activeOutstanding = requests
    .filter((r) => ["Approved", "Disbursed"].includes(r.status))
    .reduce((s, r) => s + (r.remainingBalance ?? r.amount), 0);
  const limits = availableLimit(employee, policy, activeOutstanding);

  const data = requests.map((r) => mapAdvanceHistoryItem(r, limits));

  const completed = data.filter((r) => r.status === "Completed" || r.progressPercent >= 100);
  const active = data.filter((r) => ["Approved", "Disbursed"].includes(r.status));
  const totalReceived = data
    .filter((r) => ["Approved", "Disbursed", "Completed"].includes(r.status))
    .reduce((s, r) => s + r.amount, 0);
  const totalRepaid = data.reduce((s, r) => s + r.totalPaid, 0);
  const amounts = data.map((r) => r.amount);
  const latePayments = 0;
  const missed = 0;
  const completedRate =
    data.length > 0 ? Math.round((completed.length / data.length) * 100) : 0;
  const rawScore = employee.creditScore ?? 70 + completed.length * 3;
  const creditScore = Math.min(
    100,
    Math.max(0, rawScore > 100 ? Math.round(rawScore / 10) : rawScore)
  );

  return {
    data,
    teacher: {
      fullName: employee.fullName,
      employeeCode: employee.employeeCode,
      school: employee.companyName,
      department: employee.department,
      email: employee.email,
    },
    summary: {
      totalAdvances: data.length,
      totalReceived,
      outstanding: activeOutstanding,
      completed: completed.length,
      activeAdvances: active.length,
      totalRepaid,
      availableLimit: limits.availableLimit,
      maxEligibleAmount: limits.maxEligibleAmount,
      creditScore,
      advanceScore: creditScore,
      highestAdvance: amounts.length ? Math.max(...amounts) : 0,
      lowestAdvance: amounts.length ? Math.min(...amounts) : 0,
      averageAdvance: amounts.length
        ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length)
        : 0,
      completedRate,
      repaymentScore: Math.max(0, 100 - latePayments * 10 - missed * 15),
      latePayments,
      missedDeductions: missed,
      financialRating: creditScore >= 90 ? 5 : creditScore >= 75 ? 4 : creditScore >= 60 ? 3 : 2,
    },
  };
}

export async function updateEmployeeAdvanceRequest(
  employeeId: string,
  requestId: string,
  input: {
    amount?: number;
    months?: number;
    purpose?: string;
    purposeOther?: string;
    description?: string | null;
    signatureFile?: string | null;
    signatureMimeType?: string | null;
    signatureName?: string | null;
  }
) {
  const request = await prisma.advanceRequest.findFirst({
    where: { id: requestId, employeeId },
  });
  if (!request) throw new AppError(404, "Request not found");
  if (!canEmployeeMutate(request.status)) {
    throw new AppError(400, "This request can no longer be edited after approval or disbursement");
  }

  let purpose = input.purpose?.trim() || request.purpose;
  if (input.purpose) {
    const raw = input.purpose.trim();
    if (raw.toLowerCase() === "others" || raw.toLowerCase() === "other") {
      const other = input.purposeOther?.trim();
      if (!other) throw new AppError(400, "Please specify the purpose when selecting Others");
      purpose = `Others: ${other}`;
    } else {
      purpose = raw;
    }
  }

  return prisma.advanceRequest.update({
    where: { id: requestId },
    data: {
      ...(input.amount ? { amount: input.amount } : {}),
      ...(input.months ? { repaymentMonths: input.months } : {}),
      purpose,
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.signatureFile
        ? {
            signatureFile: input.signatureFile,
            signatureMimeType: input.signatureMimeType,
            signature: input.signatureName,
          }
        : {}),
    },
  });
}

export async function deleteEmployeeAdvanceRequest(employeeId: string, requestId: string) {
  const request = await prisma.advanceRequest.findFirst({
    where: { id: requestId, employeeId },
  });
  if (!request) throw new AppError(404, "Request not found");
  if (!canEmployeeMutate(request.status)) {
    throw new AppError(400, "This request can no longer be deleted after approval or disbursement");
  }
  await prisma.advanceRequest.delete({ where: { id: requestId } });
  return { message: "Request deleted", id: requestId };
}
