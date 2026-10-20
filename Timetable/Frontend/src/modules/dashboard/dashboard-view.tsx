'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Grid3X3,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { timetableApi } from '@/services/timetable-api';
import type { DashboardOverview } from '@/types';
import { DashboardInsights } from '@/modules/dashboard/dashboard-insights';
import { DashboardSkeleton } from '@/modules/dashboard/dashboard-skeleton';

type ScheduleFilter = 'all' | 'classes' | 'teachers';

const NAVY = '#000435';

function statusBadge(status: DashboardOverview['todaySchedule'][0]['status']) {
  switch (status) {
    case 'completed':
      return { label: 'Done', cls: 'bg-emerald-100 text-emerald-800' };
    case 'running':
      return { label: 'Live', cls: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30' };
    case 'late':
      return { label: 'Late', cls: 'bg-amber-100 text-amber-900' };
    case 'missed':
      return { label: 'Missed', cls: 'bg-red-100 text-red-800' };
    default:
      return { label: 'Upcoming', cls: 'bg-slate-100 text-slate-600' };
  }
}

function DashboardHero({ term, academicYear }: { term: string; academicYear: string }) {
  const dayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Timetable dashboard</p>
      <h1 className="mt-2 text-xl font-extrabold tracking-tight text-navy sm:text-2xl">{dayLabel}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {term} · {academicYear}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/timetable?tab=timetable"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-navy transition hover:border-slate-300 hover:bg-white"
        >
          <Grid3X3 size={14} className="text-primary" /> Open timetable
        </Link>
        <Link
          href="/create-timetable"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-navy transition hover:border-slate-300 hover:bg-white"
        >
          <Sparkles size={14} className="text-primary" /> Create / edit
        </Link>
        <Link
          href="/timetable?tab=conflicts"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-navy transition hover:border-slate-300 hover:bg-white"
        >
          <AlertTriangle size={14} className="text-amber-600" /> Conflicts
        </Link>
      </div>
    </section>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone = '#2563eb',
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex min-w-[132px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:min-w-0 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${tone}14`, color: tone }}
        >
          {icon}
        </div>
        <p className="text-xl font-extrabold tabular-nums leading-none sm:text-2xl" style={{ color: NAVY }}>
          {value}
        </p>
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
    </div>
  );
}

export function DashboardView() {
  const { term, academicYear } = useAcademicSettings();
  const [date] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('all');
  const [classFilter, setClassFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await timetableApi.dashboardOverview({
        term,
        academic_year: academicYear,
        date,
      });
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [term, academicYear, date]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredSchedule = useMemo(() => {
    if (!data) return [];
    let rows = data.todaySchedule;
    if (classFilter) rows = rows.filter((r) => r.className === classFilter);
    if (teacherFilter) rows = rows.filter((r) => r.teacherUserId === teacherFilter);
    return rows;
  }, [data, classFilter, teacherFilter]);

  const classOptions = useMemo(
    () => [...new Set(data?.todaySchedule.map((r) => r.className) ?? [])].sort(),
    [data],
  );
  const teacherOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of data?.todaySchedule ?? []) map.set(r.teacherUserId, r.teacherName);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [data]);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  const kpis = data?.kpis;

  return (
    <div className="space-y-4 pb-6 sm:space-y-6">
      <DashboardHero term={term} academicYear={academicYear} />

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:pb-0">
        <Kpi label="Periods today" value={kpis?.todaysPeriods ?? 0} icon={<CalendarDays size={18} />} />
        <Kpi
          label="Teachers"
          value={`${kpis?.teachersTeaching.active ?? 0}/${kpis?.teachersTeaching.total ?? 0}`}
          icon={<Users size={18} />}
          tone="#0f766e"
        />
        <Kpi
          label="Conflicts"
          value={kpis?.conflicts ?? 0}
          icon={<AlertTriangle size={18} />}
          tone={kpis?.conflicts ? '#dc2626' : '#059669'}
        />
        <Kpi
          label="Coverage"
          value={`${data?.lessonCoverage.percent ?? kpis?.lessonCoveragePercent ?? 0}%`}
          icon={<CheckCircle2 size={18} />}
          tone="#0284c7"
        />
      </div>

      {data ? <DashboardInsights data={data} /> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-white px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-extrabold sm:text-lg" style={{ color: NAVY }}>
              Today&apos;s schedule
            </h2>
            <Link
              href="/timetable?tab=timetable"
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600 hover:underline"
            >
              Full timetable <ChevronRight size={14} />
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['all', 'classes', 'teachers'] as ScheduleFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setScheduleFilter(f);
                  setClassFilter('');
                  setTeacherFilter('');
                }}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition sm:text-xs ${
                  scheduleFilter === f ? 'bg-navy text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200'
                }`}
              >
                {f === 'all' ? 'All' : f === 'classes' ? 'Class' : 'Teacher'}
              </button>
            ))}
          </div>
          {scheduleFilter === 'classes' ? (
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm sm:max-w-xs"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">All classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : null}
          {scheduleFilter === 'teachers' ? (
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm sm:max-w-xs"
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
            >
              <option value="">All teachers</option>
              {teacherOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        <div className="px-2 py-2 sm:px-3 sm:py-3">
          {filteredSchedule.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center">
              <p className="text-sm text-slate-400">No lessons scheduled today.</p>
              <Link
                href="/create-timetable"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-amber-600 hover:underline"
              >
                Create timetable <ChevronRight size={14} />
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredSchedule.map((row) => {
                const badge = statusBadge(row.status);
                const isRowLive = row.status === 'running';
                return (
                  <li
                    key={row.id}
                    className={`relative flex gap-3 rounded-xl border px-3 py-3 transition sm:gap-4 sm:px-4 ${
                      isRowLive
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50'
                    }`}
                  >
                    {isRowLive ? (
                      <span className="absolute bottom-3 left-0 top-3 w-1 rounded-full bg-emerald-500" />
                    ) : null}
                    <div className="w-[72px] shrink-0 sm:w-20">
                      <p className="text-sm font-extrabold leading-tight" style={{ color: NAVY }}>
                        {row.period}
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium tabular-nums text-slate-400 sm:text-[11px]">
                        {row.time}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: NAVY }}>
                        {row.subjectName}, {row.className}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{row.teacherName}</p>
                    </div>
                    <span
                      className={`shrink-0 self-start rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide sm:text-[11px] ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
