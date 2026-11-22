import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardList, Clock, ShieldCheck } from 'lucide-react';
import { useGovernmentAuth } from '@/contexts/government-auth-context';
import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApprovalPipeline } from '@/government/components/approval-pipeline';
import { RoleDashboardCards } from '@/government/components/role-dashboard-cards';
import { governmentAccountSubtitle, primaryWorkspaceForUser } from '@/government/utils/persona-workspace';
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
  icon: typeof ClipboardList;
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
        Open <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

export default function GovernmentOverviewPage() {
  const { summary, user } = useGovernmentAuth();
  const k = summary?.kpis;
  const workspace = primaryWorkspaceForUser(user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={governmentAccountSubtitle(user)}
        action={
          <Link to={workspace.href}>
            <Button variant="amber">{workspace.label}</Button>
          </Link>
        }
      />

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Your workspaces</p>
        <RoleDashboardCards />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awaiting action"
          value={k?.awaitingReview ?? 0}
          href={workspace.href}
          icon={ClipboardList}
          iconWrapClass="bg-amber/20"
          iconClass="text-amber-900"
        />
        <StatCard
          label="Corrections"
          value={k?.correctionsRequired ?? 0}
          href="/government/applications"
          icon={Clock}
          iconWrapClass="bg-slate-100"
          iconClass="text-slate-700"
        />
        <StatCard
          label="Authorized"
          value={k?.approved ?? 0}
          href="/government/approved"
          icon={ShieldCheck}
          iconWrapClass="bg-emerald-100"
          iconClass="text-emerald-800"
        />
        <StatCard
          label="In progress"
          value={k?.activeTrips ?? 0}
          href="/government/monitoring"
          icon={CheckCircle2}
          iconWrapClass="bg-navy/10"
          iconClass="text-navy"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-navy">Pipeline</h2>
            <Link to="/government/applications" className="text-xs font-bold text-navy hover:underline">
              Applications
            </Link>
          </div>
          <div className="mt-4">
            {summary?.pipeline?.length ? (
              <ApprovalPipeline stages={summary.pipeline} />
            ) : (
              <p className="text-sm text-slate-500">No applications yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-bold text-navy">Recent decisions</h2>
          <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto">
            {(summary?.recentDecisions ?? []).slice(0, 8).map((d) => (
              <li key={`${d.reference}-${d.decidedAt}`} className="border-b border-line pb-3 last:border-0">
                <p className="truncate text-sm font-semibold text-slate-900">{d.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {d.reference} · {String(d.decision).replace(/_/g, ' ')}
                </p>
              </li>
            ))}
            {!summary?.recentDecisions?.length ? (
              <li className="text-sm text-slate-500">No decisions yet.</li>
            ) : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}
