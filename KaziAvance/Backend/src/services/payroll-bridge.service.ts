import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error";

const ACTIVE_STATUSES = ["Approved", "Disbursed"] as const;

function calcMonthlyDeduction(amount: number, months: number) {
  const interest = Math.round(amount * 0.025);
  const fee = Math.round(amount * 0.01);
  return Math.round((amount + interest + fee) / Math.max(1, months));
}

/** Active advances for Payroll to deduct when running payroll. */
export async function listAdvancesForPayroll(organizationId: string) {
  if (!organizationId) throw new AppError(400, "organizationId is required");

  const requests = await prisma.advanceRequest.findMany({
    where: {
      employee: { organizationId },
      status: { in: [...ACTIVE_STATUSES] },
      OR: [{ remainingBalance: { gt: 0 } }, { remainingBalance: null }],
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          email: true,
          fullName: true,
        },
      },
      repayments: {
        where: { status: { not: "Paid" }, paidAt: null },
        orderBy: { installmentNumber: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return requests.map((r) => {
    const remaining = r.remainingBalance ?? r.amount;
    const monthly =
      r.monthlyDeduction ??
      r.repayments[0]?.amount ??
      calcMonthlyDeduction(r.amount, r.repaymentMonths);
    const deduct = Math.min(monthly, Math.max(0, remaining));

    return {
      advanceId: r.id,
      requestNumber: r.requestNumber,
      employeeId: r.employee.id,
      employeeCode: r.employee.employeeCode,
      email: r.employee.email,
      employeeName: r.employee.fullName,
      status: r.status,
      approvedAmount: r.amount,
      remainingBalance: remaining,
      monthlyDeduction: deduct,
      repaymentMonths: r.repaymentMonths,
    };
  });
}

type DeductionItem = {
  employeeCode?: string | null;
  email?: string | null;
  amount: number;
  requestNumber?: string | null;
  advanceId?: string | null;
};

/**
 * Apply payroll deductions to Kazi advances after a payroll run is marked paid.
 * Marks the next unpaid installment(s) and reduces remainingBalance.
 */
export async function applyPayrollDeductions(
  organizationId: string,
  input: {
    month?: number;
    year?: number;
    paymentRef?: string | null;
    items: DeductionItem[];
  }
) {
  if (!organizationId) throw new AppError(400, "organizationId is required");
  const results: Array<{
    employeeCode?: string | null;
    email?: string | null;
    applied: number;
    advanceId?: string;
    requestNumber?: string;
  }> = [];

  for (const item of input.items) {
    const amount = Math.round(Number(item.amount) || 0);
    if (amount <= 0) continue;

    const code = item.employeeCode?.trim();
    const email = item.email?.trim()?.toLowerCase();

    const advances = await prisma.advanceRequest.findMany({
      where: {
        employee: { organizationId },
        status: { in: [...ACTIVE_STATUSES] },
        ...(item.advanceId ? { id: item.advanceId } : {}),
        ...(item.requestNumber ? { requestNumber: item.requestNumber } : {}),
        OR: [{ remainingBalance: { gt: 0 } }, { remainingBalance: null }],
      },
      include: {
        repayments: { orderBy: { installmentNumber: "asc" } },
        employee: { select: { employeeCode: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const matched = advances.filter((a) => {
      if (item.advanceId || item.requestNumber) return true;
      if (code && a.employee.employeeCode === code) return true;
      if (email && a.employee.email?.toLowerCase() === email) return true;
      return false;
    });

    if (!matched.length) {
      results.push({ employeeCode: code, email, applied: 0 });
      continue;
    }

    let left = amount;
    for (const adv of matched) {
      if (left <= 0) break;
      const remaining = adv.remainingBalance ?? adv.amount;
      if (remaining <= 0) continue;

      const apply = Math.min(left, remaining);
      const unpaid = adv.repayments.filter((r) => r.status !== "Paid" && !r.paidAt);
      let applyLeft = apply;
      const now = new Date();

      for (const rep of unpaid) {
        if (applyLeft <= 0) break;
        const portion = Math.min(applyLeft, rep.amount - (rep.paidAmount || 0));
        if (portion <= 0) continue;
        const newPaid = (rep.paidAmount || 0) + portion;
        const fullyPaid = newPaid >= rep.amount;
        await prisma.advanceRepayment.update({
          where: { id: rep.id },
          data: {
            paidAmount: newPaid,
            ...(fullyPaid ? { status: "Paid", paidAt: now } : { status: "Pending" }),
          },
        });
        applyLeft -= portion;
      }

      const newRemaining = Math.max(0, remaining - apply);
      await prisma.advanceRequest.update({
        where: { id: adv.id },
        data: {
          remainingBalance: newRemaining,
          ...(newRemaining <= 0
            ? { status: "Completed" }
            : adv.status === "Approved"
              ? { status: "Disbursed", disbursedAt: adv.disbursedAt ?? now }
              : {}),
          reviewComment: [
            adv.reviewComment,
            `Payroll deduction ${apply.toLocaleString()} RWF` +
              (input.month && input.year ? ` (${input.month}/${input.year})` : "") +
              (input.paymentRef ? ` ref ${input.paymentRef}` : ""),
          ]
            .filter(Boolean)
            .join(" · "),
        },
      });

      left -= apply;
      results.push({
        employeeCode: adv.employee.employeeCode,
        email: adv.employee.email,
        applied: apply,
        advanceId: adv.id,
        requestNumber: adv.requestNumber,
      });
    }
  }

  return { appliedCount: results.filter((r) => r.applied > 0).length, results };
}
