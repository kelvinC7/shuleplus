import { TenantStatus } from '../generated/prisma';
import { prisma } from '../config/database';

type SchoolProfilePayload = {
  district?: string | null;
  sector?: string | null;
  location?: { district?: string | null; sector?: string | null };
};

export class TenantService {
  async createTenant(input: {
    organizationId: string;
    organizationName: string;
    organizationCode?: string;
    schoolProfile?: SchoolProfilePayload | null;
  }) {
    const district =
      input.schoolProfile?.district ??
      input.schoolProfile?.location?.district ??
      null;
    const sector =
      input.schoolProfile?.sector ??
      input.schoolProfile?.location?.sector ??
      null;

    const existing = await prisma.tenant.findFirst({
      where: {
        OR: [
          { organizationId: input.organizationId },
          ...(input.organizationCode ? [{ organizationCode: input.organizationCode }] : []),
        ],
      },
    });

    if (existing) {
      return prisma.tenant.update({
        where: { id: existing.id },
        data: {
          organizationName: input.organizationName,
          district: existing.district ?? district ?? undefined,
          sector: existing.sector ?? sector ?? undefined,
          organizationCode: existing.organizationCode ?? input.organizationCode,
        },
      });
    }

    return prisma.tenant.create({
      data: {
        organizationId: input.organizationId,
        organizationName: input.organizationName,
        organizationCode: input.organizationCode,
        district,
        sector,
        status: TenantStatus.ACTIVE,
      },
    });
  }
}

export const tenantService = new TenantService();
