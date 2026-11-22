import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { useGovernmentAuth } from '@/contexts/government-auth-context';

export default function GovernmentReportsPage() {
  const { summary } = useGovernmentAuth();
  const k = summary?.kpis;

  return (
    <div className="space-y-4">
      <PageHeader title="Reports & analytics" description="Export-ready summaries for workload, decisions, and compliance within your jurisdiction." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Approval rate', value: k ? `${Math.round((k.approved / Math.max(1, k.totalApplications)) * 100)}%` : 'N/A' },
          { label: 'Trips pending review', value: k?.awaitingReview ?? 0 },
          { label: 'Safety gaps', value: (k?.missingDocuments ?? 0) + (k?.safetyIssues ?? 0) },
        ].map((item) => (
          <Card key={item.label}>
            <p className="text-xs font-bold uppercase text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-extrabold text-navy">{item.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
