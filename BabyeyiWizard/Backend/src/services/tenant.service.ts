import { Prisma, SchoolOwnership, TenantStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { fetchIamSchoolProfile, type IamSchoolProfile } from '../clients/iam.client';
import { seedService } from './seed.service';

function mapOwnership(value?: string | null): SchoolOwnership {
  const raw = (value ?? '').toUpperCase().replace(/[-\s]/g, '_');
  if (raw.includes('PRIVATE')) return SchoolOwnership.PRIVATE;
  if (raw.includes('AIDED')) return SchoolOwnership.GOVERNMENT_AIDED;
  return SchoolOwnership.GOVERNMENT;
}

/**
 * IAM branding assets live on the IAM server filesystem.
 * Convert relative paths like "/uploads/xxx.png" to absolute URLs
 * so the BabyeyiWizard frontend can load them cross-origin.
 */
function resolveIamAssetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  const normalised = path.startsWith('/') ? path : `/${path}`;
  return `${env.IAM_ORIGIN}${normalised}`;
}

export class TenantService {
  async createTenant(input: {
    organizationId: string;
    organizationName: string;
    organizationCode?: string;
    schoolProfile?: IamSchoolProfile;
  }) {
    const existing = await prisma.tenant.findFirst({
      where: {
        OR: [
          { organizationId: input.organizationId },
          ...(input.organizationCode ? [{ organizationCode: input.organizationCode }] : []),
        ],
      },
    });

    const tenant =
      existing ??
      (await prisma.tenant.create({
        data: {
          organizationId: input.organizationId,
          organizationCode: input.organizationCode,
          organizationName: input.organizationName,
          status: TenantStatus.ACTIVE,
        },
      }));

    // Seed/profile must not fail IAM provisioning once the tenant row exists
    try {
      await seedService.seedTenantData(tenant.organizationId, tenant.organizationName);
    } catch (err) {
      console.error('[Babyeyi] seedTenantData failed (tenant kept):', err);
    }

    try {
      const profileSource =
        input.schoolProfile ?? (await fetchIamSchoolProfile(input.organizationId));
      if (profileSource) {
        await this.syncSchoolProfileFromIam(tenant.organizationId, profileSource);
      }
    } catch (err) {
      console.error('[Babyeyi] school profile sync failed (tenant kept):', err);
    }

    return tenant;
  }

  async syncSchoolProfileFromIam(organizationId: string, source: IamSchoolProfile) {
    const data = {
      schoolName: source.schoolName,
      schoolCode: source.organizationCode ?? undefined,
      ownershipType: mapOwnership(source.ownershipType ?? source.schoolCategory),
      academicYear: source.academicYear ?? '2025-2026',
      principalName: source.principalName ?? undefined,
      province: source.province ?? undefined,
      district: source.district ?? undefined,
      sector: source.sector ?? undefined,
      cell: source.cell ?? undefined,
      village: source.village ?? undefined,
      logoPath: resolveIamAssetUrl(source.logoUrl),
      stampPath: resolveIamAssetUrl(source.stampUrl),
      signaturePath: resolveIamAssetUrl(source.signatureUrl),
      verificationStatus: 'verified',
      schoolStatus: 'active',
      settings: {
        schoolCategory: source.schoolCategory,
        schoolProgram: source.schoolProgram,
        educationLevels: source.educationLevels ?? [],
        curriculum: source.curriculum,
        schoolMotto: source.schoolMotto,
        schoolShift: source.schoolShift,
        leaders: source.leaders ?? [],
        contact: {
          email: source.email,
          phone: source.phone,
          website: source.website,
          address: source.address,
        },
      } as Prisma.InputJsonValue,
    };

    await prisma.schoolProfile.upsert({
      where: { organizationId },
      create: { organizationId, ...data },
      update: data,
    });
  }

  async syncFromIam(organizationId: string) {
    const profile = await fetchIamSchoolProfile(organizationId);
    if (!profile) return null;
    await this.syncSchoolProfileFromIam(organizationId, profile);
    return profile;
  }
}

export const tenantService = new TenantService();
