import { prisma } from "../config/database";

/** Ensures tenant settings exist only — no demo fleet or sample learners. */
export async function seedTenantData(organizationId: string) {
  await prisma.transportSettings.upsert({
    where: { organizationId },
    update: {},
    create: {
      organizationId,
      schoolName: "School",
      academicYear: "2026-2027",
      term: "Term 1",
    },
  });
}

export async function writeAudit(
  organizationId: string,
  action: string,
  opts?: { actorUserId?: string; entityType?: string; entityId?: string; detail?: string }
) {
  await prisma.auditLog.create({
    data: {
      organizationId,
      action,
      actorUserId: opts?.actorUserId,
      entityType: opts?.entityType,
      entityId: opts?.entityId,
      detail: opts?.detail,
    },
  });
}
