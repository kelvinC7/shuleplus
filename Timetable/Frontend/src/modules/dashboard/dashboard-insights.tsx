'use client';

import Link from 'next/link';
import { ChevronRight, ScanLine } from 'lucide-react';
import type { DashboardOverview } from '@/types';

const NAVY = '#000435';

export type PeriodStudyRow = {
  period: string;
  time: string;
  total: number;
  done: number;
  live: number;
  pending: number;
  missed: number;
  pct: number;
};

export function buildPeriodStudyRows(schedule: DashboardOverview['todaySchedule']): PeriodStudyRow[] {
  const order: string[] = [];
  const map = new Map<string, PeriodStudyRow>();

  for (const row of schedule) {
    if (!map.has(row.period)) {
      order.push(row.period);
      map.set(row.period, {
        period: row.period,
        time: row.time.split('–')[0]?.trim() ?? row.time,
        total: 0,
        done: 0,
        live: 0,
        pending: 0,
        missed: 0,
        pct: 0,
      });
    }
    const e = map.get(row.period)!;
    e.total += 1;
    if (row.status === 'completed') e.done += 1;
    else if (row.status === 'running') e.live += 1;
    else if (row.status === 'missed' || row.status === 'late') e.missed += 1;
    else e.pending += 1;
  }

  return order.map((p) => {
    const e = map.get(p)!;
    const taught = e.done + e.live;
    e.pct = e.total ? Math.round((taught / e.total) * 100) : 0;
    return e;
  });
}

function BarChart({
  rows,
  maxBars = 12,
}: {
  rows: PeriodStudyRow[];
  maxBars?: number;
}) {
  const slice = rows.slice(0, maxBars);
  if (!slice.length) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">No period data for today yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {slice.map((row) => (
        <div key={row.period}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-navy">
              {row.period}{' '}
              <span className="font-normal tabular-nums text-slate-400">{row.time}</span>
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-slate-600">
              {row.done + row.live}/{row.total}
            </span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${row.total ? (row.done / row.total) * 100 : 0}%` }}
              title="Completed"
            />
            <div
              className="bg-sky-400 transition-all"
              style={{ width: `${row.total ? (row.live / row.total) * 100 : 0}%` }}
              title="In progress"
            />
            <div
              className="bg-amber-300 transition-all"
              style={{ width: `${row.total ? (row.pending / row.total) * 100 : 0}%` }}
              title="Upcoming"
            />
            <div
              className="bg-red-400 transition-all"
              style={{ width: `${row.total ? (row.missed / row.total) * 100 : 0}%` }}
              title="Missed / late"
            />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-3 pt-1 text-[10px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Taught
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-400" /> Live
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-300" /> Upcoming
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-400" /> Missed
        </span>
      </div>
    </div>
  );
}

function TeacherScanSummary({
  attendance,
  lessonCoverage,
}: {
  attendance: DashboardOverview['teacherAttendance'];
  lessonCoverage: DashboardOverview['lessonCoverage'];
}) {
  const pending = Math.max(
    0,
    lessonCoverage.scheduled - attendance.onTime - attendance.late - attendance.absent,
  );
  const total = Math.max(1, attendance.onTime + attendance.late + attendance.absent + pending);
  const onPct = Math.round((attendance.onTime / total) * 100);
  const latePct = Math.round((attendance.late / total) * 100);
  const absentPct = Math.round((attendance.absent / total) * 100);
  const pendPct = Math.round((pending / total) * 100);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div
        className="mx-auto h-28 w-28 shrink-0 rounded-full sm:mx-0"
        style={{
          background: `conic-gradient(
            #10b981 0 ${onPct}%,
            #f59e0b ${onPct}% ${onPct + latePct}%,
            #ef4444 ${onPct + latePct}% ${onPct + latePct + absentPct}%,
            #e2e8f0 ${onPct + latePct + absentPct}% 100%
          )`,
        }}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-white m-[10px]">
          <div className="text-center">
            <p className="text-xl font-extrabold tabular-nums" style={{ color: NAVY }}>
              {lessonCoverage.percent}%
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Scanned</p>
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <StatLine label="On time" value={attendance.onTime} color="#10b981" pct={onPct} />
        <StatLine label="Late check-in" value={attendance.late} color="#f59e0b" pct={latePct} />
        <StatLine label="Missed" value={attendance.absent} color="#ef4444" pct={absentPct} />
        <StatLine label="Pending" value={pending} color="#cbd5e1" pct={pendPct} />
      </div>
    </div>
  );
}

function StatLine({
  label,
  value,
  color,
  pct,
}: {
  label: string;
  value: number;
  color: string;
  pct: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-medium text-slate-600">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-navy">{value}</span>
    </div>
  );
}

function ClassStudyBars({ classes }: { classes: DashboardOverview['classActivity'] }) {
  const top = [...classes].sort((a, b) => b.today - a.today).slice(0, 8);
  if (!top.length) {
    return <p className="py-6 text-center text-sm text-slate-400">No class lessons today.</p>;
  }

  return (
    <div className="space-y-2.5">
      {top.map((c) => {
        const pct = c.today ? Math.round((c.completed / c.today) * 100) : 0;
        return (
          <div key={c.className}>
            <div className="mb-1 flex justify-between gap-2 text-xs">
              <span className="truncate font-semibold text-navy">{c.className}</span>
              <span className="shrink-0 tabular-nums text-slate-500">
                {c.completed}/{c.today} periods
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-0.5 text-[10px] text-slate-400">{pct}% with class attendance recorded</p>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardInsights({ data }: { data: DashboardOverview }) {
  const periodRows = buildPeriodStudyRows(data.todaySchedule);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-sm font-extrabold sm:text-base" style={{ color: NAVY }}>
              Periods today
            </h2>
            <p className="text-[11px] text-slate-500">Class study progress by timetable period</p>
          </div>
          <Link
            href="/live-monitor"
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600 hover:underline"
          >
            Live monitor <ChevronRight size={14} />
          </Link>
        </div>
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <BarChart rows={periodRows} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <ScanLine size={18} className="text-amber-600" />
            <div>
              <h2 className="text-sm font-extrabold sm:text-base" style={{ color: NAVY }}>
                Teacher check-in
              </h2>
              <p className="text-[11px] text-slate-500">Scan / punctuality for today&apos;s periods</p>
            </div>
          </div>
        </div>
        <div className="px-4 py-4 sm:px-5">
          <TeacherScanSummary attendance={data.teacherAttendance} lessonCoverage={data.lessonCoverage} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-extrabold sm:text-base" style={{ color: NAVY }}>
            Classes by periods
          </h2>
          <p className="text-[11px] text-slate-500">Lessons scheduled vs attendance recorded</p>
        </div>
        <div className="max-h-[320px] overflow-y-auto px-4 py-4 sm:px-5">
          <ClassStudyBars classes={data.classActivity} />
        </div>
      </div>
    </section>
  );
}
