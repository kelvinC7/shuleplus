import { BudgetStatus } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { appendAuditLog } from "./audit.service";
import { CATEGORIES, DEPARTMENTS, LARGE_EXPENSE_RWF, PAYMENT_METHODS, usageSeverity } from "./constants";

async function getOwnedBudget(organizationId: string, budgetId: string) {
  const budget = await prisma.schoolBudget.findFirst({ where: { id: budgetId, organizationId } });
  if (!budget) throw new AppError(404, "Budget not found");
  return budget;
}

export function lineOptions() {
  return {
    categories: [...CATEGORIES],
    departments: [...DEPARTMENTS],
    paymentMethods: [...PAYMENT_METHODS],
    priorities: ["High", "Medium", "Low"],
  };
}

export async function listLines(organizationId: string, budgetId?: string) {
  if (!budgetId) {
    const approved = await prisma.schoolBudget.findFirst({
      where: { organizationId, status: BudgetStatus.approved },
      orderBy: { updatedAt: "desc" },
    });
    budgetId = approved?.id;
  }
  if (!budgetId) return [];
  await getOwnedBudget(organizationId, budgetId);
  const lines = await prisma.schoolBudgetLine.findMany({
    where: { budgetId },
    orderBy: { createdAt: "desc" },
  });
  return lines.map((l) => ({
    ...l,
    remainingRwf: Math.max(0, l.plannedAmountRwf - l.usedAmountRwf),
    usagePercent: l.plannedAmountRwf > 0 ? Math.round((l.usedAmountRwf / l.plannedAmountRwf) * 100) : 0,
    severity: usageSeverity(l.usedAmountRwf, l.plannedAmountRwf),
  }));
}

export async function linesSummary(organizationId: string, budgetId?: string) {
  const lines = await listLines(organizationId, budgetId);
  const planned = lines.reduce((s, l) => s + l.plannedAmountRwf, 0);
  const used = lines.reduce((s, l) => s + l.usedAmountRwf, 0);
  return {
    totals: {
      planned,
      used,
      remaining: Math.max(0, planned - used),
      lines: lines.length,
      frozen: lines.filter((l) => l.isFrozen).length,
    },
    lines,
  };
}

export async function createLine(
  organizationId: string,
  actor: { id?: string; roles?: string[] },
  input: {
    budgetId?: string;
    budget_id?: string;
    lineName?: string;
    line_name?: string;
    category: string;
    department: string;
    priority?: string;
    plannedAmountRwf?: number;
    planned_amount_rwf?: number;
    startDate?: string;
    start_date?: string;
    endDate?: string;
    end_date?: string;
    notes?: string;
  }
) {
  const budgetId = String(input.budgetId ?? input.budget_id ?? "");
  const budget = await getOwnedBudget(organizationId, budgetId);
  if (
    budget.status !== BudgetStatus.approved &&
    budget.status !== BudgetStatus.pending_approval &&
    budget.status !== BudgetStatus.draft
  ) {
    throw new AppError(400, "Cannot allocate lines on this budget status");
  }

  const planned = Number(input.plannedAmountRwf ?? input.planned_amount_rwf ?? 0);
  if (!(planned > 0)) throw new AppError(400, "planned_amount_rwf must be > 0");
  const remaining = budget.totalExpectedIncomeRwf - budget.totalAllocatedRwf;
  if (planned > remaining + 0.0001) {
    throw new AppError(400, `Planned amount exceeds unallocated income (${remaining} RWF)`);
  }

  const lineName = String(input.lineName ?? input.line_name ?? "").trim();
  if (!lineName) throw new AppError(400, "line_name is required");

  const [line] = await prisma.$transaction([
    prisma.schoolBudgetLine.create({
      data: {
        budgetId,
        lineName,
        category: String(input.category),
        department: String(input.department),
        priority: input.priority ?? "Medium",
        plannedAmountRwf: planned,
        startDate: input.startDate || input.start_date ? new Date(String(input.startDate ?? input.start_date)) : null,
        endDate: input.endDate || input.end_date ? new Date(String(input.endDate ?? input.end_date)) : null,
        notes: input.notes,
      },
    }),
    prisma.schoolBudget.update({
      where: { id: budgetId },
      data: { totalAllocatedRwf: { increment: planned } },
    }),
  ]);

  await appendAuditLog({
    organizationId,
    budgetId,
    action: "line:create",
    actorId: actor.id,
    actorRole: actor.roles?.[0],
    details: { lineId: line.id, planned },
  });

  return line;
}

export async function updateLine(
  organizationId: string,
  id: string,
  actor: { id?: string; roles?: string[] },
  input: Partial<{
    lineName: string;
    line_name: string;
    category: string;
    department: string;
    priority: string;
    plannedAmountRwf: number;
    planned_amount_rwf: number;
    notes: string;
  }>
) {
  const line = await prisma.schoolBudgetLine.findFirst({
    where: { id, budget: { organizationId } },
    include: { budget: true },
  });
  if (!line) throw new AppError(404, "Budget line not found");

  const newPlanned =
    input.plannedAmountRwf !== undefined || input.planned_amount_rwf !== undefined
      ? Number(input.plannedAmountRwf ?? input.planned_amount_rwf)
      : line.plannedAmountRwf;

  if (newPlanned < line.usedAmountRwf) {
    throw new AppError(400, "planned_amount_rwf cannot be less than used amount");
  }

  const delta = newPlanned - line.plannedAmountRwf;
  const headroom = line.budget.totalExpectedIncomeRwf - line.budget.totalAllocatedRwf;
  if (delta > headroom + 0.0001) {
    throw new AppError(400, "Increase exceeds unallocated income");
  }

  const [updated] = await prisma.$transaction([
    prisma.schoolBudgetLine.update({
      where: { id },
      data: {
        lineName: input.lineName ?? input.line_name ?? line.lineName,
        category: input.category ?? line.category,
        department: input.department ?? line.department,
        priority: input.priority ?? line.priority,
        plannedAmountRwf: newPlanned,
        notes: input.notes ?? line.notes,
      },
    }),
    prisma.schoolBudget.update({
      where: { id: line.budgetId },
      data: { totalAllocatedRwf: { increment: delta } },
    }),
  ]);

  await appendAuditLog({
    organizationId,
    budgetId: line.budgetId,
    action: "line:update",
    actorId: actor.id,
    actorRole: actor.roles?.[0],
    details: { lineId: id, newPlanned },
  });

  return updated;
}

export async function freezeLine(
  organizationId: string,
  id: string,
  actor: { id?: string; roles?: string[] },
  freeze: boolean
) {
  const line = await prisma.schoolBudgetLine.findFirst({
    where: { id, budget: { organizationId } },
  });
  if (!line) throw new AppError(404, "Budget line not found");
  const updated = await prisma.schoolBudgetLine.update({
    where: { id },
    data: { isFrozen: freeze },
  });
  await appendAuditLog({
    organizationId,
    budgetId: line.budgetId,
    action: freeze ? "line:freeze" : "line:unfreeze",
    actorId: actor.id,
    actorRole: actor.roles?.[0],
    details: { lineId: id },
  });
  return updated;
}

export async function createUsage(
  organizationId: string,
  actor: { id?: string; roles?: string[] },
  input: {
    budgetLineId?: string;
    budget_line_id?: string;
    amountRwf?: number;
    amount_rwf?: number;
    usageDate?: string;
    usage_date?: string;
    expenseCategory?: string;
    expense_category?: string;
    paymentMethod?: string;
    payment_method?: string;
    paymentBankName?: string;
    payment_bank_name?: string;
    paymentPhone?: string;
    payment_phone?: string;
    description?: string;
    receiptName?: string;
    receipt_name?: string;
    source?: string;
  }
) {
  const lineId = String(input.budgetLineId ?? input.budget_line_id ?? "");
  const line = await prisma.schoolBudgetLine.findFirst({
    where: { id: lineId, budget: { organizationId } },
    include: { budget: true },
  });
  if (!line) throw new AppError(404, "Budget line not found");
  if (line.isFrozen) throw new AppError(400, "Line is frozen; usage is blocked");
  if (line.budget.status !== BudgetStatus.approved) {
    throw new AppError(400, "Usage is only allowed on approved budgets");
  }

  const amount = Number(input.amountRwf ?? input.amount_rwf ?? 0);
  if (!(amount > 0)) throw new AppError(400, "amount_rwf must be > 0");
  const remaining = line.plannedAmountRwf - line.usedAmountRwf;
  if (amount > remaining + 0.0001) {
    throw new AppError(400, `Amount exceeds line remaining (${remaining} RWF)`);
  }

  const [usage] = await prisma.$transaction([
    prisma.schoolBudgetLineUsage.create({
      data: {
        budgetLineId: lineId,
        amountRwf: amount,
        usageDate: new Date(String(input.usageDate ?? input.usage_date ?? new Date().toISOString())),
        expenseCategory: input.expenseCategory ?? input.expense_category,
        paymentMethod: input.paymentMethod ?? input.payment_method,
        paymentBankName: input.paymentBankName ?? input.payment_bank_name,
        paymentPhone: input.paymentPhone ?? input.payment_phone,
        description: input.description,
        receiptName: input.receiptName ?? input.receipt_name,
        source: input.source ?? "manual",
        createdById: actor.id,
      },
    }),
    prisma.schoolBudgetLine.update({
      where: { id: lineId },
      data: { usedAmountRwf: { increment: amount } },
    }),
  ]);

  await appendAuditLog({
    organizationId,
    budgetId: line.budgetId,
    action: "usage:create",
    actorId: actor.id,
    actorRole: actor.roles?.[0],
    details: {
      lineId,
      amount,
      largeExpense: amount >= LARGE_EXPENSE_RWF,
    },
  });

  return usage;
}

export async function listUsage(
  organizationId: string,
  opts: { budgetId?: string; budgetLineId?: string }
) {
  return prisma.schoolBudgetLineUsage.findMany({
    where: {
      budgetLine: {
        budget: { organizationId },
        ...(opts.budgetId ? { budgetId: opts.budgetId } : {}),
        ...(opts.budgetLineId ? { id: opts.budgetLineId } : {}),
      },
    },
    include: {
      budgetLine: { select: { id: true, lineName: true, department: true, category: true, budgetId: true } },
    },
    orderBy: { usageDate: "desc" },
    take: 300,
  });
}

export async function departmentView(organizationId: string, budgetId?: string) {
  const lines = await listLines(organizationId, budgetId);
  const map = new Map<string, { planned: number; used: number; lines: number }>();
  for (const l of lines) {
    const cur = map.get(l.department) ?? { planned: 0, used: 0, lines: 0 };
    cur.planned += l.plannedAmountRwf;
    cur.used += l.usedAmountRwf;
    cur.lines += 1;
    map.set(l.department, cur);
  }
  return [...map.entries()].map(([department, v]) => ({
    department,
    ...v,
    remaining: Math.max(0, v.planned - v.used),
    usagePercent: v.planned > 0 ? Math.round((v.used / v.planned) * 100) : 0,
  }));
}

export async function vsActual(organizationId: string, budgetId?: string) {
  const lines = await listLines(organizationId, budgetId);
  return lines.map((l) => ({
    id: l.id,
    lineName: l.lineName,
    category: l.category,
    department: l.department,
    planned: l.plannedAmountRwf,
    actual: l.usedAmountRwf,
    variance: l.plannedAmountRwf - l.usedAmountRwf,
    variancePercent:
      l.plannedAmountRwf > 0
        ? Math.round(((l.plannedAmountRwf - l.usedAmountRwf) / l.plannedAmountRwf) * 100)
        : 0,
    severity: l.severity,
    isFrozen: l.isFrozen,
  }));
}
