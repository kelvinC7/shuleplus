import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bus,
  CheckCircle2,
  Circle,
  ClipboardList,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSchoolTrips } from '@/schools/hooks/use-school-trips';
import { formatTripDateTime, isOperationalTrip } from '@/schools/utils/trip-display';
import { cn } from '@/shared/cn';

type OpsTab = 'upcoming' | 'today' | 'in_progress';

const CHECKLIST = [
  { id: 'manifest', label: 'Final manifest confirmed with homeroom teachers', icon: Users },
  { id: 'transport', label: 'Driver and vehicle details verified on site', icon: Bus },
  { id: 'consent', label: 'Guardian consent records available offline', icon: ShieldCheck },
  { id: 'emergency', label: 'Emergency contacts shared with trip leader', icon: Phone },
  { id: 'roll', label: 'Departure roll call completed', icon: ClipboardList },
];

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export default function TripOperationsPage() {
  const { rows, loading } = useSchoolTrips();
  const [tab, setTab] = useState<OpsTab>('today');
  const [checked, setChecked] = useState<Record<string, Record<string, boolean>>>({});

  const operational = useMemo(() => rows.filter((t) => isOperationalTrip(t.status)), [rows]);

  const filtered = useMemo(() => {
    const now = Date.now();
    if (tab === 'in_progress') return operational.filter((t) => t.status === 'TRIP_IN_PROGRESS');
    if (tab === 'today') {
      return operational.filter((t) => isToday(t.departAt) || t.status === 'TRIP_IN_PROGRESS');
    }
    return operational.filter((t) => {
      if (!t.departAt) return t.status === 'APPROVED';
      return new Date(t.departAt).getTime() > now && t.status === 'APPROVED';
    });
  }, [operational, tab]);

  function toggleCheck(tripId: string, itemId: string) {
    setChecked((prev) => ({
      ...prev,
      [tripId]: { ...prev[tripId], [itemId]: !prev[tripId]?.[itemId] },
    }));
  }

  function progressFor(tripId: string) {
    const tripChecks = checked[tripId] ?? {};
    const done = CHECKLIST.filter((c) => tripChecks[c.id]).length;
    return Math.round((done / CHECKLIST.length) * 100);
  }

  const tabs: Array<{ id: OpsTab; label: string; count: number }> = [
    {
      id: 'today',
      label: 'Today',
      count: operational.filter((t) => isToday(t.departAt) || t.status === 'TRIP_IN_PROGRESS').length,
    },
    {
      id: 'upcoming',
      label: 'Upcoming',
      count: operational.filter((t) => t.status === 'APPROVED' && t.departAt && new Date(t.departAt).getTime() > Date.now()).length,
    },
    { id: 'in_progress', label: 'In progress', count: operational.filter((t) => t.status === 'TRIP_IN_PROGRESS').length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trip operations"
        description="Day-of checklist for approved journeys · supervision, transport, and learner safety on departure."
        action={
          <Link to="/school/calendar">
            <Button variant="outline">Open calendar</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-2xl border p-4 text-left transition',
              tab === t.id ? 'border-navy bg-navy text-white shadow-lg shadow-navy/15' : 'border-line bg-white hover:border-navy/20'
            )}
          >
            <p className={cn('text-xs font-bold uppercase tracking-wide', tab === t.id ? 'text-white/70' : 'text-slate-500')}>
              {t.label}
            </p>
            <p className="mt-2 text-3xl font-extrabold">{t.count}</p>
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="py-16 text-center text-sm text-slate-500">Loading operational trips…</Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="mt-4 text-lg font-bold text-slate-900">No trips in this queue</p>
          <p className="mt-1 max-w-md text-sm text-slate-600">
            Approved departures appear here. Submit applications from My trips and track approvals on the dashboard.
          </p>
          <Link to="/school/trips" className="mt-6">
            <Button variant="amber">View my trips</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-5">
          {filtered.map((t) => {
            const pct = progressFor(t.id);
            return (
              <Card key={t.id} className="overflow-hidden p-0">
                <div className="flex flex-col gap-4 border-b border-line bg-gradient-to-r from-navy to-navy-muted px-6 py-5 text-white md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-white/60">{t.reference}</p>
                    <h2 className="mt-1 text-xl font-extrabold">{t.title}</h2>
                    <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {t.destination ?? 'Destination TBD'}
                      </span>
                      <span>{formatTripDateTime(t.departAt)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {t._count.participants} learners · {t._count.staff} staff
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                      {t.status.replace(/_/g, ' ')}
                    </span>
                    <div className="rounded-xl bg-white/10 px-4 py-2 text-center">
                      <p className="text-[10px] font-bold uppercase text-white/60">Checklist</p>
                      <p className="text-2xl font-extrabold">{pct}%</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-[1fr_280px]">
                  <ul className="space-y-2">
                    {CHECKLIST.map((item) => {
                      const on = checked[t.id]?.[item.id];
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => toggleCheck(t.id, item.id)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition',
                              on ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-line bg-white hover:bg-slate-50'
                            )}
                          >
                            {on ? (
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                            ) : (
                              <Circle className="h-5 w-5 shrink-0 text-slate-300" />
                            )}
                            <Icon className="h-4 w-4 shrink-0 opacity-60" />
                            {item.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="rounded-2xl border border-line bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Quick actions</p>
                    <div className="mt-3 flex flex-col gap-2">
                      <Link to={`/school/trips/${t.id}/edit`}>
                        <Button variant="primary" type="button" className="w-full">
                          Open application
                        </Button>
                      </Link>
                      <Link to="/school/participants">
                        <Button variant="outline" type="button" className="w-full">
                          View manifest
                        </Button>
                      </Link>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                        Checklist progress is saved in this browser session. Official trip-day logging will sync to the server in a later release.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
