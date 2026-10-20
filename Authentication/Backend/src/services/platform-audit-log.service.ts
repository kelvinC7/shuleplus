import { AuditAction, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { academicSettingsService } from './academic-settings.service';
import { defaultAcademicSettings } from '../utils/academic-settings';

export type AuditPeriod = 'today' | 'week' | 'term' | 'range';

export const ACCESS_AUDIT_ACTIONS: AuditAction[] = [
  AuditAction.LOGIN,
  AuditAction.LOGOUT,
  AuditAction.LOGIN_FAILED,
  AuditAction.SESSION_REVOKED,
  AuditAction.PASSWORD_CHANGED,
  AuditAction.PASSWORD_RESET,
  AuditAction.MFA_ENABLED,
  AuditAction.MFA_DISABLED,
  AuditAction.EMAIL_VERIFIED,
];

export interface AuditLogQuery {
  period?: AuditPeriod;
  from?: string;
  to?: string;
  organizationId?: string;
  action?: AuditAction;
  search?: string;
  page?: number;
  pageSize?: number;
  accessOnly?: boolean;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseDateStart(iso: string): Date {
  return startOfDay(new Date(`${iso}T00:00:00.000Z`));
}

function parseDateEnd(iso: string): Date {
  return endOfDay(new Date(`${iso}T00:00:00.000Z`));
}

function approximateTermRange(academicYear: string, term: string) {
  const startYear = Number.parseInt(academicYear.split('-')[0] ?? '', 10);
  const termNum = Number.parseInt(term.replace(/\D/g, ''), 10) || 1;
  if (!Number.isFinite(startYear)) {
    const now = new Date();
    return {
      from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: endOfDay(now),
      label: `${term} (estimated)`,
    };
  }

  const windows: Record<number, [string, string]> = {
    1: [`${startYear}-09-01`, `${startYear}-12-20`],
    2: [`${startYear + 1}-01-07`, `${startYear + 1}-04-10`],
    3: [`${startYear + 1}-04-20`, `${startYear + 1}-07-31`],
  };
  const [startIso, endIso] = windows[termNum] ?? windows[1];
  return {
    from: parseDateStart(startIso),
    to: parseDateEnd(endIso),
    label: `${term} · ${academicYear}`,
  };
}

export async function resolveAuditDateRange(input: {
  period: AuditPeriod;
  organizationId?: string;
  from?: string;
  to?: string;
}) {
  const now = new Date();
  const todayEnd = endOfDay(now);

  if (input.period === 'today') {
    return { from: startOfDay(now), to: todayEnd, label: 'Today' };
  }

  if (input.period === 'week') {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to: todayEnd, label: 'Last 7 days' };
  }

  if (input.period === 'range') {
    if (!input.from || !input.to) {
      throw new AppError(400, 'Custom range requires from and to dates (YYYY-MM-DD)');
    }
    if (input.from > input.to) {
      throw new AppError(400, 'Start date must be before end date');
    }
    return {
      from: parseDateStart(input.from),
      to: parseDateEnd(input.to),
      label: `${input.from} → ${input.to}`,
    };
  }

  let settings = defaultAcademicSettings();
  if (input.organizationId) {
    settings = await academicSettingsService.getForOrganization(input.organizationId);
  }
  const term = settings.currentTerm ?? 'Term 1';
  const year = settings.currentAcademicYear ?? settings.academicYears[0] ?? '2025-2026';
  const configured = settings.termDates?.[term];
  if (configured?.start && configured?.end) {
    return {
      from: parseDateStart(configured.start),
      to: parseDateEnd(configured.end),
      label: `${term} · ${year}`,
    };
  }
  return approximateTermRange(year, term);
}

function buildWhere(
  range: { from: Date; to: Date },
  query: AuditLogQuery
): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [
    { createdAt: { gte: range.from, lte: range.to } },
  ];

  if (query.organizationId) {
    and.push({ organizationId: query.organizationId });
  }
  if (query.action) {
    and.push({ action: query.action });
  } else if (query.accessOnly) {
    and.push({ action: { in: ACCESS_AUDIT_ACTIONS } });
  }

  if (query.search?.trim()) {
    const q = query.search.trim();
    and.push({
      OR: [
        { resource: { contains: q, mode: 'insensitive' } },
        { ipAddress: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
        { organization: { name: { contains: q, mode: 'insensitive' } } },
      ],
    });
  }

  return { AND: and };
}

const logInclude = {
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  organization: { select: { id: true, name: true } },
} as const;

export class PlatformAuditLogService {
  async queryLogs(query: AuditLogQuery) {
    const period = query.period ?? 'week';
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));

    const range = await resolveAuditDateRange({
      period,
      organizationId: query.organizationId,
      from: query.from,
      to: query.to,
    });

    const where = buildWhere(range, query);

    const [total, items, stats] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: logInclude,
      }),
      this.summaryStats(where),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      stats,
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        label: range.label,
        period,
      },
    };
  }

  private async summaryStats(where: Prisma.AuditLogWhereInput) {
    const [
      total,
      logins,
      loginFailed,
      logouts,
      securityEvents,
      distinctUsers,
      distinctOrgs,
    ] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({ where: { AND: [where, { action: AuditAction.LOGIN }] } }),
      prisma.auditLog.count({ where: { AND: [where, { action: AuditAction.LOGIN_FAILED }] } }),
      prisma.auditLog.count({ where: { AND: [where, { action: AuditAction.LOGOUT }] } }),
      prisma.auditLog.count({
        where: {
          AND: [
            where,
            {
              action: {
                in: [
                  AuditAction.SESSION_REVOKED,
                  AuditAction.PASSWORD_CHANGED,
                  AuditAction.PASSWORD_RESET,
                  AuditAction.MFA_ENABLED,
                  AuditAction.MFA_DISABLED,
                ],
              },
            },
          ],
        },
      }),
      prisma.auditLog.findMany({
        where: { AND: [where, { userId: { not: null } }] },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.auditLog.findMany({
        where: { AND: [where, { organizationId: { not: null } }] },
        distinct: ['organizationId'],
        select: { organizationId: true },
      }),
    ]);

    return {
      total,
      logins,
      loginFailed,
      logouts,
      securityEvents,
      uniqueUsers: distinctUsers.length,
      uniqueSchools: distinctOrgs.length,
    };
  }

  async getAccessAnalytics(query: AuditLogQuery) {
    const period = query.period ?? 'week';
    const range = await resolveAuditDateRange({
      period,
      organizationId: query.organizationId,
      from: query.from,
      to: query.to,
    });

    const where = buildWhere(range, { ...query, accessOnly: true });

    const [
      stats,
      byAction,
      logsForSeries,
      orgGrouped,
      userGrouped,
    ] = await Promise.all([
      this.accessStats(where),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { _all: true },
      }),
      prisma.auditLog.findMany({
        where,
        select: { createdAt: true, action: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.auditLog.groupBy({
        by: ['organizationId'],
        where: { AND: [where, { organizationId: { not: null } }] },
        _count: { _all: true },
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: { AND: [where, { userId: { not: null } }] },
        _count: { _all: true },
      }),
    ]);

    const orgGroupedTop = [...orgGrouped]
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 8);
    const userGroupedTop = [...userGrouped]
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 8);

    const orgIds = orgGroupedTop
      .map((g) => g.organizationId)
      .filter((id): id is string => Boolean(id));
    const userIds = userGroupedTop.map((g) => g.userId).filter((id): id is string => Boolean(id));

    const [orgs, users] = await Promise.all([
      orgIds.length
        ? prisma.organization.findMany({
            where: { id: { in: orgIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      userIds.length
        ? prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
        : Promise.resolve([]),
    ]);

    const orgName = new Map(orgs.map((o) => [o.id, o.name]));
    const userLabel = new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim() || u.email])
    );

    const daily = buildDailyAccessSeries(logsForSeries, range.from, range.to);
    const hourly = buildHourlyAccessSeries(logsForSeries);

    return {
      stats,
      byAction: [...byAction]
        .sort((a, b) => b._count._all - a._count._all)
        .map((row) => ({
          action: row.action,
          count: row._count._all,
        })),
      daily,
      hourly,
      topSchools: orgGroupedTop.map((row) => ({
        organizationId: row.organizationId,
        name: row.organizationId ? orgName.get(row.organizationId) ?? 'Unknown school' : 'Platform',
        count: row._count._all,
      })),
      topUsers: userGroupedTop.map((row) => ({
        userId: row.userId,
        name: row.userId ? userLabel.get(row.userId) ?? 'User' : 'System',
        count: row._count._all,
      })),
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        label: range.label,
        period,
      },
    };
  }

  private async accessStats(where: Prisma.AuditLogWhereInput) {
    const [total, logins, failures, logouts, uniqueUsers] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({ where: { AND: [where, { action: AuditAction.LOGIN }] } }),
      prisma.auditLog.count({ where: { AND: [where, { action: AuditAction.LOGIN_FAILED }] } }),
      prisma.auditLog.count({ where: { AND: [where, { action: AuditAction.LOGOUT }] } }),
      prisma.auditLog.findMany({
        where: { AND: [where, { userId: { not: null } }] },
        distinct: ['userId'],
        select: { userId: true },
      }),
    ]);

    const successRate =
      logins + failures > 0 ? Math.round((logins / (logins + failures)) * 1000) / 10 : null;

    return {
      total,
      logins,
      failures,
      logouts,
      uniqueUsers: uniqueUsers.length,
      successRate,
    };
  }
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildDailyAccessSeries(
  logs: { createdAt: Date; action: AuditAction }[],
  from: Date,
  to: Date
) {
  const buckets = new Map<
    string,
    { label: string; logins: number; failures: number; logouts: number; total: number }
  >();

  const cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor <= end) {
    const key = dayKey(cursor);
    buckets.set(key, {
      label: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      logins: 0,
      failures: 0,
      logouts: 0,
      total: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const log of logs) {
    const key = dayKey(log.createdAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.total += 1;
    if (log.action === AuditAction.LOGIN) bucket.logins += 1;
    if (log.action === AuditAction.LOGIN_FAILED) bucket.failures += 1;
    if (log.action === AuditAction.LOGOUT) bucket.logouts += 1;
  }

  return [...buckets.values()];
}

function buildHourlyAccessSeries(logs: { createdAt: Date; action: AuditAction }[]) {
  const hours = Array.from({ length: 24 }, (_, h) => ({
    label: `${String(h).padStart(2, '0')}:00`,
    hour: h,
    total: 0,
    logins: 0,
    failures: 0,
  }));

  for (const log of logs) {
    const h = log.createdAt.getHours();
    const bucket = hours[h];
    if (!bucket) continue;
    bucket.total += 1;
    if (log.action === AuditAction.LOGIN) bucket.logins += 1;
    if (log.action === AuditAction.LOGIN_FAILED) bucket.failures += 1;
  }

  return hours;
}

export const platformAuditLogService = new PlatformAuditLogService();
