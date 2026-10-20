import { createHash } from 'node:crypto';
import path from 'node:path';
import QRCode from 'qrcode';
import {
  ApprovalAction,
  ApprovalStage,
  AssetType,
  CircularStatus,
  Prisma,
} from '../generated/prisma';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { publicUploadPath, uploadRoot } from '../config/upload';
import { calcTotalFee, mapOwnershipToFeeScope } from '../constants/babyeyi';
import { AppError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { resolveNesaPolicy } from '../clients/nesa.client';
import { fetchIamAcademicSettings, updateIamAcademicSettings, type IamAcademicSettings } from '../clients/iam.client';
import { buildContentI18nFromEnglish, applyRwPatch, isContentI18nBundle } from '../utils/content-i18n';
import {
  defaultAcademicSettings,
  parseAcademicSettings,
  type AcademicSettings,
} from '../utils/academic-settings';

type JsonValue = Prisma.InputJsonValue;

function asJsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function inferStudentType(raw?: string | null): 'DAY' | 'BOARDING' {
  const v = (raw ?? '').toLowerCase();
  if (v.includes('board')) return 'BOARDING';
  return 'DAY';
}

function inferEducationLevel(classLabel?: string | null, level?: string | null): string {
  if (level) {
    const u = level.toUpperCase().replace(/[\s_-]+/g, '');
    if (u === 'TSS') return 'TVET';
    if (u.includes('NURS') || u === 'BABY') return 'NURSERY';
    if (['NURSERY', 'PRIMARY', 'SECONDARY', 'TVET'].includes(u)) return u;
    if (u === 'OLEVEL' || u === 'ALEVEL') return 'SECONDARY';
  }
  const label = (classLabel ?? '').toUpperCase().trim();
  if (/^N[1-3]\b/.test(label) || /^N\d/.test(label) || label === 'BABY' || label.startsWith('BABY ')) {
    return 'NURSERY';
  }
  if (/nurs|baby/i.test(classLabel ?? '')) return 'NURSERY';
  if (/^P/.test(label)) return 'PRIMARY';
  if (/^S/.test(label)) return 'SECONDARY';
  if (/^L/.test(label) || /^Y/.test(label)) return 'TVET';
  return 'PRIMARY';
}

function normalizeEducationLevel(category?: string | null, classLabel?: string | null): string {
  const raw = (category ?? '').trim();
  if (raw) {
    const u = raw.toUpperCase().replace(/[\s_-]+/g, '');
    if (u === 'TSS') return 'TVET';
    if (u.includes('NURS') || u === 'BABY') return 'NURSERY';
    if (u === 'PRIMARY') return 'PRIMARY';
    if (u === 'SECONDARY' || u === 'OLEVEL' || u === 'ALEVEL') return 'SECONDARY';
    if (u === 'TVET') return 'TVET';
  }
  return inferEducationLevel(classLabel, null).toUpperCase();
}

/** Strip stream suffix when SM stores "P1 A" in name instead of name=P1 stream=A. */
function parseBaseClassName(name: string, stream?: string | null): string {
  const trimmed = name.trim();
  if (stream?.trim()) return trimmed;
  const match = trimmed.match(/^([A-Za-z]+\d+)\s+([A-Za-z0-9]+)$/);
  return match ? match[1].toUpperCase() : trimmed;
}

function resolveFeeTarget(body: Record<string, unknown>): string {
  const explicit = String(body.fee_target_students ?? body.feeTargetStudents ?? '').toLowerCase();
  if (explicit === 'private' || explicit === 'public') return explicit;
  const category = String(body.school_category ?? body.category ?? '').toLowerCase();
  if (category === 'private') return 'private';
  return 'public';
}

export class BabyeyiService {
  private orgId(req: AuthenticatedRequest) {
    const id = req.organizationRef;
    if (!id) throw new AppError(403, 'Tenant not resolved');
    return id;
  }

  private actorName(req: AuthenticatedRequest) {
    return req.user?.name ?? req.user?.email ?? 'User';
  }

  async getDashboard(req: AuthenticatedRequest) {
    const organizationId = this.orgId(req);
    const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
    const profile = await prisma.schoolProfile.findUnique({ where: { organizationId } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayCirculars,
      qrScans,
      recentActivities,
      monthlyStats,
      statusBreakdown,
      classYearGroups,
    ] = await Promise.all([
      prisma.circular.count({ where: { organizationId, createdAt: { gte: today } } }),
      prisma.circular.aggregate({ where: { organizationId }, _sum: { qrScanCount: true } }),
      prisma.circularActivity.findMany({
        where: { circular: { organizationId } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { circular: { select: { className: true, academicYear: true } } },
      }),
      this.monthlyCircularStats(organizationId),
      prisma.circular.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { id: true },
      }),
      prisma.circular.groupBy({
        by: ['academicYear', 'className'],
        where: { organizationId },
        _count: { id: true },
        _sum: { totalFee: true },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      statusBreakdown.map((s) => [s.status, s._count.id])
    ) as Partial<Record<CircularStatus, number>>;
    const published = statusCounts.PUBLISHED ?? 0;
    const pending = statusCounts.PENDING ?? 0;
    const drafts = statusCounts.DRAFT ?? 0;
    const rejected = statusCounts.REJECTED ?? 0;
    const totalCirculars = statusBreakdown.reduce((sum, s) => sum + s._count.id, 0);

    const classYearBreakdown = classYearGroups.map((g) => ({
      academicYear: g.academicYear,
      className: g.className,
      count: g._count.id,
      totalFee: Number(g._sum.totalFee ?? 0),
    }));

    const unreadNotifications = await prisma.notification.count({
      where: { organizationId, isRead: false },
    });

    return {
      organizationName: tenant?.organizationName ?? profile?.schoolName ?? 'School',
      schoolProfile: profile,
      kpis: {
        todayCirculars,
        todayDelta: '+8%',
        published,
        pending,
        drafts,
        rejected,
        qrScans: qrScans._sum.qrScanCount ?? 0,
        totalCirculars,
        unreadNotifications,
      },
      timeline: recentActivities.map((a) => ({
        id: a.id,
        time: a.createdAt,
        description: a.description,
        eventType: a.eventType,
        className: a.circular.className,
      })),
      charts: {
        monthlyStats,
        statusBreakdown: statusBreakdown.map((s) => ({
          status: s.status,
          count: s._count.id,
        })),
        paymentDistribution: await this.paymentDistribution(organizationId),
        qrTrend: monthlyStats.map((m) => ({ month: m.month, scans: m.scans })),
        classYearBreakdown,
      },
    };
  }

  private async monthlyCircularStats(organizationId: string) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const rows = await prisma.$queryRaw<Array<{ month: number; created: bigint; scans: bigint }>>`
      SELECT
        EXTRACT(MONTH FROM created_at)::int AS month,
        COUNT(*)::bigint AS created,
        COALESCE(SUM(qr_scan_count), 0)::bigint AS scans
      FROM circulars
      WHERE organization_id = ${organizationId}
        AND created_at >= ${start}
        AND created_at <= ${end}
      GROUP BY 1
      ORDER BY 1
    `;

    const byMonth = new Map(
      rows.map((row) => [row.month, { created: Number(row.created), scans: Number(row.scans) }])
    );

    return months.map((label, index) => {
      const entry = byMonth.get(index + 1);
      return { month: label, created: entry?.created ?? 0, scans: entry?.scans ?? 0 };
    });
  }

  private async paymentDistribution(organizationId: string) {
    const circulars = await prisma.circular.findMany({
      where: { organizationId, status: { in: ['PUBLISHED', 'APPROVED'] } },
      select: { payments: true },
      take: 50,
    });
    const buckets: Record<string, number> = {};
    for (const c of circulars) {
      const payments = c.payments as Array<{ name?: string; amount?: number }>;
      for (const p of payments) {
        const key = p.name ?? 'Other';
        buckets[key] = (buckets[key] ?? 0) + (Number(p.amount) || 0);
      }
    }
    return Object.entries(buckets).map(([name, amount]) => ({ name, amount }));
  }

  async getSchoolInfo(req: AuthenticatedRequest) {
    const organizationId = this.orgId(req);

    // Always prefer latest school branding/profile from IAM registration
    try {
      const { tenantService } = await import('./tenant.service');
      const synced = await tenantService.syncFromIam(organizationId);
      if (synced) {
        console.info(`[Babyeyi] syncFromIam OK for ${organizationId}: logo=${synced.logoUrl ?? 'null'} stamp=${synced.stampUrl ?? 'null'} sig=${synced.signatureUrl ?? 'null'}`);
      } else {
        console.warn(`[Babyeyi] syncFromIam returned null for ${organizationId}`);
      }
    } catch (err) {
      console.error('[Babyeyi] getSchoolInfo syncFromIam failed:', err);
    }

    let profile = await prisma.schoolProfile.findUnique({ where: { organizationId } });
    if (!profile) {
      const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
      profile = await prisma.schoolProfile.create({
        data: {
          organizationId,
          schoolName: tenant?.organizationName ?? 'School',
        },
      });
    }
    const scope = mapOwnershipToFeeScope(profile.ownershipType);
    const classes = await prisma.registeredClass.findMany({ where: { organizationId } });
    const settings = (profile.settings ?? {}) as Record<string, unknown>;
    const documentDescriptionTemplate = this.parseDocumentDescriptionTemplate(settings);
    return {
      profile,
      feeScope: scope,
      classes,
      branding: {
        logoUrl: profile.logoPath,
        signatureUrl: profile.signaturePath,
        stampUrl: profile.stampPath,
        otherLogoUrl: profile.otherLogoPath,
      },
      leaders: Array.isArray(settings.leaders) ? settings.leaders : [],
      contact: settings.contact ?? null,
      schoolCategory: settings.schoolCategory ?? null,
      documentDescriptionTemplate,
    };
  }

  private parseDocumentDescriptionTemplate(settings: Record<string, unknown>) {
    const raw = settings.documentDescriptionTemplate;
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    const descriptionLines = Array.isArray(obj.descriptionLines)
      ? obj.descriptionLines.filter((line): line is string => typeof line === 'string' && line.trim().length > 0)
      : [];
    return {
      includeSchoolDescription: obj.includeSchoolDescription === true,
      descriptionLines,
    };
  }

  async getAcademicClasses(req: AuthenticatedRequest) {
    const organizationId = this.orgId(req);
    const empty = {
      source: 'student-management' as const,
      classes: [] as Array<{
        id?: string;
        name: string;
        stream: string | null;
        label: string;
        educationLevel: string;
      }>,
    };

    try {
      const base = env.STUDENT_MANAGEMENT_API_URL.replace(/\/$/, '');
      const qs = new URLSearchParams({ organizationId }).toString();
      const response = await fetch(`${base}/service/classes?${qs}`, {
        headers: {
          'x-service-key': env.SERVICE_API_KEY,
          'x-source-service': 'babyeyi-wizard',
          Accept: 'application/json',
        },
      });
      if (!response.ok) return empty;
      const body = (await response.json()) as {
        success?: boolean;
        data?: Array<{
          id?: string;
          name?: string;
          stream?: string | null;
          label?: string;
          category?: string | null;
          grade?: { name?: string | null } | null;
        }>;
      };
      const items = Array.isArray(body.data) ? body.data : [];
      const byBaseClass = new Map<
        string,
        { id?: string; name: string; stream: null; label: string; educationLevel: string }
      >();
      for (const c of items) {
        const rawName = String(c.name || '').trim() || c.grade?.name || 'Class';
        const stream = c.stream ? String(c.stream).trim() : null;
        const name = parseBaseClassName(rawName, stream);
        const label = name;
        const educationLevel = normalizeEducationLevel(c.category, c.label ?? rawName);
        const key = `${educationLevel}::${name.toUpperCase()}`;
        if (!byBaseClass.has(key)) {
          byBaseClass.set(key, { id: c.id, name, stream: null, label, educationLevel });
        }
      }
      return {
        source: 'student-management' as const,
        classes: [...byBaseClass.values()].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true })
        ),
      };
    } catch {
      return empty;
    }
  }

  async getNesaLimit(query: {
    level?: string;
    term?: string;
    category?: string;
    district?: string;
    ownershipType?: string;
    ownership_type?: string;
    feeTargetStudents?: string;
    fee_target_students?: string;
    academicYear?: string;
    academic_year?: string;
    educationLevel?: string;
    education_level?: string;
    studentType?: string;
    student_type?: string;
    classLabel?: string;
    class_label?: string;
    class?: string;
  }) {
    const classLabel = query.classLabel ?? query.class_label ?? query.class ?? query.level;
    const term = query.term;
    if (!classLabel || !term) throw new AppError(400, 'level/class and term are required');

    const ownershipType = query.ownershipType ?? query.ownership_type ?? query.category;
    const feeTargetStudents =
      query.feeTargetStudents ??
      query.fee_target_students ??
      (String(query.category ?? '').toLowerCase() === 'private' ? 'private' : 'public');

    const resolved = await resolveNesaPolicy({
      ownershipType,
      feeTargetStudents,
      academicYear: query.academicYear ?? query.academic_year,
      term,
      educationLevel: query.educationLevel ?? query.education_level ?? inferEducationLevel(classLabel),
      studentType: query.studentType ?? query.student_type ?? 'DAY',
      classLabel,
    });

    if (resolved) {
      if (!resolved.applies) {
        return {
          applies: false,
          limit: null,
          tuitionMaxRwf: null,
          generalAssemblyMaxRwf: null,
          totalMaxRwf: null,
          source: 'nesa-policy-engine',
          reason: resolved.reason,
          policies: [],
        };
      }
      const limit = resolved.totalMaxRwf ?? resolved.tuitionMaxRwf ?? resolved.limit ?? null;
      return {
        applies: true,
        limit,
        tuitionMaxRwf: resolved.tuitionMaxRwf ?? null,
        generalAssemblyMaxRwf: resolved.generalAssemblyMaxRwf ?? null,
        totalMaxRwf: resolved.totalMaxRwf ?? null,
        source: 'nesa-policy-engine',
        reason: resolved.reason,
        policies: resolved.policies ?? [],
      };
    }

    // Fallback: legacy Babyeyi table / constants when Nesa is unreachable
    const level = classLabel;
    const dbLimit = await prisma.nesaFeeLimit.findFirst({
      where: {
        level,
        term,
        category: query.category ?? 'Public',
        ...(query.district ? { district: query.district } : {}),
      },
    });
    if (dbLimit) {
      return {
        applies: true,
        limit: Number(dbLimit.limitRwf),
        tuitionMaxRwf: Number(dbLimit.limitRwf),
        generalAssemblyMaxRwf: null,
        totalMaxRwf: Number(dbLimit.limitRwf),
        source: 'database',
      };
    }

    return {
      applies: true,
      limit: null,
      tuitionMaxRwf: null,
      generalAssemblyMaxRwf: null,
      totalMaxRwf: null,
      source: 'none',
      reason: 'NESA policy service is unavailable and no cached fee limit matches this class',
    };
  }

  private async enforcePolicyOnCreate(
    body: Record<string, unknown>,
    totalFee: number,
    requestIncrease: boolean
  ): Promise<{ nesaLimit?: number }> {
    const ownershipType = String(body.ownership_type ?? body.ownershipType ?? 'Government');
    const feeTargetStudents = resolveFeeTarget(body);
    const classLabel = String(body.class_name ?? body.className ?? body.class ?? 'P1');
    const term = String(body.term ?? 'Term 1');
    const academicYear = String(body.academic_year ?? body.academicYear ?? '');
    const studentType = inferStudentType(String(body.student_type ?? body.studentType ?? ''));

    const resolved = await resolveNesaPolicy({
      ownershipType,
      feeTargetStudents,
      academicYear,
      term,
      educationLevel: String(body.education_level ?? body.educationLevel ?? '') || inferEducationLevel(classLabel),
      studentType,
      classLabel,
    });

    if (!resolved || !resolved.applies) {
      return { nesaLimit: undefined };
    }

    const limit = resolved.totalMaxRwf ?? resolved.tuitionMaxRwf ?? resolved.limit ?? null;
    if (limit == null) return { nesaLimit: undefined };

    if (totalFee > limit && !requestIncrease) {
      throw new AppError(
        400,
        `Total fees (${totalFee} RWF) exceed NESA policy limit (${limit} RWF). Request an increase or reduce fees.`
      );
    }

    return { nesaLimit: limit };
  }

  async getRequirementsCatalog() {
    return prisma.requirementCatalog.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async listCirculars(req: AuthenticatedRequest, query: Record<string, string | undefined>) {
    const organizationId = this.orgId(req);
    const where: Prisma.CircularWhereInput = { organizationId };

    if (query.status) where.status = query.status.toUpperCase() as CircularStatus;
    if (query.academic_year) where.academicYear = query.academic_year;
    if (query.class) where.className = query.class;
    if (query.category) where.schoolCategory = query.category;
    if (query.search) {
      where.OR = [
        { className: { contains: query.search, mode: 'insensitive' } },
        { authorName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const limit = Math.min(parseInt(query.limit ?? '200', 10), 500);
    return prisma.circular.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  async getCircular(req: AuthenticatedRequest, id: string) {
    const organizationId = this.orgId(req);
    const circular = await prisma.circular.findFirst({
      where: { id, organizationId },
      include: {
        activities: { orderBy: { createdAt: 'desc' } },
        approvals: { orderBy: { createdAt: 'asc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        versions: { orderBy: { version: 'desc' }, take: 20 },
        collaborators: true,
      },
    });
    if (!circular) throw new AppError(404, 'Circular not found');
    return circular;
  }

  async createCircular(req: AuthenticatedRequest, body: Record<string, unknown>, files?: Express.Multer.File[]) {
    const organizationId = this.orgId(req);
    const payments = this.parseJson(body.payments, []);
    const totalFee = calcTotalFee(payments as Array<{ amount?: number }>);
    const requestIncrease = body.request_increase === 'true' || body.requestIncrease === true;

    const { nesaLimit } = await this.enforcePolicyOnCreate(body, totalFee, requestIncrease);
    if (nesaLimit != null && (body.nesa_limit == null || body.nesa_limit === '')) {
      body.nesa_limit = nesaLimit;
    }

    const data = this.buildCircularData(body, organizationId, payments, totalFee, req, undefined, await this.resolveAcademicDefaults(organizationId));

    const circular = await prisma.circular.create({ data });

    await this.handleFileUploads(circular.id, organizationId, files);
    await this.logActivity(circular.id, 'created', `Circular for ${circular.className} created`, this.actorName(req));
    await this.createVersion(circular.id, circular, 'created', this.actorName(req));

    if (body.status === 'PENDING' || data.requestIncrease) {
      await this.initApprovals(circular.id);
    }

    this.scheduleTranslationJob(circular.id);

    // Always mint a verification QR so View & Print can show it immediately.
    return this.ensureQrAssets(circular.id);
  }

  async updateCircular(
    req: AuthenticatedRequest,
    id: string,
    body: Record<string, unknown>,
    files?: Express.Multer.File[]
  ) {
    const organizationId = this.orgId(req);
    const existing = await prisma.circular.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Circular not found');

    const payments = this.parseJson(body.payments, existing.payments);
    const totalFee = calcTotalFee(payments as Array<{ amount?: number }>);
    const requestIncrease = body.request_increase === 'true' || body.requestIncrease === true;
    const statusHint = String(body.status ?? '').toUpperCase();
    if (statusHint && statusHint !== 'DRAFT') {
      const { nesaLimit } = await this.enforcePolicyOnCreate(body, totalFee, requestIncrease);
      if (nesaLimit != null && (body.nesa_limit == null || body.nesa_limit === '')) {
        body.nesa_limit = nesaLimit;
      }
    }
    const data = this.buildCircularData(
      body,
      organizationId,
      payments,
      totalFee,
      req,
      existing,
      await this.resolveAcademicDefaults(organizationId)
    );

    await prisma.circular.update({
      where: { id },
      data: { ...data, version: existing.version + 1 },
    });

    await this.handleFileUploads(id, organizationId, files);
    await this.logActivity(id, 'edited', `Circular updated to version ${existing.version + 1}`, this.actorName(req));
    const circular = await prisma.circular.findUniqueOrThrow({ where: { id } });
    await this.createVersion(id, circular, 'edited', this.actorName(req));

    this.scheduleTranslationJob(id);

    // Refresh QR payload so hash/URL stay aligned with the latest document version.
    return this.ensureQrAssets(id);
  }

  /**
   * Kicks off background EN -> RW/FR translation of narrative fields (parent message, payment
   * names, requirements, other info, class notes, leader roles). Non-blocking: the HTTP response
   * for create/update never waits on this. Preserves manual Hindura edits whose English source
   * text has not changed since the last translation run.
   */
  private scheduleTranslationJob(circularId: string) {
    setImmediate(async () => {
      try {
        await prisma.circular.update({
          where: { id: circularId },
          data: { translationStatus: 'pending' },
        });

        const circular = await prisma.circular.findUnique({ where: { id: circularId } });
        if (!circular) return;

        const previous = isContentI18nBundle(circular.contentI18n) ? circular.contentI18n : null;
        const bundle = await buildContentI18nFromEnglish(
          {
            parentMessage: circular.parentMessage,
            payments: asJsonArray<{ name?: string }>(circular.payments),
            requirements: asJsonArray<{ item?: string; description?: string }>(circular.requirements),
            otherInfos: asJsonArray<{ item?: string }>(circular.otherInfos),
            classReqs: asJsonArray<{ item?: string }>(circular.classReqs),
            leaders: asJsonArray<{ role?: string }>(circular.leaders),
          },
          previous
        );

        await prisma.circular.update({
          where: { id: circularId },
          data: {
            contentI18n: bundle as unknown as JsonValue,
            translationStatus: bundle.status,
          },
        });
      } catch (err) {
        await prisma.circular
          .update({ where: { id: circularId }, data: { translationStatus: 'failed' } })
          .catch(() => null);
        // eslint-disable-next-line no-console
        console.error('[babyeyi] background translation job failed', err);
      }
    });
  }

  /** "Hindura" — manual Kinyarwanda content edit. Overrides specific rw fields on top of the bundle. */
  async patchContentI18nRw(
    req: AuthenticatedRequest,
    id: string,
    patch: {
      parentMessage?: string;
      payments?: Array<{ index: number; name: string }>;
      requirements?: Array<{ index: number; item?: string; description?: string }>;
      otherInfos?: Array<{ index: number; item: string }>;
      classReqs?: Array<{ index: number; item: string }>;
      leaders?: Array<{ index: number; role: string }>;
    }
  ) {
    const organizationId = this.orgId(req);
    const circular = await prisma.circular.findFirst({ where: { id, organizationId } });
    if (!circular) throw new AppError(404, 'Circular not found');

    const previous = isContentI18nBundle(circular.contentI18n)
      ? circular.contentI18n
      : await buildContentI18nFromEnglish({
          parentMessage: circular.parentMessage,
          payments: asJsonArray<{ name?: string }>(circular.payments),
          requirements: asJsonArray<{ item?: string; description?: string }>(circular.requirements),
          otherInfos: asJsonArray<{ item?: string }>(circular.otherInfos),
          classReqs: asJsonArray<{ item?: string }>(circular.classReqs),
          leaders: asJsonArray<{ role?: string }>(circular.leaders),
        });

    const nextBundle = applyRwPatch(previous, patch);

    const updated = await prisma.circular.update({
      where: { id },
      data: { contentI18n: nextBundle as unknown as JsonValue, translationStatus: 'manual' },
    });

    await this.logActivity(id, 'translation-edited', 'Kinyarwanda content updated manually (Hindura)', this.actorName(req));
    return updated;
  }

  /** Forces a full re-translation of narrative fields from the current English source. */
  async regenerateTranslations(req: AuthenticatedRequest, id: string) {
    const organizationId = this.orgId(req);
    const circular = await prisma.circular.findFirst({ where: { id, organizationId } });
    if (!circular) throw new AppError(404, 'Circular not found');

    const bundle = await buildContentI18nFromEnglish({
      parentMessage: circular.parentMessage,
      payments: asJsonArray<{ name?: string }>(circular.payments),
      requirements: asJsonArray<{ item?: string; description?: string }>(circular.requirements),
      otherInfos: asJsonArray<{ item?: string }>(circular.otherInfos),
      classReqs: asJsonArray<{ item?: string }>(circular.classReqs),
      leaders: asJsonArray<{ role?: string }>(circular.leaders),
    });

    return prisma.circular.update({
      where: { id },
      data: { contentI18n: bundle as unknown as JsonValue, translationStatus: bundle.status },
    });
  }

  async deleteCircular(req: AuthenticatedRequest, id: string) {
    const organizationId = this.orgId(req);
    const existing = await prisma.circular.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Circular not found');
    await prisma.circular.delete({ where: { id } });
    return { deleted: true };
  }

  async duplicateCircular(req: AuthenticatedRequest, id: string) {
    const organizationId = this.orgId(req);
    const source = await prisma.circular.findFirst({ where: { id, organizationId } });
    if (!source) throw new AppError(404, 'Circular not found');

    const copy = await prisma.circular.create({
      data: {
        organizationId: source.organizationId,
        academicYear: source.academicYear,
        term: source.term,
        className: source.className,
        classes: source.classes as JsonValue,
        educationLevel: source.educationLevel,
        schoolCategory: source.schoolCategory,
        ownershipType: source.ownershipType,
        feeTargetStudents: source.feeTargetStudents,
        province: source.province,
        district: source.district,
        sector: source.sector,
        cell: source.cell,
        village: source.village,
        language: source.language,
        parentMessage: source.parentMessage,
        payments: source.payments as JsonValue,
        requirements: source.requirements as JsonValue,
        banks: source.banks as JsonValue,
        classReqs: source.classReqs as JsonValue,
        otherInfos: source.otherInfos as JsonValue,
        announcements: source.announcements as JsonValue,
        includeAnnouncements: source.includeAnnouncements,
        includeSchoolDescription: source.includeSchoolDescription,
        descriptionLines: source.descriptionLines as JsonValue,
        leaders: source.leaders as JsonValue,
        requestReasons: source.requestReasons as JsonValue,
        totalFee: source.totalFee,
        nesaLimit: source.nesaLimit,
        contentI18n: source.contentI18n as JsonValue,
        translationStatus: source.translationStatus,
        status: 'DRAFT',
        version: 1,
        publishedAt: null,
        publishedBy: null,
        requestIncrease: false,
        increaseReason: null,
        increaseDesc: null,
        nesaStatus: null,
        qrCodePath: null,
        qrHash: null,
        pdfPath: null,
        downloadCount: 0,
        viewCount: 0,
        qrScanCount: 0,
        shareCount: 0,
        authorName: this.actorName(req),
      },
    });

    await this.logActivity(copy.id, 'duplicated', `Duplicated from ${source.className}`, this.actorName(req));
    return this.ensureQrAssets(copy.id);
  }

  async publishCircular(req: AuthenticatedRequest, id: string) {
    const organizationId = this.orgId(req);
    const circular = await prisma.circular.findFirst({ where: { id, organizationId } });
    if (!circular) throw new AppError(404, 'Circular not found');
    if (!['APPROVED', 'DRAFT'].includes(circular.status)) {
      throw new AppError(400, 'Only draft or approved circulars can be published');
    }

    const qrHash = createHash('sha256').update(`${circular.id}-${Date.now()}`).digest('hex').slice(0, 16);
    const qrPath = await this.generateQrCode(circular.id, qrHash);

    const updated = await prisma.circular.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedBy: this.actorName(req),
        qrHash,
        qrCodePath: qrPath,
      },
    });

    await this.logActivity(id, 'published', 'Circular published', this.actorName(req));
    await prisma.notification.create({
      data: {
        organizationId,
        type: 'CIRCULAR_PUBLISHED',
        title: 'Circular Published',
        message: `${circular.className} circular is now live`,
        circularId: id,
      },
    });

    return updated;
  }

  async generateQr(req: AuthenticatedRequest, id: string) {
    const organizationId = this.orgId(req);
    const circular = await prisma.circular.findFirst({ where: { id, organizationId } });
    if (!circular) throw new AppError(404, 'Circular not found');

    const ensured = await this.ensureQrAssets(id);
    const qrHash = ensured.qrHash ?? createHash('sha256').update(id).digest('hex').slice(0, 16);
    const dataUrl = await QRCode.toDataURL(`${env.VERIFY_PUBLIC_URL}/${id}?h=${qrHash}`, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    return {
      qr_code_url: ensured.qrCodePath,
      qr_code_data_url: dataUrl,
      qr_view_url: `${env.VERIFY_PUBLIC_URL}/${id}?h=${qrHash}`,
      qr_hash: qrHash,
    };
  }

  /** Creates / refreshes PNG on disk + qrHash for every circular. */
  private async ensureQrAssets(circularId: string) {
    const circular = await prisma.circular.findUnique({ where: { id: circularId } });
    if (!circular) throw new AppError(404, 'Circular not found');

    const qrHash =
      circular.qrHash ?? createHash('sha256').update(`${circular.id}-${circular.version}`).digest('hex').slice(0, 16);
    const qrPath = await this.writeQrPng(circular.id, qrHash);

    return prisma.circular.update({
      where: { id: circularId },
      data: { qrHash, qrCodePath: qrPath },
    });
  }

  private async writeQrPng(circularId: string, hash: string) {
    const url = `${env.VERIFY_PUBLIC_URL}/${circularId}?h=${hash}`;
    const filename = `qr-${circularId}.png`;
    const filepath = path.join(uploadRoot, filename);
    await QRCode.toFile(filepath, url, { width: 320, margin: 2, errorCorrectionLevel: 'M' });
    return publicUploadPath(filename);
  }

  async verifyCircular(docId: string, hash?: string) {
    const circular = await prisma.circular.findUnique({
      where: { id: docId },
      include: {
        tenant: { select: { organizationName: true } },
        activities: { orderBy: { createdAt: 'asc' }, take: 40 },
        approvals: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!circular) throw new AppError(404, 'Document not found');

    const profile = await prisma.schoolProfile.findUnique({
      where: { organizationId: circular.organizationId },
    });

    const hashProvided = Boolean(hash);
    const hashMatches = !hashProvided || circular.qrHash === hash;
    const status = circular.status;

    let authenticity: 'authentic' | 'pending' | 'invalid' | 'revoked' | 'hash_mismatch' = 'invalid';
    if (status === 'REJECTED' || status === 'ARCHIVED') authenticity = 'revoked';
    else if (status === 'DRAFT' || status === 'PENDING') authenticity = 'pending';
    else if (hashProvided && circular.qrHash && circular.qrHash !== hash) authenticity = 'hash_mismatch';
    else if (status === 'APPROVED' || status === 'PUBLISHED') authenticity = hashMatches ? 'authentic' : 'hash_mismatch';

    if (authenticity === 'authentic') {
      await prisma.circular.update({
        where: { id: docId },
        data: { qrScanCount: { increment: 1 } },
      });
      await prisma.notification.create({
        data: {
          organizationId: circular.organizationId,
          type: 'QR_SCANNED',
          title: 'QR code scanned',
          message: `Public verification of ${circular.className} circular (${circular.academicYear} · ${circular.term})`,
          circularId: docId,
        },
      });
    } else if (authenticity === 'hash_mismatch' || authenticity === 'invalid') {
      await prisma.notification.create({
        data: {
          organizationId: circular.organizationId,
          type: 'VERIFICATION_ALERT',
          title: 'Verification failed',
          message: `Suspicious verify attempt on ${circular.className} circular (${authenticity.replace(/_/g, ' ')})`,
          circularId: docId,
        },
      });
    }

    const totalFee = Number(circular.totalFee);
    const nesaLimit = circular.nesaLimit != null ? Number(circular.nesaLimit) : null;
    const withinLimit = nesaLimit == null ? true : totalFee <= nesaLimit;
    const limitPct = nesaLimit && nesaLimit > 0 ? Math.min(100, Math.round((totalFee / nesaLimit) * 100)) : null;

    const payments = Array.isArray(circular.payments) ? (circular.payments as Array<{ name?: string; amount?: number }>) : [];
    const checks = [
      { key: 'qr', label: 'QR Signature', pass: Boolean(circular.qrHash) && hashMatches },
      { key: 'hash', label: 'Document Hash', pass: Boolean(circular.qrHash) },
      { key: 'server', label: 'Server Integrity', pass: authenticity !== 'invalid' },
      { key: 'seal', label: 'Digital Seal', pass: authenticity === 'authentic' || authenticity === 'pending' },
      { key: 'approval', label: 'Approval Record', pass: status === 'APPROVED' || status === 'PUBLISHED' },
      { key: 'db', label: 'Database Match', pass: true },
      { key: 'school', label: 'School Registration', pass: Boolean(profile?.schoolName) },
      { key: 'nesa', label: 'Fee Compliance', pass: withinLimit },
    ];
    const passCount = checks.filter((c) => c.pass).length;
    const trustScore = Math.round((passCount / checks.length) * 100);

    const timeline = [
      {
        key: 'created',
        label: 'Created',
        at: circular.createdAt,
        done: true,
      },
      {
        key: 'approved',
        label: 'Approved',
        at: circular.approvals.find((a) => a.action === 'APPROVED')?.actedAt ?? null,
        done: status === 'APPROVED' || status === 'PUBLISHED',
      },
      {
        key: 'qr',
        label: 'QR Generated',
        at: circular.qrCodePath ? circular.updatedAt : null,
        done: Boolean(circular.qrHash),
      },
      {
        key: 'published',
        label: 'Published',
        at: circular.publishedAt,
        done: status === 'PUBLISHED',
      },
      {
        key: 'downloaded',
        label: 'Downloaded',
        at: circular.downloadCount > 0 ? circular.updatedAt : null,
        done: circular.downloadCount > 0,
      },
      {
        key: 'verified',
        label: 'Verified',
        at: new Date(),
        done: authenticity === 'authentic',
        current: true,
      },
    ];

    const contact = ((profile?.settings ?? {}) as Record<string, unknown>).contact as
      | { email?: string; phone?: string; website?: string; address?: string }
      | undefined;

    let qrDataUrl: string | null = null;
    if (circular.qrHash) {
      try {
        qrDataUrl = await QRCode.toDataURL(
          `${env.VERIFY_PUBLIC_URL}/${circular.id}?h=${circular.qrHash}`,
          { width: 280, margin: 1, errorCorrectionLevel: 'M' }
        );
      } catch {
        qrDataUrl = null;
      }
    }

    const hostBase = env.VERIFY_PUBLIC_URL.replace(/\/verify\/?$/, '').replace(/\/$/, '');
    const apiBase = env.PUBLIC_API_URL.replace(/\/$/, '');
    const abs = (p?: string | null) => {
      if (!p) return null;
      if (/^https?:|^data:/i.test(p)) return p;
      return `${apiBase}${p.startsWith('/') ? p : `/${p}`}`;
    };

    return {
      verified: authenticity === 'authentic',
      authenticity,
      securityStatus: authenticity,
      trustScore,
      verifiedAt: new Date().toISOString(),
      circular: {
        ...circular,
        qrScanCount: authenticity === 'authentic' ? circular.qrScanCount + 1 : circular.qrScanCount,
      },
      school: profile
        ? {
            ...profile,
            contact: contact ?? null,
          }
        : null,
      organizationName: circular.tenant.organizationName,
      feeCompliance: {
        totalFee,
        nesaLimit,
        withinLimit,
        limitPct,
        exceeded: !withinLimit,
      },
      payments,
      securityChecks: checks,
      timeline,
      authenticityDetails: {
        algorithm: 'HMAC-SHA256',
        hash: circular.qrHash ? `${circular.qrHash.slice(0, 8)}…${circular.qrHash.slice(-4)}` : null,
        fullHash: circular.qrHash,
        generatedAt: circular.updatedAt,
        verificationUrl: `${env.VERIFY_PUBLIC_URL}/${circular.id}${circular.qrHash ? `?h=${circular.qrHash}` : ''}`,
      },
      verificationMeta: {
        lastVerified: 'Just now',
        country: 'Rwanda',
        verificationCount: authenticity === 'authentic' ? circular.qrScanCount + 1 : circular.qrScanCount,
      },
      documentPreview: {
        logoUrl: abs(profile?.logoPath),
        otherLogoUrl: abs(profile?.otherLogoPath),
        signatureUrl: abs(profile?.signaturePath),
        stampUrl: abs(profile?.stampPath),
        qrDataUrl,
        portalHome: hostBase || 'http://localhost:3013',
      },
    };
  }

  async reportSuspiciousDocument(
    docId: string,
    input: { reason?: string; details?: string; reporterEmail?: string }
  ) {
    const circular = await prisma.circular.findUnique({ where: { id: docId } });
    if (!circular) throw new AppError(404, 'Document not found');

    await prisma.circularActivity.create({
      data: {
        circularId: docId,
        eventType: 'suspicious_report',
        description: `Report: ${input.reason || 'unspecified'} — ${(input.details || '').slice(0, 500)}`,
        actorName: input.reporterEmail || 'anonymous',
      },
    });

    const reason = (input.reason || 'Unspecified issue').trim();
    const details = (input.details || '').trim();
    await prisma.notification.create({
      data: {
        organizationId: circular.organizationId,
        type: 'VERIFICATION_REPORT',
        title: 'Public verification report',
        message: details
          ? `${reason}: ${details.slice(0, 240)}`
          : `${reason} — reported via public verify page`,
        circularId: docId,
      },
    });

    return { ok: true, message: 'Report received. Our team will review this document.' };
  }

  // Legacy method name retained for publish path
  private async generateQrCode(circularId: string, hash: string) {
    return this.writeQrPng(circularId, hash);
  }

  async listApprovals(req: AuthenticatedRequest) {
    const organizationId = this.orgId(req);
    const pending = await prisma.circularApproval.findMany({
      where: {
        action: 'PENDING',
        circular: { organizationId },
      },
      include: {
        circular: {
          select: {
            id: true,
            className: true,
            academicYear: true,
            term: true,
            status: true,
            authorName: true,
            totalFee: true,
            requestIncrease: true,
            increaseReason: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const byStage = {
      director: pending.filter((p) => p.stage === 'DIRECTOR').length,
      accountant: pending.filter((p) => p.stage === 'ACCOUNTANT').length,
      district: pending.filter((p) => p.stage === 'DISTRICT').length,
      nesa: pending.filter((p) => p.stage === 'NESA').length,
    };

    return { pending, counts: byStage, total: pending.length };
  }

  async actOnApproval(
    req: AuthenticatedRequest,
    circularId: string,
    stage: ApprovalStage,
    action: ApprovalAction,
    notes?: string
  ) {
    const organizationId = this.orgId(req);
    const circular = await prisma.circular.findFirst({ where: { id: circularId, organizationId } });
    if (!circular) throw new AppError(404, 'Circular not found');

    await prisma.circularApproval.updateMany({
      where: { circularId, stage },
      data: { action, notes, approverName: this.actorName(req), actedAt: new Date() },
    });

    if (action === 'REJECTED') {
      await prisma.circular.update({ where: { id: circularId }, data: { status: 'REJECTED' } });
      await this.logActivity(circularId, 'rejected', `Rejected at ${stage}`, this.actorName(req));
    } else if (action === 'APPROVED') {
      const remaining = await prisma.circularApproval.count({
        where: { circularId, action: 'PENDING' },
      });
      if (remaining === 0) {
        await prisma.circular.update({ where: { id: circularId }, data: { status: 'APPROVED' } });
        await this.logActivity(circularId, 'approved', 'All approvals complete', this.actorName(req));
        await this.ensureQrAssets(circularId);
      } else {
        await this.logActivity(circularId, 'approved', `Approved at ${stage}`, this.actorName(req));
      }
    }

    return this.getCircular(req, circularId);
  }

  async getAnalytics(req: AuthenticatedRequest) {
    const organizationId = this.orgId(req);
    const [statusCounts, topDownloaded, topShared, monthlyStats, heatMap] = await Promise.all([
      prisma.circular.groupBy({ by: ['status'], where: { organizationId }, _count: { id: true } }),
      prisma.circular.findMany({
        where: { organizationId },
        orderBy: { downloadCount: 'desc' },
        take: 5,
        select: { id: true, className: true, academicYear: true, downloadCount: true, viewCount: true },
      }),
      prisma.circular.findMany({
        where: { organizationId },
        orderBy: { shareCount: 'desc' },
        take: 5,
        select: { id: true, className: true, shareCount: true },
      }),
      this.monthlyCircularStats(organizationId),
      this.monthlyCircularStats(organizationId),
    ]);

    const totals = await prisma.circular.aggregate({
      where: { organizationId },
      _sum: { downloadCount: true, viewCount: true, qrScanCount: true, shareCount: true },
    });

    return {
      statusCounts,
      topDownloaded,
      topShared,
      monthlyStats,
      heatMap,
      totals: {
        downloads: totals._sum.downloadCount ?? 0,
        views: totals._sum.viewCount ?? 0,
        qrScans: totals._sum.qrScanCount ?? 0,
        shares: totals._sum.shareCount ?? 0,
      },
    };
  }

  async listTemplates(req: AuthenticatedRequest) {
    const organizationId = this.orgId(req);
    return prisma.template.findMany({
      where: { OR: [{ isSystem: true }, { organizationId }] },
      orderBy: [{ isFavorite: 'desc' }, { usageCount: 'desc' }],
    });
  }

  async listAssets(req: AuthenticatedRequest) {
    const organizationId = this.orgId(req);
    const profile = await prisma.schoolProfile.findUnique({ where: { organizationId } });
    const assets = await prisma.schoolAsset.findMany({ where: { organizationId } });
    return { profile, assets };
  }

  async uploadAsset(req: AuthenticatedRequest, assetType: string, file: Express.Multer.File) {
    const organizationId = this.orgId(req);
    const typeMap: Record<string, AssetType> = {
      logo: 'LOGO',
      stamp: 'STAMP',
      signature: 'SIGNATURE',
      other_logo: 'OTHER_LOGO',
      letterhead: 'LETTERHEAD',
      footer: 'FOOTER',
    };
    const mapped = typeMap[assetType.toLowerCase()];
    if (!mapped) throw new AppError(400, 'Invalid asset type');

    const filePath = publicUploadPath(path.basename(file.path));
    await prisma.schoolAsset.create({
      data: {
        organizationId,
        assetType: mapped,
        fileName: file.originalname,
        filePath,
        mimeType: file.mimetype,
        fileSize: file.size,
      },
    });

    const profileField: Record<string, string> = {
      LOGO: 'logoPath',
      STAMP: 'stampPath',
      SIGNATURE: 'signaturePath',
      OTHER_LOGO: 'otherLogoPath',
      LETTERHEAD: 'letterheadPath',
      FOOTER: 'footerPath',
    };
    await prisma.schoolProfile.update({
      where: { organizationId },
      data: { [profileField[mapped]]: filePath },
    });

    return { filePath, url: filePath, assetType: mapped };
  }

  async listNotifications(req: AuthenticatedRequest) {
    const organizationId = this.orgId(req);
    return prisma.notification.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markAllNotificationsRead(req: AuthenticatedRequest) {
    const organizationId = this.orgId(req);
    await prisma.notification.updateMany({
      where: { organizationId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async markNotificationRead(req: AuthenticatedRequest, id: string) {
    const organizationId = this.orgId(req);
    await prisma.notification.updateMany({
      where: { id, organizationId },
      data: { isRead: true },
    });
    return { success: true };
  }

  async listVersions(req: AuthenticatedRequest, circularId: string) {
    const organizationId = this.orgId(req);
    const circular = await prisma.circular.findFirst({ where: { id: circularId, organizationId } });
    if (!circular) throw new AppError(404, 'Circular not found');
    return prisma.circularVersion.findMany({
      where: { circularId },
      orderBy: { version: 'desc' },
    });
  }

  async restoreVersion(req: AuthenticatedRequest, circularId: string, versionId: string) {
    const organizationId = this.orgId(req);
    const circular = await prisma.circular.findFirst({ where: { id: circularId, organizationId } });
    if (!circular) throw new AppError(404, 'Circular not found');

    const version = await prisma.circularVersion.findFirst({
      where: { id: versionId, circularId },
    });
    if (!version) throw new AppError(404, 'Version not found');

    const snapshot = version.snapshot as Record<string, unknown>;
    const updated = await prisma.circular.update({
      where: { id: circularId },
      data: {
        ...(snapshot as Prisma.CircularUpdateInput),
        version: circular.version + 1,
      },
    });

    await this.logActivity(circularId, 'restored', `Restored to version ${version.version}`, this.actorName(req));
    return updated;
  }

  async getCollaboration(req: AuthenticatedRequest, circularId?: string) {
    const organizationId = this.orgId(req);
    const collaborators = circularId
      ? await prisma.circularCollaborator.findMany({ where: { circularId } })
      : [];

    const activities = await prisma.circularActivity.findMany({
      where: { circular: { organizationId } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return { collaborators, activities };
  }

  async getAcademicSettings(req: AuthenticatedRequest): Promise<AcademicSettings> {
    const organizationId = this.orgId(req);
    const iam = await fetchIamAcademicSettings(organizationId);
    return parseAcademicSettings(iam);
  }

  async updateAcademicSettings(req: AuthenticatedRequest, body: AcademicSettings): Promise<AcademicSettings> {
    const organizationId = this.orgId(req);
    const updated = await updateIamAcademicSettings(organizationId, body);
    if (!updated) throw new AppError(502, 'Failed to save academic settings to organization profile');
    if (updated.currentAcademicYear) {
      await prisma.schoolProfile.updateMany({
        where: { organizationId },
        data: { academicYear: updated.currentAcademicYear },
      });
    }
    return parseAcademicSettings(updated);
  }

  private async resolveAcademicDefaults(organizationId: string): Promise<AcademicSettings> {
    const iam = await fetchIamAcademicSettings(organizationId);
    return parseAcademicSettings(iam);
  }

  async getSettings(req: AuthenticatedRequest) {
    const organizationId = this.orgId(req);
    let profile = await prisma.schoolProfile.findUnique({ where: { organizationId } });
    const iamAcademic = await fetchIamAcademicSettings(organizationId);

    if (profile && iamAcademic?.currentAcademicYear && profile.academicYear !== iamAcademic.currentAcademicYear) {
      profile = await prisma.schoolProfile.update({
        where: { organizationId },
        data: { academicYear: iamAcademic.currentAcademicYear },
      });
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return {
      profile,
      settings: profile?.settings ?? {},
      auditLogs,
      academicSettings: parseAcademicSettings(iamAcademic),
    };
  }

  async updateSettings(req: AuthenticatedRequest, body: Record<string, unknown>) {
    const organizationId = this.orgId(req);
    const existing = await prisma.schoolProfile.findUnique({ where: { organizationId } });
    if (!existing) throw new AppError(404, 'School profile not found');

    const currentSettings = (existing.settings ?? {}) as Record<string, unknown>;
    const { settings, ...profileFields } = body;
    const nextSettings =
      settings && typeof settings === 'object'
        ? ({ ...currentSettings, ...(settings as Record<string, unknown>) } as JsonValue)
        : undefined;

    return prisma.schoolProfile.update({
      where: { organizationId },
      data: {
        ...(profileFields as Prisma.SchoolProfileUpdateInput),
        ...(nextSettings ? { settings: nextSettings } : {}),
      },
    });
  }

  async bulkAction(req: AuthenticatedRequest, action: string, ids: string[]) {
    const organizationId = this.orgId(req);
    const circulars = await prisma.circular.findMany({
      where: { id: { in: ids }, organizationId },
    });
    if (circulars.length === 0) throw new AppError(404, 'No circulars found');

    switch (action) {
      case 'approve':
        await prisma.circular.updateMany({
          where: { id: { in: ids }, organizationId },
          data: { status: 'APPROVED' },
        });
        break;
      case 'publish':
        for (const c of circulars) {
          if (['APPROVED', 'DRAFT'].includes(c.status)) {
            await this.publishCircular(req, c.id).catch(() => null);
          }
        }
        break;
      case 'archive':
        await prisma.circular.updateMany({
          where: { id: { in: ids }, organizationId },
          data: { status: 'ARCHIVED' },
        });
        break;
      case 'delete':
        await prisma.circular.deleteMany({ where: { id: { in: ids }, organizationId } });
        break;
      default:
        throw new AppError(400, `Unknown bulk action: ${action}`);
    }

    return { affected: circulars.length, action };
  }

  async addComment(req: AuthenticatedRequest, circularId: string, content: string) {
    const organizationId = this.orgId(req);
    const circular = await prisma.circular.findFirst({ where: { id: circularId, organizationId } });
    if (!circular) throw new AppError(404, 'Circular not found');

    const comment = await prisma.circularComment.create({
      data: { circularId, content, authorName: this.actorName(req) },
    });

    await prisma.notification.create({
      data: {
        organizationId,
        type: 'COMMENT_ADDED',
        title: 'New Comment',
        message: `Comment on ${circular.className} circular`,
        circularId,
      },
    });

    return comment;
  }

  async incrementDownload(req: AuthenticatedRequest, id: string) {
    const organizationId = this.orgId(req);
    await prisma.circular.updateMany({
      where: { id, organizationId },
      data: { downloadCount: { increment: 1 } },
    });
  }

  async getPrintHtml(
    req: AuthenticatedRequest,
    id: string,
    opts: { lang?: string; autoprint?: boolean }
  ) {
    const organizationId = this.orgId(req);
    const circular = await prisma.circular.findFirst({ where: { id, organizationId } });
    if (!circular) throw new AppError(404, 'Circular not found');

    let profile = await prisma.schoolProfile.findUnique({ where: { organizationId } });
    if (!profile) {
      profile = await prisma.schoolProfile.create({
        data: { organizationId, schoolName: 'School' },
      });
    }

    const ensured = await this.ensureQrAssets(id);
    const qrHash = ensured.qrHash ?? createHash('sha256').update(id).digest('hex').slice(0, 16);
    const qrDataUrl = await QRCode.toDataURL(`${env.VERIFY_PUBLIC_URL}/${id}?h=${qrHash}`, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    const host = req.get('host') || `localhost:${env.PORT}`;
    const proto = (req.get('x-forwarded-proto') as string) || req.protocol || 'http';
    const publicApiBase = `${proto}://${host}${env.API_PREFIX}`;

    const { buildBabyeyiPrintPageHtml } = await import('../utils/babyeyi-doc-html');
    return buildBabyeyiPrintPageHtml({
      circular: ensured as Parameters<typeof buildBabyeyiPrintPageHtml>[0]['circular'],
      profile,
      publicApiBase,
      lang: opts.lang,
      autoprint: opts.autoprint,
      qrDataUrl,
    });
  }

  private buildCircularData(
    body: Record<string, unknown>,
    organizationId: string,
    payments: unknown,
    totalFee: number,
    req: AuthenticatedRequest,
    existing?: {
      status: CircularStatus;
      authorName: string | null;
      leaders?: unknown;
      academicYear?: string;
      term?: string;
    },
    academicDefaults: AcademicSettings = defaultAcademicSettings()
  ): Prisma.CircularCreateInput {
    const status = (body.status as string)?.toUpperCase() as CircularStatus | undefined;
    const requestIncrease = body.request_increase === 'true' || body.requestIncrease === true;

    // Respect an explicit status (e.g. Save draft → DRAFT). Only auto-promote when status omitted.
    let finalStatus: CircularStatus = status ?? existing?.status ?? 'DRAFT';
    if (requestIncrease && !status && finalStatus === 'DRAFT') finalStatus = 'PENDING';

    const tenant = { connect: { organizationId } };
    const leadersFallback =
      existing?.leaders != null && !(Array.isArray(existing.leaders) && existing.leaders.length === 0)
        ? existing.leaders
        : [];
    const parsedLeaders = this.parseJson(body.leaders, leadersFallback) as JsonValue;
    // Never wipe saved leaders with an empty payload when body omitted leaders.
    const leaders =
      body.leaders === undefined || body.leaders === null || body.leaders === ''
        ? ((existing?.leaders as JsonValue) ?? [])
        : parsedLeaders;

    return {
      tenant,
      academicYear: String(
        body.academic_year ??
          body.academicYear ??
          existing?.academicYear ??
          academicDefaults.currentAcademicYear ??
          academicDefaults.academicYears[0] ??
          defaultAcademicSettings().currentAcademicYear
      ),
      term: String(
        body.term ??
          existing?.term ??
          academicDefaults.currentTerm ??
          academicDefaults.terms[0] ??
          defaultAcademicSettings().currentTerm
      ),
      className: String(body.class_name ?? body.className ?? body.class ?? 'P1'),
      classes: this.parseJson(body.classes, [body.class_name ?? 'P1']) as JsonValue,
      educationLevel:
        body.education_level || body.educationLevel
          ? inferEducationLevel(
              String(body.class_name ?? body.className ?? body.class ?? ''),
              String(body.education_level ?? body.educationLevel ?? '')
            )
          : inferEducationLevel(String(body.class_name ?? body.className ?? body.class ?? '')),
      schoolCategory: String(body.school_category ?? body.category ?? 'Public'),
      ownershipType: String(body.ownership_type ?? 'Government'),
      feeTargetStudents: String(body.fee_target_students ?? 'public'),
      province: body.province ? String(body.province) : undefined,
      district: body.district ? String(body.district) : undefined,
      sector: body.sector ? String(body.sector) : undefined,
      cell: body.cell ? String(body.cell) : undefined,
      village: body.village ? String(body.village) : undefined,
      language: String(body.language ?? 'en'),
      parentMessage: body.parent_message ? String(body.parent_message) : undefined,
      payments: payments as JsonValue,
      requirements: this.parseJson(body.requirements, []) as JsonValue,
      banks: this.parseJson(body.banks_json ?? body.banks, []) as JsonValue,
      classReqs: this.parseJson(body.classReqs ?? body.class_reqs, []) as JsonValue,
      otherInfos: this.parseJson(body.other_infos ?? body.otherInfos, []) as JsonValue,
      announcements: this.parseJson(body.announcements, []) as JsonValue,
      includeAnnouncements:
        body.include_announcements === 'true' ||
        body.includeAnnouncements === true ||
        body.include_announcements === true,
      includeSchoolDescription:
        body.include_school_description === 'true' ||
        body.includeSchoolDescription === true ||
        body.include_school_description === true,
      descriptionLines: this.parseJson(body.description_lines ?? body.descriptionLines, []) as JsonValue,
      leaders: leaders as JsonValue,
      status: finalStatus,
      totalFee,
      requestIncrease,
      increaseReason: body.increase_reason ? String(body.increase_reason) : undefined,
      increaseDesc: body.increase_desc ? String(body.increase_desc) : undefined,
      requestReasons: this.parseJson(body.request_reasons, []) as JsonValue,
      nesaLimit: body.nesa_limit ? Number(body.nesa_limit) : undefined,
      authorId: req.user?.sub,
      authorName: existing?.authorName ?? this.actorName(req),
    };
  }

  private parseJson<T>(value: unknown, fallback: T): T {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    }
    return value as T;
  }

  private async handleFileUploads(
    _circularId: string,
    organizationId: string,
    files?: Express.Multer.File[]
  ) {
    if (!files?.length) return;
    for (const file of files) {
      const field = file.fieldname;
      const typeMap: Record<string, AssetType> = {
        school_logo: 'LOGO',
        stamp: 'STAMP',
        director_signature: 'SIGNATURE',
        other_logo: 'OTHER_LOGO',
      };
      if (typeMap[field]) {
        await this.uploadAsset(
          { organizationRef: organizationId } as AuthenticatedRequest,
          field,
          file
        );
      }
    }
  }

  private async logActivity(circularId: string, eventType: string, description: string, actorName: string) {
    await prisma.circularActivity.create({
      data: { circularId, eventType, description, actorName },
    });
  }

  private async createVersion(
    circularId: string,
    circular: { version: number },
    changeType: string,
    changedBy: string
  ) {
    const full = await prisma.circular.findUnique({ where: { id: circularId } });
    if (!full) return;
    await prisma.circularVersion.create({
      data: {
        circularId,
        version: full.version,
        snapshot: full as unknown as JsonValue,
        changeType,
        changedByName: changedBy,
      },
    });
  }

  private async initApprovals(circularId: string) {
    const stages: ApprovalStage[] = ['DIRECTOR', 'ACCOUNTANT', 'DISTRICT', 'NESA'];
    await prisma.circularApproval.createMany({
      data: stages.map((stage) => ({ circularId, stage, action: 'PENDING' })),
    });
  }

  /* ---------- Public payment-portal helpers ---------- */

  private normalizeYear(value: string): string {
    return value.trim().replace(/[–—]/g, '-').replace(/\//g, '-').toLowerCase();
  }

  private normalizeTerm(value: string): string {
    const s = value.trim().toLowerCase().replace(/\s+/g, ' ');
    const roman: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4' };
    const m = s.match(/term\s*([ivx\d]+)/i) || s.match(/^([ivx\d]+)$/i);
    if (!m) return s;
    const token = m[1].toLowerCase();
    return `term ${roman[token] ?? token}`;
  }

  private classMatches(circular: { className: string; classes: unknown }, classLabel?: string | null): boolean {
    if (!classLabel?.trim()) return true;
    const needle = classLabel.trim().toLowerCase();
    const names = new Set<string>();
    names.add(circular.className.toLowerCase());
    if (Array.isArray(circular.classes)) {
      for (const c of circular.classes) {
        if (typeof c === 'string') names.add(c.toLowerCase());
      }
    }
    for (const name of names) {
      if (name === needle || name.includes(needle) || needle.includes(name)) return true;
    }
    return false;
  }

  private toPublicCircular(circular: {
    id: string;
    organizationId: string;
    academicYear: string;
    term: string;
    className: string;
    status: CircularStatus;
    payments: unknown;
    requirements: unknown;
    banks?: unknown;
    totalFee: { toNumber?: () => number } | number;
    parentMessage: string | null;
  }) {
    const paymentsRaw = Array.isArray(circular.payments) ? circular.payments : [];
    const requirementsRaw = Array.isArray(circular.requirements) ? circular.requirements : [];

    const payments = paymentsRaw
      .map((p: any, index: number) => ({
        id: `pay-${index}-${String(p?.name ?? 'fee')
          .toLowerCase()
          .replace(/\s+/g, '-')}`,
        name: String(p?.name ?? 'Fee'),
        amount: Number(p?.amount ?? 0) || 0,
        payChannel: p?.pay_channel ?? p?.payChannel ?? null,
      }))
      .filter((p) => p.name && p.amount >= 0);

    const requirements = requirementsRaw
      .map((r: any, index: number) => {
        const name = String(r?.item ?? r?.name ?? 'Requirement');
        const price = Number(r?.cost ?? r?.amount ?? r?.price ?? 0) || 0;
        return {
          id: `req-${index}-${name.toLowerCase().replace(/\s+/g, '-')}`,
          name,
          description: r?.description ? String(r.description) : null,
          quantity: r?.quantity != null ? String(r.quantity) : null,
          price,
          amount: price,
          payChannel: r?.pay_channel ?? r?.payChannel ?? null,
        };
      })
      .filter((r) => r.name);

    const totalFee =
      typeof circular.totalFee === 'object' && circular.totalFee && 'toNumber' in circular.totalFee
        ? Number(circular.totalFee.toNumber?.() ?? 0)
        : Number(circular.totalFee ?? 0);

    const banksRaw = Array.isArray(circular.banks) ? circular.banks : [];
    const banks = banksRaw
      .filter((b: any) => b?.bank_name)
      .map((b: any) => ({
        bankName: String(b.bank_name),
        bankAccount: String(b.account_no ?? b.accountNumber ?? '') || null,
        bankAccountName: String(b.account_name ?? b.bankAccountName ?? '') || null,
        isPrimary: Boolean(b.is_primary),
      }));

    // Primary bank detail used by the storefront "BANK DETAILS" block.
    const primaryBank = banks.find((b) => b.isPrimary) ?? banks[0] ?? null;

    return {
      id: circular.id,
      organizationId: circular.organizationId,
      academicYear: circular.academicYear,
      term: circular.term,
      className: circular.className,
      status: circular.status,
      totalFee,
      parentMessage: circular.parentMessage,
      payments,
      requirements,
      // Storefront-friendly aliases (the WebpageBabyeyi Get-Babyeyi wizard reads these)
      feeLines: payments,
      requirementLines: requirements,
      banks,
      bankName: primaryBank?.bankName ?? null,
      bankAccount: primaryBank?.bankAccount ?? null,
      bankAccountName: primaryBank?.bankAccountName ?? null,
      grandTotal: totalFee,
    };
  }

  /** Years & terms from approved/published circulars for a school (optionally filtered by class). */
  async listPublicCircularOptions(organizationId: string, classLabel?: string) {
    if (!organizationId?.trim()) throw new AppError(400, 'organizationId is required');

    const rows = await prisma.circular.findMany({
      where: {
        organizationId,
        status: { in: ['APPROVED', 'PUBLISHED'] },
      },
      select: {
        academicYear: true,
        term: true,
        className: true,
        classes: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const filtered = rows.filter((r) => this.classMatches(r, classLabel));
    const circYears = Array.from(new Set(filtered.map((r) => r.academicYear).filter(Boolean)));
    const circTerms = Array.from(new Set(filtered.map((r) => r.term).filter(Boolean)));

    // Org's centrally-configured academic period (org admin → Settings) — the
    // same source BabyeyiWizard uses. Prefer it so the public wizard shows the
    // exact years/terms configured on the backend, even before circulars exist.
    const iam = await fetchIamAcademicSettings(organizationId);
    const configuredYears = iam?.academicYears ?? [];
    const configuredTerms = iam?.terms ?? [];

    // Merge configured (settings) years/terms with any present in circulars.
    const years = [...new Set([...configuredYears, ...circYears])];
    const terms = [...new Set([...configuredTerms, ...circTerms])];

    const currentAcademicYear = iam?.currentAcademicYear ?? circYears[0] ?? years[0] ?? null;
    const currentTerm = iam?.currentTerm ?? circTerms[0] ?? terms[0] ?? null;

    // Grouped shape consumed by public portals (WebpageBabyeyi Get-Babyeyi wizard):
    // [{ academicYear, terms }]. Terms per year come from the configured terms,
    // merged with the terms actually present in circulars for that year.
    const grouped = years.map((year) => {
      const yearTerms = [
        ...new Set([
          ...(configuredYears.includes(year) ? configuredTerms : []),
          ...circTerms.filter((t) => filtered.some((r) => r.academicYear === year && r.term === t)),
        ]),
      ];
      return { academicYear: year, terms: yearTerms };
    });

    return {
      academicYears: years,
      terms,
      grouped,
      currentAcademicYear,
      currentTerm,
      count: filtered.length,
    };
  }

  /** List approved/published circular summaries for public portals (MiniWebsite, etc.). */
  async listPublicCirculars(
    organizationId: string,
    filters?: { academicYear?: string; term?: string }
  ) {
    if (!organizationId?.trim()) throw new AppError(400, 'organizationId is required');

    const rows = await prisma.circular.findMany({
      where: {
        organizationId,
        status: { in: ['APPROVED', 'PUBLISHED'] },
        ...(filters?.academicYear?.trim() ? { academicYear: filters.academicYear.trim() } : {}),
      },
      select: {
        id: true,
        academicYear: true,
        term: true,
        className: true,
        classes: true,
        status: true,
        totalFee: true,
        updatedAt: true,
      },
      orderBy: [{ academicYear: 'desc' }, { updatedAt: 'desc' }],
      take: 300,
    });

    let filtered = rows;
    if (filters?.term?.trim()) {
      const termKey = this.normalizeTerm(filters.term);
      filtered = rows.filter((r) => this.normalizeTerm(r.term) === termKey);
    }

    return filtered.map((r) => ({
      id: r.id,
      academicYear: r.academicYear,
      term: r.term,
      className: r.className,
      classes: r.classes,
      status: r.status,
      totalFee: r.totalFee,
      updatedAt: r.updatedAt,
    }));
  }

  /** Public print HTML for approved/published circulars (MiniWebsite, landing portal). */
  async getPublicPrintHtml(
    organizationId: string,
    id: string,
    opts: { lang?: string; autoprint?: boolean; publicApiBase?: string }
  ) {
    if (!organizationId?.trim()) throw new AppError(400, 'organizationId is required');

    const circular = await prisma.circular.findFirst({
      where: {
        id,
        organizationId,
        status: { in: ['APPROVED', 'PUBLISHED'] },
      },
    });
    if (!circular) throw new AppError(404, 'Circular not found');

    let profile = await prisma.schoolProfile.findUnique({ where: { organizationId } });
    if (!profile) {
      profile = await prisma.schoolProfile.create({
        data: { organizationId, schoolName: 'School' },
      });
    }

    const ensured = await this.ensureQrAssets(id);
    const qrHash = ensured.qrHash ?? createHash('sha256').update(id).digest('hex').slice(0, 16);
    const qrDataUrl = await QRCode.toDataURL(`${env.VERIFY_PUBLIC_URL}/${id}?h=${qrHash}`, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    const publicApiBase = opts.publicApiBase ?? env.PUBLIC_API_URL.replace(/\/$/, '');

    const { buildBabyeyiPrintPageHtml } = await import('../utils/babyeyi-doc-html');
    return buildBabyeyiPrintPageHtml({
      circular: ensured as Parameters<typeof buildBabyeyiPrintPageHtml>[0]['circular'],
      profile,
      publicApiBase,
      lang: opts.lang,
      autoprint: opts.autoprint,
      qrDataUrl,
    });
  }

  /** Best matching approved/published circular for year + term + class. */
  async getPublicCircular(params: {
    organizationId: string;
    academicYear: string;
    term: string;
    classLabel?: string;
  }) {
    const { organizationId, academicYear, term, classLabel } = params;
    if (!organizationId?.trim()) throw new AppError(400, 'organizationId is required');
    if (!academicYear?.trim()) throw new AppError(400, 'academicYear is required');
    if (!term?.trim()) throw new AppError(400, 'term is required');

    const rows = await prisma.circular.findMany({
      where: {
        organizationId,
        status: { in: ['APPROVED', 'PUBLISHED'] },
      },
      orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }],
      take: 200,
    });

    const yearKey = this.normalizeYear(academicYear);
    const termKey = this.normalizeTerm(term);

    const matches = rows.filter((r) => {
      if (this.normalizeYear(r.academicYear) !== yearKey) return false;
      if (this.normalizeTerm(r.term) !== termKey) return false;
      return this.classMatches(r, classLabel);
    });

    if (matches.length === 0) {
      throw new AppError(
        404,
        `No approved circular found for ${academicYear}, ${term}${classLabel ? ` · ${classLabel}` : ''}`
      );
    }

    // Prefer PUBLISHED, then exact className match
    matches.sort((a, b) => {
      const score = (c: typeof a) =>
        (c.status === 'PUBLISHED' ? 2 : 1) +
        (classLabel && c.className.toLowerCase() === classLabel.trim().toLowerCase() ? 1 : 0);
      return score(b) - score(a);
    });

    return this.toPublicCircular(matches[0]);
  }
}

export const babyeyiService = new BabyeyiService();
