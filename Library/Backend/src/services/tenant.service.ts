import { prisma } from '../config/database';

export async function ensureTenant(organizationId: string, organizationName?: string) {
  const existing = await prisma.tenant.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return prisma.tenant.create({
    data: {
      organizationId,
      organizationName: organizationName ?? organizationId,
    },
  });
}
