import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { APPROVAL_TIMELINE_STAGES } from '@/government/config/workflow-stages';

const AUTHORITIES = [
  { name: 'Local / district education authority', scope: 'Local & in-country trips', routes: 'education' },
  { name: 'Ministry of Education & Sports (configurable)', scope: 'Foreign / national category trips', routes: 'education, final' },
  { name: 'Ministry of Works & Transport (configurable)', scope: 'Transport evidence & hired PSV', routes: 'transport' },
  { name: 'Traffic / checkpoint inspectorate', scope: 'Trip-day checklist only', routes: 'checkpoint' },
];

export default function AuthoritiesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Authorities & jurisdictions"
        description="Authority names and legal rules must match your deployment jurisdiction · configure routing here, not hard-coded in application logic."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {AUTHORITIES.map((a) => (
          <Card key={a.name}>
            <h3 className="font-bold text-navy">{a.name}</h3>
            <p className="mt-2 text-sm text-slate-600">{a.scope}</p>
            <p className="mt-2 text-xs font-bold uppercase text-slate-500">Workflow stages: {a.routes}</p>
          </Card>
        ))}
      </div>
      <Card>
        <h3 className="text-sm font-bold uppercase text-slate-500">Linked workflow stages</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {APPROVAL_TIMELINE_STAGES.map((s) => (
            <li key={s.key}>{s.label}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
