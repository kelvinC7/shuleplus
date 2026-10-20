import {
  ApprovalAction,
  CircularStatus,
  Prisma,
} from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class NesaReviewService {
  async listCirculars(query: {
    organizationId?: string;
    status?: string;
    academicYear?: string;
    district?: string;
    search?: string;
    limit?: number;
  }) {
    const where: Prisma.CircularWhereInput = {};

    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.status) where.status = query.status.toUpperCase() as CircularStatus;
    if (query.academicYear) where.academicYear = query.academicYear;
    if (query.district) where.district = { equals: query.district, mode: 'insensitive' };
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { className: { contains: q, mode: 'insensitive' } },
        { authorName: { contains: q, mode: 'insensitive' } },
        { academicYear: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Exclude pure drafts from national NESA inbox unless explicitly requested
    if (!query.status) {
      where.status = { notIn: ['DRAFT'] };
    }

    const limit = Math.min(Math.max(query.limit ?? 200, 1), 500);
    const circulars = await prisma.circular.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const orgIds = [...new Set(circulars.map((c) => c.organizationId))];
    const tenants = await prisma.tenant.findMany({
      where: { organizationId: { in: orgIds } },
      include: { schoolProfile: true },
    });
    const tenantByOrg = new Map(tenants.map((t) => [t.organizationId, t]));

    return circulars.map((c) => {
      const tenant = tenantByOrg.get(c.organizationId);
      return {
        id: c.id,
        organizationId: c.organizationId,
        schoolName: tenant?.schoolProfile?.schoolName ?? tenant?.organizationName ?? 'School',
        schoolCode: tenant?.organizationCode ?? tenant?.schoolProfile?.schoolCode ?? null,
        province: c.province ?? tenant?.schoolProfile?.province ?? null,
        district: c.district ?? tenant?.schoolProfile?.district ?? null,
        sector: c.sector ?? tenant?.schoolProfile?.sector ?? null,
        academicYear: c.academicYear,
        term: c.term,
        className: c.className,
        status: c.status,
        nesaStatus: c.nesaStatus,
        totalFee: c.totalFee,
        requestIncrease: c.requestIncrease,
        increaseReason: c.increaseReason,
        authorName: c.authorName,
        publishedAt: c.publishedAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });
  }

  async getCircular(id: string) {
    const circular = await prisma.circular.findUnique({
      where: { id },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        approvals: { orderBy: { createdAt: 'asc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        versions: { orderBy: { version: 'desc' }, take: 10 },
      },
    });
    if (!circular) throw new AppError(404, 'Circular not found');

    const tenant = await prisma.tenant.findUnique({
      where: { organizationId: circular.organizationId },
      include: { schoolProfile: true },
    });

    return {
      ...circular,
      schoolName: tenant?.schoolProfile?.schoolName ?? tenant?.organizationName ?? 'School',
      schoolCode: tenant?.organizationCode ?? tenant?.schoolProfile?.schoolCode ?? null,
      schoolProvince: tenant?.schoolProfile?.province ?? circular.province,
      schoolDistrict: tenant?.schoolProfile?.district ?? circular.district,
      schoolSector: tenant?.schoolProfile?.sector ?? circular.sector,
    };
  }

  async addComment(id: string, content: string, authorName: string) {
    const circular = await prisma.circular.findUnique({ where: { id } });
    if (!circular) throw new AppError(404, 'Circular not found');
    if (!content.trim()) throw new AppError(400, 'Comment content is required');

    const comment = await prisma.circularComment.create({
      data: {
        circularId: id,
        content: content.trim(),
        authorName: authorName || 'NESA Officer',
      },
    });

    await prisma.circularActivity.create({
      data: {
        circularId: id,
        eventType: 'comment',
        description: `NESA note: ${content.trim().slice(0, 200)}`,
        actorName: authorName || 'NESA Officer',
      },
    });

    await prisma.notification.create({
      data: {
        organizationId: circular.organizationId,
        type: 'COMMENT_ADDED',
        title: 'NESA comment',
        message: `NESA left a note on ${circular.className} circular`,
        circularId: id,
      },
    });

    return comment;
  }

  async reject(id: string, reason: string, authorName: string) {
    if (!reason.trim()) throw new AppError(400, 'Rejection reason is required');
    const circular = await prisma.circular.findUnique({ where: { id } });
    if (!circular) throw new AppError(404, 'Circular not found');

    await prisma.$transaction([
      prisma.circular.update({
        where: { id },
        data: {
          status: 'REJECTED',
          nesaStatus: 'REJECTED',
          publishedAt: null,
          publishedBy: null,
        },
      }),
      prisma.circularApproval.updateMany({
        where: { circularId: id, stage: 'NESA' },
        data: {
          action: 'REJECTED' as ApprovalAction,
          reason: reason.trim(),
          notes: reason.trim(),
          approverName: authorName || 'NESA Officer',
          actedAt: new Date(),
        },
      }),
      prisma.circularActivity.create({
        data: {
          circularId: id,
          eventType: 'nesa_rejected',
          description: reason.trim(),
          actorName: authorName || 'NESA Officer',
        },
      }),
      prisma.notification.create({
        data: {
          organizationId: circular.organizationId,
          type: 'SYSTEM',
          title: 'Circular rejected by NESA',
          message: reason.trim().slice(0, 400),
          circularId: id,
        },
      }),
    ]);

    return this.getCircular(id);
  }

  async unpublish(id: string, reason: string, authorName: string) {
    if (!reason.trim()) throw new AppError(400, 'Reason is required to unpublish');
    const circular = await prisma.circular.findUnique({ where: { id } });
    if (!circular) throw new AppError(404, 'Circular not found');
    if (circular.status !== 'PUBLISHED' && circular.status !== 'APPROVED') {
      throw new AppError(400, 'Only published or approved circulars can be unpublished');
    }

    await prisma.$transaction([
      prisma.circular.update({
        where: { id },
        data: {
          status: 'REJECTED',
          nesaStatus: 'NOT_PUBLISHED',
          publishedAt: null,
          publishedBy: null,
        },
      }),
      prisma.circularActivity.create({
        data: {
          circularId: id,
          eventType: 'nesa_unpublished',
          description: reason.trim(),
          actorName: authorName || 'NESA Officer',
        },
      }),
      prisma.notification.create({
        data: {
          organizationId: circular.organizationId,
          type: 'SYSTEM',
          title: 'Circular unpublished by NESA',
          message: reason.trim().slice(0, 400),
          circularId: id,
        },
      }),
    ]);

    return this.getCircular(id);
  }

  async approve(id: string, notes: string | undefined, authorName: string) {
    const circular = await prisma.circular.findUnique({ where: { id } });
    if (!circular) throw new AppError(404, 'Circular not found');

    await prisma.circularApproval.updateMany({
      where: { circularId: id, stage: 'NESA' },
      data: {
        action: 'APPROVED',
        notes: notes?.trim() || null,
        reason: notes?.trim() || null,
        approverName: authorName || 'NESA Officer',
        actedAt: new Date(),
      },
    });

    await prisma.circular.update({
      where: { id },
      data: {
        status: 'APPROVED',
        nesaStatus: 'APPROVED',
      },
    });

    await prisma.circularActivity.create({
      data: {
        circularId: id,
        eventType: 'nesa_approved',
        description: notes?.trim() || 'Approved by NESA',
        actorName: authorName || 'NESA Officer',
      },
    });

    return this.getCircular(id);
  }

  async getPrintHtml(
    id: string,
    opts: { lang?: string; autoprint?: boolean; host?: string; protocol?: string }
  ) {
    const circular = await prisma.circular.findUnique({ where: { id } });
    if (!circular) throw new AppError(404, 'Circular not found');

    let profile = await prisma.schoolProfile.findUnique({
      where: { organizationId: circular.organizationId },
    });
    if (!profile) {
      const tenant = await prisma.tenant.findUnique({
        where: { organizationId: circular.organizationId },
      });
      profile = await prisma.schoolProfile.create({
        data: {
          organizationId: circular.organizationId,
          schoolName: tenant?.organizationName ?? 'School',
        },
      });
    }

    // Ensure QR assets via babyeyi service helper path — mint QR data URL directly
    const { createHash } = await import('node:crypto');
    const QRCode = (await import('qrcode')).default;
    const { env } = await import('../config/env');
    const qrHash =
      circular.qrHash ??
      createHash('sha256').update(`${circular.id}-${circular.version}`).digest('hex').slice(0, 16);
    const qrDataUrl = await QRCode.toDataURL(`${env.VERIFY_PUBLIC_URL}/${id}?h=${qrHash}`, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    if (!circular.qrHash) {
      await prisma.circular.update({
        where: { id },
        data: { qrHash },
      });
    }

    const host = opts.host || `localhost:${env.PORT}`;
    const proto = opts.protocol || 'http';
    const publicApiBase = `${proto}://${host}${env.API_PREFIX}`;

    const { buildBabyeyiPrintPageHtml } = await import('../utils/babyeyi-doc-html');
    return buildBabyeyiPrintPageHtml({
      circular: circular as Parameters<typeof buildBabyeyiPrintPageHtml>[0]['circular'],
      profile,
      publicApiBase,
      lang: opts.lang,
      autoprint: opts.autoprint,
      qrDataUrl,
    });
  }
}

export const nesaReviewService = new NesaReviewService();
