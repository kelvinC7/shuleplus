'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, RefreshCw, Siren, Users } from 'lucide-react';
import { TransportPageLayout } from '@/components/transport-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { transportApi, type LiveOpsData, type Trip } from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { formatTime } from '@/utils/format';

function TripCard({
  trip,
  onStart,
  onComplete,
  onReconcile,
}: {
  trip: Trip;
  onStart: (id: string, force?: boolean) => void;
  onComplete: (id: string) => void;
  onReconcile: (tripId: string, studentCode: string, mark: string) => void;
}) {
  const missing = trip.passengers?.filter((p) => p.mark === 'MISSING' || p.mark === 'EXPECTED') ?? [];
  return (
    <div className="hr-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-navy px-5 py-3 text-white">
        <div>
          <p className="text-lg font-extrabold tracking-tight">{trip.bus.code}</p>
          <p className="text-xs text-white/60">{trip.route?.direction ?? trip.route?.name ?? '—'}</p>
        </div>
        <StatusBadge status={trip.status} />
      </div>
      <div className="space-y-3 p-5">
        <p className="text-2xl font-extrabold text-navy">
          {trip.boardedCount} / {trip.bus.capacity}{' '}
          <span className="text-sm font-semibold text-muted">students</span>
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-800">
            {trip.boardedCount} boarded
          </div>
          <div className="rounded-xl bg-rose-50 px-3 py-2 text-rose-800">{trip.missingCount} missing</div>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted">Driver</dt>
            <dd className="font-semibold text-navy">{trip.driver?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Attendant</dt>
            <dd className="font-semibold text-navy">{trip.attendant?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Last RFID</dt>
            <dd className="font-semibold text-navy">
              {trip.lastRfidName ?? '—'} {trip.lastRfidAt ? `— ${formatTime(trip.lastRfidAt)}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Location / ETA</dt>
            <dd className="font-semibold text-navy">
              {trip.lastLocation ?? '—'} {trip.etaAt ? `· ${formatTime(trip.etaAt)}` : ''}
            </dd>
          </div>
        </dl>
        {missing.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-bold">⚠ {missing.length} students not boarded</p>
            <ul className="mt-1 list-disc pl-4 text-xs">
              {missing.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span>{p.studentName}</span>
                  <span className="flex gap-1">
                    <button type="button" className="underline" onClick={() => onReconcile(trip.id, p.studentCode, 'ABSENT')}>
                      Absent
                    </button>
                    <button type="button" className="underline" onClick={() => onReconcile(trip.id, p.studentCode, 'MANUAL')}>
                      Manual
                    </button>
                    <button
                      type="button"
                      className="underline"
                      onClick={() => onReconcile(trip.id, p.studentCode, 'CHANGED_BUS')}
                    >
                      Changed bus
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Link href="/boarding" className="btn-secondary text-xs">
            View students
          </Link>
          <Link href="/dashboard" className="btn-secondary text-xs">
            View map
          </Link>
          {trip.status !== 'LIVE' && trip.status !== 'COMPLETED' ? (
            <>
              <button type="button" className="btn-primary text-xs" onClick={() => onStart(trip.id, false)}>
                Start trip
              </button>
              {missing.length > 0 ? (
                <button type="button" className="btn-secondary text-xs" onClick={() => onStart(trip.id, true)}>
                  Force start
                </button>
              ) : null}
            </>
          ) : null}
          {trip.status === 'LIVE' ? (
            <button type="button" className="btn-secondary text-xs" onClick={() => onComplete(trip.id)}>
              Complete trip
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function OperationsView() {
  const toast = useToast();
  const [data, setData] = useState<LiveOpsData | null>(null);

  const load = useCallback(async () => {
    try {
      const { data: res } = await transportApi.liveOperations();
      setData(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load live operations'));
    }
  }, [toast]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  async function start(id: string, force?: boolean) {
    try {
      await transportApi.startTrip(id, force);
      toast.success(force ? 'Trip started (forced)' : 'Trip started');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Cannot start trip'));
      await load();
    }
  }

  async function complete(id: string) {
    try {
      await transportApi.completeTrip(id);
      toast.success('Trip completed');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Complete failed'));
    }
  }

  async function reconcile(tripId: string, studentCode: string, mark: string) {
    try {
      await transportApi.reconcile(tripId, studentCode, mark);
      toast.success(`Marked ${mark.toLowerCase()}`);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Reconcile failed'));
    }
  }

  const trips = data?.todayTrips?.filter((t) => t.status === 'BOARDING' || t.status === 'LIVE') ?? data?.liveTrips ?? [];

  return (
    <TransportPageLayout
      actions={
        <button type="button" className="btn-secondary" onClick={() => void load()}>
          <RefreshCw size={16} /> Refresh
        </button>
      }
    >
      <div className="mb-2 flex items-center gap-2 text-navy">
        <MapPin size={18} className="text-primary" />
        <h2 className="text-lg font-bold">Live Trip Control Center</h2>
      </div>
      <p className="mb-4 text-sm text-muted">
        Reconcile expected vs RFID boarded students before the driver is allowed to start the trip.
      </p>

      {trips.length === 0 ? (
        <div className="hr-card p-8 text-center text-sm text-muted">
          No boarding or live trips. Open a bus from Trips to prepare one, or tap an RFID card on the boarding desk.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onStart={(id, force) => void start(id, force)}
              onComplete={(id) => void complete(id)}
              onReconcile={(tripId, code, mark) => void reconcile(tripId, code, mark)}
            />
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="hr-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-navy">
            <Users size={16} /> Missing students
          </h3>
          {(data?.missingStudents?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted">All expected students are accounted for.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data!.missingStudents.slice(0, 10).map((s) => (
                <li key={s.id} className="flex justify-between">
                  <span className="font-semibold text-navy">{s.studentName}</span>
                  <StatusBadge status={s.liveState} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="hr-card p-5">
          <h3 className="mb-3 text-sm font-bold uppercase text-navy">Safety alerts</h3>
          {(data?.alerts?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted">No open alerts.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data!.alerts.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <p className="font-semibold text-navy">{a.title}</p>
                  <p className="text-xs text-muted">{a.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="hr-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-navy">
            <Siren size={16} /> Emergencies
          </h3>
          {(data?.emergencies?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted">No open emergencies.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data!.emergencies.map((e) => (
                <li key={e.id} className="rounded-xl bg-rose-50 px-3 py-2 text-rose-900">
                  {e.bus?.code} · {e.type} · {e.location}
                </li>
              ))}
            </ul>
          )}
          <Link href="/emergencies" className="mt-3 inline-block text-xs font-semibold text-primary">
            Open emergency desk →
          </Link>
        </div>
      </div>
    </TransportPageLayout>
  );
}
