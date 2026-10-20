import { prisma } from "../config/prisma";
import { getRequestFee } from "./platform-policy.service";

export async function listPlatformRequests(school?: string) {
  const requests = await prisma.advanceRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      employee: true,
      repayments: { orderBy: { installmentNumber: "asc" } },
    },
  });

  const q = (school || "").trim().toLowerCase();
  const rows = requests
    .filter((r) => {
      if (!q || q === "all") return true;
      return String(r.employee.companyName || "").toLowerCase().includes(q);
    })
    .map((r) => {
      const fee = getRequestFee(r.id, r.amount);
      const paid = r.repayments.filter((p) => p.status === "Paid" || p.paidAt);
      const totalPaid = paid.reduce((s, p) => s + p.amount, 0);
      return {
        id: r.id,
        requestNumber: r.requestNumber,
        school: r.employee.companyName,
        organizationId: r.employee.organizationId,
        teacher: r.employee.fullName,
        employeeCode: r.employee.employeeCode,
        amount: r.amount,
        months: r.repaymentMonths,
        status: r.status,
        purpose: r.purpose,
        submittedAt: r.createdAt.toISOString(),
        profitPercent: fee.profitPercent,
        income: fee.income,
        totalPaid,
        remainingBalance: r.remainingBalance ?? Math.max(0, r.amount - totalPaid),
      };
    });

  const schools = Array.from(new Set(requests.map((r) => r.employee.companyName).filter(Boolean))).sort();
  const incomeTotal = rows.reduce((s, r) => s + r.income, 0);

  return {
    schools,
    summary: {
      total: rows.length,
      pending: rows.filter((r) => r.status === "Pending" || r.status === "Under Review").length,
      active: rows.filter((r) => r.status === "Approved" || r.status === "Disbursed").length,
      incomeTotal,
    },
    data: rows,
  };
}
