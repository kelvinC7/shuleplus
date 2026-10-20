import { TenantStatus } from "../generated/prisma";
import { prisma } from "../config/database";
import { seedTenantData } from "./seed.service";

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

  if (existing) {
    await seedTenantData(existing.organizationId);
    return existing;
  }

  const tenant = await prisma.tenant.create({
    data: {
      organizationId: input.organizationId,
      organizationCode: input.organizationCode,
      organizationName: input.organizationName,
      status: TenantStatus.ACTIVE,
    },
  });

  await seedTenantData(tenant.organizationId);
  return tenant;
}
