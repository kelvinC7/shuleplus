'use client';

import { useMemo } from 'react';
import { Clock, GraduationCap, MapPin } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';
import { formatDate, daysLabel, formatTime } from '@/lib/format';
import { ACADEMIC_EMPTY } from '@/lib/academic-display';
import type { UpcomingExam } from '@/types';

type Props = {
  exams: UpcomingExam[];
  className?: string;
  term?: string;
  classNameLabel?: string;
};

function examTone(type: string) {
  const t = type.toLowerCase();
  if (t.includes('final') || t.includes('national')) return 'bg-rose-50 text-rose-900 ring-rose-200/80';
  if (t.includes('mid')) return 'bg-violet-50 text-violet-900 ring-violet-200/80';
  if (t.includes('test') || t.includes('quiz')) return 'bg-sky-50 text-sky-900 ring-sky-200/80';
  return 'bg-indigo-50 text-indigo-900 ring-indigo-200/80';
}

export function ExamTimetablePanel({ exams, className, term, classNameLabel }: Props) {
  const sorted = useMemo(
    () =>
      [...exams].sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      }),
    [exams]
  );

  const byMonth = useMemo(() => {
    const map = new Map<string, UpcomingExam[]>();
    for (const e of sorted) {
      if (!e.date) continue;
      const d = new Date(e.date);
      const key = d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()];
  }, [sorted]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-navy to-[#0a0f3d] p-5 text-white shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-white/10">
            <GraduationCap className="size-6 text-amber-300" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold">Exam & test timetable</h2>
            <p className="mt-1 text-sm text-white/75">
              {classNameLabel ? `${classNameLabel} · ` : ''}
              {term || 'Current term'}
            </p>
          </div>
        </div>
        <Link
          href="/timetable"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/25"
        >
          <Clock className="size-3.5" />
          View weekly class timetable
        </Link>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          className="border-slate-200 bg-white py-12"
          title="No exams scheduled"
          description="School exam and test dates appear here when they are published for your child's class."
        />
      ) : (
        <div className="space-y-6">
          {byMonth.map(([monthLabel, rows]) => (
            <section key={monthLabel}>
              <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-500">{monthLabel}</h3>
              <ul className="space-y-2">
                {rows.map((exam) => (
                  <li
                    key={exam.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-[4.5rem] flex-col items-center justify-center rounded-xl bg-slate-50 px-3 py-2 sm:shrink-0">
                      <span className="text-[10px] font-bold uppercase text-slate-500">
                        {exam.date
                          ? new Date(exam.date).toLocaleDateString(undefined, { weekday: 'short' })
                          : 'TBC'}
                      </span>
                      <span className="text-2xl font-extrabold tabular-nums text-navy">
                        {exam.date ? new Date(exam.date).getDate() : ACADEMIC_EMPTY}
                      </span>
                      <span className="text-[10px] font-medium text-muted">
                        {exam.date ? formatTime(exam.date) : ''}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ring-1', examTone(exam.type))}>
                          {exam.type || 'Exam'}
                        </span>
                      </div>
                      <p className="mt-1 text-base font-extrabold text-navy">{exam.subject}</p>
                      {exam.date ? (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                          <MapPin className="size-3 shrink-0 opacity-60" />
                          {formatDate(exam.date)} · {daysLabel(exam.date)}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
