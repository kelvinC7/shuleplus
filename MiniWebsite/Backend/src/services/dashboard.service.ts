import { prisma } from '../config/database';
import { publicSiteUrl, websiteService } from './website.service';

export class DashboardService {
  async getSummary(organizationId: string) {
    const site = await websiteService.getOrCreateSite(organizationId);

    const [applicantCount, newCount, reviewedCount, contactedCount, acceptedCount, pageCount, tenant] =
      await Promise.all([
        prisma.applicant.count({ where: { websiteId: site.id } }),
        prisma.applicant.count({ where: { websiteId: site.id, status: 'NEW' } }),
        prisma.applicant.count({ where: { websiteId: site.id, status: 'REVIEWED' } }),
        prisma.applicant.count({ where: { websiteId: site.id, status: 'CONTACTED' } }),
        prisma.applicant.count({ where: { websiteId: site.id, status: 'ACCEPTED' } }),
        prisma.websitePage.count({ where: { websiteId: site.id } }),
        prisma.tenant.findUnique({ where: { organizationId } }),
      ]);

    return {
      organizationId,
      organizationName: tenant?.organizationName ?? site.organizationName,
      websiteId: site.id,
      websiteStatus: site.status,
      websiteTitle: site.title,
      slug: site.slug,
      publicUrl: publicSiteUrl(site.slug),
      published: site.status === 'PUBLISHED',
      publishedAt: site.publishedAt,
      applicantCount,
      newCount,
      reviewedCount,
      contactedCount,
      acceptedCount,
      rejectedCount: await prisma.applicant.count({
        where: { websiteId: site.id, status: 'REJECTED' },
      }),
      pageCount,
      status: tenant?.status ?? 'UNKNOWN',
    };
  }
}

export const dashboardService = new DashboardService();
