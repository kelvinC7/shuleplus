import { api } from '@/lib/api';

export type AuditPeriod = 'today' | 'week' | 'term' | 'range';

export interface PlatformAuditLog {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
  organization?: { id: string; name: string } | null;
}

export interface AuditLogsQuery {
  period: AuditPeriod;
  from?: string;
  to?: string;
  organizationId?: string;
  search?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogsResponse {
  items: PlatformAuditLog[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  stats: {
    total: number;
    logins: number;
    loginFailed: number;
    logouts: number;
    securityEvents: number;
    uniqueUsers: number;
    uniqueSchools: number;
  };
  range: { from: string; to: string; label: string; period: AuditPeriod };
}

export interface AccessAnalyticsResponse {
  stats: {
    total: number;
    logins: number;
    failures: number;
    logouts: number;
    uniqueUsers: number;
    successRate: number | null;
  };
  byAction: { action: string; count: number }[];
  daily: { label: string; logins: number; failures: number; logouts: number; total: number }[];
  hourly: { label: string; hour: number; total: number; logins: number; failures: number }[];
  topSchools: { organizationId: string | null; name: string; count: number }[];
  topUsers: { userId: string | null; name: string; count: number }[];
  range: { from: string; to: string; label: string; period: AuditPeriod };
}

function buildParams(query: AuditLogsQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {
    period: query.period,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
  };
  if (query.from) params.from = query.from;
  if (query.to) params.to = query.to;
  if (query.organizationId) params.organizationId = query.organizationId;
  if (query.search?.trim()) params.search = query.search.trim();
  if (query.action) params.action = query.action;
  return params;
}

const EMPTY_STATS: AuditLogsResponse['stats'] = {
  total: 0,
  logins: 0,
  loginFailed: 0,
  logouts: 0,
  securityEvents: 0,
  uniqueUsers: 0,
  uniqueSchools: 0,
};

function normalizeAuditLogsResponse(raw: unknown, period: AuditPeriod): AuditLogsResponse {
  if (Array.isArray(raw)) {
    const items = raw as PlatformAuditLog[];
    return {
      items,
      pagination: {
        page: 1,
        pageSize: items.length || 1,
        total: items.length,
        totalPages: 1,
      },
      stats: { ...EMPTY_STATS, total: items.length },
      range: { from: '', to: '', label: '', period },
    };
  }

  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as AuditLogsResponse).items)) {
    throw new Error('Invalid audit logs response');
  }

  const body = raw as AuditLogsResponse;
  return {
    ...body,
    pagination: body.pagination ?? {
      page: 1,
      pageSize: body.items.length || 1,
      total: body.items.length,
      totalPages: 1,
    },
    stats: body.stats ?? EMPTY_STATS,
    range: body.range ?? { from: '', to: '', label: '', period },
  };
}

export async function fetchAuditLogs(apiPrefix: string, query: AuditLogsQuery) {
  const { data } = await api.get<{ success: boolean; data: unknown }>(
    `${apiPrefix}/audit-logs`,
    { params: buildParams(query) }
  );
  return normalizeAuditLogsResponse(data.data, query.period);
}

function normalizeAccessAnalytics(raw: unknown, period: AuditPeriod): AccessAnalyticsResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid access analytics response');
  }
  const body = raw as AccessAnalyticsResponse;
  return {
    stats: body.stats ?? {
      total: 0,
      logins: 0,
      failures: 0,
      logouts: 0,
      uniqueUsers: 0,
      successRate: null,
    },
    byAction: Array.isArray(body.byAction) ? body.byAction : [],
    daily: Array.isArray(body.daily) ? body.daily : [],
    hourly: Array.isArray(body.hourly) ? body.hourly : [],
    topSchools: Array.isArray(body.topSchools) ? body.topSchools : [],
    topUsers: Array.isArray(body.topUsers) ? body.topUsers : [],
    range: body.range ?? { from: '', to: '', label: '', period },
  };
}

export async function fetchAccessAnalytics(apiPrefix: string, query: Omit<AuditLogsQuery, 'page' | 'pageSize' | 'search' | 'action'>) {
  const { data } = await api.get<{ success: boolean; data: unknown }>(
    `${apiPrefix}/audit-logs/access-analytics`,
    { params: buildParams({ ...query, page: 1, pageSize: 1 }) }
  );
  return normalizeAccessAnalytics(data.data, query.period);
}
