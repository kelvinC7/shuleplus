import type { AdvanceRequest, AdvanceRepayment, Employee, OrgPolicy } from "../generated/prisma";
import { prisma } from "../config/prisma";
import { syncEmployeePayroll } from "./payroll.service";
import { employmentMonths } from "./advance-eligibility.service";

const ACTIVE_STATUSES = new Set(["Approved", "Disbursed"]);
const PENDING_STATUSES = new Set(["Pending", "Submitted", "Under Review"]);

function calcMonthlyDeduction(amount: number, months: number) {
  const interest = Math.round(amount * 0.025);
  const fee = Math.round(amount * 0.01);
  return Math.round((amount + interest + fee) / months);
}

function buildEligibility(employee: Employee, policy: OrgPolicy, _activeCount: number, outstanding: number) {
  const reasons: string[] = [];

  const blocked =
    !employee.allowAdvance ||
    employee.eligibilityStatus === "Blocked" ||
    employee.eligibilityStatus === "Suspended" ||
    employee.eligibilityStatus === "Disabled";

  if (!employee.allowAdvance || employee.eligibilityStatus === "Blocked") {
    reasons.push("Advance access is blocked by organization policy");
  }
  if (employee.eligibilityStatus === "Suspended") {
    reasons.push("Account is suspended for advances");
  }
  if (employee.eligibilityStatus === "Disabled") {
    reasons.push("Advance requests are paused on your account.");
  }
  if (!blocked && !/active/i.test(employee.employmentStatus || "")) {
    reasons.push("Employment is not currently active");
  }
  if ((employee.netSalary ?? 0) <= 0) {
    reasons.push("No salary on file — sync Payroll or set salary in admin");
  }

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

  if (outstanding > 0 && availableAdvance <= 0) {
    reasons.push("Maximum advance limit reached");
  }
  if (outstanding > 0 && availableAdvance > 0) {
    reasons.push(`Outstanding balance: ${outstanding.toLocaleString()} RWF. ${availableAdvance.toLocaleString()} RWF still available.`);
  }

  if (reasons.length === 0) {
    reasons.push("Employment and salary records look good");
    reasons.push("Within organization advance policy limits");
  }

  const salaryOk = (employee.netSalary ?? 0) > 0;
  const activeEmployment = /active/i.test(employee.employmentStatus || "");
  const isCapped = outstanding > 0 && availableAdvance <= 0;

  let status: string;
  if (blocked) {
    status = employee.eligibilityStatus === "Blocked" || employee.eligibilityStatus === "Suspended"
      ? employee.eligibilityStatus
      : "Disabled";
  } else if (!activeEmployment) {
    status = "Not Eligible";
  } else if (gross <= 0 && net <= 0) {
    status = "Salary Missing";
  } else if (net <= 0) {
    status = "Net Salary Missing";
  } else if (isCapped) {
    status = "Advance Outstanding";
  } else {
    status = "Eligible";
  }

  return { score: 100, status, reasons, maxAdvance, availableAdvance, maxAdvanceAmount: employee.maxAdvanceAmount ?? 0, maxSalaryPercent: pct };
}

function mapInstallments(repayments: AdvanceRepayment[]) {
  return repayments.map((r) => {
    let status: "Paid" | "Upcoming" | "Pending" = "Pending";
    if (r.status === "Paid" || r.paidAt) status = "Paid";
    else if (r.status === "Upcoming" || r.dueDate.getTime() >= Date.now()) status = "Upcoming";

    return {
      name: `Installment ${r.installmentNumber}`,
      amount: r.amount,
      date: r.dueDate.toISOString(),
      status,
    };
  });
}

function synthesizeInstallments(advance: AdvanceRequest) {
  const months = Math.max(1, advance.repaymentMonths);
  const monthly =
    advance.monthlyDeduction ?? calcMonthlyDeduction(advance.amount, months);
  const start = advance.disbursedAt ?? advance.approvedAt ?? advance.createdAt;
  const rows = [];
  for (let i = 0; i < months; i++) {
    const due = new Date(start);
    due.setMonth(due.getMonth() + i + 1);
    rows.push({
      name: `Installment ${i + 1}`,
      amount: monthly,
      date: due.toISOString(),
      status: (due.getTime() < Date.now() ? "Pending" : "Upcoming") as "Paid" | "Upcoming" | "Pending",
    });
  }
  return rows;
}

export async function getEmployeeDashboard(
  employee: Employee,
  authHeader?: string
) {
  await syncEmployeePayroll(employee.id, employee.employeeCode, {
    organizationId: employee.organizationId,
    email: employee.email,
    bearerToken: authHeader,
  });

  const latest = await prisma.employee.findUnique({ where: { id: employee.id } });
  if (!latest) throw new Error("Employee not found");

  const organizationId = latest.organizationId ?? "";
  const policy = organizationId
    ? await prisma.orgPolicy.upsert({
        where: { organizationId },
        update: {},
        create: { organizationId },
      })
    : ({
        maxAdvancePercent: 50,
        maxActiveAdvances: 1,
        minEmploymentMonths: 0,
      } as OrgPolicy);

  const advances = await prisma.advanceRequest.findMany({
    where: { employeeId: latest.id },
    orderBy: { createdAt: "desc" },
    include: { repayments: { orderBy: { installmentNumber: "asc" } } },
  });

  const activeAdvances = advances.filter((a) => ACTIVE_STATUSES.has(a.status));
  const active = activeAdvances[0] ?? null;
  const outstandingBalance = activeAdvances.reduce(
    (sum, a) => sum + (a.remainingBalance ?? a.amount),
    0
  );

  const pct = latest.maxSalaryPercent ?? policy.maxAdvancePercent ?? 50;
  const capFromNet = Math.round(latest.netSalary * (pct / 100));
  const maxEligibleAmount =
    latest.maxAdvanceAmount && latest.maxAdvanceAmount > 0
      ? capFromNet > 0
        ? Math.min(latest.maxAdvanceAmount, capFromNet)
        : latest.maxAdvanceAmount
      : capFromNet;
  const availableLimit = Math.max(0, maxEligibleAmount - outstandingBalance);
  const remainingEligibility = availableLimit;

  const repayments = active?.repayments ?? [];
  const installments =
    repayments.length > 0
      ? mapInstallments(repayments)
      : active
        ? synthesizeInstallments(active)
        : [];

  const unpaid = installments.filter((i) => i.status !== "Paid");
  const monthlyDeduction =
    active?.monthlyDeduction ??
    (unpaid[0]?.amount ??
      (active ? calcMonthlyDeduction(active.amount, active.repaymentMonths) : 0));

  const nextDeductionDate =
    unpaid[0]?.date ??
    (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString();
    })();

  const estimatedCompletionDate =
    unpaid[unpaid.length - 1]?.date ?? nextDeductionDate;

  const completionPercent = active
    ? Math.round(
        ((active.amount - (active.remainingBalance ?? active.amount)) / Math.max(active.amount, 1)) *
          100
      )
    : 0;

  const eligibility = buildEligibility(
    latest,
    policy,
    activeAdvances.length,
    outstandingBalance
  );

  const pendingCount = advances.filter((a) => PENDING_STATUSES.has(a.status)).length;
  const notifications = [
    ...(active
      ? [
          {
            id: `adv-${active.id}`,
            type: `Active advance ${active.requestNumber}`,
            time: "Now",
            channel: "In-app",
            read: false,
          },
        ]
      : []),
    ...(pendingCount
      ? [
          {
            id: "pending-req",
            type: `${pendingCount} request(s) awaiting review`,
            time: "Recent",
            channel: "In-app",
            read: false,
          },
        ]
      : []),
    ...(latest.netSalary > 0
      ? [
          {
            id: "salary-ok",
            type: "Salary synced from Payroll / admin record",
            time: "Today",
            channel: "System",
            read: true,
          },
        ]
      : [
          {
            id: "salary-missing",
            type: "Salary not set — ask admin to sync Payroll",
            time: "Today",
            channel: "System",
            read: false,
          },
        ]),
  ];

  return {
    now: new Date().toISOString(),
    greeting: `Welcome back, ${latest.fullName}`,
    employee: {
      id: latest.employeeCode,
      fullName: latest.fullName,
      department: latest.department,
      position: latest.position,
      phone: latest.phone ?? null,
      company: latest.companyName,
      status: latest.employmentStatus,
      yearsOfService: latest.yearsOfService,
      lastLogin: latest.lastLoginAt ?? latest.updatedAt,
      verificationStatus: latest.verificationStatus,
      profileCompletion: latest.profileCompletion,
      creditScore: latest.creditScore,
      advanceEligibility: eligibility.status,
      riskLevel: latest.riskLevel,
      email: latest.email,
    },
    financialSummary: {
      salary: {
        gross: latest.grossSalary,
        net: latest.netSalary,
        currentMonth: latest.netSalary,
      },
      advance: {
        availableLimit,
        maxEligibleAmount,
        outstandingBalance,
        remainingEligibility,
        maxAdvanceAmount: latest.maxAdvanceAmount ?? 0,
        maxSalaryPercent: pct,
      },
      repayment: {
        monthlyDeduction,
        remainingInstallments: unpaid.length,
        nextDeductionDate,
        estimatedCompletionDate,
      },
    },
    eligibility,
    activeAdvance: active
      ? {
          advanceId: active.requestNumber,
          approvedAmount: active.amount,
          disbursedAmount: active.disbursedAt ? active.amount : 0,
          approvalDate: (active.approvedAt ?? active.createdAt).toISOString(),
          interestRate: 2.5,
          repaymentPeriodMonths: active.repaymentMonths,
          currentBalance: active.remainingBalance ?? active.amount,
          completionPercent,
          status: active.status,
          agreementUrl: "",
        }
      : {
          advanceId: "",
          approvedAmount: 0,
          disbursedAmount: 0,
          approvalDate: "",
          interestRate: 0,
          repaymentPeriodMonths: 0,
          currentBalance: 0,
          completionPercent: 0,
          status: "",
          agreementUrl: "",
        },
    installments,
    notifications,
  };
}
