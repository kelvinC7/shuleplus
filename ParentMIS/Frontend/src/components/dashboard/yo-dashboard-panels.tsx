'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ActivityLog, FeeStatement, UpcomingExam } from '@/types';

function activityPill(type?: string) {
  const t = (type ?? '').toLowerCase();
  if (t.includes('present') || t.includes('fee_paid') || t.includes('success')) {
    return 'bg-[rgba(18,160,106,0.15)] text-[var(--yo-green)]';
  }
  if (t.includes('due') || t.includes('alert') || t.includes('late')) {
    return 'bg-[var(--yo-amber-soft)] text-[#b26b00]';
  }
  return 'bg-[var(--yo-bg)] text-[var(--yo-muted)]';
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function YoTodayPanel({ exams }: { exams: UpcomingExam[] }) {
  const items = exams.slice(0, 4);

  return (
    <section className="hr-card rounded-[24px] p-5 min-[700px]:p-[22px]">
      <h2 className="text-base font-bold text-[var(--yo-navy)]">Today in class</h2>
      <p className="mt-0.5 text-xs text-[var(--yo-muted)]">Schedule & upcoming checks</p>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--yo-muted)]">No classes or exams scheduled for today.</p>
      ) : (
        <ul className="mt-4">
          {items.map((exam) => (
            <li key={exam.id} className="flex items-center gap-3.5 border-t border-[var(--yo-line)] py-3.5 first:border-t-0 first:pt-0">
              <span className="w-12 shrink-0 text-xs font-bold text-[var(--yo-muted)]">{formatTime(exam.date)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--yo-navy)]">{exam.subject}</p>
                <p className="text-xs text-[var(--yo-muted)]">{exam.type}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${activityPill('exam')}`}>
                Upcoming
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link href="/timetable" className="mt-3 inline-flex items-center gap-0.5 text-xs font-bold text-[#b26b00]">
        Full timetable <ChevronRight className="size-3.5" />
      </Link>
    </section>
  );
}

export function YoTodoPanel({ statements, activities }: { statements: FeeStatement[]; activities: ActivityLog[] }) {
  const feeTodos = statements.filter((s) => s.status !== 'PAID').slice(0, 3);
  const activityTodos = activities.slice(0, 3);

  return (
    <section className="hr-card rounded-[24px] p-5 min-[700px]:p-[22px]">
      <h2 className="text-base font-bold text-[var(--yo-navy)]">To do</h2>
      <p className="mt-0.5 text-xs text-[var(--yo-muted)]">Fees and follow-ups</p>
      <ul className="mt-4">
        {feeTodos.map((s) => (
          <li key={s.id} className="flex items-start gap-3 border-t border-[var(--yo-line)] py-3.5 first:border-t-0 first:pt-0">
            <span className="mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-[7px] border-2 border-[var(--yo-line)] text-xs text-transparent" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--yo-navy)]">{s.description}</p>
              <p className="text-xs text-[var(--yo-muted)]">
                {s.balance.toLocaleString()} RWF · due {s.dueDate ? new Date(s.dueDate).toLocaleDateString() : 'soon'}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${activityPill('due')}`}>
              {s.status === 'OVERDUE' ? 'Overdue' : 'Due'}
            </span>
          </li>
        ))}
        {feeTodos.length === 0 && activityTodos.length === 0 ? (
          <li className="py-2 text-sm text-[var(--yo-muted)]">You&apos;re all caught up.</li>
        ) : null}
        {feeTodos.length === 0
          ? activityTodos.map((log) => (
              <li key={log.id} className="flex items-start gap-3 border-t border-[var(--yo-line)] py-3.5 first:border-t-0 first:pt-0">
                <span className="mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-[7px] border-2 border-[var(--yo-line)]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[var(--yo-navy)]">{log.description}</p>
                  <p className="text-xs text-[var(--yo-muted)]">{log.action?.replace(/_/g, ' ') ?? 'Update'}</p>
                </div>
              </li>
            ))
          : null}
      </ul>
      <Link href="/fees" className="mt-3 inline-flex items-center gap-0.5 text-xs font-bold text-[#b26b00]">
        View fees <ChevronRight className="size-3.5" />
      </Link>
    </section>
  );
}

export function YoActivityPanel({
  activities,
  timeAgo,
}: {
  activities: ActivityLog[];
  timeAgo: (iso: string) => string;
}) {
  return (
    <section className="hr-card rounded-[24px] p-5 min-[700px]:p-[22px]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[var(--yo-navy)]">Recent activity</h2>
        <Link href="/timeline" className="inline-flex items-center gap-0.5 text-xs font-bold text-[#b26b00]">
          All <ChevronRight className="size-3.5" />
        </Link>
      </div>
      {activities.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--yo-muted)]">No activity yet.</p>
      ) : (
        <ul className="mt-3">
          {activities.slice(0, 5).map((log) => (
            <li key={log.id} className="flex items-center gap-3.5 border-t border-[var(--yo-line)] py-3.5 first:border-t-0 first:pt-0">
              <span className="w-12 shrink-0 text-xs font-bold text-[var(--yo-muted)]">{timeAgo(log.createdAt)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug text-[var(--yo-navy)]">{log.description}</p>
                <p className="text-xs text-[var(--yo-muted)]">{log.action?.replace(/_/g, ' ') ?? 'Update'}</p>
              </div>
              <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold sm:inline ${activityPill(log.action)}`}>
                New
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
