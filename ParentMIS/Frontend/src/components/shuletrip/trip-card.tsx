'use client';

import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';
import type { SchoolTrip } from '@/types/shuletrip';
import {
  countdownLabel,
  statusBadge,
  tripConsentState,
  tripDateTimeLabel,
  tripLocationLabel,
} from '@/lib/shuletrip-utils';
import { cn } from '@/lib/utils';

const toneClass = {
  amber: 'bg-amber-100 text-amber-900',
  green: 'bg-emerald-100 text-emerald-800',
  slate: 'bg-slate-100 text-slate-700',
  red: 'bg-red-100 text-red-800',
} as const;

export function TripCard({ trip, compact }: { trip: SchoolTrip; compact?: boolean }) {
  const badge = statusBadge(trip);
  const dest = tripLocationLabel(trip.place);
  const awaiting = tripConsentState(trip) === 'awaiting';

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm transition hover:shadow-md">
      <div className={cn('border-b border-border/60 px-4 py-4', compact && 'py-3')}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase', toneClass[badge.tone])}>
            {badge.label}
          </span>
          {awaiting ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">
              Consent needed
            </span>
          ) : null}
        </div>
        <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-navy">{trip.title}</h3>
        <p className="mt-1 text-xs font-medium text-muted">
          {trip.studentName} · {trip.short}
        </p>
      </div>
      <div className={cn('flex flex-1 flex-col gap-3 p-4', compact && 'p-3')}>
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="font-semibold text-muted">When</dt>
            <dd className="font-semibold leading-snug text-navy">
              {tripDateTimeLabel(trip, 'depart')}
              <span className="text-muted"> → </span>
              {tripDateTimeLabel(trip, 'ret')}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-muted">Destination</dt>
            <dd className="flex items-center gap-1 font-semibold text-navy">
              <MapPin className="size-3 shrink-0 text-muted" />
              {dest}
            </dd>
          </div>
        </dl>
        <p className="text-[11px] font-medium text-muted">{countdownLabel(trip)}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Link
            href={`/shuletrip/${trip.id}?studentId=${encodeURIComponent(trip.studentId)}`}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-border px-3 py-2.5 text-[13px] font-bold text-navy hover:bg-slate-50"
          >
            View trip
            <ChevronRight className="size-4" />
          </Link>
          {awaiting ? (
            <Link
              href={`/shuletrip/${trip.id}?studentId=${encodeURIComponent(trip.studentId)}#consent`}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-primary px-3 py-2.5 text-[13px] font-bold text-navy"
            >
              Consent
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
