'use client';

import {
  Activity,
  CalendarCheck,
  CircleDollarSign,
  FileText,
  CalendarClock,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useStudentFetch } from '@/hooks/use-fetch';
import { timeAgo, formatShortDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface TimelineItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

const TYPE_META: Record<string, { icon: React.ReactNode; ring: string; bg: string }> = {
  ATTENDANCE: {
    icon: <CalendarCheck className="size-4" />,
    ring: 'ring-emerald-200',
    bg: 'bg-emerald-500',
  },
  FEE: {
    icon: <CircleDollarSign className="size-4" />,
    ring: 'ring-sky-200',
    bg: 'bg-sky-500',
  },
  EXAM: {
    icon: <FileText className="size-4" />,
    ring: 'ring-violet-200',
    bg: 'bg-violet-500',
  },
  LEAVE: {
    icon: <CalendarClock className="size-4" />,
    ring: 'ring-amber-200',
    bg: 'bg-amber-500',
  },
  DISCIPLINE: {
    icon: <ShieldAlert className="size-4" />,
    ring: 'ring-rose-200',
    bg: 'bg-rose-500',
  },
  PLATFORM: {
    icon: <Activity className="size-4" />,
    ring: 'ring-slate-200',
    bg: 'bg-slate-500',
  },
};

export default function TimelinePage() {
  const { data, loading, error } = useStudentFetch<TimelineItem[]>('/timeline');
  const items = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live Timeline"
        title="School Activity Feed"
        action={
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
            <Activity className="size-4 text-primary" />
            {items.length} events
          </div>
        }
      />

      <div className="hr-card p-6 md:p-8">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex animate-pulse gap-4">
                <div className="size-10 shrink-0 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-slate-100" />
                  <div className="h-3 w-2/3 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState icon={<AlertCircle className="text-red-500" />} title="Unable to load timeline" description={error} />
        ) : items.length === 0 ? (
          <EmptyState title="No activity yet" description="Events from the school will appear here." />
        ) : (
          <div className="relative space-y-6 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
            {items.map((item) => {
              const meta = TYPE_META[item.type] ?? TYPE_META.PLATFORM;
              return (
                <div key={item.id} className="relative flex gap-4 pl-1">
                  <div className={cn('relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full text-white ring-4', meta.bg, meta.ring)}>
                    {meta.icon}
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-white/70 px-4 py-3 transition-colors hover:bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-navy">{item.title}</p>
                      <span className="text-xs font-medium text-slate-400">
                        {formatShortDate(item.timestamp)} · {timeAgo(item.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
