'use client';

import Link from 'next/link';
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useStudentFetch } from '@/hooks/use-fetch';
import { formatDate, daysUntil, daysLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Homework {
  id: string;
  assignmentId?: string | null;
  subject: string;
  title: string;
  description: string | null;
  teacher: string | null;
  assignedDate: string;
  dueDate: string;
  status: string;
  homeworkType?: string;
  className?: string | null;
  maxScore?: number | null;
  estimatedMinutes?: number | null;
  questionCount?: number | null;
  score?: number | null;
  feedback?: string | null;
}

interface HomeworkStats {
  pending: number;
  dueToday: number;
  completed: number;
  total: number;
}

function statusStyle(status: string, overdue: boolean) {
  if (status === 'SUBMITTED' || status === 'REVIEWED' || status === 'COMPLETED') {
    return 'bg-emerald-50 text-emerald-700';
  }
  if (overdue) return 'bg-red-50 text-red-700';
  if (status === 'IN_PROGRESS') return 'bg-blue-50 text-blue-700';
  return 'bg-amber-50 text-amber-700';
}

function progressLabel(status: string) {
  if (status === 'REVIEWED' || status === 'COMPLETED') return 'Graded';
  if (status === 'SUBMITTED') return 'Submitted ✓';
  if (status === 'IN_PROGRESS') return 'In progress';
  return 'Not started';
}

export default function HomeworkPage() {
  const { data: stats, loading: statsLoading } = useStudentFetch<HomeworkStats>('/homework/stats');
  const { data, loading, error } = useStudentFetch<Homework[]>('/homework');
  const items = data ?? [];
  const pendingItems = items.filter((h) => h.status === 'PENDING' || h.status === 'IN_PROGRESS');
  const completedItems = items.filter((h) => ['SUBMITTED', 'REVIEWED', 'COMPLETED'].includes(h.status));

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Homework"
        action={
          stats && !statsLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 px-4 py-2 text-sm font-semibold text-navy">
              <BookOpen className="size-4 text-primary" />
              {stats.pending} pending
            </div>
          ) : null
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: stats?.pending ?? '—', tone: 'bg-amber-50 text-amber-800' },
          { label: 'Due today', value: stats?.dueToday ?? '—', tone: 'bg-red-50 text-red-800' },
          { label: 'Completed', value: stats?.completed ?? '—', tone: 'bg-emerald-50 text-emerald-800' },
        ].map((s) => (
          <div key={s.label} className={cn('rounded-2xl border border-transparent p-4', s.tone)}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="size-5 animate-spin" /> Loading homework…
        </div>
      ) : error ? (
        <EmptyState icon={<AlertCircle className="text-red-500" />} title="Unable to load homework" description={error} />
      ) : items.length === 0 ? (
        <EmptyState title="No homework assigned" description="New assignments appear here when teachers publish them." />
      ) : (
        <div className="space-y-6">
          {pendingItems.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-500">Pending</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pendingItems.map((h) => (
                  <HomeworkCard key={h.id} homework={h} />
                ))}
              </div>
            </section>
          )}

          {completedItems.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-500">Completed</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {completedItems.map((h) => (
                  <HomeworkCard key={h.id} homework={h} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function HomeworkCard({ homework: h }: { homework: Homework }) {
  const due = daysUntil(h.dueDate);
  const isOverdue = due < 0 && !['SUBMITTED', 'REVIEWED', 'COMPLETED'].includes(h.status);
  const graded = h.status === 'REVIEWED' || h.status === 'COMPLETED';

  return (
    <Link
      href={`/homework/${h.id}`}
      className={cn(
        'group flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md',
        isOverdue && 'border-red-200'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-navy text-primary">
          <BookOpen className="size-4" />
        </div>
        <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase', statusStyle(h.status, isOverdue))}>
          {progressLabel(h.status)}
        </span>
      </div>

      <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-primary">{h.subject}</p>
      <h3 className="font-bold text-navy group-hover:text-primary">{h.title}</h3>
      <p className="mt-0.5 text-xs text-slate-500">
        {[h.className, h.subject].filter(Boolean).join(' · ')}
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        {h.questionCount ? <span>{h.questionCount} questions</span> : null}
        {h.maxScore != null ? <span>{h.maxScore} marks</span> : null}
        {h.estimatedMinutes ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" /> {h.estimatedMinutes} min
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className={cn('inline-flex items-center gap-1 font-medium', isOverdue ? 'text-red-600' : 'text-navy')}>
          <CalendarClock className="size-3.5" />
          {isOverdue ? 'Overdue' : daysLabel(h.dueDate)}
        </span>
        {graded && h.score != null ? (
          <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
            <CheckCircle2 className="size-3.5" /> {h.score}/{h.maxScore ?? '—'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 font-semibold text-primary">
            View <ChevronRight className="size-3.5" />
          </span>
        )}
      </div>
    </Link>
  );
}
