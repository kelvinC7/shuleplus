'use client';

import Link from 'next/link';
import { Bell, Bus, Clock, MapPin, ChevronRight } from 'lucide-react';
import { TransportPortalShell } from '@/components/transport/transport-portal-shell';

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function TransportOverviewPage() {
  return (
    <TransportPortalShell title="Transport overview">
      {({ data, portal }) => (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="hr-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Route</p>
              <p className="mt-1 font-bold text-navy">{portal.assignment.routeName || 'Not set'}</p>
              <p className="text-xs text-muted">{portal.assignment.routeCode}</p>
            </div>
            <div className="hr-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Bus</p>
              <p className="mt-1 flex items-center gap-1 font-bold text-navy">
                <Bus className="size-4 text-primary" />
                {portal.bus ? `${portal.bus.code}` : 'Pending'}
              </p>
              <p className="text-xs text-muted">{portal.bus?.plateNumber}</p>
            </div>
            <div className="hr-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Pickup stop</p>
              <p className="mt-1 font-bold text-navy">{portal.assignment.pickup?.name ?? 'Not set'}</p>
              <p className="text-xs text-muted">{portal.assignment.pickup?.landmark ?? portal.assignment.schoolName}</p>
            </div>
            <div className="hr-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Notifications</p>
              <p className="mt-1 flex items-center gap-1 font-bold text-navy">
                <Bell className="size-4 text-primary" />
                {data.unreadTransportNotifications} unread
              </p>
              <Link href="/transport/notifications" className="text-xs font-semibold text-sky-700">
                Transport alerts
              </Link>
            </div>
          </div>

          <div className="hr-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-navy">Today&apos;s journey</p>
                <p className="mt-1 text-xs text-muted">
                  Status: <span className="font-semibold text-navy">{portal.todayJourney.status}</span>
                  {portal.todayJourney.startedAt ? ` · Started ${fmtTime(portal.todayJourney.startedAt)}` : ''}
                </p>
              </div>
              <Link href="/transport/attendance" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700">
                Full timeline <ChevronRight className="size-4" />
              </Link>
            </div>
            {portal.todayJourney.note ? (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">{portal.todayJourney.note}</p>
            ) : null}
            <ul className="mt-4 space-y-2">
              {portal.todayTimeline.length === 0 ? (
                <li className="text-sm text-muted">No events recorded yet today.</li>
              ) : (
                portal.todayTimeline.map((ev) => (
                  <li key={ev.id} className="flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-2">
                    <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-navy">{ev.label}</p>
                      <p className="text-xs text-muted">
                        {fmtTime(ev.scannedAt)} · {ev.method} · {ev.status}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ul>
            {(portal.todayJourney.pendingMorning.length > 0 || portal.todayJourney.pendingAfternoon.length > 0) && (
              <p className="mt-3 text-xs text-muted">
                Expected next:{' '}
                {[...portal.todayJourney.pendingMorning, ...portal.todayJourney.pendingAfternoon]
                  .map((t) => t.replace(/_/g, ' '))
                  .join(', ')}
              </p>
            )}
          </div>

          {portal.liveTracking ? (
            <div className="hr-card p-5">
              <p className="font-semibold text-navy">Bus location</p>
              <p className="mt-1 text-xs text-muted">
                {portal.liveTracking.isLive && !portal.liveTracking.stale
                  ? 'Live GPS when connection allows'
                  : 'Last known position (may be delayed in low connectivity areas)'}
              </p>
              <p className="mt-2 text-sm">
                <MapPin className="mr-1 inline size-3.5" />
                Updated {fmtTime(portal.liveTracking.recordedAt)}
              </p>
              <Link href="/transport/map" className="mt-2 inline-block text-sm font-semibold text-sky-700">
                Open route map
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </TransportPortalShell>
  );
}
