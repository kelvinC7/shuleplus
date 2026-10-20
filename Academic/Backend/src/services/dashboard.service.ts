import { prisma } from '../config/database';
import { fetchIamOrganizationProfile, resolveIamAssetUrl } from '../clients/iam.client';

export class DashboardService {
  async getSummary(organizationId: string) {
    const [studentCount, classCount, activeEnrollments, tenant, profile] = await Promise.all([
      prisma.student.count({ where: { organizationId, status: 'ACTIVE' } }),
      prisma.class.count({ where: { organizationId } }),
      prisma.enrollment.count({ where: { organizationId, isCurrent: true, status: 'ACTIVE' } }),
      prisma.tenant.findUnique({ where: { organizationId } }),
      fetchIamOrganizationProfile(organizationId),
    ]);

    return {
      organizationId,
      organizationName: tenant?.organizationName ?? profile?.schoolName ?? 'Unknown',
      studentCount,
      classCount,
      activeEnrollments,
      status: tenant?.status ?? 'UNKNOWN',
      logoUrl: resolveIamAssetUrl(profile?.logoUrl),
    };
  }
}

export const dashboardService = new DashboardService();
