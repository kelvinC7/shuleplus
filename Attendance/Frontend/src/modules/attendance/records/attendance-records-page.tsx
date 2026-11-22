'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarRange,
  ChevronDown,
  ClipboardCheck,
  FileDown,
  IdCard,
  Info,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  ShieldAlert,
  Users,
  UserSquare2,
  X,
} from 'lucide-react';
import {
  AttendanceFilterBar,
  filterSummary,
  isoWeekNumber,
  primaryAttendanceDateIso,
  startOfWeekIso,
  useAttendanceFilters,
  weekDaysIso,
  weekRangeIso,
} from '@/components/attendance-filters';
import { FilterSelect, PersonAvatar } from '@/components/attendance-ui';
import { ListPagination } from '@/components/list-pagination';
import {
  attendanceApi,
  type AttendanceRecord,
  type AttendanceTimelineEvent,
} from '@/services/attendance-api';
import { formatAttendanceTime, formatDurationMins } from '@/utils/format-attendance-time';
import { exportAttendancePdf, exportWeeklyAttendancePdf, type StaffWeeklyCell, type StaffWeeklyDay, type WeekAttendancePerson } from '@/utils/export-attendance-pdf';
import { buildSchoolPdfBranding, fetchSchoolOrganizationProfile } from '@/utils/school-pdf-branding';
import { GeneralStatusBadge } from './general-status-badge';
import { StaffCardAccessTab } from './staff-card-access-tab';
import { StaffWeeklyReportModal } from './staff-weekly-report-modal';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { AttendanceStatusIndicators } from './attendance-status-indicators';
import { AttendanceProfileDrawer } from './attendance-profile-drawer';

type Audience = 'STUDENT' | 'STAFF' | 'CARDS' | 'CLASS_PERF';

function todayLocalIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function eachIsoDate(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from.slice(0, 10)}T12:00:00`);
  const end = new Date(`${to.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out;
  const cursor = new Date(start);
  while (cursor <= end && out.length < 370) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    out.push(`${y}-${m}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function schoolDaysBetween(from: string, to: string): string[] {
  // Mon–Fri only, up to 370 days.
  return eachIsoDate(from, to).filter((iso) => {
    const d = new Date(`${iso}T12:00:00`).getDay();
    return d >= 1 && d <= 5;
  });
}

function academicYearBounds(label?: string | null): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const raw = String(label ?? '').trim();
  const match = raw.match(/(\d{4})\D+(\d{2,4})/);
  if (match) {
    const startYear = Number(match[1]);
    let endYear = Number(match[2]);
    if (endYear < 100) endYear = Math.floor(startYear / 100) * 100 + endYear;
    if (endYear < startYear) endYear = startYear + 1;
    // Common school-year pattern (e.g. 2025-2026): Sep .. Jul. Fallback to Jan-Dec if same year.
    if (endYear > startYear) {
      return { from: `${startYear}-09-01`, to: `${endYear}-07-31` };
    }
    return { from: `${startYear}-01-01`, to: `${startYear}-12-31` };
  }
  // Fallback: current calendar year to date.
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function termBounds(
  termLabel: string | undefined,
  academicYearLabel: string | undefined,
  knownTerms: string[]
): { from: string; to: string } {
  const year = academicYearBounds(academicYearLabel);
  const terms = (knownTerms.length ? knownTerms : ['Term 1', 'Term 2', 'Term 3']).filter(Boolean);
  const idx = Math.max(
    0,
    terms.findIndex((t) => t.trim().toLowerCase() === String(termLabel ?? '').trim().toLowerCase())
  );
  const start = new Date(`${year.from}T12:00:00`);
  const end = new Date(`${year.to}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return year;
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  const slice = Math.max(1, Math.ceil(totalDays / Math.max(1, terms.length)));
  const fromD = new Date(start);
  fromD.setDate(fromD.getDate() + idx * slice);
  const toD = new Date(start);
  toD.setDate(toD.getDate() + Math.min(totalDays, (idx + 1) * slice) - 1);
  return { from: localIsoDate(fromD), to: localIsoDate(toD) };
}



async function fetchAllMatching(
  params: Record<string, string | number | undefined>,
  mode: 'staffRoster' | 'studentRoster' | 'legacy'
) {
  const limit = 100;
  const all: AttendanceRecord[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data } =
      mode === 'staffRoster'
        ? await attendanceApi.staffRoster({ ...params, page, limit })
        : mode === 'studentRoster'
          ? await attendanceApi.studentRoster({ ...params, page, limit })
          : await attendanceApi.attendance({ ...params, page, limit });
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
  const [tapFilter, setTapFilter] = useState<'all' | 'tapped' | 'not_tapped'>('all');
  const [groupFilter, setGroupFilter] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [sortBy, setSortBy] = useState('checkin');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [classPerf, setClassPerf] = useState<Array<{ className: string; studentCount: number; avgRate: number; presentDays: number; expectedDays: number }>>([]);
  const [classPerfLoading, setClassPerfLoading] = useState(false);
  const [classTotals, setClassTotals] = useState<{ classes: Array<{ className: string; assigned: number; tapped: number; notTapped: number; late: number; missingCheckout: number; present: number }>; totals: { assigned: number; tapped: number; notTapped: number; late: number; missingCheckout: number } } | null>(null);
  const [classPerfSearch, setClassPerfSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ present: 0, late: 0, missingCheckout: 0, absent: 0, assigned: 0, total: 0 });
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
  const [exporting, setExporting] = useState(false);
  const [applyingAbsence, setApplyingAbsence] = useState(false);
  const [absencePromptDates, setAbsencePromptDates] = useState<string[] | null>(null);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [schoolName, setSchoolName] = useState('School');
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [timeline, setTimeline] = useState<AttendanceTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const queryBase = useMemo(() => {
    const periodParams = { ...params };
    const singleDay =
      filters.mode === 'today' ||
      filters.mode === 'date' ||
      (filters.mode === 'range' && periodParams.from === periodParams.to);
    if (!singleDay && !periodParams.date) {
      delete periodParams.date;
    } else if (singleDay && !periodParams.date) {
      periodParams.date = primaryAttendanceDateIso(filters);
    }
    const effectiveStatus =
      tapFilter === 'tapped' ? (status && status !== 'ABSENT' ? status : 'PRESENT') : tapFilter === 'not_tapped' ? 'ABSENT' : status || undefined;
    return {
      ...periodParams,
      personType: audience === 'CARDS' || audience === 'CLASS_PERF' ? 'STUDENT' : audience,
      status: effectiveStatus,
      className: (audience === 'STUDENT' || audience === 'CLASS_PERF') && groupFilter ? groupFilter : undefined,
      department: audience === 'STAFF' && groupFilter ? groupFilter : undefined,
      staffRole: audience === 'STAFF' && staffRole ? staffRole : undefined,
      sortBy,
      sortDir,
    };
  }, [params, filters, audience, status, tapFilter, groupFilter, staffRole, sortBy, sortDir]);

  const isRangeMode = useMemo(
    () =>
      filters.mode === 'week' ||
      filters.mode === 'term' ||
      filters.mode === 'year' ||
      (filters.mode === 'range' && Boolean(params.from) && params.from !== params.to),
    [filters.mode, params.from, params.to]
  );

  const filterKey = JSON.stringify({ queryBase, page, limit });
  useEffect(() => setPage(1), [queryBase]);

  useEffect(() => {
    attendanceApi.attendanceFilterOptions().then(({ data }) => {
      if (data.data) setFilterOptions(data.data);
    }).catch(() => {});
    attendanceApi.organizationProfile().then(({ data }) => {
      const name = data.data?.schoolName?.trim();
      if (name) setSchoolName(name);
    }).catch(() => {
      attendanceApi.settingsGet().then(({ data }) => {
        const name = data.data?.schoolName?.trim();
        if (name) setSchoolName(name);
      }).catch(() => {});
    });
  }, []);

  const loadClassPerformance = useCallback(async () => {
    setClassPerfLoading(true);
    try {
      const perfParams = { ...params, personType: 'STUDENT' } as any;
      const [perfRes, totalsRes] = await Promise.all([
        attendanceApi.peopleStudentsClassPerformance(perfParams),
        attendanceApi.attendanceClassTotals(perfParams),
      ]);
      setClassPerf(perfRes.data.data?.classes ?? []);
      setClassTotals((totalsRes.data.data as any) ?? null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load class performance'));
    } finally {
      setClassPerfLoading(false);
    }
  }, [params, toast]);

  useEffect(() => {
    if (audience === 'CLASS_PERF') void loadClassPerformance();
  }, [audience, loadClassPerformance]);

  const load = useCallback(async () => {
    if (audience === 'CARDS' || audience === 'CLASS_PERF') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (isRangeMode) {
        const [{ data: listRes }, { data: summaryRes }] = await Promise.all([
          attendanceApi.attendance({ ...queryBase, page, limit }),
          attendanceApi.attendanceSummary(queryBase),
        ]);
        const payload = listRes.data;
        setRows(payload?.items ?? []);
        setTotal(payload?.total ?? 0);
        setTotalPages(payload?.totalPages ?? 1);
        const s = summaryRes.data as any;
        const assigned = s?.assigned ?? 0;
        const notTapped = s?.notTapped ?? (assigned > 0 ? Math.max(0, assigned - (s?.present ?? 0)) : (s?.absent ?? 0));
        setSummary({
          present: s?.present ?? 0,
          late: s?.late ?? 0,
          missingCheckout: s?.missingCheckout ?? 0,
          absent: assigned > 0 ? notTapped : (s?.absent ?? 0),
          assigned,
          total: s?.total ?? 0,
        });
      } else if (audience === 'STAFF') {
        const { data } = await attendanceApi.staffRoster({ ...queryBase, page, limit });
        const payload = data.data as any;
        setRows(payload?.items ?? []);
        setTotal(payload?.total ?? 0);
        setTotalPages(payload?.totalPages ?? 1);
        const sm = payload?.summary ?? {};
        setSummary({
          present: sm.present ?? 0,
          late: sm.late ?? 0,
          missingCheckout: sm.missingCheckout ?? 0,
          absent: sm.absent ?? 0,
          assigned: sm.assigned ?? sm.total ?? 0,
          total: sm.total ?? 0,
        });
      } else {
        const { data } = await attendanceApi.studentRoster({ ...queryBase, page, limit });
        const payload = data.data as any;
        setRows(payload?.items ?? []);
        setTotal(payload?.total ?? 0);
        setTotalPages(payload?.totalPages ?? 1);
        const sm = payload?.summary ?? {};
        setSummary({
          present: sm.present ?? 0,
          late: sm.late ?? 0,
          missingCheckout: sm.missingCheckout ?? 0,
          absent: sm.absent ?? 0,
          assigned: sm.assigned ?? sm.total ?? 0,
          total: sm.total ?? 0,
        });
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load attendance records'));
    } finally {
      setLoading(false);
    }
  }, [audience, queryBase, isRangeMode, page, limit, toast]);

  useEffect(() => {
    void load();
  }, [load, filterKey]);

  async function openDrawer(row: AttendanceRecord) {
    if (String(row.id).startsWith('absent:')) {
      toast.info('No tap recorded — marked absent (assigned card, no check-in).');
      return;
    }
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

  async function runExport(scope: 'page' | 'all' | 'tapped' | 'not_tapped') {
    if (audience === 'CARDS' || audience === 'CLASS_PERF') return;
    setExporting(true);
    try {
      const mode = isRangeMode
        ? 'legacy'
        : audience === 'STAFF'
          ? 'staffRoster'
          : 'studentRoster';
      let data = scope === 'page' ? rows : await fetchAllMatching(queryBase, mode);
      if (scope === 'tapped') {
        if (data === rows) data = await fetchAllMatching(queryBase, mode);
        data = data.filter((r) => (r.attendanceStatus ?? r.display?.attendanceStatus) !== 'ABSENT');
      }
      if (scope === 'not_tapped') {
        if (data === rows) data = await fetchAllMatching(queryBase, mode);
        data = data.filter((r) => (r.attendanceStatus ?? r.display?.attendanceStatus) === 'ABSENT');
      }
      const subtitle = `Generated ${new Date().toLocaleString()} · Shule+ Attendance`;
      const profile = await fetchSchoolOrganizationProfile();
      const titleSuffix = scope === 'tapped' ? ' (Tapped cards)' : scope === 'not_tapped' ? ' (Not tapped / absent)' : '';
      await exportAttendancePdf(
        buildSchoolPdfBranding(profile, periodLabel, {
          title: `Attendance records${titleSuffix}`,
          subtitle,
          audienceLabel:
            audience === 'STUDENT'
              ? 'Students (includes card holders marked absent)'
              : 'Staff (includes card holders marked absent)',
        }),
        data,
        { staffColumns: audience === 'STAFF' }
      );
      toast.success(`PDF ready · ${data.length} row(s)`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(false);
    }
  }

  function toWeeklyCell(record: AttendanceRecord): StaffWeeklyCell {
    const status = (record.attendanceStatus ?? record.display?.attendanceStatus ?? record.status) as string;
    if (status === 'ABSENT') return { status: 'ABSENT' };
    const punctuality = (record.punctuality ?? record.display?.punctuality) as string | undefined;
    const checkoutStatus = (record.checkoutStatus ?? record.display?.checkoutStatus) as string | undefined;
    const base = { entryTime: record.entryTime ?? null, exitTime: record.exitTime ?? null, expectedArrival: record.expectedArrival ?? null };
    if (checkoutStatus === 'PENDING') return { ...base, status: 'PENDING_CHECKOUT' };
    if (punctuality === 'LATE') return { ...base, status: 'LATE' };
    return { ...base, status: 'PRESENT' };
  }

  async function runWeeklyExport() {
    if (audience === 'CARDS' || audience === 'CLASS_PERF') return;
    if (filters.mode !== 'week') {
      toast.error('Switch to Week view to export a weekly attendance report');
      return;
    }
    setExporting(true);
    try {
      const { from, to } = weekRangeIso(filters.weekStart);
      const daysIso = weekDaysIso(filters.weekStart).slice(0, 5);
      const days: StaffWeeklyDay[] = daysIso.map((iso) => ({
        iso,
        weekday: new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' }),
        label: new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      }));
      const mode = audience === 'STAFF' ? 'staffRoster' : 'studentRoster';
      const perDay = await Promise.all(
        daysIso.map((date) =>
          fetchAllMatching(
            {
              ...queryBase,
              date,
              from: undefined,
              to: undefined,
              page: 1,
              limit: 200,
            },
            mode
          )
        )
      );
      const peopleMap = new Map<string, WeekAttendancePerson>();
      const keyFor = (r: AttendanceRecord) =>
        (r.studentId || r.studentCode || r.cardNumber || `${r.studentName}|${r.className ?? ''}`).toLowerCase();
      daysIso.forEach((iso, i) => {
        for (const r of perDay[i] || []) {
          const k = keyFor(r);
          if (!peopleMap.has(k)) {
            peopleMap.set(k, {
              key: k,
              name: r.studentName || 'Unknown',
              code: r.studentCode ?? null,
              group: audience === 'STAFF' ? (r.groupLabel ?? r.department ?? r.className ?? null) : (r.className ?? r.groupLabel ?? null),
              role: audience === 'STAFF' ? (r.staffRole ?? null) : null,
              days: {},
            });
          }
          peopleMap.get(k)!.days[iso] = toWeeklyCell(r);
        }
      });
      const people = [...peopleMap.values()].sort((a, b) => a.name.localeCompare(b.name));
      const profile = await fetchSchoolOrganizationProfile();
      const weekLabel = `${new Date(`${from}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} – ${new Date(`${to}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · Week ${isoWeekNumber(from)}`;
      await exportWeeklyAttendancePdf(
        buildSchoolPdfBranding(profile, weekLabel, {
          title: `Weekly ${audience === 'STAFF' ? 'staff' : 'student'} attendance`,
          subtitle: `Mon–Fri week view · ${schoolName || 'School'}`,
          audienceLabel: audience === 'STAFF' ? 'Staff weekly in/out and totals' : 'Student weekly in/out and totals',
        }),
        days,
        people
      );
      toast.success(`Weekly PDF ready · ${people.length} person(s)`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not generate weekly PDF'));
    } finally {
      setExporting(false);
    }
  }

  function absenceDates(): string[] {
    const today = todayLocalIso();
    if (filters.mode === 'week') {
      return weekDaysIso(filters.weekStart).slice(0, 5).filter((d) => d <= today);
    }
    if (filters.mode === 'today') return [today];
    if (filters.mode === 'date' && filters.date) return [filters.date.slice(0, 10)];
    if (filters.mode === 'range' && filters.from && filters.to) {
      return schoolDaysBetween(filters.from, filters.to).filter((d) => d <= today);
    }
    if (filters.mode === 'year') {
      const yearLabel = filters.academicYear || academic?.currentAcademicYear || undefined;
      const bounds = academicYearBounds(yearLabel);
      return schoolDaysBetween(bounds.from, today < bounds.to ? today : bounds.to).filter((d) => d <= today);
    }
    if (filters.mode === 'term') {
      const yearLabel = filters.academicYear || academic?.currentAcademicYear || undefined;
      const termLabel = filters.term || academic?.currentTerm || undefined;
      const bounds = termBounds(termLabel, yearLabel, academic?.terms ?? []);
      const cap = today < bounds.to ? today : bounds.to;
      return schoolDaysBetween(bounds.from, cap).filter((d) => d <= today);
    }
    return [];
  }

  async function loadAbsentStudents(date: string) {
    const limit = 100;
    const all: AttendanceRecord[] = [];
    for (let p = 1; p <= 50; p++) {
      const { data } = await attendanceApi.studentRoster({
        date,
        status: 'ABSENT',
        page: p,
        limit,
        className: groupFilter || undefined,
      });
      const batch = data.data?.items ?? [];
      all.push(...batch);
      if (batch.length < limit) break;
    }

    const seen = new Set<string>();
    const students: Array<{
      studentId?: string;
      studentCode?: string;
      studentName: string;
      className?: string;
    }> = [];
    for (const row of all) {
      if (!row.studentName) continue;
      const key =
        row.studentId?.trim() ||
        row.studentCode?.trim() ||
        `${row.studentName.trim().toLowerCase()}|${row.className ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      students.push({
        studentId: row.studentId ?? undefined,
        studentCode: row.studentCode ?? undefined,
        studentName: row.studentName,
        className: row.groupLabel ?? row.className ?? undefined,
      });
    }
    return students;
  }

  function requestAbsenceMarks() {
    if (audience !== 'STUDENT' || applyingAbsence) return;
    const dates = absenceDates();
    if (!dates.length) {
      toast.info('Pick a day, week, term, academic year or custom range to apply absence marks');
      return;
    }
    // Cap very large runs to keep the browser responsive; term/year can be long.
    const capped = dates.length > 120 ? dates.slice(-120) : dates;
    if (dates.length > 120) {
      toast.info(
        `Large period selected (${dates.length} school days). Applying the most recent 120 days now — you can run again for earlier dates if needed.`,
        'Applying recent days'
      );
    }
    setAbsencePromptDates(capped);
  }

  async function confirmApplyAbsenceMarks() {
    const dates = absencePromptDates;
    if (!dates?.length || applyingAbsence) return;
    setAbsencePromptDates(null);
    setApplyingAbsence(true);
    try {
      let applied = 0;
      let skipped = 0;
      let disabled = false;
      let processed = 0;

      for (const date of dates) {
        const students = await loadAbsentStudents(date);
        if (!students.length) continue;
        processed += students.length;
        const { data } = await attendanceApi.applyAbsenceDeductions({ date, students });
        applied += data.data?.applied ?? 0;
        skipped += data.data?.skipped ?? 0;
        if (data.data?.enabled === false) disabled = true;
      }

      if (!processed) {
        toast.toast({
          type: 'info',
          placement: 'center',
          title: 'No absent students found',
          description:
            'No card-holding students were marked absent for the selected school day(s). Switch to Today/Date to review assigned-card absentees.',
          duration: 7000,
        });
      } else if (disabled) {
        toast.toast({
          type: 'warning',
          placement: 'center',
          title: 'Absence deductions are off',
          description:
            'Turn on “Student absence” in Discipline → Settings → Attendance Deductions to apply marks.',
          duration: 7000,
        });
      } else if (applied === 0 && skipped > 0) {
        toast.toast({
          type: 'info',
          placement: 'center',
          title: 'Already recorded',
          description: `${skipped} student${skipped === 1 ? '' : 's'} already had an absence mark for the selected day${dates.length === 1 ? '' : 's'}. Nothing was duplicated.`,
          duration: 6500,
        });
      } else {
        toast.toast({
          type: 'success',
          placement: 'center',
          title: 'Absence marks applied',
          description: `${applied} absence mark${applied === 1 ? '' : 's'} applied · ${skipped} already recorded. Points removed are based on your Discipline attendance deduction setting.`,
          duration: 7000,
        });
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not apply absence marks'), 'Absence marks');
    } finally {
      setApplyingAbsence(false);
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
        <div className="relative flex flex-wrap items-center gap-2">
          {audience === 'STUDENT' || audience === 'STAFF' ? (
            <div className="relative">
              <button
                type="button"
                className="btn-primary"
                disabled={exporting}
                onClick={() => { setDownloadMenuOpen((v) => !v); setMoreMenuOpen(false); }}
              >
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                Download PDF
                <ChevronDown size={14} className="opacity-80" />
              </button>
              {downloadMenuOpen ? (
                <>
                  <button type="button" className="fixed inset-0 z-20 cursor-default" aria-label="Close" onClick={() => setDownloadMenuOpen(false)} />
                  <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-xl">
                    {[
                      { key: 'page', label: 'Current page' },
                      { key: 'all', label: 'All records' },
                      ...(filters.mode === 'week' ? [{ key: 'week_view', label: 'Weekly view (Mon–Fri, in/out per day)' }] : []),
                      { key: 'tapped', label: 'Tapped cards only' },
                      { key: 'not_tapped', label: 'Not tapped / absent' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-navy hover:bg-slate-50"
                        onClick={() => {
                          setDownloadMenuOpen(false);
                          if (opt.key === 'week_view') void runWeeklyExport();
                          else void runExport(opt.key as any);
                        }}
                      >
                        <FileDown size={14} className="text-muted" /> {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="relative">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setMoreMenuOpen((v) => !v); setDownloadMenuOpen(false); }}
            >
              <MoreHorizontal size={16} /> More
            </button>
            {moreMenuOpen ? (
              <>
                <button type="button" className="fixed inset-0 z-20 cursor-default" aria-label="Close" onClick={() => setMoreMenuOpen(false)} />
                <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-xl">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-navy hover:bg-slate-50 disabled:opacity-50"
                    onClick={() => { setMoreMenuOpen(false); void load(); }}
                    disabled={loading}
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin text-muted' : 'text-muted'} /> Refresh
                  </button>
                  {audience === 'STAFF' ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-navy hover:bg-slate-50"
                      onClick={() => { setMoreMenuOpen(false); setWeeklyOpen(true); }}
                    >
                      <CalendarRange size={14} className="text-muted" /> Weekly PDF
                    </button>
                  ) : null}
                  {audience === 'STUDENT' ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-navy hover:bg-slate-50 disabled:opacity-50"
                      disabled={applyingAbsence || loading}
                      onClick={() => { setMoreMenuOpen(false); requestAbsenceMarks(); }}
                    >
                      {applyingAbsence ? <Loader2 size={14} className="animate-spin text-muted" /> : <ClipboardCheck size={14} className="text-muted" />} Absence marks
                    </button>
                  ) : null}
                  {audience !== 'STUDENT' && audience !== 'STAFF' ? (
                    <p className="px-3 py-2 text-xs text-muted">No additional actions for this view.</p>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="-mx-1 overflow-x-auto px-1">
        <div className="flex min-w-max gap-1 rounded-2xl bg-slate-100/90 p-1 ring-1 ring-slate-200/80 sm:min-w-0">
          {(
            [
              { id: 'STUDENT' as const, label: 'Students', icon: Users },
              { id: 'STAFF' as const, label: 'Staff', icon: UserSquare2 },
              { id: 'CARDS' as const, label: 'Smart access', icon: IdCard },
              { id: 'CLASS_PERF' as const, label: 'Class performance', icon: BarChart3 },
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
                  setStaffRole('');
                  setTapFilter('all');
                  setStatus('');
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-semibold transition sm:gap-2 sm:px-4 sm:text-sm ${
                  active ? 'bg-white text-[#000435] shadow-sm ring-1 ring-slate-200/80' : 'text-muted hover:text-navy'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" /> <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {audience === 'STUDENT' || audience === 'STAFF' ? <AttendanceSummaryCards summary={summary} loading={loading} /> : null}

      {audience === 'CARDS' ? (
        <StaffCardAccessTab
          schoolName={schoolName}
          departments={filterOptions.departments}
          staffRoles={filterOptions.staffRoles}
          classes={filterOptions.classes}
          periodLabel={periodLabel}
        />
      ) : null}

      {audience === 'CLASS_PERF' ? (
        <>
          <AttendanceFilterBar
            filters={filters}
            setFilters={setFilters}
            academic={academic}
            showClassFilter
            searchPlaceholder="Search class..."
          />
          <ClassPerformanceView
            schoolName={schoolName}
            periodLabel={periodLabel}
            loading={classPerfLoading}
            totals={classTotals}
            search={classPerfSearch}
            onSearchChange={setClassPerfSearch}
            onRefresh={() => void loadClassPerformance()}
          />
        </>
      ) : null}

      {audience === 'STUDENT' || audience === 'STAFF' ? (
        <>
          <AttendanceFilterBar
            filters={filters}
            setFilters={setFilters}
            academic={academic}
            showClassFilter={false}
            searchPlaceholder={audience === 'STUDENT' ? 'Search by name or student ID…' : 'Search by name or staff ID…'}
            extra={
              <div className="flex w-full flex-wrap gap-3 sm:contents">
                <FilterSelect
                  label={audience === 'STUDENT' ? 'Class' : 'Department'}
                  value={groupFilter}
                  onChange={setGroupFilter}
                  options={[
                    {
                      value: '',
                      label: audience === 'STUDENT' ? 'All classes' : 'All departments',
                    },
                    ...(audience === 'STUDENT' ? filterOptions.classes : filterOptions.departments).map((c) => ({
                      value: c,
                      label: c,
                    })),
                  ]}
                />
                {audience === 'STAFF' ? (
                  <FilterSelect
                    label="Position"
                    value={staffRole}
                    onChange={setStaffRole}
                    options={[
                      { value: '', label: 'All positions' },
                      ...filterOptions.staffRoles.map((p) => ({ value: p, label: p })),
                    ]}
                  />
                ) : null}
                <FilterSelect
                  label="Tap status"
                  value={tapFilter}
                  onChange={(v) => setTapFilter(v as any)}
                  options={[
                    { value: 'all', label: 'All (tapped & not tapped)' },
                    { value: 'tapped', label: 'Tapped cards' },
                    { value: 'not_tapped', label: 'Not tapped / absent' },
                  ]}
                />
                <FilterSelect
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: '', label: 'All statuses' },
                    { value: 'PRESENT', label: 'Present' },
                    { value: 'LATE', label: 'Late' },
                    { value: 'ABSENT', label: 'Absent' },
                    { value: 'PENDING_CHECKOUT', label: 'Missing check-out' },
                    { value: 'ENTERED_ONLY', label: 'Entered only' },
                  ]}
                />
              </div>
            }
          />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <p>
              Attendance date: <span className="font-semibold text-navy">{periodLabel}</span>
              <span className="ml-2 font-mono text-[10px] text-muted">({primaryAttendanceDateIso(filters)})</span>
            </p>
            {audience === 'STUDENT' && groupFilter ? (
              <p className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-navy">
                Class: {groupFilter} · {total.toLocaleString()} record{total === 1 ? '' : 's'} · assigned { (summary.assigned ?? 0).toLocaleString() }
              </p>
            ) : null}
            {isRangeMode ? (
              <span className="text-sky-700">
                Range view lists tap records with their dates. Switch to Today or Date for assigned-card absentees and full class totals.
              </span>
            ) : null}
          </div>
        </>
      ) : null}

      {audience === 'STUDENT' || audience === 'STAFF' ? (
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
                {audience === 'STAFF' ? <th className="px-3 py-3 font-semibold">Position</th> : null}
                {isRangeMode ? <th className="px-3 py-3 font-semibold">Date</th> : null}
                <th className="px-3 py-3 font-semibold">Expected</th>
                <SortHeader label="Check-in" col="checkin" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Check-out" col="checkout" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-3 font-semibold">Total hours</th>
                <th className="px-3 py-3 font-semibold">General status</th>
                <th className="px-3 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={(audience === 'STAFF' ? 10 : 9) + (isRangeMode ? 1 : 0)} className="px-4 py-16 text-center text-muted">
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
                    {audience === 'STAFF' ? <td className="px-3 py-3 text-xs">{r.staffRole ?? '—'}</td> : null}
                    {isRangeMode ? (
                      <td className="px-3 py-3 font-mono text-xs">{r.lessonDate?.slice(0, 10) ?? '—'}</td>
                    ) : null}
                    <td className="px-3 py-3 font-mono text-xs">{r.expectedArrival ?? '—'}</td>
                    <td className="px-3 py-3 font-mono text-xs">{formatAttendanceTime(r.entryTime)}</td>
                    <td className="px-3 py-3 font-mono text-xs">{formatAttendanceTime(r.exitTime)}</td>
                    <td className="px-3 py-3 text-xs">{formatDurationMins(r.durationMins)}</td>
                    <td className="px-3 py-3">
                      <GeneralStatusBadge row={r} />
                    </td>
                    <td className="px-3 py-3">
                      <AttendanceStatusIndicators
                        attendanceStatus={r.attendanceStatus ?? r.display?.attendanceStatus}
                        punctuality={r.punctuality ?? r.display?.punctuality}
                        checkoutStatus={r.checkoutStatus ?? r.display?.checkoutStatus}
                      />
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
      ) : null}

      {audience === 'STUDENT' || audience === 'STAFF' ? (
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
                    <p className="font-mono text-[10px] text-muted">
                      {r.studentCode} · {r.groupLabel ?? r.className}
                      {isRangeMode ? ` · ${r.lessonDate?.slice(0, 10) ?? ''}` : ''}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-muted">#{(page - 1) * limit + i + 1}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted">In</span> <span className="font-mono">{formatAttendanceTime(r.entryTime)}</span></div>
                <div><span className="text-muted">Out</span> <span className="font-mono">{formatAttendanceTime(r.exitTime)}</span></div>
              </div>
              <div className="mt-2 space-y-2">
                <GeneralStatusBadge row={r} />
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
      ) : null}

      <AttendanceProfileDrawer
        open={drawerOpen}
        record={selected}
        timeline={timeline}
        loading={timelineLoading}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
      />

      <StaffWeeklyReportModal
        open={weeklyOpen}
        onClose={() => setWeeklyOpen(false)}
        weekStart={startOfWeekIso(filters.mode === 'week' ? filters.weekStart : filters.date || todayLocalIso())}
        schoolName={schoolName}
        departments={filterOptions.departments}
        staffRoles={filterOptions.staffRoles}
      />

      {absencePromptDates ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-[#000435]/45 backdrop-blur-sm"
            onClick={() => !applyingAbsence && setAbsencePromptDates(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="absence-marks-title"
            className="relative w-full max-w-lg animate-fade-in-up overflow-hidden rounded-3xl border border-white/60 bg-white shadow-[0_30px_90px_rgba(0,4,53,0.35)]"
          >
            <div className="flex items-start gap-4 border-b border-slate-100 bg-gradient-to-br from-[#000435] via-[#0a1240] to-[#1a1f5c] px-5 py-5 text-white sm:px-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FCB038]/15 text-[#FCB038] ring-1 ring-[#FCB038]/30">
                <ClipboardCheck size={22} />
              </span>
              <div className="min-w-0 flex-1 pr-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FCB038]/90">Attendance action</p>
                <h2 id="absence-marks-title" className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Apply absence marks
                </h2>
                <p className="mt-1 text-sm text-white/70">
                  {absencePromptDates.length} school day{absencePromptDates.length === 1 ? '' : 's'} selected
                  {absencePromptDates.length === 1
                    ? ` · ${absencePromptDates[0]}`
                    : ` · ${absencePromptDates[0]} to ${absencePromptDates[absencePromptDates.length - 1]}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAbsencePromptDates(null)}
                className="absolute right-4 top-4 rounded-xl p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <ShieldAlert size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-900">Deduction for absent students</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-800/90 sm:text-sm">
                      This creates a discipline mark for each student marked <strong>absent</strong> (with an assigned card) on the selected day(s).
                      Students already marked for the same day are skipped automatically.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#000435]/10 text-[#000435]">
                    <Info size={16} />
                  </span>
                  <div className="min-w-0 text-xs leading-relaxed text-slate-600 sm:text-sm">
                    <p className="font-semibold text-[#000435]">Where the points come from</p>
                    <p className="mt-1">
                      Marks removed per absence (for example <strong>2</strong> or <strong>3</strong> points) are set in{' '}
                      <strong>Discipline → Settings → Attendance Deductions → Student absence</strong>. Saving updates the
                      default <strong>Absence Without Permission</strong> rule.
                    </p>
                    <p className="mt-1">
                      Want this to run automatically every day? Turn on <strong>Automatic daily absence marks</strong> in
                      the same Discipline settings (you can turn it off anytime; existing marks are never removed).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
              <button
                type="button"
                className="btn-secondary w-full justify-center sm:w-auto"
                onClick={() => setAbsencePromptDates(null)}
                disabled={applyingAbsence}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary w-full justify-center sm:w-auto"
                onClick={() => void confirmApplyAbsenceMarks()}
                disabled={applyingAbsence}
              >
                {applyingAbsence ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
                Apply absence marks
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ClassPerformanceView({
  schoolName,
  periodLabel,
  loading,
  totals,
  search,
  onSearchChange,
  onRefresh,
}: {
  schoolName: string;
  periodLabel: string;
  loading: boolean;
  totals: { classes: Array<{ className: string; assigned: number; tapped: number; notTapped: number; late: number; missingCheckout: number; present: number }>; totals: { assigned: number; tapped: number; notTapped: number; late: number; missingCheckout: number } } | null;
  search: string;
  onSearchChange: (v: string) => void;
  onRefresh: () => void;
}) {
  const [hover, setHover] = useState<{ cls: string; segment: string; value: number; pct: number; assigned: number } | null>(null);
  const q = search.trim().toLowerCase();
  const classes = (totals?.classes ?? []).filter((c) => !q || c.className.toLowerCase().includes(q));
  const t = totals?.totals;
  const pct = (v: number, a: number) => (a > 0 ? Math.round((v / a) * 1000) / 10 : 0);
  const overallRate = t && t.assigned > 0 ? Math.round((t.tapped / t.assigned) * 1000) / 10 : 0;

  const exportClasses = () => {
    if (!classes.length) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = classes
      .map((c, i) => {
        const onTime = Math.max(0, c.tapped - c.late);
        return `<tr><td>${i + 1}</td><td>${c.className}</td><td>${c.assigned}</td><td>${pct(c.tapped, c.assigned)}%</td><td>${onTime} (${pct(onTime, c.assigned)}%)</td><td>${c.late} (${pct(c.late, c.assigned)}%)</td><td>${c.notTapped} (${pct(c.notTapped, c.assigned)}%)</td><td>${c.notTapped}/${c.assigned || 0}</td></tr>`;
      })
      .join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Class attendance performance</title><style>body{font-family:system-ui,sans-serif;padding:24px;color:#000435}h1{margin:0 0 4px;font-size:18px}p{margin:0 0 16px;color:#64748b;font-size:12px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}th{background:#000435;color:#fff}</style></head><body><h1>Class attendance performance</h1><p>${periodLabel} · ${schoolName}${q ? ` · Filter: ${search}` : ''}</p><table><thead><tr><th>#</th><th>Class</th><th>Students</th><th>Attendance</th><th>On time</th><th>Late</th><th>Absent/Not tapped</th><th>Not tapped / Assigned</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const maxBars = classes.length;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#FCB038]">Overview</p>
            <h2 className="text-xl font-bold text-[#000435]">Class attendance performance</h2>
            <p className="text-xs text-muted sm:text-sm">Per-class attendance for <span className="font-semibold text-navy">{periodLabel}</span>. Percentages are based on each class&apos;s assigned students.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:w-64">
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search class..."
                className="input h-10 w-full pl-3 pr-3 text-sm"
              />
            </div>
            <button type="button" className="btn-secondary text-xs" onClick={onRefresh} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button type="button" className="btn-primary text-xs" onClick={exportClasses} disabled={loading || !classes.length}>
              <FileDown size={14} /> Export
            </button>
          </div>
        </div>

        {t ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Classes shown', value: `${classes.length}${q ? ` / ${totals?.classes.length ?? 0}` : ''}`, border: 'border-slate-300', accent: 'text-slate-700', hint: 'Filtered classes' },
              { label: 'Overall attendance', value: `${overallRate}%`, border: 'border-emerald-300', accent: 'text-emerald-700', hint: `${t.tapped.toLocaleString()} tapped of ${t.assigned.toLocaleString()} assigned` },
              { label: 'Absent / Not tapped', value: `${t.notTapped.toLocaleString()}/${t.assigned.toLocaleString()}`, border: 'border-red-300', accent: 'text-red-700', hint: t.assigned > 0 ? `${pct(t.notTapped, t.assigned)}% of assigned` : 'No assigned students' },
              { label: 'Late arrivals', value: t.late.toLocaleString(), border: 'border-amber-300', accent: 'text-amber-700', hint: t.assigned > 0 ? `${pct(t.late, t.assigned)}% of assigned` : '—' },
            ].map((c) => (
              <div key={c.label} className={`rounded-xl border-2 ${c.border} bg-white p-3`}>
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${c.accent}`}>{c.label}</p>
                <p className="mt-1 text-xl font-extrabold text-[#000435]">{loading ? '—' : c.value}</p>
                <p className="mt-0.5 text-[11px] text-muted">{c.hint}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-[#000435]">Attendance by class</h3>
            <p className="text-xs text-muted">Stacked bars show on-time, late, and absent/not tapped for each class (based on assigned students). Hover or tap a segment for details.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />On time</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />Late</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" />Absent / Not tapped</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !classes.length ? (
          <p className="py-12 text-center text-sm text-muted">{q ? 'No classes match your search.' : 'No class data for this period.'}</p>
        ) : (
          <div className="relative">
            {hover ? (
              <div className="pointer-events-none absolute right-0 top-0 z-10 max-w-[260px] rounded-xl border border-border bg-[#000435] px-3 py-2 text-xs text-white shadow-lg">
                <p className="font-bold">{hover.cls}</p>
                <p className="mt-0.5 text-white/90">{hover.segment}: <span className="font-semibold">{hover.value.toLocaleString()}</span> of {hover.assigned.toLocaleString()} students (<span className="font-semibold">{hover.pct}%</span>)</p>
              </div>
            ) : null}
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[520px]" style={{ minWidth: `${Math.max(520, classes.length * 72)}px` }}>
                <div className="flex h-[280px] items-end gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-3 pb-10 pt-4 sm:h-[320px]">
                  {classes.map((c) => {
                    const assigned = c.assigned || 0;
                    const onTime = Math.max(0, c.tapped - c.late);
                    const late = Math.min(c.late, c.tapped);
                    const absent = c.notTapped;
                    const attendancePct = pct(c.tapped, assigned);
                    const segs = [
                      { key: 'absent', label: 'Absent / Not tapped', value: absent, color: 'bg-red-500', pct: pct(absent, assigned) },
                      { key: 'late', label: 'Late', value: late, color: 'bg-amber-400', pct: pct(late, assigned) },
                      { key: 'onTime', label: 'On time (present)', value: onTime, color: 'bg-emerald-500', pct: pct(onTime, assigned) },
                    ];
                    const totalForBar = Math.max(assigned, onTime + late + absent, 1);
                    return (
                      <div key={c.className} className="group flex min-w-[56px] flex-1 flex-col items-center">
                        <div className="mb-1 text-[10px] font-bold text-[#000435]">{attendancePct}%</div>
                        <div
                          className="relative flex w-full max-w-[52px] flex-1 flex-col-reverse overflow-hidden rounded-t-md border border-slate-200 bg-white shadow-sm"
                          style={{ minHeight: 8 }}
                          title={`${c.className}: ${attendancePct}% attendance (${c.tapped}/${assigned} students)`}
                        >
                          {segs.map((s) => {
                            const h = totalForBar > 0 ? (s.value / totalForBar) * 100 : 0;
                            if (s.value <= 0) return null;
                            return (
                              <div
                                key={s.key}
                                className={`${s.color} w-full transition-opacity hover:opacity-90`}
                                style={{ height: `${h}%`, minHeight: s.value > 0 ? 3 : 0 }}
                                onMouseEnter={() => setHover({ cls: c.className, segment: s.label, value: s.value, pct: s.pct, assigned })}
                                onMouseLeave={() => setHover(null)}
                                onFocus={() => setHover({ cls: c.className, segment: s.label, value: s.value, pct: s.pct, assigned })}
                                onBlur={() => setHover(null)}
                                tabIndex={0}
                                role="img"
                                aria-label={`${c.className} ${s.label}: ${s.value} (${s.pct}%)`}
                              />
                            );
                          })}
                          {assigned === 0 ? <div className="h-full w-full bg-slate-100" /> : null}
                        </div>
                        <div className="mt-2 h-16 w-full max-w-[64px]">
                          <p className="mx-auto w-full truncate text-center text-[10px] font-semibold text-navy [writing-mode:vertical-rl] rotate-180 sm:text-[11px]" title={c.className}>
                            {c.className || 'Unassigned'}
                          </p>
                        </div>
                        <div className="text-[10px] text-muted">{c.assigned} stud.</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted sm:hidden">Swipe horizontally to view all classes.</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-[#000435]">All classes totals</h3>
            <p className="text-xs text-muted">Detailed totals by class. Attendance % is based on assigned students in each class.</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Class</th>
                  <th className="px-3 py-2.5">Students</th>
                  <th className="px-3 py-2.5">Attendance</th>
                  <th className="px-3 py-2.5">On time</th>
                  <th className="px-3 py-2.5">Late</th>
                  <th className="px-3 py-2.5">Absent / Not tapped</th>
                  <th className="px-3 py-2.5">Missing checkout</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></td></tr>
                ) : !classes.length ? (
                  <tr><td colSpan={8} className="py-8 text-center text-sm text-muted">{q ? 'No classes match your search.' : 'No class totals for this period.'}</td></tr>
                ) : (
                  <>
                    {classes.map((c, i) => {
                      const onTime = Math.max(0, c.tapped - c.late);
                      const rate = pct(c.tapped, c.assigned);
                      return (
                        <tr key={c.className} className="border-t border-border/60 hover:bg-slate-50/60">
                          <td className="px-3 py-2.5 text-muted">{i + 1}</td>
                          <td className="px-3 py-2.5 font-semibold text-navy">{c.className}</td>
                          <td className="px-3 py-2.5">{c.assigned}</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${rate >= 80 ? 'bg-emerald-100 text-emerald-700' : rate >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{rate}%</span>
                            <span className="ml-1.5 text-xs text-muted">({c.tapped}/{c.assigned || 0})</span>
                          </td>
                          <td className="px-3 py-2.5 text-emerald-700 font-medium">{onTime} <span className="text-xs text-muted">({pct(onTime, c.assigned)}%)</span></td>
                          <td className="px-3 py-2.5 text-amber-700 font-medium">{c.late} <span className="text-xs text-muted">({pct(c.late, c.assigned)}%)</span></td>
                          <td className="px-3 py-2.5 text-red-700 font-medium">{c.notTapped} <span className="text-xs text-muted">({pct(c.notTapped, c.assigned)}%)</span></td>
                          <td className="px-3 py-2.5">{c.missingCheckout}</td>
                        </tr>
                      );
                    })}
                    {t && !q ? (
                      <tr className="border-t border-border bg-slate-50 font-bold text-navy">
                        <td className="px-3 py-2.5"></td>
                        <td className="px-3 py-2.5">Totals</td>
                        <td className="px-3 py-2.5">{t.assigned}</td>
                        <td className="px-3 py-2.5">{t.assigned ? `${pct(t.tapped, t.assigned)}%` : '—'} <span className="text-xs font-normal text-muted">({t.tapped}/{t.assigned})</span></td>
                        <td className="px-3 py-2.5">{Math.max(0, t.tapped - t.late)}</td>
                        <td className="px-3 py-2.5">{t.late}</td>
                        <td className="px-3 py-2.5">{t.notTapped}</td>
                        <td className="px-3 py-2.5">{t.missingCheckout}</td>
                      </tr>
                    ) : null}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function AttendanceSummaryCards({
  summary,
  loading,
}: {
  summary: { present: number; late: number; missingCheckout: number; absent: number; assigned?: number; total?: number };
  loading: boolean;
}) {
  const assigned = summary.assigned ?? summary.total ?? 0;
  const tapped = summary.present;
  const notTapped = summary.absent;
  const absentLabel = assigned > 0 ? `${notTapped.toLocaleString()}/${assigned.toLocaleString()}` : notTapped.toLocaleString();
  const cards = [
    { label: 'Present / Tapped', value: tapped.toLocaleString(), hint: assigned > 0 ? `Checked in · ${tapped}/${assigned} assigned` : 'Checked in during period', border: 'border-emerald-300', accent: 'text-emerald-700' },
    { label: 'Late arrivals', value: summary.late.toLocaleString(), hint: 'Arrived after start time', border: 'border-amber-300', accent: 'text-amber-700' },
    { label: 'Not tapped / Absent', value: absentLabel, hint: assigned > 0 ? 'No tap out of assigned cards' : 'No tap recorded', border: 'border-red-300', accent: 'text-red-700' },
    { label: 'Missing check-out', value: summary.missingCheckout.toLocaleString(), hint: 'Arrival recorded only', border: 'border-sky-300', accent: 'text-sky-700' },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-2xl border-2 ${c.border} bg-white p-4 shadow-sm`}>
          <p className={`text-xs font-semibold uppercase tracking-wide ${c.accent}`}>{c.label}</p>
          <p className="mt-1 text-2xl font-extrabold text-[#000435] sm:text-3xl">{loading ? '—' : c.value}</p>
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
