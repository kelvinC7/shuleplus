import { TenantStatus, WebsiteStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import type { IamSchoolProfile } from '../clients/iam.client';
import { resolveExternalAssetUrl } from '../utils/asset-url';
import { slugify } from './website.service';

export class TenantService {
  async createTenant(input: {
    organizationId: string;
    organizationName: string;
    organizationCode?: string;
    schoolProfile?: IamSchoolProfile | null;
  }) {
    const profile = input.schoolProfile ?? null;
    const displayName = profile?.schoolName?.trim() || input.organizationName;

    const existing = await prisma.tenant.findFirst({
      where: {
        OR: [
          { organizationId: input.organizationId },
          ...(input.organizationCode ? [{ organizationCode: input.organizationCode }] : []),
        ],
      },
    });

    const tenant = existing
      ? await prisma.tenant.update({
          where: { id: existing.id },
          data: {
            organizationCode: input.organizationCode ?? existing.organizationCode,
            organizationName: displayName,
            status: TenantStatus.ACTIVE,
          },
        })
      : await prisma.tenant.create({
          data: {
            organizationId: input.organizationId,
            organizationCode: input.organizationCode,
            organizationName: displayName,
            status: TenantStatus.ACTIVE,
          },
        });

    const site = await prisma.schoolWebsite.findUnique({
      where: { organizationId: input.organizationId },
    });

    if (!site) {
      await prisma.schoolWebsite.create({
        data: {
          organizationId: input.organizationId,
          organizationName: displayName,
          slug: slugify(displayName),
          title: displayName,
          logoUrl: resolveExternalAssetUrl(profile?.logoUrl),
          email: profile?.email?.trim() || null,
          phone: profile?.phone?.trim() || null,
          address: profile?.address?.trim() || null,
          about: profile?.schoolMotto?.trim() || null,
          primaryColor: '#001121',
          secondaryColor: '#f59e0b',
          status: WebsiteStatus.DRAFT,
          template: 'vschool',
          templateName: 'vSchool Classic',
        },
      });
    } else if (!site.logoUrl && profile?.logoUrl) {
      await prisma.schoolWebsite.update({
        where: { organizationId: input.organizationId },
        data: {
          logoUrl: resolveExternalAssetUrl(profile.logoUrl),
          ...(site.title === 'My School' && displayName ? { title: displayName, organizationName: displayName } : {}),
        },
      });
    }

    return tenant;
  }
}

export const tenantService = new TenantService();
