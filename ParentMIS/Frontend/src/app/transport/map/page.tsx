'use client';

import dynamic from 'next/dynamic';
import { TransportPortalShell } from '@/components/transport/transport-portal-shell';
import { useTransportLocale } from '@/contexts/transport-locale-context';

const TransportRouteMap = dynamic(
  () => import('@/components/transport/transport-route-map').then((m) => ({ default: m.TransportRouteMap })),
  { ssr: false, loading: () => <div className="h-[min(420px,55vh)] animate-pulse rounded-2xl bg-slate-100" /> }
);

export default function TransportMapPage() {
  const { t } = useTransportLocale();
  return (
    <TransportPortalShell title={t('nav.map')}>
      {({ portal }) => (
        <div className="space-y-4">
          {portal.liveTracking ? (
            <div className="hr-card p-5">
              <p className="font-semibold text-navy">{t('map.busPosition')}</p>
              <p className="mt-1 text-sm text-muted">
                {portal.liveTracking.isLive && !portal.liveTracking.stale ? t('map.liveHint') : t('map.staleHint')}
              </p>
              <a
                className="mt-3 inline-block text-sm font-semibold text-sky-700"
                href={`https://www.openstreetmap.org/?mlat=${portal.liveTracking.latitude}&mlon=${portal.liveTracking.longitude}#map=16/${portal.liveTracking.latitude}/${portal.liveTracking.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                {t('map.openOsm')}
              </a>
            </div>
          ) : (
            <div className="hr-card p-5 text-sm text-muted">{t('map.noGps')}</div>
          )}
          <TransportRouteMap
            stops={portal.route?.stops ?? []}
            routeColor={portal.route?.color}
            liveTracking={portal.liveTracking}
          />
          <div className="hr-card p-5">
            <p className="font-semibold text-navy">{t('map.plannedRoute')}</p>
            <p className="mt-1 text-sm text-muted">{portal.route?.name}</p>
            <ul className="mt-4 space-y-2">
              {(portal.route?.stops ?? []).map((s) => (
                <li key={s.id} className={`text-sm ${s.isChildStop ? 'font-semibold text-navy' : 'text-muted'}`}>
                  {s.sequence}. {s.name}
                  {s.landmark ? ` · ${s.landmark}` : ''}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </TransportPortalShell>
  );
}
