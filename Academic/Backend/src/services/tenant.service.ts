import { TenantStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { parseSchoolCodeNumeric } from '../utils/student-code';

type SchoolProfilePayload = {
  district?: string | null;
  schoolCode?: string | null;
  location?: { district?: string | null };
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
    const schoolCode =
      input.schoolProfile?.schoolCode ??
      (input.organizationCode ? parseSchoolCodeNumeric(input.organizationCode) : null);

    const existing = await prisma.tenant.findFirst({
      where: {
        OR: [
          { organizationId: input.organizationId },
          ...(input.organizationCode ? [{ organizationCode: input.organizationCode }] : []),
        ],
      },
    });

    if (existing) {
      if ((!existing.district && district) || (!existing.schoolCode && schoolCode)) {
        return prisma.tenant.update({
          where: { id: existing.id },
          data: {
            district: existing.district ?? district ?? undefined,
            schoolCode: existing.schoolCode ?? schoolCode ?? undefined,
            organizationCode: existing.organizationCode ?? input.organizationCode,
          },
        });
      }
      return existing;
    }

    return prisma.tenant.create({
      data: {
        organizationId: input.organizationId,
        organizationCode: input.organizationCode,
        organizationName: input.organizationName,
        district: district ?? undefined,
        schoolCode: schoolCode ?? undefined,
        status: TenantStatus.ACTIVE,
      },
    });
  }

  async getTenant(organizationRef: string) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ organizationId: organizationRef }, { organizationCode: organizationRef }],
      },
    });
    if (!tenant) throw new AppError(404, 'Tenant not found');
    return tenant;
  }
}

export const tenantService = new TenantService();
