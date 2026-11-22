'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarClock,
  Eye,
  FileSpreadsheet,
  FileText,
  Info,
  Printer,
  Users,
  UsersRound,
} from 'lucide-react';
import type { CourseConfig, PeriodSlotDefinition, TeacherProfile, TimetableRow } from '@/types';
import { WEEK_DAYS } from '@/types';
import { SelectField, TextField } from '@/components/form-fields';
import { HrDataTable, PillBadge, AvatarInitials, type HrTableColumn } from '@/components/hr-data-table';
import { SideDrawer } from '@/components/side-drawer';
import { TimetableGrid } from '@/components/timetable-grid';
import { TimetablePrintPreview } from '@/components/timetable-print-preview';
import { toast } from 'sonner';
import {
  buildTeacherWorkload,
  DEFAULT_WORKLOAD_THRESHOLDS,
  normalizeDayOrder,
  type TeacherLoadStatus,
  type TeacherWorkloadRow,
  type WorkloadThresholds,
} from '@/utils/timetable-reporting';
import {
  exportTeacherDetailExcel,
  exportTeacherWorkloadExcel,
} from '@/utils/timetable-excel-export';

interface TeacherWorkloadViewProps {
  rows: TimetableRow[];
  profiles: TeacherProfile[];
  courses: CourseConfig[];
  periodSlots: PeriodSlotDefinition[];
  days: string[];
  term: string;
  academicYear: string;
  schoolName?: string;
}

type SortKey = 'teacherName' | 'department' | 'totalPeriods' | 'classCount' | 'subjectCount';

function statusLabel(status: TeacherLoadStatus): string {
  if (status === 'overloaded') return 'Overloaded';
  if (status === 'high') return 'High load';
  return 'Normal';
}

function statusTone(status: TeacherLoadStatus): 'green' | 'amber' | 'red' {
  if (status === 'overloaded') return 'red';
  if (status === 'high') return 'amber';
  return 'green';
}

export function TeacherWorkloadView({
  rows,
  profiles,
  courses,
  periodSlots,
  days,
  term,
  academicYear,
  schoolName,
}: TeacherWorkloadViewProps) {
  const [thresholds, setThresholds] = useState<WorkloadThresholds>(DEFAULT_WORKLOAD_THRESHOLDS);
  const [department, setDepartment] = useState('ALL');
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'totalPeriods',
    direction: 'desc',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  const workload = useMemo(
    () => buildTeacherWorkload(rows, profiles, periodSlots, courses, thresholds),
    [rows, profiles, periodSlots, courses, thresholds]
  );

  const departments = useMemo(
    () =>
      [...new Set(workload.map((teacher) => teacher.department))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [workload]
  );
  const subjects = useMemo(
    () => [...new Set(workload.flatMap((teacher) => teacher.subjects))].sort(),
    [workload]
  );
  const classes = useMemo(
    () => [...new Set(workload.flatMap((teacher) => teacher.classes))].sort(),
    [workload]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return workload.filter((teacher) => {
      if (department !== 'ALL' && teacher.department !== department) return false;
      if (teacherFilter !== 'ALL' && teacher.teacherUserId !== teacherFilter) return false;
      if (subjectFilter !== 'ALL' && !teacher.subjects.includes(subjectFilter)) return false;
      if (classFilter !== 'ALL' && !teacher.classes.includes(classFilter)) return false;
      if (needle) {
        const haystack = [
          teacher.teacherName,
          teacher.employeeNumber ?? '',
          teacher.department,
          teacher.position ?? '',
          ...teacher.subjects,
          ...teacher.classes,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [workload, department, teacherFilter, subjectFilter, classFilter, search]);

  const sorted = useMemo(() => {
    const multiplier = sort.direction === 'asc' ? 1 : -1;
    const sortKey = sort.key;
    return [...filtered].sort((a, b) => {
      if (sortKey === 'teacherName') {
        return multiplier * a.teacherName.localeCompare(b.teacherName);
      }
      if (sortKey === 'department') {
        return multiplier * a.department.localeCompare(b.department);
      }
      const left = a[sortKey];
      const right = b[sortKey];
      return multiplier * (Number(left) - Number(right));
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => {
    setPage(1);
  }, [department, teacherFilter, subjectFilter, classFilter, search, sort, pageSize]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize]
  );

  const summary = useMemo(() => {
    const totalPeriods = workload.reduce((sum, teacher) => sum + teacher.totalPeriods, 0);
    const without = workload.filter((teacher) => teacher.totalPeriods === 0).length;
    const high = workload.filter((teacher) => teacher.status !== 'normal').length;
    const overloaded = workload.filter((teacher) => teacher.status === 'overloaded').length;
    return {
      totalTeachers: workload.length,
      totalPeriods,
      average: workload.length ? totalPeriods / workload.length : 0,
      without,
      high,
      overloaded,
    };
  }, [workload]);

  const selectedTeacher = selectedTeacherId
    ? workload.find((teacher) => teacher.teacherUserId === selectedTeacherId) ?? null
    : null;

  const teacherRows = useMemo(
    () =>
      selectedTeacher
        ? rows.filter(
            (row) => row.teacherUserId === selectedTeacher.teacherUserId && !row.isExtraActivity
          )
        : [],
    [rows, selectedTeacher]
  );

  const orderedDays = useMemo(
    () => [...days].sort((a, b) => normalizeDayOrder(a) - normalizeDayOrder(b)),
    [days]
  );

  function toggleSort(key: string) {
    setSort((prev) =>
      prev.key === key
        ? { key: key as SortKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key: key as SortKey, direction: key === 'teacherName' || key === 'department' ? 'asc' : 'desc' }
    );
  }

  function setHigh(value: number) {
    const high = Math.max(1, Math.round(value || 1));
    setThresholds((prev) => ({ high, overloaded: Math.max(high, prev.overloaded) }));
  }

  function setOverloaded(value: number) {
    const overloaded = Math.max(1, Math.round(value || 1));
    setThresholds((prev) => ({ ...prev, overloaded: Math.max(prev.high, overloaded) }));
  }

  function exportExcel() {
    exportTeacherWorkloadExcel(sorted, { schoolName, term, academicYear });
    toast.success(`Exported ${sorted.length} teacher${sorted.length === 1 ? '' : 's'} to Excel`);
  }

  async function exportPdf() {
    try {
      const { exportTeacherWorkloadPdf } = await import('@/utils/timetable-pdf-export');
      exportTeacherWorkloadPdf(sorted, { schoolName, term, academicYear }, {
        highThreshold: thresholds.high,
        overloadedThreshold: thresholds.overloaded,
      });
      toast.success('Teacher workload PDF downloaded');
    } catch {
      toast.error('Could not create the workload PDF');
    }
  }

  const columns: HrTableColumn<TeacherWorkloadRow>[] = [
    {
      key: 'teacherName',
      header: 'Teacher',
      sortable: true,
      render: (teacher) => (
        <div className="flex items-center gap-3">
          <AvatarInitials name={teacher.teacherName} seed={teacher.teacherUserId} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy">{teacher.teacherName}</p>
            <p className="truncate text-[11px] text-muted">
              {teacher.employeeNumber
                ? `Staff ${teacher.employeeNumber}`
                : teacher.position || 'Teacher'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      render: (teacher) => (
        <div className="flex flex-col gap-0.5">
          <PillBadge tone="violet">{teacher.department}</PillBadge>
          {teacher.departmentSource !== 'subject' ? (
            <span className="text-[10px] text-muted">Inferred from position</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'totalPeriods',
      header: 'Total Periods',
      sortable: true,
      render: (teacher) => (
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-navy">{teacher.totalPeriods}</span>
          <PillBadge tone={statusTone(teacher.status)}>{statusLabel(teacher.status)}</PillBadge>
        </div>
      ),
    },
    {
      key: 'classCount',
      header: 'Classes',
      sortable: true,
      render: (teacher) => (
        <div className="max-w-[220px]">
          <p className="text-sm font-semibold text-navy">
            {teacher.classCount} {teacher.classCount === 1 ? 'class' : 'classes'}
          </p>
          <p className="truncate text-[11px] text-muted" title={teacher.classes.join(', ')}>
            {teacher.classes.join(', ') || 'None assigned'}
          </p>
        </div>
      ),
    },
    {
      key: 'subjectCount',
      header: 'Subjects',
      sortable: true,
      render: (teacher) => (
        <div className="max-w-[240px]">
          <p className="text-sm font-semibold text-navy">
            {teacher.subjectCount} {teacher.subjectCount === 1 ? 'subject' : 'subjects'}
          </p>
          <p className="truncate text-[11px] text-muted" title={teacher.subjects.join(', ')}>
            {teacher.subjects.join(', ') || 'None assigned'}
          </p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (teacher) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setSelectedTeacherId(teacher.teacherUserId)}
            className="rounded-lg p-2 text-muted transition hover:bg-slate-100 hover:text-navy"
            aria-label={`View ${teacher.teacherName}`}
          >
            <Eye size={16} />
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!teacher.slots.length) {
                toast.info('This teacher has no scheduled periods');
                return;
              }
              const { exportTeacherTimetablePdf } = await import('@/utils/timetable-pdf-export');
              exportTeacherTimetablePdf(
                teacher.teacherUserId,
                teacher.teacherName,
                rows,
                { schoolName, term, academicYear },
                { periodSlots, courses }
              );
            }}
            className="rounded-lg p-2 text-muted transition hover:bg-slate-100 hover:text-navy"
            aria-label={`Download ${teacher.teacherName} PDF`}
          >
            <FileText size={16} />
          </button>
          <button
            type="button"
            onClick={() =>
              exportTeacherDetailExcel(teacher, periodSlots, {
                schoolName,
                term,
                academicYear,
              })
            }
            className="rounded-lg p-2 text-muted transition hover:bg-slate-100 hover:text-navy"
            aria-label={`Download ${teacher.teacherName} Excel`}
          >
            <FileSpreadsheet size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={<UsersRound size={18} />}
          label="Total Teachers"
          value={summary.totalTeachers}
          hint="Profiles + scheduled teachers"
        />
        <SummaryCard
          icon={<CalendarClock size={18} />}
          label="Assigned Periods"
          value={summary.totalPeriods}
          hint={`${term} ${academicYear}`}
        />
        <SummaryCard
          icon={<BriefcaseBusiness size={18} />}
          label="Average / Teacher"
          value={summary.average.toFixed(1)}
          hint="Scheduled teaching periods"
        />
        <SummaryCard
          icon={<Users size={18} />}
          label="Without Timetable"
          value={summary.without}
          hint="No scheduled teaching periods"
          tone={summary.without > 0 ? 'amber' : 'default'}
        />
        <SummaryCard
          icon={<AlertTriangle size={18} />}
          label="High Workload"
          value={summary.high}
          hint={`${summary.overloaded} overloaded`}
          tone={summary.high > 0 ? 'red' : 'default'}
        />
      </div>

      <div className="hr-card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SelectField
            label="Department"
            value={department}
            onChange={setDepartment}
            options={[
              { value: 'ALL', label: 'All departments' },
              ...departments.map((value) => ({ value, label: value })),
            ]}
          />
          <SelectField
            label="Teacher"
            value={teacherFilter}
            onChange={setTeacherFilter}
            options={[
              { value: 'ALL', label: 'All teachers' },
              ...workload
                .map((teacher) => ({
                  value: teacher.teacherUserId,
                  label: teacher.teacherName,
                }))
                .sort((a, b) => a.label.localeCompare(b.label)),
            ]}
          />
          <SelectField
            label="Subject"
            value={subjectFilter}
            onChange={setSubjectFilter}
            options={[
              { value: 'ALL', label: 'All subjects' },
              ...subjects.map((subject) => ({ value: subject, label: subject })),
            ]}
          />
          <SelectField
            label="Class"
            value={classFilter}
            onChange={setClassFilter}
            options={[
              { value: 'ALL', label: 'All classes' },
              ...classes.map((className) => ({ value: className, label: className })),
            ]}
          />
          <TextField
            label="Search"
            value={search}
            onChange={setSearch}
            placeholder="Teacher, department, subject…"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-slate-50/70 px-3 py-2.5">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-600">
            <Info size={14} className="mt-0.5 shrink-0 text-ochre" />
            <span>
              Counts <strong>actual scheduled teaching slots</strong> for {term} {academicYear}.
              Breaks, lunch and extra activities are excluded; each day + time slot is counted once
              even when it contains multiple subjects or classes. Department is inferred from
              scheduled subjects and falls back to the staff position.
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              High ≥
              <input
                type="number"
                min={1}
                value={thresholds.high}
                onChange={(event) => setHigh(Number(event.target.value))}
                className="w-16 rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-semibold text-navy outline-none focus:border-primary"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              Overloaded ≥
              <input
                type="number"
                min={1}
                value={thresholds.overloaded}
                onChange={(event) => setOverloaded(Number(event.target.value))}
                className="w-16 rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-semibold text-navy outline-none focus:border-primary"
              />
            </label>
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={exportExcel}>
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => void exportPdf()}>
              <FileText size={14} /> PDF
            </button>
          </div>
        </div>
      </div>

      <HrDataTable
        columns={columns}
        data={paged}
        rowKey={(teacher) => teacher.teacherUserId}
        page={page}
        totalPages={totalPages}
        total={sorted.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sortKey={sort.key}
        sortDirection={sort.direction}
        onSort={toggleSort}
        loading={false}
        emptyMessage="No teachers match the selected filters"
        emptyAction={
          <button
            type="button"
            className="btn-secondary py-2 text-xs"
            onClick={() => {
              setDepartment('ALL');
              setTeacherFilter('ALL');
              setSubjectFilter('ALL');
              setClassFilter('ALL');
              setSearch('');
            }}
          >
            Clear filters
          </button>
        }
      />

      <TeacherDrawer
        teacher={selectedTeacher}
        teacherRows={teacherRows}
        periodSlots={periodSlots}
        courses={courses}
        days={orderedDays}
        term={term}
        academicYear={academicYear}
        schoolName={schoolName}
        thresholds={thresholds}
        onClose={() => setSelectedTeacherId(null)}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'default' | 'amber' | 'red';
}) {
  const toneClass =
    tone === 'red'
      ? 'bg-red-50 text-red-600'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-600'
        : 'bg-primary/12 text-navy';
  return (
    <div className="hr-card flex items-start gap-3 p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-0.5 text-xl font-bold leading-tight text-navy">{value}</p>
        {hint ? <p className="truncate text-[11px] text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}

function TeacherDrawer({
  teacher,
  teacherRows,
  periodSlots,
  courses,
  days,
  term,
  academicYear,
  schoolName,
  thresholds,
  onClose,
}: {
  teacher: TeacherWorkloadRow | null;
  teacherRows: TimetableRow[];
  periodSlots: PeriodSlotDefinition[];
  courses: CourseConfig[];
  days: string[];
  term: string;
  academicYear: string;
  schoolName?: string;
  thresholds: WorkloadThresholds;
  onClose: () => void;
}) {
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    setPrintOpen(false);
  }, [teacher?.teacherUserId]);

  if (!teacher) return null;

  const activeDays = days.filter((day) => (teacher.dailyPeriods[day] ?? 0) > 0);
  const orderedSlots = [...teacher.slots].sort(
    (a, b) =>
      normalizeDayOrder(a.dayOfWeek) - normalizeDayOrder(b.dayOfWeek) ||
      a.startTime.localeCompare(b.startTime)
  );

  async function handlePdf() {
    const { exportTeacherTimetablePdf } = await import('@/utils/timetable-pdf-export');
    exportTeacherTimetablePdf(
      teacher!.teacherUserId,
      teacher!.teacherName,
      teacherRows,
      { schoolName, term, academicYear },
      { periodSlots, courses }
    );
  }

  return (
    <>
      <SideDrawer
        open
        onClose={onClose}
        title={teacher.teacherName}
        subtitle={`${teacher.department} · ${teacher.totalPeriods} scheduled periods`}
        width="full"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">
              {teacher.slots.length} assigned slot{teacher.slots.length === 1 ? '' : 's'} · all
              periods included
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary py-2 text-xs" onClick={() => setPrintOpen(true)}>
                <Printer size={14} /> Print
              </button>
              <button type="button" className="btn-secondary py-2 text-xs" onClick={() => void handlePdf()}>
                <FileText size={14} /> PDF
              </button>
              <button
                type="button"
                className="btn-primary py-2 text-xs"
                onClick={() =>
                  exportTeacherDetailExcel(teacher, periodSlots, {
                    schoolName,
                    term,
                    academicYear,
                  })
                }
              >
                <FileSpreadsheet size={14} /> Excel
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-gradient-to-br from-navy/[0.03] to-primary/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <AvatarInitials name={teacher.teacherName} seed={teacher.teacherUserId} />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-navy">{teacher.teacherName}</p>
                <p className="text-xs text-muted">
                  {teacher.position || 'Teacher'}
                  {teacher.employeeNumber ? ` · Staff ${teacher.employeeNumber}` : ''}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <PillBadge tone="violet">{teacher.department}</PillBadge>
                  <PillBadge tone={statusTone(teacher.status)}>{statusLabel(teacher.status)}</PillBadge>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted sm:text-right">
              {teacher.loginEmail ? <p>{teacher.loginEmail}</p> : null}
              {teacher.loginPhone ? <p>{teacher.loginPhone}</p> : null}
              <p className="mt-1 font-semibold text-navy">
                {term} · {academicYear}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DrawerStat label="Total periods" value={teacher.totalPeriods} />
            <DrawerStat label="Classes / streams" value={teacher.classCount} />
            <DrawerStat label="Subjects" value={teacher.subjectCount} />
            <DrawerStat label="Active days" value={activeDays.length} />
          </div>

          <div
            className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${
              teacher.status === 'overloaded'
                ? 'border-red-200 bg-red-50 text-red-800'
                : teacher.status === 'high'
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {teacher.status === 'normal' ? (
              <p>
                Workload is within the configured threshold: {teacher.totalPeriods} periods is below
                the high-load mark of {thresholds.high}.
              </p>
            ) : (
              <p>
                {teacher.status === 'overloaded' ? 'Overloaded' : 'High workload'}:{' '}
                {teacher.totalPeriods} scheduled periods (high ≥ {thresholds.high}, overloaded ≥{' '}
                {thresholds.overloaded}). Review the timetable or redistribute classes.
              </p>
            )}
          </div>

          <div className="hr-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-navy">Weekly timetable</h3>
                <p className="text-[11px] text-muted">Days down · periods across</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {teacher.classes.slice(0, 8).map((className) => (
                  <span
                    key={className}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                  >
                    {className}
                  </span>
                ))}
                {teacher.classes.length > 8 ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    +{teacher.classes.length - 8}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="overflow-x-auto p-2">
              <TimetableGrid
                rows={teacherRows}
                periodSlots={periodSlots}
                days={days}
                courses={courses}
                showStream
                compact
                emptyLabel="No class"
              />
            </div>
          </div>

          <div className="hr-card overflow-hidden">
            <div className="border-b border-border/70 px-4 py-3">
              <h3 className="text-sm font-semibold text-navy">All assigned periods</h3>
              <p className="text-[11px] text-muted">
                Every scheduled slot where {teacher.teacherName} is the assigned teacher.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/80 text-[11px] uppercase tracking-wider text-muted">
                    <th className="px-4 py-2.5 font-semibold">Day</th>
                    <th className="px-4 py-2.5 font-semibold">Period</th>
                    <th className="px-4 py-2.5 font-semibold">Time</th>
                    <th className="px-4 py-2.5 font-semibold">Subject</th>
                    <th className="px-4 py-2.5 font-semibold">Class / Stream</th>
                    <th className="px-4 py-2.5 font-semibold">Room</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedSlots.length ? (
                    orderedSlots.map((slot) => (
                      <tr
                        key={slot.key}
                        className="border-b border-border/60 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-2.5 font-medium text-navy">{slot.dayOfWeek}</td>
                        <td className="px-4 py-2.5 text-muted">{slot.periodLabel}</td>
                        <td className="px-4 py-2.5 text-muted">
                          {slot.startTime}–{slot.endTime}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-navy">{slot.subjectName}</td>
                        <td className="px-4 py-2.5 text-muted">{slot.className}</td>
                        <td className="px-4 py-2.5 text-muted">{slot.room || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                        No teaching periods assigned for {term} {academicYear}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="flex items-start gap-1.5 text-[11px] text-muted">
            <Info size={13} className="mt-0.5 shrink-0" />
            The {teacher.totalPeriods} periods shown are counted from real timetable records for{' '}
            {term} {academicYear}. Duplicate records for the same day/time slot are counted once.
          </p>
        </div>
      </SideDrawer>

      <TimetablePrintPreview
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        groups={[
          {
            key: teacher.teacherUserId,
            title: `Teacher Timetable · ${teacher.teacherName}`,
            subtitle: `${teacher.totalPeriods} periods · ${teacher.department}`,
            rows: teacherRows,
            showStream: true,
          },
        ]}
        periodSlots={periodSlots}
        days={days}
        courses={courses}
        schoolName={schoolName}
        term={term}
        academicYear={academicYear}
        title={`Teacher Timetable · ${teacher.teacherName}`}
        subtitle={`${teacher.totalPeriods} scheduled periods`}
      />
    </>
  );
}

function DrawerStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-navy">{value}</p>
    </div>
  );
}
