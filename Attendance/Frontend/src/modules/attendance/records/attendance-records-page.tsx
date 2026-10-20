'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  FileDown,
  Loader2,
  RefreshCw,
  Users,
  UserSquare2,
} from 'lucide-react';
import { AttendanceFilterBar, filterSummary, useAttendanceFilters } from '@/components/attendance-filters';
import { filterSelectClass, PersonAvatar } from '@/components/attendance-ui';
import { ListPagination } from '@/components/list-pagination';
import {
  attendanceApi,
  type AttendanceRecord,
  type AttendanceTimelineEvent,
} from '@/services/attendance-api';
import { formatAttendanceTime, formatDurationMins } from '@/utils/format-attendance-time';
import {
  attendanceRowsToCsv,
  downloadCsv,
  printAttendanceReport,
} from '@/utils/export-table';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { AttendanceStatusIndicators } from './attendance-status-indicators';
import { AttendanceProfileDrawer } from './attendance-profile-drawer';

type Audience = 'STUDENT' | 'STAFF';

async function fetchAllMatching(params: Record<string, string | number | undefined>) {
  const limit = 100;
  const all: AttendanceRecord[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data } = await attendanceApi.attendance({ ...params, page, limit });
    const batch = data.data?.items ?? [];
    all.push(...batch);
    if (batch.length < limit) break;
  }
  return all;
}

export function AttendanceRecordsPage() {
  const toast = useToast();
  const { filters, setFilters, params, academic } = useAttendanceFilters({ mode: 'today' });
  const [audience, setAudience] = useState<Audience>('STUDENT');
  const [status, setStatus] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [sortBy, setSortBy] = useState('checkin');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ present: 0, late: 0, missingCheckout: 0, absent: 0 });
  const [filterOptions, setFilterOptions] = useState<{
    classes: string[];
    departments: string[];
    staffRoles: string[];
    sources?: { studentManagement?: boolean; hrIam?: boolean };
  }>({
    classes: [],
    departments: [],
    staffRoles: [],
  });
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [timeline, setTimeline] = useState<AttendanceTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const queryBase = useMemo(
    () => ({
      ...params,
      personType: audience,
      status: status || undefined,
      className: audience === 'STUDENT' && groupFilter ? groupFilter : undefined,
      department: audience === 'STAFF' && groupFilter ? groupFilter : undefined,
      staffRole: audience === 'STAFF' && staffRole ? staffRole : undefined,
      sortBy,
      sortDir,
    }),
    [params, audience, status, groupFilter, staffRole, sortBy, sortDir]
  );

  const filterKey = JSON.stringify({ queryBase, page, limit });
  useEffect(() => setPage(1), [queryBase]);

  useEffect(() => {
    attendanceApi.attendanceFilterOptions().then(({ data }) => {
      if (data.data) setFilterOptions(data.data);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        attendanceApi.attendance({ ...queryBase, page, limit }),
        attendanceApi.attendanceSummary(queryBase),
      ]);
      const payload = listRes.data.data;
      setRows(payload?.items ?? []);
      setTotal(payload?.total ?? 0);
      setTotalPages(payload?.totalPages ?? 1);
      setSummary(sumRes.data.data ?? { present: 0, late: 0, missingCheckout: 0, absent: 0 });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load attendance records'));
    } finally {
      setLoading(false);
    }
  }, [queryBase, page, limit, toast]);

  useEffect(() => {
    void load();
  }, [load, filterKey]);

  async function openDrawer(row: AttendanceRecord) {
    setSelected(row);
    setDrawerOpen(true);
    setTimeline([]);
    setTimelineLoading(true);
    try {
      const { data } = await attendanceApi.attendanceDetail(row.id);
      setSelected(data.data?.record ?? row);
      setTimeline(data.data?.timeline ?? []);
    } catch {
      toast.error('Could not load timeline');
    } finally {
      setTimelineLoading(false);
    }
  }

  function toggleSort(column: string) {
    if (sortBy === column) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(column);
      setSortDir('asc');
    }
  }

  const periodLabel = filterSummary(filters, academic);
  const schoolSubtitle = 'Shule+ · Digital Attendance Management';

  async function runExport(scope: 'page' | 'all', format: 'excel' | 'pdf') {
    setExporting(true);
    setExportOpen(false);
    try {
      const data = scope === 'page' ? rows : await fetchAllMatching(queryBase);
      const subtitle = `${periodLabel} · ${audience === 'STUDENT' ? 'Students' : 'Staff'} · Generated ${new Date().toLocaleString()}`;
      if (format === 'excel') {
        downloadCsv(
          `attendance-records-${params.date ?? params.from ?? 'export'}.csv`,
          attendanceRowsToCsv(data, subtitle)
        );
        toast.success(`Exported ${data.length} rows to Excel (CSV)`);
      } else {
        printAttendanceReport('Attendance Records', subtitle, data);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#FCB038]">Live records</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#000435] sm:text-3xl">Attendance Records</h1>
          <p className="mt-1 text-sm text-muted">{schoolSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <div className="relative">
            <button
              type="button"
              className="btn-primary"
              disabled={exporting}
              onClick={() => setExportOpen((o) => !o)}
            >
              <FileDown size={16} /> Export <ChevronDown size={14} />
            </button>
            {exportOpen ? (
              <div className="absolute right-0 z-20 mt-1 min-w-[200px] rounded-xl border border-border bg-white py-1 shadow-lg">
                <button type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50" onClick={() => void runExport('page', 'excel')}>
                  Excel · this page
                </button>
                <button type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50" onClick={() => void runExport('all', 'excel')}>
                  Excel · all matching
                </button>
                <button type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50" onClick={() => void runExport('all', 'pdf')}>
                  PDF · all matching
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex gap-1 rounded-2xl bg-slate-100/90 p-1 ring-1 ring-slate-200/80">
        {(
          [
            { id: 'STUDENT' as const, label: 'Students', icon: Users },
            { id: 'STAFF' as const, label: 'Staff', icon: UserSquare2 },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = audience === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setAudience(tab.id);
                setGroupFilter('');
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                active ? 'bg-white text-[#000435] shadow-sm ring-1 ring-slate-200/80' : 'text-muted hover:text-navy'
              }`}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      <AttendanceSummaryCards summary={summary} loading={loading} />

      <AttendanceFilterBar
        filters={filters}
        setFilters={setFilters}
        academic={academic}
        showClassFilter={false}
        searchPlaceholder={audience === 'STUDENT' ? 'Search by name or student ID…' : 'Search by name or staff ID…'}
        extra={
          <div className="flex flex-wrap gap-2">
            <select className={filterSelectClass} value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
              <option value="">{audience === 'STUDENT' ? 'All classes' : 'All departments'}</option>
              {(audience === 'STUDENT' ? filterOptions.classes : filterOptions.departments).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {audience === 'STAFF' ? (
              <select className={filterSelectClass} value={staffRole} onChange={(e) => setStaffRole(e.target.value)}>
                <option value="">All roles</option>
                {filterOptions.staffRoles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            ) : null}
            <select className={filterSelectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
              <option value="PENDING_CHECKOUT">Missing check-out</option>
              <option value="ENTERED_ONLY">Entered only</option>
            </select>
          </div>
        }
      />

      <p className="text-xs text-muted">
        Attendance date: <span className="font-semibold text-navy">{periodLabel}</span>
        {filterOptions.sources?.studentManagement || filterOptions.sources?.hrIam ? (
          <span className="ml-2 text-[10px]">
            · Classes from Student Management
            {filterOptions.sources?.hrIam ? ' · Departments/roles from HR & IAM' : ''}
          </span>
        ) : null}
      </p>

      <div className="hidden md:block overflow-hidden rounded-2xl border border-[#000435]/10 bg-white shadow-sm">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[1024px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/95 text-xs uppercase tracking-wide text-muted backdrop-blur">
              <tr className="border-b border-border">
                <th className="w-12 px-3 py-3 font-semibold">No.</th>
                <SortHeader label="Profile" col="name" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader
                  label={audience === 'STUDENT' ? 'Class' : 'Department'}
                  col="class"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <th className="px-3 py-3 font-semibold">Expected</th>
                <SortHeader label="Check-in" col="checkin" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Check-out" col="checkout" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-3 font-semibold">Duration</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-muted">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b border-border/60 transition hover:bg-[#000435]/[0.02]"
                    onClick={() => void openDrawer(r)}
                  >
                    <td className="px-3 py-3 font-mono text-xs text-muted">{(page - 1) * limit + i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <PersonAvatar
                          name={r.studentName}
                          photoUrl={r.photoUrl}
                          personKind={r.personType ?? (audience === 'STAFF' ? 'STAFF' : 'STUDENT')}
                          size={36}
                        />
                        <div>
                          <p className="font-semibold text-[#000435]">{r.studentName}</p>
                          <p className="font-mono text-[10px] text-muted">{r.studentCode ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">{r.groupLabel ?? r.className ?? '—'}</td>
                    <td className="px-3 py-3 font-mono text-xs">{r.expectedArrival ?? '—'}</td>
                    <td className="px-3 py-3 font-mono text-xs">{formatAttendanceTime(r.entryTime)}</td>
                    <td className="px-3 py-3 font-mono text-xs">{formatAttendanceTime(r.exitTime)}</td>
                    <td className="px-3 py-3 text-xs">{formatDurationMins(r.durationMins)}</td>
                    <td className="px-3 py-3">
                      <AttendanceStatusIndicators
                        attendanceStatus={r.attendanceStatus ?? r.display?.attendanceStatus}
                        punctuality={r.punctuality ?? r.display?.punctuality}
                        checkoutStatus={r.checkoutStatus ?? r.display?.checkoutStatus}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button type="button" className="text-xs font-semibold text-[#FCB038] hover:underline" onClick={(e) => { e.stopPropagation(); void openDrawer(r); }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">No records match your filters.</p>
        ) : null}
        <ListPagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} onLimitChange={(n) => { setLimit(n); setPage(1); }} />
      </div>

      <div className="space-y-3 md:hidden">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Loading…</p>
        ) : (
          rows.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => void openDrawer(r)}
              className="w-full rounded-2xl border border-border bg-white p-4 text-left shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <PersonAvatar
                    name={r.studentName}
                    photoUrl={r.photoUrl}
                    personKind={r.personType ?? (audience === 'STAFF' ? 'STAFF' : 'STUDENT')}
                    size={44}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-navy">{r.studentName}</p>
                    <p className="font-mono text-[10px] text-muted">{r.studentCode} · {r.groupLabel ?? r.className}</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-muted">#{(page - 1) * limit + i + 1}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted">In</span> <span className="font-mono">{formatAttendanceTime(r.entryTime)}</span></div>
                <div><span className="text-muted">Out</span> <span className="font-mono">{formatAttendanceTime(r.exitTime)}</span></div>
              </div>
              <div className="mt-2">
                <AttendanceStatusIndicators
                  attendanceStatus={r.attendanceStatus ?? r.display?.attendanceStatus}
                  punctuality={r.punctuality ?? r.display?.punctuality}
                  checkoutStatus={r.checkoutStatus ?? r.display?.checkoutStatus}
                />
              </div>
            </button>
          ))
        )}
        <ListPagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} onLimitChange={(n) => { setLimit(n); setPage(1); }} />
      </div>

      <AttendanceProfileDrawer
        open={drawerOpen}
        record={selected}
        timeline={timeline}
        loading={timelineLoading}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
      />
    </div>
  );
}

function AttendanceSummaryCards({
  summary,
  loading,
}: {
  summary: { present: number; late: number; missingCheckout: number; absent: number };
  loading: boolean;
}) {
  const cards = [
    { label: 'Present', value: summary.present, hint: 'Checked in today', tone: 'border-emerald-200 bg-emerald-50/40' },
    { label: 'Late arrivals', value: summary.late, hint: 'Arrived after start time', tone: 'border-amber-200 bg-amber-50/40' },
    { label: 'Missing check-out', value: summary.missingCheckout, hint: 'Arrival recorded only', tone: 'border-sky-200 bg-sky-50/40' },
    { label: 'Absent', value: summary.absent, hint: 'No qualifying attendance', tone: 'border-red-200 bg-red-50/40' },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-2xl border p-4 shadow-sm ${c.tone}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{c.label}</p>
          <p className="mt-1 text-3xl font-extrabold text-[#000435]">{loading ? '—' : c.value.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted">{c.hint}</p>
        </div>
      ))}
    </div>
  );
}

function SortHeader({
  label,
  col,
  sortBy,
  sortDir,
  onSort,
}: {
  label: string;
  col: string;
  sortBy: string;
  sortDir: string;
  onSort: (c: string) => void;
}) {
  const active = sortBy === col;
  return (
    <th className="px-3 py-3 font-semibold">
      <button type="button" className="inline-flex items-center gap-1 hover:text-navy" onClick={() => onSort(col)}>
        {label}
        {active ? <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span> : null}
      </button>
    </th>
  );
}
