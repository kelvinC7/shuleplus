'use client';

import { Calendar, MapPin, Clock, CalendarDays, AlertCircle } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useStudentFetch } from '@/hooks/use-fetch';
import { formatDate, daysUntil, daysLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  category: string;
}

function categoryCls(category: string): string {
  switch (category.toLowerCase()) {
    case 'sports':
      return 'bg-emerald-100 text-emerald-700';
    case 'academic':
      return 'bg-sky-100 text-sky-700';
    case 'holiday':
      return 'bg-violet-100 text-violet-700';
    case 'cultural':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export default function EventsPage() {
  const { data, loading, error } = useStudentFetch<SchoolEvent[]>('/events');
  const events = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Events & Calendar"
        title="School Events"
        action={
          <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 px-4 py-2 text-sm font-semibold text-navy">
            <CalendarDays className="size-4 text-primary" />
            {events.length} upcoming
          </div>
        }
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<AlertCircle className="text-red-500" />} title="Unable to load events" description={error} />
      ) : events.length === 0 ? (
        <EmptyState title="No events scheduled" description="School events will appear here as they are published." />
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const eventDate = new Date(event.date);
            const d = daysUntil(event.date);
            return (
              <div
                key={event.id}
                className="hr-card flex flex-col gap-4 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-soft-lg sm:flex-row sm:items-center"
              >
                {/* Date tile */}
                <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-navy to-navy-light text-white shadow-md shadow-navy/10">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                    {eventDate.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-2xl font-bold">{eventDate.getDate()}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-navy">{event.title}</h3>
                    <span className={cn('rounded-full px-3 py-0.5 text-xs font-semibold', categoryCls(event.category))}>
                      {event.category}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{event.description}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5" /> {formatDate(event.date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5" /> {event.time}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" /> {event.location}
                    </span>
                  </div>
                </div>

                <span
                  className={cn(
                    'inline-flex shrink-0 items-center rounded-full px-4 py-1.5 text-xs font-semibold',
                    d < 0 ? 'bg-slate-100 text-slate-400' : d <= 3 ? 'bg-primary/15 text-ochre' : 'bg-emerald-100 text-emerald-700'
                  )}
                >
                  {daysLabel(event.date)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
