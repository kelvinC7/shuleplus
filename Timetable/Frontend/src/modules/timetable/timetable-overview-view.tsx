'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Layers,
  Search,
  UsersRound,
} from 'lucide-react';
import type {
  CourseConfig,
  CoverageItem,
  PeriodSlotDefinition,
  TeacherProfile,
  TimetableRow,
} from '@/types';
import { TextField } from '@/components/form-fields';
import { PillBadge } from '@/components/hr-data-table';
import {
  buildTimetableOverview,
  DEFAULT_WORKLOAD_THRESHOLDS,
  normalizeDayOrder,
  type ClassCompletionRow,
} from '@/utils/timetable-reporting';

interface TimetableOverviewViewProps {
  rows: TimetableRow[];
  profiles: TeacherProfile[];
  courses: CourseConfig[];
  coverage: CoverageItem[];
  classes: string[];
  periodSlots: PeriodSlotDefinition[];
  days: string[];
  term: string;
  academicYear: string;
}

export function TimetableOverviewView({
  rows,
  profiles,
  courses,
  coverage,
  classes,
  periodSlots,
  days,
  term,
  academicYear,
}: TimetableOverviewViewProps) {
  const [classSearch, setClassSearch] = useState('');

  const overview = useMemo(
    () =>
      buildTimetableOverview(
        rows,
        classes,
        profiles,
        periodSlots,
        coverage,
        courses,
        DEFAULT_WORKLOAD_THRESHOLDS
      ),
    [rows, classes, profiles, periodSlots, coverage, courses]
  );

  const orderedDays = useMemo(
    () => [...days].sort((a, b) => normalizeDayOrder(a) - normalizeDayOrder(b)),
    [days]
  );

  const filteredClassCompletion = useMemo(() => {
    const needle = classSearch.trim().toLowerCase();
    const list = needle
      ? overview.classCompletion.filter((row) =>
          row.className.toLowerCase().includes(needle)
        )
      : overview.classCompletion;
    return [...list].sort(
      (a, b) => b.missing - a.missing || a.className.localeCompare(b.className)
    );
  }, [overview.classCompletion, classSearch]);

  const completionTone =
    overview.completionPercent == null
      ? 'default'
      : overview.completionPercent >= 95
        ? 'green'
        : overview.completionPercent >= 80
          ? 'amber'
          : 'red';

  const maxSubject = overview.subjectDistribution[0]?.count ?? 1;
  const maxDepartment = overview.departmentDistribution[0]?.count ?? 1;
  const maxDay = Math.max(1, ...overview.dayDistribution.map((day) => day.count));
  const maxLoadBucket = Math.max(1, ...overview.teacherLoadBuckets.map((bucket) => bucket.count));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          icon={<Layers size={18} />}
          label="Total Classes / Streams"
          value={overview.totalClasses}
          hint={`${overview.totalStreams} stream${overview.totalStreams === 1 ? '' : 's'} configured`}
        />
        <OverviewCard
          icon={<UsersRound size={18} />}
          label="Teachers Assigned"
          value={overview.totalTeachers}
          hint={`${profiles.length} teacher profile${profiles.length === 1 ? '' : 's'} in the module`}
        />
        <OverviewCard
          icon={<CalendarClock size={18} />}
          label="Scheduled Teaching Periods"
          value={overview.totalPeriods}
          hint={`${term} ${academicYear} · breaks excluded`}
        />
        <OverviewCard
          icon={<CalendarCheck2 size={18} />}
          label="Completion"
          value={overview.completionPercent == null ? '—' : `${overview.completionPercent}%`}
          hint={
            overview.completionPercent == null
              ? 'Coverage is unavailable for this term'
              : `${overview.placedPeriods} of ${overview.expectedPeriods} expected periods`
          }
          tone={completionTone}
        />
      </div>

      {overview.completionPercent != null ? (
        <div className="hr-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-navy">Timetable completion</h3>
              <p className="text-[11px] text-muted">
                Expected periods are based on teacher assignments and course configuration.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <PillBadge tone={completionTone === 'green' ? 'green' : completionTone}>
                {overview.completionPercent}% placed
              </PillBadge>
              <PillBadge tone={overview.unassignedPeriods > 0 ? 'amber' : 'green'}>
                {overview.unassignedPeriods} unassigned
              </PillBadge>
            </div>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                overview.completionPercent >= 95
                  ? 'bg-emerald-500'
                  : overview.completionPercent >= 80
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${overview.completionPercent}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
            <span>{overview.placedPeriods} placed</span>
            <span>{overview.unassignedPeriods} still to place</span>
            <span>{overview.expectedPeriods} expected</span>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <p>
            Completion cannot be calculated because no assignment coverage was returned for {term}{' '}
            {academicYear}. Scheduled teaching periods and distributions below still use real
            timetable records.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="hr-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-navy">Periods by subject</h3>
              <p className="text-[11px] text-muted">Scheduled teaching slots, break rows excluded</p>
            </div>
            <BookOpen size={16} className="text-muted" />
          </div>
          <div className="space-y-2.5 p-4">
            {overview.subjectDistribution.length ? (
              overview.subjectDistribution.slice(0, 12).map((subject) => (
                <BarRow
                  key={subject.label}
                  label={subject.label}
                  value={subject.count}
                  max={maxSubject}
                  tone="bg-primary"
                />
              ))
            ) : (
              <EmptyRow message="No subjects scheduled yet." />
            )}
            {overview.subjectDistribution.length > 12 ? (
              <p className="pt-1 text-[11px] text-muted">
                +{overview.subjectDistribution.length - 12} more subjects
              </p>
            ) : null}
          </div>
        </div>

        <div className="hr-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-navy">Periods by department</h3>
              <p className="text-[11px] text-muted">Department inferred from each teacher's subjects</p>
            </div>
            <BarChart3 size={16} className="text-muted" />
          </div>
          <div className="space-y-2.5 p-4">
            {overview.departmentDistribution.length ? (
              overview.departmentDistribution.map((department) => (
                <BarRow
                  key={department.label}
                  label={department.label}
                  value={department.count}
                  max={maxDepartment}
                  tone="bg-teal"
                />
              ))
            ) : (
              <EmptyRow message="No teacher departments to show." />
            )}
          </div>
        </div>

        <div className="hr-card overflow-hidden">
          <div className="border-b border-border/70 px-4 py-3">
            <h3 className="text-sm font-semibold text-navy">Teaching periods by day</h3>
            <p className="text-[11px] text-muted">All classes and streams combined</p>
          </div>
          <div className="space-y-2.5 p-4">
            {orderedDays.map((day) => {
              const count = overview.dayDistribution.find((item) => item.label === day)?.count ?? 0;
              return <BarRow key={day} label={day} value={count} max={maxDay} tone="bg-navy" />;
            })}
          </div>
        </div>

        <div className="hr-card overflow-hidden">
          <div className="border-b border-border/70 px-4 py-3">
            <h3 className="text-sm font-semibold text-navy">Teacher load distribution</h3>
            <p className="text-[11px] text-muted">
              Number of teachers by weekly scheduled periods
            </p>
          </div>
          <div className="space-y-2.5 p-4">
            {overview.teacherLoadBuckets.map((bucket) => (
              <BarRow
                key={bucket.label}
                label={bucket.label}
                value={bucket.count}
                max={maxLoadBucket}
                tone={
                  bucket.label === '30+' || bucket.label === '21–30'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="hr-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
          <div>
            <h3 className="text-sm font-semibold text-navy">Completion by class / stream</h3>
            <p className="text-[11px] text-muted">
              Expected vs placed periods. Missing periods are sorted first.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <TextField
              label="Find class"
              value={classSearch}
              onChange={setClassSearch}
              placeholder="e.g. P5"
            />
          </div>
        </div>

        {filteredClassCompletion.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/80 text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-4 py-2.5 font-semibold">Class / Stream</th>
                  <th className="px-4 py-2.5 font-semibold">Group</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Expected</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Placed</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Missing</th>
                  <th className="px-4 py-2.5 font-semibold">Completion</th>
                </tr>
              </thead>
              <tbody>
                {filteredClassCompletion.map((row) => (
                  <CompletionRow key={row.className} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-muted">
            No class completion data matches your search.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-slate-50/60 px-4 py-3 text-[11px] text-muted">
        <p className="flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-emerald-500" />
          All figures are calculated from real timetable records for {term} {academicYear}.
        </p>
        <p className="flex items-center gap-1.5">
          <Search size={13} /> Use the Class Timetable and Teacher Workload tabs for detailed views.
        </p>
      </div>
    </div>
  );
}

function OverviewCard({
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
  tone?: 'default' | 'green' | 'amber' | 'red';
}) {
  const iconTone =
    tone === 'red'
      ? 'bg-red-50 text-red-600'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-600'
        : tone === 'green'
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-primary/12 text-navy';
  return (
    <div className="hr-card flex items-start gap-3 p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
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

function BarRow({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: string;
}) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate font-medium text-navy">{label}</span>
        <span className="shrink-0 font-semibold text-muted">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function CompletionRow({ row }: { row: ClassCompletionRow }) {
  const tone = row.missing === 0 ? 'green' : row.percent >= 80 ? 'amber' : 'red';
  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-slate-50/60">
      <td className="px-4 py-2.5 font-semibold text-navy">{row.className}</td>
      <td className="px-4 py-2.5 text-muted">{row.group}</td>
      <td className="px-4 py-2.5 text-center text-muted">{row.expected}</td>
      <td className="px-4 py-2.5 text-center font-medium text-navy">{row.placed}</td>
      <td className="px-4 py-2.5 text-center">
        {row.missing > 0 ? (
          <PillBadge tone="red">{row.missing}</PillBadge>
        ) : (
          <PillBadge tone="green">0</PillBadge>
        )}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${
                row.percent >= 95
                  ? 'bg-emerald-500'
                  : row.percent >= 80
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, row.percent)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-navy">{row.percent}%</span>
          <PillBadge tone={tone}>{tone === 'green' ? 'Complete' : tone === 'amber' ? 'Nearly there' : 'Incomplete'}</PillBadge>
        </div>
      </td>
    </tr>
  );
}

function EmptyRow({ message }: { message: string }) {
  return <p className="rounded-xl border border-dashed border-border bg-slate-50/60 px-4 py-8 text-center text-xs text-muted">{message}</p>;
}
