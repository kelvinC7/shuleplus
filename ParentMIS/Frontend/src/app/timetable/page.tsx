'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  UserRound,
  XCircle,
} from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useStudentFetch } from '@/hooks/use-fetch';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'EXCUSED'
  | 'SICK'
  | 'SCHOOL_ACTIVITY'
  | null;

interface TimetableSlot {
  id: string;
  period: number;
  periodLabel: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
  room: string | null;
  attendanceStatus: AttendanceStatus;
  attendanceDone: boolean;
  lessonStarted: boolean;
  sessionStatus: string | null;
}

interface TimetableDay {
  date: string;
  day: string;
  dayIndex: number;
  slots: TimetableSlot[];
}

interface TimetableResponse {
  source?: 'timetable' | 'local';
  term?: string | null;
  academicYear?: string | null;
  className?: string | null;
  weekStart: string;
  weekEnd: string;
  days: TimetableDay[];
  summary?: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    unmarked: number;
    total: number;
  };
  student?: {
    id: string;
    name: string;
    shuleCode: string;
    className: string | null;
  };
  warning?: string;
}

type ViewMode = 'day' | 'week';

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeekMonday(d: Date): Date {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + n);
  return next;
}

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function statusMeta(status: AttendanceStatus, lessonStarted: boolean, attendanceDone: boolean) {
  if (status === 'PRESENT') {
    return {
      label: 'Present',
      className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      icon: CheckCircle2,
    };
  }
  if (status === 'LATE') {
    return {
      label: 'Late',
      className: 'bg-amber-50 text-amber-700 ring-amber-200',
      icon: Clock,
    };
  }
  if (status === 'ABSENT') {
    return {
      label: 'Absent',
      className: 'bg-rose-50 text-rose-700 ring-rose-200',
      icon: XCircle,
    };
  }
  if (status === 'EXCUSED' || status === 'SICK' || status === 'SCHOOL_ACTIVITY') {
    return {
      label: status === 'SICK' ? 'Sick' : status === 'SCHOOL_ACTIVITY' ? 'Activity' : 'Excused',
      className: 'bg-sky-50 text-sky-700 ring-sky-200',
      icon: CheckCircle2,
    };
  }
  if (attendanceDone || lessonStarted) {
    return {
      label: 'Not marked',
      className: 'bg-slate-100 text-slate-500 ring-slate-200',
      icon: Clock,
    };
  }
  return {
    label: 'Upcoming',
    className: 'bg-slate-50 text-slate-400 ring-slate-200',
    icon: Clock,
  };
}

function StatusPill({
  status,
  lessonStarted,
  attendanceDone,
}: {
  status: AttendanceStatus;
  lessonStarted: boolean;
  attendanceDone: boolean;
}) {
  const meta = statusMeta(status, lessonStarted, attendanceDone);
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1',
        meta.className
      )}
    >
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  );
}

export default function TimetablePage() {
  const { linkedStudents, activeStudentId } = useAuth();
  const child = linkedStudents.find((s) => s.id === activeStudentId);

  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeekMonday(new Date()));
  const [view, setView] = useState<ViewMode>('day');
  const todayIso = toIsoDate(new Date());
  const todayIndex = new Date().getDay();
  const [activeDate, setActiveDate] = useState(() => {
    const mon = startOfWeekMonday(new Date());
    if (todayIndex >= 1 && todayIndex <= 5) return todayIso;
    return toIsoDate(mon);
  });

  const weekStart = toIsoDate(weekAnchor);
  const weekEnd = toIsoDate(addDays(weekAnchor, 4));
  const path = `/timetable?from=${weekStart}&to=${weekEnd}`;
  const { data, loading, error, reload } = useStudentFetch<TimetableResponse>(path);

  const weekDays = useMemo(
    () => (data?.days ?? []).filter((d) => d.dayIndex >= 1 && d.dayIndex <= 5),
    [data]
  );

  const activeDay = weekDays.find((d) => d.date === activeDate) ?? weekDays[0];
  const activeSlots = activeDay?.slots ?? [];
  const summary = data?.summary;

  function shiftWeek(delta: number) {
    const next = addDays(weekAnchor, delta * 7);
    setWeekAnchor(next);
    const nextStart = toIsoDate(next);
    setActiveDate(nextStart);
  }

  function goThisWeek() {
    const mon = startOfWeekMonday(new Date());
    setWeekAnchor(mon);
    setActiveDate(todayIndex >= 1 && todayIndex <= 5 ? todayIso : toIsoDate(mon));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Class Timetable"
        title="Lessons & Period Attendance"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm">
              {child?.className || data?.className || 'Class'} · {child?.firstName || 'Child'}
            </div>
          </div>
        }
      />

      {data?.warning ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {data.warning}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-2xl border border-border bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setView('day')}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-bold transition',
              view === 'day' ? 'bg-navy text-primary' : 'text-slate-500 hover:bg-slate-50'
            )}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => setView('week')}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-bold transition',
              view === 'week' ? 'bg-navy text-primary' : 'text-slate-500 hover:bg-slate-50'
            )}
          >
            Week
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary px-3 py-2" onClick={() => shiftWeek(-1)}>
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" className="btn-secondary px-3 py-2 text-xs font-bold" onClick={goThisWeek}>
            This week
          </button>
          <div className="min-w-[140px] rounded-xl border border-border bg-white px-3 py-2 text-center text-sm font-bold text-navy">
            {formatShortDate(weekStart)} – {formatShortDate(weekEnd)}
          </div>
          <button type="button" className="btn-secondary px-3 py-2" onClick={() => shiftWeek(1)}>
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Present', value: summary.present, tone: 'text-emerald-700 bg-emerald-50' },
            { label: 'Absent', value: summary.absent, tone: 'text-rose-700 bg-rose-50' },
            { label: 'Late', value: summary.late, tone: 'text-amber-700 bg-amber-50' },
            { label: 'Excused', value: summary.excused, tone: 'text-sky-700 bg-sky-50' },
            { label: 'Not marked', value: summary.unmarked, tone: 'text-slate-600 bg-slate-100' },
          ].map((item) => (
            <div key={item.label} className={cn('rounded-2xl px-4 py-3', item.tone)}>
              <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">{item.label}</p>
              <p className="mt-1 text-2xl font-extrabold">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="hr-card space-y-3 p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertCircle className="text-red-500" />}
          title="Unable to load timetable"
          description={error}
          action={
            <button type="button" className="btn-primary" onClick={() => void reload()}>
              Try again
            </button>
          }
        />
      ) : weekDays.length === 0 || weekDays.every((d) => d.slots.length === 0) ? (
        <EmptyState
          icon={<CalendarDays />}
          title="No class timetable yet"
          description="When the school publishes this class timetable in Timetable, periods will appear here with teacher attendance."
        />
      ) : view === 'day' ? (
        <>
          <div className="hr-card p-2">
            <div className="grid grid-cols-5 gap-2">
              {weekDays.map((d) => {
                const isActive = activeDay?.date === d.date;
                const isToday = d.date === todayIso;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setActiveDate(d.date)}
                    className={cn(
                      'rounded-xl px-2 py-3 text-center transition',
                      isActive
                        ? 'bg-gradient-to-r from-primary to-gold font-bold text-navy shadow-md shadow-primary/20'
                        : 'text-slate-500 hover:bg-slate-50'
                    )}
                  >
                    <span className="block text-xs font-semibold uppercase tracking-wide">
                      {d.day.slice(0, 3)}
                    </span>
                    <span className="mt-0.5 block text-[11px] opacity-80">{formatShortDate(d.date)}</span>
                    {isToday ? (
                      <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide">Today</span>
                    ) : (
                      <span className="mt-1 block text-[10px] opacity-70">{d.slots.length} lessons</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3 px-1">
              <div>
                <h2 className="text-lg font-extrabold text-navy">
                  {activeDay?.day} · {activeDay ? formatShortDate(activeDay.date) : ''}
                </h2>
                <p className="text-sm text-muted">
                  {data?.term && data?.academicYear
                    ? `${data.term} · ${data.academicYear}`
                    : 'Class periods for this day'}
                </p>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                {activeSlots.length} periods
              </span>
            </div>

            {activeSlots.length === 0 ? (
              <div className="hr-card p-8">
                <EmptyState
                  icon={<CalendarDays />}
                  title="No lessons today"
                  description="This day has no scheduled periods for your child's class."
                />
              </div>
            ) : (
              activeSlots.map((slot) => (
                <article
                  key={slot.id}
                  className="hr-card overflow-hidden border border-border/70 transition hover:border-primary/30"
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-navy text-primary">
                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">P</span>
                        <span className="text-lg font-extrabold leading-none">{slot.period}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-extrabold text-navy">{slot.subject}</h3>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="size-3.5 text-primary" />
                            {slot.startTime} – {slot.endTime}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound className="size-3.5 text-primary" />
                            {slot.teacher}
                          </span>
                          {slot.room ? (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="size-3.5 text-primary" />
                              {slot.room}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <StatusPill
                      status={slot.attendanceStatus}
                      lessonStarted={slot.lessonStarted}
                      attendanceDone={slot.attendanceDone}
                    />
                  </div>
                </article>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="hr-card overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-5 border-b border-slate-100">
              {weekDays.map((d) => (
                <div key={d.date} className="border-r border-slate-100 px-3 py-3 last:border-r-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{d.day.slice(0, 3)}</p>
                  <p className="text-sm font-extrabold text-navy">{formatShortDate(d.date)}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5">
              {weekDays.map((d) => (
                <div key={d.date} className="min-h-[280px] space-y-2 border-r border-slate-100 p-2 last:border-r-0">
                  {d.slots.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-slate-300">No lessons</p>
                  ) : (
                    d.slots.map((slot) => {
                      const meta = statusMeta(
                        slot.attendanceStatus,
                        slot.lessonStarted,
                        slot.attendanceDone
                      );
                      return (
                        <div
                          key={slot.id}
                          className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5"
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {slot.startTime}
                          </p>
                          <p className="mt-0.5 text-sm font-bold leading-snug text-navy">{slot.subject}</p>
                          <p className="mt-1 truncate text-[11px] text-slate-500">{slot.teacher}</p>
                          <div className="mt-2">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1',
                                meta.className
                              )}
                            >
                              {meta.label}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
