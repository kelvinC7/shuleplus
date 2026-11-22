import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

export async function getOrCreateSmsSettings(organizationId: string) {
  return prisma.smsSchoolSettings.upsert({
    where: { organizationId },
    create: { organizationId, smsEnabled: false, maxSegments: 0 },
    update: {},
  });
}

export async function getUsageSummary(organizationId: string) {
  const s = await getOrCreateSmsSettings(organizationId);
  const remaining = Math.max(0, s.maxSegments - s.segmentsUsed);
  const campaigns = await prisma.smsCampaign.findMany({
    where: { organizationId },
    select: { deliveredCount: true, failedCount: true, pendingCount: true, segmentsTotal: true },
  });
  let delivered = 0;
  let failed = 0;
  for (const c of campaigns) {
    delivered += c.deliveredCount;
    failed += c.failedCount;
  }
  return {
    smsEnabled: s.smsEnabled,
    maxSegments: s.maxSegments,
    segmentsUsed: s.segmentsUsed,
    remaining,
    quotaPeriod: s.quotaPeriod,
    delivered,
    failed,
    warnAt80: s.warnAt80,
    warnAt90: s.warnAt90,
  };
}

export async function assertCanSend(organizationId: string, segmentsNeeded: number) {
  const s = await getOrCreateSmsSettings(organizationId);
  if (!s.smsEnabled) {
    throw new AppError(403, 'SMS is not enabled for this school. Contact Shule+ support.');
  }
  const remaining = s.maxSegments - s.segmentsUsed;
  if (s.blockAtLimit && segmentsNeeded > remaining) {
    throw new AppError(
      402,
      `Insufficient SMS quota. Need ${segmentsNeeded} segments, ${Math.max(0, remaining)} remaining.`
    );
  }
  return s;
}

export async function reserveSegments(
  organizationId: string,
  segments: number,
  campaignId: string,
  actorId?: string
) {
  await prisma.$transaction(async (tx) => {
    const s = await tx.smsSchoolSettings.findUnique({ where: { organizationId } });
    if (!s) throw new AppError(404, 'SMS settings not found');
    const remaining = s.maxSegments - s.segmentsUsed;
    if (s.blockAtLimit && segments > remaining) {
      throw new AppError(402, 'Insufficient SMS quota');
    }
    await tx.smsSchoolSettings.update({
      where: { organizationId },
      data: { segmentsUsed: { increment: segments } },
    });
    await tx.smsQuotaLedger.create({
      data: {
        organizationId,
        deltaSegments: segments,
        reason: 'campaign_send',
        campaignId,
        actorId,
      },
    });
  });
}

export async function listAllSchoolSettings() {
  const [tenants, settings] = await Promise.all([
    prisma.tenant.findMany(),
    prisma.smsSchoolSettings.findMany(),
  ]);
  const tenantByOrg = new Map(tenants.map((t) => [t.organizationId, t]));
  const settingsByOrg = new Map(settings.map((s) => [s.organizationId, s]));
  const orgIds = new Set<string>([...tenantByOrg.keys(), ...settingsByOrg.keys()]);

  return [...orgIds]
    .map((organizationId) => {
      const t = tenantByOrg.get(organizationId);
      const s = settingsByOrg.get(organizationId);
      const maxSegments = s?.maxSegments ?? 0;
      const segmentsUsed = s?.segmentsUsed ?? 0;
      return {
        organizationId,
        organizationName: t?.organizationName ?? organizationId,
        organizationCode: t?.organizationCode ?? null,
        smsEnabled: s?.smsEnabled ?? false,
        maxSegments,
        segmentsUsed,
        remaining: Math.max(0, maxSegments - segmentsUsed),
        quotaPeriod: s?.quotaPeriod ?? 'MONTHLY',
        parentPackagesEnabled: s?.parentPackagesEnabled ?? false,
        momoPayeeNumber: s?.momoPayeeNumber ?? null,
      };
    })
    .sort((a, b) => a.organizationName.localeCompare(b.organizationName));
}

export async function updateSchoolSettings(
  organizationId: string,
  input: {
    smsEnabled?: boolean;
    maxSegments?: number;
    quotaPeriod?: 'MONTHLY' | 'TERM' | 'ANNUAL' | 'ONE_TIME';
    segmentsUsed?: number;
    updatedBy?: string;
    parentPackagesEnabled?: boolean;
    momoPayeeNumber?: string | null;
    momoUssdTemplate?: string | null;
    defaultAllocation?: 'CHILD' | 'FAMILY';
  }
) {
  await prisma.tenant.findFirst({ where: { organizationId } });
  return prisma.smsSchoolSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      smsEnabled: input.smsEnabled ?? false,
      maxSegments: input.maxSegments ?? 0,
      quotaPeriod: input.quotaPeriod ?? 'MONTHLY',
      segmentsUsed: input.segmentsUsed ?? 0,
      parentPackagesEnabled: input.parentPackagesEnabled ?? false,
      momoPayeeNumber: input.momoPayeeNumber ?? null,
      momoUssdTemplate: input.momoUssdTemplate ?? null,
      defaultAllocation: input.defaultAllocation ?? 'CHILD',
      updatedBy: input.updatedBy,
    },
    update: {
      ...(input.smsEnabled !== undefined ? { smsEnabled: input.smsEnabled } : {}),
      ...(input.maxSegments !== undefined ? { maxSegments: input.maxSegments } : {}),
      ...(input.quotaPeriod !== undefined ? { quotaPeriod: input.quotaPeriod } : {}),
      ...(input.segmentsUsed !== undefined ? { segmentsUsed: input.segmentsUsed } : {}),
      ...(input.parentPackagesEnabled !== undefined ? { parentPackagesEnabled: input.parentPackagesEnabled } : {}),
      ...(input.momoPayeeNumber !== undefined ? { momoPayeeNumber: input.momoPayeeNumber } : {}),
      ...(input.momoUssdTemplate !== undefined ? { momoUssdTemplate: input.momoUssdTemplate } : {}),
      ...(input.defaultAllocation !== undefined ? { defaultAllocation: input.defaultAllocation } : {}),
      updatedBy: input.updatedBy,
    },
  });
}
