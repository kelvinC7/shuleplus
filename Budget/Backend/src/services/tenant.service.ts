import { TenantStatus } from "@prisma/client";
import { prisma } from "../config/database";

export async function createTenant(input: {
  organizationId: string;
  organizationName: string;
  organizationCode?: string;
}) {
  const existing = await prisma.tenant.findFirst({
    where: {
      OR: [
        { organizationId: input.organizationId },
        ...(input.organizationCode ? [{ organizationCode: input.organizationCode }] : []),
      ],
    },
  });
  if (existing) return existing;

  return prisma.tenant.create({
    data: {
      organizationId: input.organizationId,
      organizationCode: input.organizationCode,
      organizationName: input.organizationName,
      status: TenantStatus.ACTIVE,
    },
  });
}
