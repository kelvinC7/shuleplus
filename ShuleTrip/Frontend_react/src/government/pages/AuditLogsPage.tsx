import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { useGovernmentAuth } from '@/contexts/government-auth-context';

export default function AuditLogsPage() {
  const { summary } = useGovernmentAuth();

  return (
    <div>
      <PageHeader title="Decision audit trail" description="Recent approvals, rejections, escalations, and correction requests." />
      <Card>
        <ul className="space-y-3">
          {(summary?.recentDecisions ?? []).map((d) => (
            <li key={`${d.reference}-${d.decidedAt}`} className="border-b border-line pb-2 text-sm last:border-0">
              <span className="font-bold text-navy">{d.reference}</span> · {d.stageLabel}: {String(d.decision).replace(/_/g, ' ')}
              {d.reason ? <p className="text-xs text-slate-500">{d.reason}</p> : null}
            </li>
          ))}
          {!summary?.recentDecisions?.length ? <p className="text-sm text-slate-500">No audit entries yet.</p> : null}
        </ul>
      </Card>
    </div>
  );
}
