'use client';

import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  History,
  Hourglass,
  Play,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SmartLesson } from '@/types/smart-timetable';
import { canOpenLessonForAttendance, lessonAttendanceState } from './utils';

function stateConfig(state: ReturnType<typeof lessonAttendanceState>): {
  label: string;
  icon: LucideIcon;
  tone: string;
  dot: string;
} {
  switch (state) {
    case 'submitted':
      return {
        label: 'Submitted',
        icon: CheckCircle2,
        tone: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'active':
      return {
        label: 'Active',
        icon: CircleDot,
        tone: 'bg-primary/15 text-navy border-primary/30',
        dot: 'bg-primary animate-pulse',
      };
    case 'upcoming':
      return {
        label: 'Upcoming',
        icon: Hourglass,
        tone: 'bg-sky-50 text-sky-800 border-sky-200',
        dot: 'bg-sky-400',
      };
    default:
      return {
        label: 'Past',
        icon: History,
        tone: 'bg-slate-50 text-slate-600 border-slate-200',
        dot: 'bg-slate-300',
      };
  }
}

export function TodayPeriodsTable({
  lessons,
  onOpen,
}: {
  lessons: SmartLesson[];
  onOpen: (l: SmartLesson) => void;
}) {
  if (!lessons.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
        <BookOpen className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-3 font-semibold text-navy">No periods match your filters</p>
        <p className="mt-1 text-sm text-muted">Try clearing class or course filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-gradient-to-r from-slate-50 to-white text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              <th className="px-5 py-3.5">Period</th>
              <th className="px-5 py-3.5">Class</th>
              <th className="px-5 py-3.5">Course</th>
              <th className="px-5 py-3.5">Time</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l, idx) => {
              const state = lessonAttendanceState(l);
              const cfg = stateConfig(state);
              const StateIcon = cfg.icon;
              const canOpen = canOpenLessonForAttendance(l);
              return (
                <tr
                  key={l.timetableId}
                  className={`border-b border-border/60 transition hover:bg-slate-50/80 ${
                    l.phase === 'current' ? 'bg-primary/5' : ''
                  } ${idx === lessons.length - 1 ? 'border-0' : ''}`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold ${
                          l.phase === 'current'
                            ? 'bg-navy text-white shadow-sm'
                            : 'bg-slate-100 text-navy'
                        }`}
                      >
                        {l.periodLabel ?? '—'}
                      </span>
                      {l.phase === 'current' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                          Live
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-navy">{l.className}</p>
                    {l.room && <p className="text-xs text-muted">Room {l.room}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-navy">{l.subjectName}</p>
                    <p className="text-xs text-muted">{l.teacherName}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-navy">
                      <Clock className="h-3.5 w-3.5 text-muted" />
                      {l.startTime} – {l.endTime}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.tone}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      <StateIcon className="h-3.5 w-3.5" aria-hidden strokeWidth={2.5} />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {canOpen ? (
                      <button
                        type="button"
                        onClick={() => onOpen(l)}
                        className="inline-flex items-center gap-1 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy/90"
                      >
                        {l.attendanceDone ? 'View students' : 'Open'}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {lessons.map((l) => {
          const state = lessonAttendanceState(l);
          const cfg = stateConfig(state);
          const StateIcon = cfg.icon;
          const canOpen = canOpenLessonForAttendance(l);
          return (
            <div
              key={l.timetableId}
              className={`rounded-2xl border bg-white p-4 shadow-sm ${
                l.phase === 'current' ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-navy px-2 py-0.5 text-xs font-bold text-white">
                      {l.periodLabel}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.tone}`}>
                      <StateIcon className="h-3 w-3" aria-hidden strokeWidth={2.5} />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="mt-2 font-bold text-navy">{l.subjectName}</p>
                  <p className="text-sm text-muted">
                    {l.className} · {l.startTime}–{l.endTime}
                  </p>
                </div>
                {canOpen && (
                  <button
                    type="button"
                    className="btn-primary !px-3 !py-1.5 text-xs"
                    onClick={() => onOpen(l)}
                  >
                    {l.attendanceDone ? 'View students' : 'Open'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PeriodStatPill({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  tone?: 'default' | 'live' | 'done';
}) {
  const tones = {
    default: 'bg-white border-border',
    live: 'bg-red-50 border-red-200',
    done: 'bg-emerald-50 border-emerald-200',
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-muted">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold text-navy">{value}</p>
    </div>
  );
}

export function EmptyPeriodState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-gradient-to-br from-white to-slate-50 p-8 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-muted" />
      <p className="mt-3 font-semibold text-navy">No lessons scheduled for today</p>
      <p className="mt-1 text-sm text-muted">Your timetable periods will appear here.</p>
      {onRefresh && (
        <button type="button" className="btn-secondary mt-4 inline-flex items-center gap-2" onClick={onRefresh}>
          <Play className="h-4 w-4" /> Refresh timetable
        </button>
      )}
    </div>
  );
}
