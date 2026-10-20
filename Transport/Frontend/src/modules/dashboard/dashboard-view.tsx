'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Bus,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  MapPin,
  Wrench,
  UserRound,
} from 'lucide-react';
import { TransportPageLayout } from '@/components/transport-page-layout';
import { StatusBadge } from '@/components/status-badge';
import { transportApi, type DashboardData } from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { formatTime } from '@/utils/format';

export function DashboardView() {
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await transportApi.dashboard();
      setData(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load dashboard'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const k = data?.kpis ?? {};

  return (
    <TransportPageLayout
      actions={
        <button type="button" className="btn-secondary" onClick={() => void load()}>
          <RefreshCw size={16} /> Refresh
        </button>
      }
      kpis={[
        { label: 'Total buses', value: k.totalBuses ?? 0, hint: 'Registered fleet', icon: <Bus size={20} /> },
        { label: 'Buses active', value: k.activeBuses ?? 0, hint: 'Ready today', icon: <Bus size={20} /> },
        { label: 'Students assigned', value: k.studentsAssigned ?? 0, hint: 'On transport', icon: <Users size={20} /> },
        { label: 'Currently on buses', value: k.studentsOnBuses ?? 0, hint: 'RFID boarded', icon: <UserCheck size={20} /> },
        { label: 'Not yet boarded', value: k.notYetBoarded ?? 0, hint: 'Expected / missing', icon: <UserX size={20} /> },
        { label: 'Late / missed', value: k.lateOrMissed ?? 0, hint: 'Safety follow-up', icon: <AlertTriangle size={20} /> },
        { label: 'Buses moving', value: k.busesMoving ?? 0, hint: 'Live GPS', icon: <MapPin size={20} /> },
        { label: 'Maintenance', value: k.maintenanceBuses ?? 0, hint: 'Need service', icon: <Wrench size={20} /> },
        { label: 'Active drivers', value: k.activeDrivers ?? 0, hint: 'On duty', icon: <UserRound size={20} /> },
        { label: 'Active attendants', value: k.activeAttendants ?? 0, hint: 'On duty', icon: <UserRound size={20} /> },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="hr-card lg:col-span-2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy">Live transport map</h2>
            <Link href="/operations" className="text-xs font-semibold text-primary">
              Trip control →
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (data?.liveTrips?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted">No live trips yet. Open Live Operations to start boarding.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data!.liveTrips.map((trip) => (
                <div key={trip.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-extrabold text-navy">{trip.bus.code}</p>
                      <p className="text-xs text-muted">{trip.route?.direction ?? trip.route?.name ?? '—'}</p>
                    </div>
                    <StatusBadge status={trip.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-muted">Driver</dt>
                      <dd className="font-semibold text-navy">{trip.driver?.name ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Students</dt>
                      <dd className="font-semibold text-navy">
                        {trip.boardedCount} / {trip.bus.capacity}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Last RFID</dt>
                      <dd className="font-semibold text-navy">
                        {trip.lastRfidName ?? '—'} {trip.lastRfidAt ? formatTime(trip.lastRfidAt) : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Location</dt>
                      <dd className="font-semibold text-navy">{trip.lastLocation ?? '—'}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hr-card space-y-3 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy">Quick actions</h2>
          <Link href="/operations" className="btn-primary block text-center">
            Live trip control
          </Link>
          <Link href="/boarding" className="btn-secondary block text-center">
            RFID boarding desk
          </Link>
          <Link href="/missing" className="btn-secondary block text-center">
            Missing students
          </Link>
          <Link href="/emergencies" className="btn-secondary block text-center">
            Emergency alert
          </Link>
          <p className="pt-2 text-xs text-muted">
            {data?.organizationName} · {data?.academicYear} · {data?.term}
          </p>
        </div>
      </div>

      <div className="hr-card p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy">Recent RFID scans</h2>
        {(data?.recentEvents?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted">No boarding events yet.</p>
        ) : (
          <div className="space-y-2">
            {data!.recentEvents.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <div>
                  <p className="font-semibold text-navy">{r.studentName}</p>
                  <p className="text-xs text-muted">
                    {r.busCode || '—'} · {r.type} · {r.stopName || r.routeName || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={r.type} />
                  <p className="mt-1 text-[11px] text-muted">{formatTime(r.scannedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TransportPageLayout>
  );
}
