'use client';

import Link from 'next/link';
import { AlertCircle, CalendarDays, ClipboardCheck, MapPinned, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useParentTrips } from '@/components/shuletrip/shuletrip-shell';
import { TripCard } from '@/components/shuletrip/trip-card';
import { TripStatsRow } from '@/components/shuletrip/trip-stats-row';
import { isUpcomingTrip, tripConsentState } from '@/lib/shuletrip-utils';

export function ShuleTripParentHome() {
  const { parentName, summary, linkedStudents, activeStudentId, setActiveStudent } = useAuth();
  const { data: trips, loading, error, reload } = useParentTrips();

  const parentLabel = parentName?.trim() || 'Guardian';
  const schoolName = summary?.organization?.name ?? 'Your school';
  const list = trips ?? [];
  const awaiting = list.filter((t) => tripConsentState(t) === 'awaiting');
  const upcoming = list.filter((t) => isUpcomingTrip(t));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 pb-10">
      <section className="rounded-2xl border border-border/80 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">ShuleTrip parent</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-[1.65rem]">
          Welcome, {parentLabel.split(' ')[0]}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          {schoolName} · trips linked to your phone on the school manifest. Academics and fees are not part of this
          portal.
        </p>
      </section>

      {linkedStudents.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted" aria-hidden />
            <h2 className="text-sm font-bold text-navy">Learners on your number</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {linkedStudents.map((child) => {
              const active = child.id === activeStudentId;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setActiveStudent(child.id)}
                  className={`rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                    active
                      ? 'border-navy bg-navy text-white'
                      : 'border-border bg-white text-navy hover:border-navy/30'
                  }`}
                >
                  <span className="block font-semibold">{child.fullName}</span>
                  <span className={`block text-xs ${active ? 'text-white/75' : 'text-muted'}`}>
                    {[child.className, child.shuleCode].filter(Boolean).join(' · ') || 'Manifest learner'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          {error}
        </div>
      ) : (
        <TripStatsRow trips={list} />
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-navy">Your trips</h2>
            <p className="text-sm text-muted">From submitted ShuleTrip applications at {schoolName}.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-navy hover:bg-slate-50"
            >
              <RefreshCw className="size-3.5" />
              Refresh
            </button>
            <Link
              href="/shuletrip"
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-primary"
            >
              <MapPinned className="size-3.5" />
              Open ShuleTrip
            </Link>
          </div>
        </div>

        {awaiting.length > 0 ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
            <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-amber-800" />
            <p className="text-sm text-navy">
              <span className="font-bold">{awaiting.length}</span> trip(s) need consent before the school can proceed.
            </p>
          </div>
        ) : null}

        {loading ? (
          <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
            <CalendarDays className="mx-auto size-10 text-muted/50" />
            <p className="mt-3 text-base font-bold text-navy">No trips synced yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              After the school <strong>submits</strong> the trip in ShuleTrip, it appears here if your login phone
              matches the guardian number on the manifest. Ask the school to submit or resubmit the trip, then tap
              Refresh.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(awaiting.length ? awaiting : upcoming.length ? upcoming : list).slice(0, 4).map((trip) => (
              <TripCard key={`${trip.id}:${trip.studentId}`} trip={trip} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
