import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';

const SAMPLE = [
  { severity: 'high', title: 'Capacity mismatch flagged on review', school: 'Sample Secondary', time: '2h ago' },
  { severity: 'medium', title: 'Insurance expiry within 14 days', school: 'Demo Primary', time: 'Yesterday' },
  { severity: 'low', title: 'Guardian consent pending for 3 learners', school: 'Sample Secondary', time: '2 days ago' },
];

export default function IncidentsAlertsPage() {
  return (
    <div>
      <PageHeader
        title="Incidents & alerts"
        description="Unresolved mandatory checks, route exceptions, delays, and escalations · tracked until closed."
      />
      <ul className="space-y-3">
        {SAMPLE.map((a) => (
          <li key={a.title}>
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">{a.severity} priority</p>
                <p className="font-bold text-slate-900">{a.title}</p>
                <p className="text-sm text-slate-600">{a.school}</p>
              </div>
              <span className="text-xs text-slate-500">{a.time}</span>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
