'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ModuleTile } from '@/components/module-tile';
import { DASHBOARD_TILES } from '@/config/teacher-nav';
import { SALARY_ADVANCE } from '@/config/salary-advance-brand';
import { fetchTeacherToday } from '@/services/timetable-smart-api';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import type { DashboardSummary } from '@/types';
import type { TeacherTodayData } from '@/types/smart-timetable';

export function DashboardView({ summary }: { summary: DashboardSummary }) {
  const { term, academicYear } = useAcademicSettings();
  const [today, setToday] = useState<TeacherTodayData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTeacherToday({ term, academicYear })
      .then((data) => {
        if (!cancelled) setToday(data);
      })
      .catch(() => {
        if (!cancelled) setToday(null);
      });
    return () => {
      cancelled = true;
    };
  }, [term, academicYear]);

  const todayLessons = today?.kpis.todayClasses ?? summary.todayLessons ?? 0;
  const running = today?.kpis.classesRunning ?? 0;
  const pendingAttendance = today?.kpis.pendingAttendance ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy">Good day, Teacher</h1>
        <p className="mt-1 text-sm text-muted">
          {summary.organizationName} — your teaching workspace
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's lessons" value={String(todayLessons)} />
        <StatCard label="Classes running" value={String(running)} />
        <StatCard
          label="Pending advances"
          value={String(summary.pendingAdvanceRequests)}
          highlight={summary.pendingAdvanceRequests > 0}
        />
        <StatCard label="Approved advances" value={String(summary.approvedAdvanceRequests)} />
      </div>

      {today?.current || today?.next ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {today.current ? (
            <LessonSnap
              label="Current class"
              subject={today.current.subjectName}
              detail={`${today.current.className} · ${today.current.startTime}–${today.current.endTime}`}
              href="/my-teaching"
              hint={
                today.periodTransition?.isDoublePeriod
                  ? today.periodTransition.doublePeriodContinues
                    ? 'Double period — next slot continues here'
                    : 'Double period in progress'
                  : today.periodTransition && today.periodTransition.minutesRemaining <= 10
                    ? `${today.periodTransition.minutesRemaining} min left · ${today.periodTransition.message}`
                    : undefined
              }
            />
          ) : null}
          {today.next ? (
            <LessonSnap
              label="Next class"
              subject={today.next.subjectName}
              detail={`${today.next.className} · ${today.next.startTime}–${today.next.endTime}`}
              href="/my-teaching"
            />
          ) : null}
        </div>
      ) : null}

      {pendingAttendance > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-semibold text-navy">Attendance pending</p>
          <p className="mt-1 text-sm text-muted">
            {pendingAttendance} running lesson{pendingAttendance === 1 ? '' : 's'} still need
            attendance.
          </p>
          <Link href="/attendance" className="mt-3 inline-block text-sm font-semibold text-navy underline">
            Open attendance
          </Link>
        </div>
      ) : null}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-navy">Quick access</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DASHBOARD_TILES.filter((tile) => tile.available).map((tile) => (
            <ModuleTile key={tile.href} {...tile} />
          ))}
        </div>
      </section>

      {summary.pendingAdvanceRequests > 0 && (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
          <p className="font-semibold text-navy">{SALARY_ADVANCE.shortName}</p>
          <p className="mt-1 text-sm text-muted">
            You have {summary.pendingAdvanceRequests} salary advance request
            {summary.pendingAdvanceRequests === 1 ? '' : 's'} awaiting review.
          </p>
        </div>
      )}
    </div>
  );
}

function LessonSnap({
  label,
  subject,
  detail,
  href,
  hint,
}: {
  label: string;
  subject: string;
  detail: string;
  href: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-primary/40"
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-navy">{subject}</p>
      <p className="text-sm text-muted">{detail}</p>
      {hint ? <p className="mt-2 text-xs font-medium text-primary">{hint}</p> : null}
    </Link>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="relative flex min-h-[112px] flex-col rounded-2xl bg-white p-4 shadow-[0_2px_14px_-4px_rgba(0,4,53,0.1)] transition-all duration-300 hover:-translate-y-0.5 sm:min-h-[120px] sm:p-5">
      <div className="flex items-center gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#000435] text-[#FCB038]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 4 4 5-6" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#000435]">{label}</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#000435] sm:text-[1.75rem] sm:leading-none">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
