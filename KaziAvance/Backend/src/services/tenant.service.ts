import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error";

export async function createTenant(input: {
  organizationId: string;
  organizationName: string;
  organizationCode?: string;
}) {
  const existing = await prisma.tenant.findFirst({
    where: {
      OR: [
        { organizationId: input.organizationId },
        ...(input.organizationCode ? [{ organizationCode: input.organizationCode }] : [])
      ]
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.tenant.create({
    data: {
      organizationId: input.organizationId,
      organizationCode: input.organizationCode,
      organizationName: input.organizationName,
      status: "ACTIVE"
    }
  });
}

export async function getActiveTenant(organizationRef: string) {
  const tenant = await prisma.tenant.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ organizationId: organizationRef }, { organizationCode: organizationRef }]
    }
  });

  if (!tenant) {
    throw new AppError(403, "Tenant not provisioned for this organization");
  }

  return tenant;
}

export async function ensureTenant(organizationId: string, organizationName = "Organization") {
  return prisma.tenant.upsert({
    where: { organizationId },
    update: {},
    create: {
      organizationId,
      organizationName,
      status: "ACTIVE",
    },
  });
}
