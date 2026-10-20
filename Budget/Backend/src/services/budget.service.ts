import { BudgetStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { fetchIamAcademicSettings } from "../clients/iam.client";
import { appendAuditLog } from "./audit.service";
import {
  BUDGET_TYPES,
  CATEGORIES,
  DEPARTMENTS,
  INCOME_PRESETS,
  TERMS,
  netFromConfig,
  usageSeverity,
} from "./constants";

type IncomeInput = {
  incomeSourceKey?: string;
  income_source_key?: string;
  expectedAmountRwf?: number;
  expected_amount_rwf?: number;
  configJson?: {
    calculationType?: string;
    quantity?: number;
    unitAmount?: number;
    deductions?: Array<{ label?: string; amount?: number }>;
  } | null;
  config_json?: IncomeInput["configJson"];
};

function mapBudget(b: {
  id: string;
  organizationId: string;
  budgetCode: string;
  title: string;
  academicYear: string;
  term: string;
  budgetType: string;
  startDate: Date | null;
  endDate: Date | null;
  description: string | null;
  preparedByName: string | null;
  status: BudgetStatus;
  totalExpectedIncomeRwf: number;
  totalAllocatedRwf: number;
  submittedAt: Date | null;
  managerReviewedByName: string | null;
  managerReviewedAt: Date | null;
  managerNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  incomeSources?: Array<{
    id: string;
    incomeSourceKey: string;
    expectedAmountRwf: number;
    configJson: unknown;
  }>;
  lines?: Array<{
    id: string;
    lineName: string;
    category: string;
    department: string;
    priority: string | null;
    plannedAmountRwf: number;
    usedAmountRwf: number;
    isFrozen: boolean;
    notes: string | null;
  }>;
}) {
  const spent = (b.lines ?? []).reduce((s, l) => s + l.usedAmountRwf, 0);
  return {
    ...b,
    unallocatedRwf: Math.max(0, b.totalExpectedIncomeRwf - b.totalAllocatedRwf),
    totalSpentRwf: spent,
    availableRwf: Math.max(0, b.totalExpectedIncomeRwf - spent),
    allocationPercent:
      b.totalExpectedIncomeRwf > 0
        ? Math.round((b.totalAllocatedRwf / b.totalExpectedIncomeRwf) * 100)
        : 0,
  };
}

async function nextBudgetCode(organizationId: string, academicYear: string) {
  const year = academicYear.split("-")[0] || String(new Date().getFullYear());
  const count = await prisma.schoolBudget.count({
    where: { organizationId, academicYear },
  });
  return `BGT-${year}-${String(count + 1).padStart(3, "0")}`;
}

export async function getOptions(organizationId: string) {
  const year = new Date().getFullYear();
  const fallbackYear = `${year}-${year + 1}`;
  const iam = await fetchIamAcademicSettings(organizationId);

  const academicYears = iam?.academicYears?.length
    ? iam.academicYears
    : [fallbackYear, `${year - 1}-${year}`, `${year + 1}-${year + 2}`];
  const terms = iam?.terms?.length ? iam.terms : [...TERMS];
  const currentAcademicYear = iam?.currentAcademicYear ?? academicYears[0] ?? fallbackYear;
  const currentTerm = iam?.currentTerm ?? terms[0] ?? "Term 1";
  const academicYearForCode = currentAcademicYear;

  return {
    budgetTypes: [...BUDGET_TYPES],
    terms,
    statuses: Object.values(BudgetStatus),
    incomePresets: [...INCOME_PRESETS],
    categories: [...CATEGORIES],
    departments: [...DEPARTMENTS],
    academicYears,
    currentAcademicYear,
    currentTerm,
    nextCode: await nextBudgetCode(organizationId, academicYearForCode),
  };
}

export async function listBudgets(organizationId: string, status?: string) {
  const rows = await prisma.schoolBudget.findMany({
    where: {
      organizationId,
      ...(status ? { status: status as BudgetStatus } : {}),
    },
    include: { incomeSources: true, lines: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapBudget);
}

export async function resolveActiveBudgetId(organizationId: string) {
  const approved = await prisma.schoolBudget.findFirst({
    where: { organizationId, status: BudgetStatus.approved },
    orderBy: { updatedAt: "desc" },
  });
  if (approved) return approved.id;
  const pending = await prisma.schoolBudget.findFirst({
    where: { organizationId, status: BudgetStatus.pending_approval },
    orderBy: { updatedAt: "desc" },
  });
  return pending?.id ?? null;
}

export async function getBudget(organizationId: string, id: string) {
  const b = await prisma.schoolBudget.findFirst({
    where: { id, organizationId },
    include: { incomeSources: true, lines: { include: { usages: true } } },
  });
  if (!b) throw new AppError(404, "Budget not found");
  return mapBudget(b);
}

function normalizeIncome(sources: IncomeInput[]) {
  return sources.map((s) => {
    const key = String(s.incomeSourceKey ?? s.income_source_key ?? "").trim();
    if (!key) throw new AppError(400, "income_source_key is required");
    const configJson = s.configJson ?? s.config_json ?? null;
    const expected = netFromConfig({
      expectedAmountRwf: Number(s.expectedAmountRwf ?? s.expected_amount_rwf ?? 0),
      configJson,
    });
    return { incomeSourceKey: key, expectedAmountRwf: expected, configJson };
  });
}

export async function createBudget(
  organizationId: string,
  actor: { id?: string; email?: string; roles?: string[] },
  input: {
    title: string;
    academicYear?: string;
    academic_year?: string;
    term: string;
    budgetType?: string;
    budget_type?: string;
    startDate?: string;
    start_date?: string;
    endDate?: string;
    end_date?: string;
    description?: string;
    preparedByName?: string;
    prepared_by_name?: string;
    submit?: boolean;
    incomeSources?: IncomeInput[];
    income_sources?: IncomeInput[];
  }
) {
  const title = String(input.title ?? "").trim();
  if (!title) throw new AppError(400, "title is required");
  const academicYear = String(input.academicYear ?? input.academic_year ?? "").trim();
  if (!academicYear) throw new AppError(400, "academic_year is required");
  const term = String(input.term ?? "").trim();
  const budgetType = String(input.budgetType ?? input.budget_type ?? "Term Budget");
  const income = normalizeIncome(input.incomeSources ?? input.income_sources ?? []);
  const totalExpected = income.reduce((s, i) => s + i.expectedAmountRwf, 0);
  const submit = Boolean(input.submit);
  const code = await nextBudgetCode(organizationId, academicYear);

  const created = await prisma.schoolBudget.create({
    data: {
      organizationId,
      budgetCode: code,
      title,
      academicYear,
      term,
      budgetType,
      startDate: input.startDate || input.start_date ? new Date(String(input.startDate ?? input.start_date)) : null,
      endDate: input.endDate || input.end_date ? new Date(String(input.endDate ?? input.end_date)) : null,
      description: input.description,
      preparedByName: input.preparedByName ?? input.prepared_by_name ?? actor.email,
      status: submit ? BudgetStatus.pending_approval : BudgetStatus.draft,
      totalExpectedIncomeRwf: totalExpected,
      totalAllocatedRwf: 0,
      submittedAt: submit ? new Date() : null,
      createdById: actor.id,
      incomeSources: {
        create: income.map((i) => ({
          incomeSourceKey: i.incomeSourceKey,
          expectedAmountRwf: i.expectedAmountRwf,
          configJson: i.configJson as Prisma.InputJsonValue,
        })),
      },
    },
    include: { incomeSources: true, lines: true },
  });

  await appendAuditLog({
    organizationId,
    budgetId: created.id,
    action: submit ? "submit" : "create",
    actorId: actor.id,
    actorRole: actor.roles?.[0],
    details: { budgetCode: created.budgetCode, totalExpected },
  });

  return mapBudget(created);
}

export async function updateBudget(
  organizationId: string,
  id: string,
  actor: { id?: string; email?: string; roles?: string[] },
  input: Parameters<typeof createBudget>[2]
) {
  const existing = await prisma.schoolBudget.findFirst({ where: { id, organizationId } });
  if (!existing) throw new AppError(404, "Budget not found");
  if (existing.status !== BudgetStatus.draft && existing.status !== BudgetStatus.rejected) {
    throw new AppError(400, "Only draft or rejected budgets can be edited");
  }

  const income = normalizeIncome(input.incomeSources ?? input.income_sources ?? []);
  const totalExpected = income.reduce((s, i) => s + i.expectedAmountRwf, 0);
  if (totalExpected < existing.totalAllocatedRwf) {
    throw new AppError(400, "Expected income cannot be less than already allocated amount");
  }
  const submit = Boolean(input.submit);

  await prisma.schoolBudgetIncomeSource.deleteMany({ where: { budgetId: id } });

  const updated = await prisma.schoolBudget.update({
    where: { id },
    data: {
      title: String(input.title ?? existing.title).trim(),
      academicYear: String(input.academicYear ?? input.academic_year ?? existing.academicYear),
      term: String(input.term ?? existing.term),
      budgetType: String(input.budgetType ?? input.budget_type ?? existing.budgetType),
      description: input.description ?? existing.description,
      preparedByName:
        input.preparedByName ?? input.prepared_by_name ?? existing.preparedByName,
      startDate:
        input.startDate || input.start_date
          ? new Date(String(input.startDate ?? input.start_date))
          : existing.startDate,
      endDate:
        input.endDate || input.end_date
          ? new Date(String(input.endDate ?? input.end_date))
          : existing.endDate,
      totalExpectedIncomeRwf: totalExpected,
      status: submit ? BudgetStatus.pending_approval : BudgetStatus.draft,
      submittedAt: submit ? new Date() : existing.submittedAt,
      managerNotes: submit ? null : existing.managerNotes,
      incomeSources: {
        create: income.map((i) => ({
          incomeSourceKey: i.incomeSourceKey,
          expectedAmountRwf: i.expectedAmountRwf,
          configJson: i.configJson as Prisma.InputJsonValue,
        })),
      },
    },
    include: { incomeSources: true, lines: true },
  });

  await appendAuditLog({
    organizationId,
    budgetId: id,
    action: submit ? "submit" : "update",
    actorId: actor.id,
    actorRole: actor.roles?.[0],
  });

  return mapBudget(updated);
}

export async function reviewBudget(
  organizationId: string,
  id: string,
  actor: { id?: string; email?: string; roles?: string[] },
  input: { decision: string; notes?: string }
) {
  const existing = await prisma.schoolBudget.findFirst({ where: { id, organizationId } });
  if (!existing) throw new AppError(404, "Budget not found");
  if (existing.status !== BudgetStatus.pending_approval) {
    throw new AppError(400, "Only pending budgets can be reviewed");
  }

  const decision = String(input.decision ?? "").toLowerCase();
  let status: BudgetStatus;
  if (decision === "approve") status = BudgetStatus.approved;
  else if (decision === "reject") {
    if (!input.notes?.trim()) throw new AppError(400, "notes are required for reject");
    status = BudgetStatus.rejected;
  } else if (decision === "revision") status = BudgetStatus.draft;
  else if (decision === "cancel") {
    if (!input.notes?.trim()) throw new AppError(400, "notes are required for cancel");
    status = BudgetStatus.closed;
  } else {
    throw new AppError(400, "decision must be approve|reject|revision|cancel");
  }

  const updated = await prisma.schoolBudget.update({
    where: { id },
    data: {
      status,
      managerNotes: input.notes ?? null,
      managerReviewedAt: new Date(),
      managerReviewedById: actor.id,
      managerReviewedByName: actor.email,
    },
    include: { incomeSources: true, lines: true },
  });

  await appendAuditLog({
    organizationId,
    budgetId: id,
    action: `review:${decision}`,
    actorId: actor.id,
    actorRole: actor.roles?.[0],
    details: { notes: input.notes },
  });

  return mapBudget(updated);
}

export async function deleteBudget(
  organizationId: string,
  id: string,
  actor: { id?: string; email?: string; roles?: string[] }
) {
  const existing = await prisma.schoolBudget.findFirst({
    where: { id, organizationId },
    include: { lines: true },
  });
  if (!existing) throw new AppError(404, "Budget not found");
  if (existing.status !== BudgetStatus.draft && existing.status !== BudgetStatus.rejected) {
    throw new AppError(400, "Only draft or rejected budgets can be deleted");
  }
  if (existing.lines.some((line) => line.usedAmountRwf > 0)) {
    throw new AppError(400, "Cannot delete a budget that has recorded spending");
  }
  if (existing.totalAllocatedRwf > 0 || existing.lines.length > 0) {
    throw new AppError(400, "Remove budget lines before deleting this budget");
  }

  await prisma.schoolBudget.delete({ where: { id } });

  await appendAuditLog({
    organizationId,
    budgetId: id,
    action: "delete",
    actorId: actor.id,
    actorRole: actor.roles?.[0],
    details: { budgetCode: existing.budgetCode, title: existing.title },
  });
}

export async function getDashboard(organizationId: string, budgetId?: string) {
  const id = budgetId || (await resolveActiveBudgetId(organizationId));
  const budgets = await listBudgets(organizationId);
  if (!id) {
    return {
      organizationName: (await prisma.tenant.findUnique({ where: { organizationId } }))
        ?.organizationName,
      activeBudgetId: null,
      kpis: {
        expected: 0,
        allocated: 0,
        spent: 0,
        available: 0,
        unallocated: 0,
        budgets: budgets.length,
        pending: budgets.filter((b) => b.status === "pending_approval").length,
      },
      byDepartment: [],
      byCategory: [],
      alerts: [],
      recentBudgets: budgets.slice(0, 8),
      lines: [],
    };
  }

  const budget = await getBudget(organizationId, id);
  const lines = budget.lines ?? [];
  const spent = lines.reduce((s, l) => s + l.usedAmountRwf, 0);

  const deptMap = new Map<string, { planned: number; used: number }>();
  const catMap = new Map<string, { planned: number; used: number }>();
  for (const l of lines) {
    const d = deptMap.get(l.department) ?? { planned: 0, used: 0 };
    d.planned += l.plannedAmountRwf;
    d.used += l.usedAmountRwf;
    deptMap.set(l.department, d);
    const c = catMap.get(l.category) ?? { planned: 0, used: 0 };
    c.planned += l.plannedAmountRwf;
    c.used += l.usedAmountRwf;
    catMap.set(l.category, c);
  }

  const alerts = lines
    .map((l) => ({
      lineId: l.id,
      lineName: l.lineName,
      severity: usageSeverity(l.usedAmountRwf, l.plannedAmountRwf),
      used: l.usedAmountRwf,
      planned: l.plannedAmountRwf,
    }))
    .filter((a) => a.severity !== "Active");

  return {
    organizationName: (await prisma.tenant.findUnique({ where: { organizationId } }))
      ?.organizationName,
    activeBudgetId: id,
    budget,
    kpis: {
      expected: budget.totalExpectedIncomeRwf,
      allocated: budget.totalAllocatedRwf,
      spent,
      available: Math.max(0, budget.totalExpectedIncomeRwf - spent),
      unallocated: Math.max(0, budget.totalExpectedIncomeRwf - budget.totalAllocatedRwf),
      budgets: budgets.length,
      pending: budgets.filter((b) => b.status === "pending_approval").length,
    },
    byDepartment: [...deptMap.entries()].map(([label, v]) => ({
      label,
      planned: v.planned,
      used: v.used,
      remaining: Math.max(0, v.planned - v.used),
    })),
    byCategory: [...catMap.entries()].map(([label, v]) => ({
      label,
      planned: v.planned,
      used: v.used,
    })),
    alerts,
    recentBudgets: budgets.slice(0, 8),
    lines,
  };
}

export async function managerOverview(organizationId: string) {
  const pending = await listBudgets(organizationId, "pending_approval");
  const approved = await listBudgets(organizationId, "approved");
  return {
    pending,
    approved: approved.slice(0, 10),
    counts: {
      pending: pending.length,
      approved: approved.length,
      rejected: (await listBudgets(organizationId, "rejected")).length,
    },
  };
}

export async function listAuditLogs(organizationId: string, budgetId?: string) {
  return prisma.schoolBudgetAuditLog.findMany({
    where: {
      organizationId,
      ...(budgetId ? { budgetId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
