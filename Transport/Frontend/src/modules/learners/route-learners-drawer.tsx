'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { Loader2, Pencil, Trash2, X } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { transportApi, type RouteLearnersDetail, type RouteListRow } from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import type { LatLng } from '@/utils/routing';

const RouteMap = dynamic(() => import('@/modules/routes/route-map').then((m) => ({ default: m.RouteMap })), {
  ssr: false,
});

interface RouteLearnersDrawerProps {
  routeRow: RouteListRow | null;
  onClose: () => void;
  onEditAssignments: (routeId: string) => void;
  onRefresh: () => void;
}

function pathFromGeo(geo: RouteLearnersDetail['route']['pathGeoJson']): LatLng[] {
  if (!geo?.coordinates?.length) return [];
  return geo.coordinates.map(([lng, lat]) => ({ lat, lng }));
}

export function RouteLearnersDrawer({ routeRow, onClose, onEditAssignments, onRefresh }: RouteLearnersDrawerProps) {
  const notify = useToast();
  const [mounted, setMounted] = useState(false);
  const [detail, setDetail] = useState<RouteLearnersDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'destinations' | 'all' | 'info'>('destinations');
  const [expandedStop, setExpandedStop] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!routeRow?.id) {
      setDetail(null);
      return;
    }
    setLoading(true);
    void transportApi
      .routeLearnersDetail(routeRow.id)
      .then(({ data }) => setDetail(data.data ?? null))
      .catch((err) => notify.error(getApiErrorMessage(err, 'Could not load route')))
      .finally(() => setLoading(false));
  }, [routeRow?.id, notify]);

  async function unassign(ids: string[]) {
    if (!ids.length) return;
    if (!window.confirm(`Unassign ${ids.length} learner(s) from this route?`)) return;
    try {
      await transportApi.unassignStudents(ids);
      notify.success('Learners unassigned');
      onRefresh();
      if (routeRow?.id) {
        const { data } = await transportApi.routeLearnersDetail(routeRow.id);
        setDetail(data.data ?? null);
      }
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Unassign failed'));
    }
  }

  if (!routeRow || !mounted) return null;

  return createPortal(
    <>
      <button type="button" aria-label="Close drawer" className="fixed inset-0 z-[9998] bg-navy/40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-[9999] flex w-full max-w-[min(100%,720px)] flex-col border-l border-border bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-muted">{routeRow.code}</p>
            <h2 className="truncate text-xl font-bold text-navy">{routeRow.name}</h2>
            <p className="text-sm text-muted">
              {routeRow.startLabel ?? ''} → {routeRow.endLabel ?? ''}
            </p>
            <StatusBadge status={routeRow.status} />
          </div>
          <button type="button" className="rounded-xl border border-border p-2" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        {loading || !detail ? (
          <div className="flex flex-1 items-center justify-center text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 border-b border-border px-5 py-3 text-center text-sm">
              <div className="rounded-xl bg-slate-50 p-2">
                <p className="text-xs text-muted">Learners</p>
                <p className="text-lg font-bold text-navy">{detail.assigned}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2">
                <p className="text-xs text-muted">Stops</p>
                <p className="text-lg font-bold text-navy">{detail.stopCount}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2">
                <p className="text-xs text-muted">Capacity</p>
                <p className="text-lg font-bold text-navy">{detail.capacityPercent ?? ''}%</p>
              </div>
            </div>

            <div className="flex gap-1 border-b border-border px-5 py-2">
              {(['destinations', 'all', 'info'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase ${
                    tab === t ? 'bg-navy text-primary' : 'text-muted hover:bg-slate-100'
                  }`}
                  onClick={() => setTab(t)}
                >
                  {t === 'destinations' ? 'By stop' : t === 'all' ? 'All learners' : 'Route info'}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {tab === 'destinations'
                ? detail.stops.map((block, idx) => (
                    <div key={block.stop.id} className="mb-3 rounded-2xl border border-border p-3">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between text-left"
                        onClick={() => setExpandedStop(expandedStop === block.stop.id ? null : block.stop.id)}
                      >
                        <span>
                          <span className="text-xs font-bold uppercase text-muted">Stop {idx + 1}</span>
                          <span className="block font-semibold text-navy">{block.stop.name}</span>
                          <span className="text-xs text-muted">
                            Pickup {block.pickupCount} · Drop-off {block.dropoffCount}
                          </span>
                        </span>
                      </button>
                      {expandedStop === block.stop.id ? (
                        <ul className="mt-2 space-y-1 border-t border-border pt-2 text-sm">
                          {block.learners.map((l) => (
                            <li key={l.id} className="flex items-center justify-between gap-2">
                              <span>
                                {l.studentName}
                                <span className="block text-xs text-muted">
                                  {l.studentCode} · ↑{l.pickupStopName ?? ''} ↓{l.dropoffStopName ?? ''}
                                </span>
                              </span>
                              <button
                                type="button"
                                className="text-danger"
                                title="Unassign"
                                onClick={() => void unassign([l.id])}
                              >
                                <Trash2 size={14} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))
                : null}

              {tab === 'all' ? (
                <ul className="space-y-2 text-sm">
                  {detail.allLearners.map((l) => (
                    <li key={l.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                      <span>
                        <span className="font-semibold text-navy">{l.studentName}</span>
                        <span className="block text-xs text-muted">
                          {l.studentCode} · {l.className ?? ''}
                        </span>
                      </span>
                      <button type="button" className="text-danger" onClick={() => void unassign([l.id])}>
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {tab === 'info' ? (
                <div className="space-y-4">
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted">Bus</dt>
                      <dd className="font-semibold">
                        {detail.bus ? `${detail.bus.code} · ${detail.bus.plateNumber}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Driver</dt>
                      <dd>{detail.bus?.driverName ?? ''}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Schedule</dt>
                      <dd>
                        {detail.route.departureTime ?? ''} – {detail.route.arrivalTime ?? ''}
                      </dd>
                    </div>
                  </dl>
                  <RouteMap
                    heightClass="h-[200px]"
                    path={pathFromGeo(detail.route.pathGeoJson)}
                    routeColor={detail.route.color ?? '#2563EB'}
                    stops={detail.stops.map((s) => ({
                      id: s.stop.id,
                      name: s.stop.name,
                      sequence: s.stop.sequence,
                      lat: s.stop.latitude,
                      lng: s.stop.longitude,
                      kind: s.stop.kind ?? undefined,
                    }))}
                  />
                </div>
              ) : null}
            </div>

            <footer className="flex flex-wrap gap-2 border-t border-border bg-slate-50 px-5 py-4">
              <button type="button" className="btn-primary" onClick={() => onEditAssignments(routeRow.id)}>
                <Pencil size={16} /> Edit assignments
              </button>
              <button
                type="button"
                className="btn-secondary text-danger"
                onClick={() => void unassign(detail.allLearners.map((l) => l.id))}
              >
                Unassign all on route
              </button>
            </footer>
          </>
        )}
      </aside>
    </>,
    document.body
  );
}
