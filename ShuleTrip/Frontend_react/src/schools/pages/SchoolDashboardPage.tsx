import { Link } from 'react-router-dom';
import { ArrowRight, Bus, CalendarClock, CheckCircle2, ClipboardList, Clock } from 'lucide-react';
import { useSchoolAuth } from '@/contexts/school-auth-context';
import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatTripDateTime } from '@/schools/utils/trip-display';
import { cn } from '@/shared/cn';

function StatCard({
  label,
  value,
  href,
  icon: Icon,
  iconWrapClass,
  iconClass,
}: {
  label: string;
  value: number;
  href: string;
  icon: typeof Bus;
  iconWrapClass: string;
  iconClass: string;
}) {
  return (
    <Link
      to={href}
      className="group rounded-2xl border border-line/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-line hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-extrabold tracking-tight text-navy">{value}</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{label}</p>
        </div>
        <span className={cn('grid h-11 w-11 place-items-center rounded-xl', iconWrapClass)}>
          <Icon className={cn('h-5 w-5', iconClass)} />
        </span>
      </div>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-navy/70 group-hover:text-navy">
        View details <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

export default function SchoolDashboardPage() {
  const { summary } = useSchoolAuth();
  const k = summary?.kpis;
  const next = summary?.nextAction;
  const upcoming = summary?.upcomingTrips?.slice(0, 5) ?? [];
  const actions = summary?.requiredActions?.slice(0, 4) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`${summary?.organizationName ?? 'Your school'} · ${summary?.academicYear ?? 'Current year'}`}
        action={
          <Link to="/school/trips/new">
            <Button variant="amber">Register new trip</Button>
          </Link>
        }
      />

      {next ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber/30 bg-gradient-to-r from-amber/15 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-900/80">Next step</p>
            <p className="mt-1 font-bold text-navy">{next.message}</p>
            {next.reference ? (
              <p className="text-sm text-slate-600">
                {next.reference} · {next.title}
              </p>
            ) : null}
          </div>
          <Link
            to={next.href}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-navy px-5 text-sm font-bold text-white"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-semibold text-emerald-900">No urgent tasks. You are ready to plan the next trip.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total trips"
          value={k?.totalTrips ?? 0}
          href="/school/trips"
          icon={ClipboardList}
          iconWrapClass="bg-slate-100"
          iconClass="text-slate-700"
        />
        <StatCard
          label="Pending approval"
          value={k?.pendingApproval ?? k?.awaitingReview ?? 0}
          href="/school/trips?status=UNDER_REVIEW"
          icon={Clock}
          iconWrapClass="bg-amber/20"
          iconClass="text-amber-900"
        />
        <StatCard
          label="Approved trips"
          value={k?.approvedTrips ?? 0}
          href="/school/authorizations"
          icon={CheckCircle2}
          iconWrapClass="bg-emerald-100"
          iconClass="text-emerald-700"
        />
        <StatCard
          label="Upcoming departures"
          value={k?.approvedUpcoming ?? 0}
          href="/school/calendar"
          icon={Bus}
          iconWrapClass="bg-blue-100"
          iconClass="text-blue-700"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-navy">Upcoming departures</h2>
            <Link to="/school/calendar" className="text-xs font-bold text-navy hover:underline">
              Calendar
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {upcoming.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{t.title}</p>
                  <p className="text-xs text-slate-500">
                    {t.reference} · {t.destination ?? 'Destination TBD'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-navy">{formatTripDateTime(t.departAt)}</p>
                  <StatusBadge status={t.status} />
                </div>
              </li>
            ))}
            {!upcoming.length ? (
              <li className="flex flex-col items-center py-10 text-center">
                <CalendarClock className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">No upcoming trips yet.</p>
                <Link to="/school/trips/new" className="mt-3 text-sm font-bold text-navy hover:underline">
                  Register your first trip
                </Link>
              </li>
            ) : null}
          </ul>
        </Card>

        {actions.length > 0 ? (
          <Card className="lg:col-span-2">
            <h2 className="text-sm font-bold text-navy">Needs attention</h2>
            <ul className="mt-4 space-y-2">
              {actions.map((a) => (
                <li key={`${a.kind}-${a.tripId}-${a.message}`}>
                  <Link
                    to={a.href}
                    className={cn(
                      'block rounded-xl border px-3 py-2.5 text-sm transition hover:border-navy/20',
                      a.priority === 'high' ? 'border-red-200 bg-red-50/60' : 'border-line bg-slate-50/80'
                    )}
                  >
                    <p className="font-bold text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-600">{a.message}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
