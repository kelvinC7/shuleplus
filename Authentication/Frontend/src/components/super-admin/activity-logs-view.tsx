'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  CalendarRange,
  ChevronRight,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
import {
  fetchAccessAnalytics,
  fetchAuditLogs,
  type AccessAnalyticsResponse,
  type AuditLogsResponse,
  type AuditPeriod,
  type PlatformAuditLog,
} from '@/lib/activity-logs-api';
import { api } from '@/lib/api';
import { SmsPagination } from '@/components/super-admin/sms-bulk/sms-page-shell';

const PAGE_SIZE = 20;
const NAVY = '#000435';
const PRIMARY = '#FCB038';

type MainTab = 'activity' | 'analytics';

const PERIOD_OPTIONS: { id: AuditPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'term', label: 'This term' },
  { id: 'range', label: 'Custom range' },
];

const ACTION_COLORS: Record<string, string> = {
  LOGIN: '#10b981',
  LOGOUT: '#64748b',
  LOGIN_FAILED: '#ef4444',
  SESSION_REVOKED: '#f97316',
  PASSWORD_RESET: '#8b5cf6',
  PASSWORD_CHANGED: '#6366f1',
  MFA_ENABLED: '#0ea5e9',
  MFA_DISABLED: '#94a3b8',
};

function formatAction(action: string) {
  return action.replace(/_/g, ' ');
}

function actionTone(action: string) {
  if (action === 'LOGIN_FAILED') return 'bg-rose-50 text-rose-700 ring-rose-200';
  if (action === 'LOGIN') return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  if (action.includes('PASSWORD') || action.includes('MFA') || action === 'SESSION_REVOKED') {
    return 'bg-amber-50 text-amber-800 ring-amber-200';
  }
  return 'bg-slate-50 text-slate-700 ring-slate-200';
}

interface SchoolOption {
  id: string;
  name: string;
}

export function ActivityLogsView() {
  const platform = usePlatformAdmin();
  const [mainTab, setMainTab] = useState<MainTab>('activity');
  const [period, setPeriod] = useState<AuditPeriod>('week');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [logsData, setLogsData] = useState<AuditLogsResponse | null>(null);
  const [analytics, setAnalytics] = useState<AccessAnalyticsResponse | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [selected, setSelected] = useState<PlatformAuditLog | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    api
      .get(`${platform.apiPrefix}/organizations`)
      .then((res) => {
        const rows = (res.data.data ?? []) as Array<{ id: string; name: string }>;
        setSchools(rows.map((o) => ({ id: o.id, name: o.name })).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setSchools([]));
  }, [platform.apiPrefix]);

  const filterKey = useMemo(
    () => JSON.stringify({ period, fromDate, toDate, schoolId, search, page, mainTab }),
    [period, fromDate, toDate, schoolId, search, page, mainTab]
  );

  const rangeIncomplete = period === 'range' && (!fromDate || !toDate);

  const loadLogs = useCallback(async () => {
    if (period === 'range' && (!fromDate || !toDate)) {
      setLogsData(null);
      setLoadingLogs(false);
      return;
    }
    setLoadingLogs(true);
    try {
      const data = await fetchAuditLogs(platform.apiPrefix, {
        period,
        from: period === 'range' ? fromDate : undefined,
        to: period === 'range' ? toDate : undefined,
        organizationId: schoolId || undefined,
        search,
        page,
        pageSize: PAGE_SIZE,
      });
      setLogsData(data);
    } catch {
      setLogsData(null);
    } finally {
      setLoadingLogs(false);
    }
  }, [platform.apiPrefix, period, fromDate, toDate, schoolId, search, page]);

  const loadAnalytics = useCallback(async () => {
    if (period === 'range' && (!fromDate || !toDate)) {
      setAnalytics(null);
      setLoadingAnalytics(false);
      return;
    }
    setLoadingAnalytics(true);
    try {
      const data = await fetchAccessAnalytics(platform.apiPrefix, {
        period,
        from: period === 'range' ? fromDate : undefined,
        to: period === 'range' ? toDate : undefined,
        organizationId: schoolId || undefined,
      });
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [platform.apiPrefix, period, fromDate, toDate, schoolId]);

  useEffect(() => {
    if (mainTab === 'activity') {
      void loadLogs();
    }
  }, [mainTab, loadLogs, filterKey]);

  useEffect(() => {
    if (mainTab === 'analytics') {
      void loadAnalytics();
    }
  }, [mainTab, loadAnalytics, period, fromDate, toDate, schoolId]);

  useEffect(() => {
    setPage(1);
  }, [period, fromDate, toDate, schoolId, search]);

  function openDrawer(log: PlatformAuditLog) {
    setSelected(log);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    window.setTimeout(() => setSelected(null), 200);
  }

  const stats = logsData?.stats;
  const rangeLabel = logsData?.range?.label ?? analytics?.range?.label ?? '';

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Security & compliance</p>
          <h1 className="font-montserrat text-2xl font-bold text-navy sm:text-3xl">Activity Logs</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Platform-wide audit trail and system access analytics across all schools.
          </p>
        </div>
        {rangeLabel ? (
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-navy/[0.04] px-4 py-2 text-xs font-semibold text-navy ring-1 ring-navy/10">
            <CalendarRange className="h-3.5 w-3.5 text-primary" />
            {rangeLabel}
          </span>
        ) : null}
      </div>

      <div className="flex gap-1 rounded-2xl bg-slate-100/90 p-1.5 ring-1 ring-slate-200/80">
        {(
          [
            { id: 'activity' as const, label: 'Activity log', icon: Activity },
            { id: 'analytics' as const, label: 'Access analytics', icon: BarChart3 },
          ] as const
        ).map((tab) => {
          const active = mainTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMainTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                active ? 'bg-white text-navy shadow-sm ring-1 ring-slate-200/80' : 'text-muted hover:text-navy'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <FilterPanel
        period={period}
        onPeriodChange={setPeriod}
        fromDate={fromDate}
        toDate={toDate}
        onFromChange={setFromDate}
        onToChange={setToDate}
        schoolId={schoolId}
        onSchoolChange={setSchoolId}
        schools={schools}
        search={search}
        onSearchChange={setSearch}
        showSearch={mainTab === 'activity'}
        onRefresh={() => (mainTab === 'activity' ? void loadLogs() : void loadAnalytics())}
      />

      {mainTab === 'activity' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total events" value={stats?.total ?? 0} icon={Activity} />
            <StatCard label="Successful logins" value={stats?.logins ?? 0} icon={LogIn} accent="text-emerald-700" />
            <StatCard label="Failed logins" value={stats?.loginFailed ?? 0} icon={ShieldAlert} accent="text-rose-600" />
            <StatCard label="Unique users" value={stats?.uniqueUsers ?? 0} icon={Users} accent="text-violet-700" />
            <StatCard label="Logouts" value={stats?.logouts ?? 0} icon={LogOut} />
            <StatCard label="Security events" value={stats?.securityEvents ?? 0} icon={ShieldCheck} accent="text-amber-700" />
            <StatCard label="Schools with activity" value={stats?.uniqueSchools ?? 0} icon={Building2} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-navy/[0.06] bg-white shadow-sm">
            {loadingLogs ? (
              <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Loading activity…
              </div>
            ) : rangeIncomplete ? (
              <p className="p-12 text-center text-sm text-muted">Choose a start and end date for your custom range.</p>
            ) : !logsData?.items?.length ? (
              <p className="p-12 text-center text-sm text-muted">No activity matches your filters.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-muted">
                        <th className="w-14 px-4 py-3">#</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Actor</th>
                        <th className="px-4 py-3">School</th>
                        <th className="px-4 py-3">Resource</th>
                        <th className="px-4 py-3">When</th>
                        <th className="w-10 px-2 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {logsData.items.map((log, index) => {
                        const rowNum = (logsData.pagination.page - 1) * logsData.pagination.pageSize + index + 1;
                        return (
                          <tr
                            key={log.id}
                            onClick={() => openDrawer(log)}
                            className="group cursor-pointer border-t border-border/70 transition hover:bg-navy/[0.02]"
                          >
                            <td className="px-4 py-3.5 font-mono text-xs text-muted">{rowNum}</td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${actionTone(log.action)}`}
                              >
                                {formatAction(log.action)}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              {log.user ? (
                                <div>
                                  <p className="font-medium text-navy">
                                    {log.user.firstName} {log.user.lastName}
                                  </p>
                                  <p className="text-xs text-muted">{log.user.email}</p>
                                </div>
                              ) : (
                                <span className="text-muted">System</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-navy">{log.organization?.name ?? '—'}</td>
                            <td className="max-w-[180px] truncate px-4 py-3.5 text-muted">
                              {log.resource ?? '—'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td className="px-2 py-3.5 text-muted opacity-0 transition group-hover:opacity-100">
                              <ChevronRight className="h-4 w-4" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <SmsPagination
                  page={logsData.pagination.page}
                  totalPages={logsData.pagination.totalPages}
                  from={(logsData.pagination.page - 1) * logsData.pagination.pageSize + 1}
                  to={Math.min(
                    logsData.pagination.page * logsData.pagination.pageSize,
                    logsData.pagination.total
                  )}
                  total={logsData.pagination.total}
                  noun="events"
                  onPageChange={setPage}
                />
              </>
            )}
          </div>
        </>
      ) : (
        <AnalyticsTab analytics={analytics} loading={loadingAnalytics} />
      )}

      {drawerOpen && selected && (
        <LogDetailDrawer log={selected} onClose={closeDrawer} />
      )}

      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}

function FilterPanel({
  period,
  onPeriodChange,
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  schoolId,
  onSchoolChange,
  schools,
  search,
  onSearchChange,
  showSearch,
  onRefresh,
}: {
  period: AuditPeriod;
  onPeriodChange: (p: AuditPeriod) => void;
  fromDate: string;
  toDate: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  schoolId: string;
  onSchoolChange: (v: string) => void;
  schools: SchoolOption[];
  search: string;
  onSearchChange: (v: string) => void;
  showSearch: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onPeriodChange(opt.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ring-1 ${
                period === opt.id
                  ? 'bg-navy text-white ring-navy'
                  : 'bg-white text-navy ring-border hover:ring-navy/20'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-border px-3 py-2 text-xs font-semibold text-navy hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {period === 'range' && (
          <>
            <Field label="From">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => onFromChange(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </Field>
            <Field label="To">
              <input
                type="date"
                value={toDate}
                onChange={(e) => onToChange(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </Field>
          </>
        )}

        <Field label="School">
          <select
            value={schoolId}
            onChange={(e) => onSchoolChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value="">All schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        {showSearch && (
          <Field label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="User, school, IP, resource…"
                className="w-full rounded-lg border border-border py-2.5 pl-9 pr-3 text-sm text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </Field>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-navy/70">{label}</label>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  display,
}: {
  label: string;
  value: number;
  icon: typeof Activity;
  accent?: string;
  display?: string;
}) {
  return (
    <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className={`mt-2 text-2xl font-bold text-navy ${accent ?? ''}`}>
            {display ?? value.toLocaleString()}
          </p>
        </div>
        <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function AnalyticsTab({
  analytics,
  loading,
}: {
  analytics: AccessAnalyticsResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white p-20 text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Loading analytics…
      </div>
    );
  }

  if (!analytics) {
    return (
      <p className="rounded-2xl border border-border bg-white p-12 text-center text-sm text-muted">
        {loading ? 'Loading…' : 'Choose filters above or pick a complete custom date range.'}
      </p>
    );
  }

  const byAction = Array.isArray(analytics.byAction) ? analytics.byAction : [];
  const daily = Array.isArray(analytics.daily) ? analytics.daily : [];
  const hourly = Array.isArray(analytics.hourly) ? analytics.hourly : [];
  const topSchools = Array.isArray(analytics.topSchools) ? analytics.topSchools : [];
  const topUsers = Array.isArray(analytics.topUsers) ? analytics.topUsers : [];
  const stats = analytics.stats ?? {
    total: 0,
    logins: 0,
    failures: 0,
    logouts: 0,
    uniqueUsers: 0,
    successRate: null as number | null,
  };

  const donutSegments = byAction.slice(0, 6).map((row, i) => ({
    label: formatAction(row?.action ?? 'UNKNOWN'),
    value: row?.count ?? 0,
    color: ACTION_COLORS[row?.action ?? ''] ?? ['#FCB038', '#000435', '#64748b', '#10b981', '#ef4444', '#8b5cf6'][i % 6],
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Access events" value={stats.total} icon={Activity} />
        <StatCard label="Logins" value={stats.logins} icon={LogIn} accent="text-emerald-700" />
        <StatCard label="Failed attempts" value={stats.failures} icon={ShieldAlert} accent="text-rose-600" />
        <StatCard label="Unique users" value={stats.uniqueUsers} icon={Users} accent="text-violet-700" />
        <StatCard
          label="Login success rate"
          value={stats.successRate ?? 0}
          icon={ShieldCheck}
          display={stats.successRate != null ? `${stats.successRate}%` : 'N/A'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Daily access trend" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={daily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="loginGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#e8ecf4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={36} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="logins" name="Logins" stroke="#10b981" fill="url(#loginGrad)" strokeWidth={2} />
              <Line type="monotone" dataKey="failures" name="Failures" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="logouts" name="Logouts" stroke="#64748b" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Events by type">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="h-[200px] w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutSegments} dataKey="value" nameKey="label" innerRadius={55} outerRadius={80} paddingAngle={2}>
                    {donutSegments.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-2 text-xs">
              {donutSegments.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-navy">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-semibold">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Activity by hour (local)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#e8ecf4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={32} />
              <Tooltip />
              <Bar dataKey="total" name="Events" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top schools by access events">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={topSchools.map((s) => ({
                label: (s.name ?? 'Unknown').slice(0, 18),
                value: s.count ?? 0,
              }))}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#e8ecf4" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" name="Events" fill={PRIMARY} radius={[0, 4, 4, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Most active users">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">User</th>
                <th className="py-2 text-right">Access events</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u, i) => (
                <tr key={u.userId ?? i} className="border-t border-border/60">
                  <td className="py-2.5 pr-4 font-mono text-xs text-muted">{i + 1}</td>
                  <td className="py-2.5 pr-4 font-medium text-navy">{u.name}</td>
                  <td className="py-2.5 text-right font-semibold text-navy">{u.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm ${className}`}
    >
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-navy">
        <span className="h-4 w-1 rounded-full bg-primary" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function LogDetailDrawer({ log, onClose }: { log: PlatformAuditLog; onClose: () => void }) {
  const metadata =
    log.metadata && typeof log.metadata === 'object' ? (log.metadata as Record<string, unknown>) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-navy/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-slide-in-right">
        <div className="border-b border-white/10 bg-gradient-to-br from-navy via-navy to-[#0a1054] px-6 py-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Audit event</p>
              <h2 className="mt-1 font-montserrat text-xl font-bold">{formatAction(log.action)}</h2>
              <p className="mt-2 text-xs text-white/70">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <DetailBlock title="Actor">
            {log.user ? (
              <>
                <p className="font-semibold text-navy">
                  {log.user.firstName} {log.user.lastName}
                </p>
                <p className="text-sm text-muted">{log.user.email}</p>
              </>
            ) : (
              <p className="text-sm text-muted">System / automated</p>
            )}
          </DetailBlock>

          <DetailBlock title="Organization">
            <p className="text-sm text-navy">{log.organization?.name ?? 'Platform (no school scope)'}</p>
          </DetailBlock>

          <DetailBlock title="Resource">
            <p className="text-sm text-navy">{log.resource ?? '—'}</p>
            {log.resourceId ? <p className="mt-1 font-mono text-xs text-muted">{log.resourceId}</p> : null}
          </DetailBlock>

          <DetailBlock title="Network">
            <p className="text-sm text-navy">{log.ipAddress ?? '—'}</p>
            {log.userAgent ? (
              <p className="mt-2 break-all text-xs leading-relaxed text-muted">{log.userAgent}</p>
            ) : null}
          </DetailBlock>

          {metadata && Object.keys(metadata).length > 0 && (
            <DetailBlock title="Metadata">
              <pre className="max-h-48 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-navy ring-1 ring-border">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </DetailBlock>
          )}

          <DetailBlock title="Event ID">
            <p className="font-mono text-xs text-muted">{log.id}</p>
          </DetailBlock>
        </div>
      </aside>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/80 bg-slate-50/50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
