import { Link } from 'react-router-dom';
import { useSchoolAuth } from '@/contexts/school-auth-context';
import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';

export default function SchoolNotificationsPage() {
  const { summary } = useSchoolAuth();

  const items = [
    ...(summary?.recentDecisions?.slice(0, 5).map((d) => ({
      category: 'Government approval',
      title: `${d.decision.replace(/_/g, ' ')} on ${d.reference}`,
      body: d.reason ?? d.stageLabel,
      href: `/school/trips/${d.tripId}/edit`,
    })) ?? []),
    ...(summary?.requiredActions?.map((a) => ({
      category: a.kind === 'correction' ? 'Correction request' : 'Task',
      title: a.title,
      body: a.message,
      href: a.href,
    })) ?? []),
  ];

  return (
    <div>
      <PageHeader
        title="Notifications & tasks"
        description="Approval updates, corrections, documents, consent, departures, and authorization changes in one place."
      />
      <ul className="space-y-3">
        {items.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600">You are caught up. New items appear when government acts or requirements change.</p>
          </Card>
        ) : (
          items.map((n, i) => (
            <li key={`${n.title}-${i}`}>
              <Link to={n.href}>
                <Card className="transition hover:border-navy/20 hover:shadow-md">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900">{n.category}</p>
                  <p className="mt-1 font-bold text-navy">{n.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                </Card>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
