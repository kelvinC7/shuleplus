'use client';

import { MapPin } from 'lucide-react';
import { TransportPortalShell } from '@/components/transport/transport-portal-shell';
import { useTransportLocale } from '@/contexts/transport-locale-context';

export default function TransportRoutePage() {
  const { t } = useTransportLocale();
  return (
    <TransportPortalShell title={t('route.title')} description={t('route.description')}>
      {({ portal }) => (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="hr-card space-y-3 p-5">
            <p className="font-semibold text-navy">Morning pickup</p>
            <p className="text-lg font-bold text-navy">{portal.assignment.pickup?.name ?? 'Not assigned'}</p>
            {portal.assignment.pickup?.landmark ? (
              <p className="text-sm text-muted">{portal.assignment.pickup.landmark}</p>
            ) : null}
            {portal.assignment.pickup?.address ? (
              <p className="text-sm">{portal.assignment.pickup.address}</p>
            ) : null}
            <p className="text-xs text-muted">Planned: {portal.assignment.departureTime ?? portal.assignment.pickup?.plannedTime ?? 'See school schedule'}</p>
          </div>
          <div className="hr-card space-y-3 p-5">
            <p className="font-semibold text-navy">Afternoon drop-off / school</p>
            <p className="text-lg font-bold text-navy">
              {portal.assignment.dropoff?.name ?? portal.assignment.schoolName ?? 'School'}
            </p>
            {portal.assignment.dropoff?.landmark ? (
              <p className="text-sm text-muted">{portal.assignment.dropoff.landmark}</p>
            ) : null}
            <p className="text-xs text-muted">Planned arrival: {portal.assignment.arrivalTime ?? 'See school schedule'}</p>
          </div>
          <div className="hr-card lg:col-span-2 p-5">
            <p className="mb-3 font-semibold text-navy">Route stops</p>
            <ol className="space-y-2">
              {(portal.route?.stops ?? []).map((stop) => (
                <li
                  key={stop.id}
                  className={`flex gap-3 rounded-xl border px-3 py-2.5 ${stop.isChildStop ? 'border-primary/40 bg-primary/5' : 'border-slate-100'}`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-primary">
                    {stop.sequence}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-navy">
                      {stop.name}
                      {stop.isChildStop ? <span className="ml-2 text-xs font-bold text-primary">Your child</span> : null}
                    </p>
                    <p className="text-xs text-muted">
                      {[stop.landmark, stop.plannedTime ? `Planned ${stop.plannedTime}` : null].filter(Boolean).join(' · ')}
                    </p>
                    {stop.isChildStop && stop.address ? (
                      <p className="mt-1 text-xs">{stop.address}</p>
                    ) : null}
                  </div>
                  {stop.landmark ? <MapPin className="size-4 shrink-0 text-muted" aria-hidden /> : null}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[11px] text-muted">
              Other families&apos; exact home addresses are not shown. Only your child&apos;s approved stop shows full detail.
            </p>
          </div>
        </div>
      )}
    </TransportPortalShell>
  );
}
