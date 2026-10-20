import { prisma } from "../config/database";

export async function appendAuditLog(input: {
  organizationId: string;
  budgetId?: string | null;
  action: string;
  actorId?: string | null;
  actorRole?: string | null;
  details?: unknown;
}) {
  return prisma.schoolBudgetAuditLog.create({
    data: {
      organizationId: input.organizationId,
      budgetId: input.budgetId ?? null,
      action: input.action,
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      details: input.details as object | undefined,
    },
  });
}
