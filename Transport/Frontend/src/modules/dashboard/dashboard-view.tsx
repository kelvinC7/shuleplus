'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Bus, Users, Route, ClipboardList, ArrowRight, Radio } from 'lucide-react';
import { TransportPageLayout } from '@/components/transport-page-layout';
import { BoardingTrendChart, FleetDonutChart } from '@/components/dashboard-charts';
import { StatusBadge } from '@/components/status-badge';
import { transportApi, type DashboardData, type Trip } from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { formatTime } from '@/utils/format';

const QUICK_LINKS = [
  { href: '/route-attendance', label: 'Route Attendance', icon: ClipboardList },
  { href: '/routes', label: 'Routes', icon: Route },
  { href: '/students', label: 'Learners', icon: Users },
  { href: '/buses', label: 'Fleet', icon: Bus },
] as const;

function journeyLabel(direction: string) {
  if (direction === 'TO_SCHOOL') return 'Morning · to school';
  if (direction === 'TO_HOME') return 'Afternoon · to home';
  return direction;
}

function ActiveTripRow({ trip }: { trip: Trip }) {
  const expected = trip.expectedCount || 0;
  const boarded = trip.boardedCount ?? 0;
  const pct = expected > 0 ? Math.min(100, Math.round((boarded / expected) * 100)) : 0;
  const routeLabel = trip.route?.name ?? trip.route?.code ?? 'Unassigned route';
  const driver = trip.driver?.name ?? trip.bus.driver?.name;
  const missing = trip.missingCount ?? 0;

  return (
    <li className="grid gap-4 border-b border-slate-200/90 py-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-2.5 text-lg font-bold text-[#000435]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#000435] text-white shadow-sm">
              <Bus size={18} strokeWidth={2} />
            </span>
            {trip.bus.code}
          </span>
          <span className="text-sm font-semibold text-[#000435]/80">{routeLabel}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {journeyLabel(trip.direction)}
          {driver ? ` · ${driver}` : ''}
          {trip.startedAt ? ` · Started ${formatTime(trip.startedAt)}` : ''}
        </p>
        <div className="mt-4 flex max-w-xl items-center gap-4">
          <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/80">
            <div
              className="h-full rounded-full bg-[#FCB038] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="shrink-0 text-sm font-bold tabular-nums text-[#000435]">
            {boarded}/{expected || 0} boarded
          </span>
        </div>
      </div>
      <div className="flex flex-col items-stretch gap-3 sm:min-w-[200px] sm:items-end">
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <StatusBadge status={trip.status} />
          {missing > 0 ? (
            <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
              {missing} missing
            </span>
          ) : null}
        </div>
        <Link href="/route-attendance" className="btn-primary w-full justify-center py-2.5 text-sm sm:w-auto">
          Open attendance
          <ArrowRight size={16} />
        </Link>
      </div>
    </li>
  );
}

function ActiveTripsPanel({ loading, trips }: { loading: boolean; trips: Trip[] }) {
  const live = trips.length;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-col gap-4 border-b-2 border-[#000435]/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Radio size={22} className="text-[#FCB038]" aria-hidden />
          <h2 className="text-lg font-bold tracking-tight text-[#000435]">Active trips</h2>
          {!loading && live > 0 ? (
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              {live} live
            </span>
          ) : null}
        </div>
        <Link href="/route-attendance" className="btn-secondary shrink-0 py-2.5 text-sm shadow-sm">
          <ClipboardList size={18} />
          Route attendance
        </Link>
      </div>

      {loading ? (
        <ul className="divide-y divide-slate-100" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="py-4">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-3 w-64 animate-pulse rounded bg-slate-50" />
              <div className="mt-3 h-1.5 w-full animate-pulse rounded-full bg-slate-100" />
            </li>
          ))}
        </ul>
      ) : live === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="max-w-md text-sm text-slate-600">No trips in progress right now.</p>
          <Link href="/route-attendance" className="btn-primary">
            <ClipboardList size={18} />
            Open Route attendance
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200">
          {trips.map((t) => (
            <ActiveTripRow key={t.id} trip={t} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function DashboardView() {
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await transportApi.dashboard();
      setData(res.data ?? null);
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
  const trend = data?.charts?.boardingTrend ?? [];
  const fleet = data?.charts?.fleetBreakdown ?? {
    active: 0,
    maintenance: 0,
    inactive: 0,
    other: 0,
  };
  const liveTrips = data?.liveTrips ?? [];

  return (
    <TransportPageLayout
      actions={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#000435] sm:text-2xl">
              {data?.organizationName ?? 'Transport'}
            </h1>
            {(data?.academicYear || data?.term) && (
              <p className="text-xs text-muted">
                {[data?.academicYear, data?.term].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <button type="button" className="btn-secondary text-sm" onClick={() => void load()}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      }
      kpis={[
        {
          label: 'Learners',
          value: loading ? 0 : (k.studentsAssigned ?? 0),
          icon: <Users size={20} />,
        },
        {
          label: 'Routes',
          value: loading ? 0 : (k.activeRoutes ?? 0),
          icon: <Route size={20} />,
        },
        {
          label: 'Buses',
          value: loading ? 0 : (k.activeBuses ?? 0),
          icon: <Bus size={20} />,
        },
        {
          label: 'Events today',
          value: loading ? 0 : (k.scansToday ?? 0),
          icon: <ClipboardList size={20} />,
        },
      ]}
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition hover:border-[#FCB038]/40 hover:shadow-md"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-[#000435]">
                <Icon size={18} className="text-[#FCB038]" />
                {link.label}
              </span>
              <ArrowRight
                size={16}
                className="text-muted transition group-hover:translate-x-0.5 group-hover:text-[#000435]"
              />
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="hr-card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold text-[#000435]">Attendance (7 days)</h2>
          {loading ? (
            <div className="h-44 animate-pulse rounded-xl bg-slate-100" />
          ) : trend.every((d) => d.boarded === 0) ? (
            <p className="py-12 text-center text-sm text-muted">No events yet</p>
          ) : (
            <BoardingTrendChart data={trend} />
          )}
        </section>

        <section className="hr-card p-5">
          <h2 className="mb-3 text-sm font-bold text-[#000435]">Fleet status</h2>
          {loading ? (
            <div className="h-44 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <FleetDonutChart data={fleet} />
          )}
        </section>
      </div>

      <ActiveTripsPanel loading={loading} trips={liveTrips} />
    </TransportPageLayout>
  );
}
