import { TenantStatus } from '../generated/prisma';
import { prisma } from '../config/database';

type SchoolProfilePayload = {
  district?: string | null;
  sector?: string | null;
  schoolCode?: string | null;
  location?: { district?: string | null; sector?: string | null };
  organizationCode?: string | null;
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
    const schoolCode = input.schoolProfile?.schoolCode ?? null;

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
          district: existing.district ?? district ?? undefined,
          sector: existing.sector ?? sector ?? undefined,
          schoolCode: existing.schoolCode ?? schoolCode ?? undefined,
          organizationCode: existing.organizationCode ?? input.organizationCode,
        },
      });
    }

    return prisma.tenant.create({
      data: {
        organizationId: input.organizationId,
        organizationCode: input.organizationCode,
        organizationName: input.organizationName,
        district: district ?? undefined,
        sector: sector ?? undefined,
        schoolCode: schoolCode ?? undefined,
        status: TenantStatus.ACTIVE,
      },
    });
  }
}

export const tenantService = new TenantService();
