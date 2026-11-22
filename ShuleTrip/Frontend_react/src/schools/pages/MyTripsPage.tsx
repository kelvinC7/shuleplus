import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bus, MapPin, Search, Users } from 'lucide-react';
import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card, KpiCard } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form-field';
import { TripStatusFilterBar } from '@/schools/components/TripStatusFilterBar';
import { TripDetailDrawer } from '@/schools/components/TripDetailDrawer';
import { TripRowMenu } from '@/schools/components/TripRowMenu';
import { useSchoolTrips } from '@/schools/hooks/use-school-trips';
import { formatTripDateTime } from '@/schools/utils/trip-display';
import { api } from '@/services/api';

function matchesStatusFilter(status: string, filter: string): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'UNDER_REVIEW') {
    return ['SUBMITTED', 'VALIDATION', 'UNDER_REVIEW', 'RESUBMITTED', 'AWAITING_ADDITIONAL_APPROVAL'].includes(status);
  }
  return status === filter;
}

export default function MyTripsPage() {
  const [params] = useSearchParams();
  const statusFilter = params.get('status') ?? 'ALL';
  const { rows, loading, error, stats, reload } = useSchoolTrips();
  const [q, setQ] = useState('');
  const [drawerTripId, setDrawerTripId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((t) => {
      if (!matchesStatusFilter(t.status, statusFilter)) return false;
      if (!needle) return true;
      return (
        t.title.toLowerCase().includes(needle) ||
        t.reference.toLowerCase().includes(needle) ||
        (t.destination?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [rows, statusFilter, q]);

  async function deleteTrip(tripId: string, reference: string) {
    try {
      await api.delete(`/trips/${tripId}`);
      await reload();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not delete this trip';
      window.alert(msg);
      throw err;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My trips"
        description="Track every application from draft through government approval and trip day."
        action={
          <Link to="/school/trips/new">
            <Button variant="amber">Register new trip</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/school/trips">
          <KpiCard label="All applications" value={stats.total} tone="navy" />
        </Link>
        <Link to="/school/trips?status=DRAFT">
          <KpiCard label="Drafts" value={stats.drafts} tone="blue" />
        </Link>
        <Link to="/school/trips?status=UNDER_REVIEW">
          <KpiCard label="In review" value={stats.inReview} tone="amber" />
        </Link>
        <Link to="/school/trips?status=CORRECTION_REQUESTED">
          <KpiCard label="Corrections required" value={stats.corrections} tone="amber" />
        </Link>
      </div>

      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_minmax(220px,280px)] lg:items-end">
          <Field label="Search trips" className="mb-0 min-w-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Title, reference, destination…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </Field>
          <TripStatusFilterBar className="sm:max-w-none" />
        </div>
      </Card>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="border-b border-line bg-slate-50/80 px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {loading ? 'Loading…' : `${filtered.length} trip${filtered.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {loading ? (
          <div className="px-5 py-16 text-center text-sm text-slate-500">Loading trips…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-navy/5 text-navy">
              <Bus className="h-7 w-7" />
            </div>
            <p className="mt-4 text-lg font-bold text-slate-900">No trips in this view</p>
            <p className="mt-1 max-w-sm text-sm text-slate-600">Try another filter or start a new school journey application.</p>
            <Link to="/school/trips/new" className="mt-6">
              <Button variant="amber">Register new trip</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-line bg-white text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3">Trip</th>
                    <th className="px-5 py-3">Schedule</th>
                    <th className="px-5 py-3">Manifest</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr
                      key={t.id}
                      className="cursor-pointer border-b border-line last:border-0 transition hover:bg-slate-50/60"
                      onClick={() => setDrawerTripId(t.id)}
                    >
                      <td className="px-5 py-4 font-bold text-navy">{t.reference}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{t.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {t.destination ?? 'Destination pending'}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{formatTripDateTime(t.departAt)}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {t._count.participants} learners · {t._count.staff} staff
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end">
                          <TripRowMenu
                            tripId={t.id}
                            tripReference={t.reference}
                            status={t.status}
                            onView={() => setDrawerTripId(t.id)}
                            onDelete={() => deleteTrip(t.id, t.reference)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line lg:hidden">
              {filtered.map((t) => (
                <li key={t.id} className="cursor-pointer p-4" onClick={() => setDrawerTripId(t.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-navy">{t.reference}</p>
                      <p className="mt-1 font-semibold text-slate-900">{t.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatTripDateTime(t.departAt)}</p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-slate-500">
                      {t._count.participants} learners · {t.destination ?? 'TBD'}
                    </span>
                    <TripRowMenu
                      tripId={t.id}
                      tripReference={t.reference}
                      status={t.status}
                      onView={() => setDrawerTripId(t.id)}
                      onDelete={() => deleteTrip(t.id, t.reference)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <TripDetailDrawer tripId={drawerTripId} onClose={() => setDrawerTripId(null)} />
    </div>
  );
}
