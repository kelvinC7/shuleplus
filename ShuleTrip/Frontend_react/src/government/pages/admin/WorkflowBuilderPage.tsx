import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { WorkflowTimeline } from '@/government/components/workflow-timeline';

export default function WorkflowBuilderPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <PageHeader
          title="Approval workflow builder"
          description="Configure sequential and parallel stages, deadlines, escalations, and routing by trip category (local vs foreign) and destination."
        />
        <Card className="mt-4 space-y-3">
          {[
            'Completeness review SLA: 2 business days',
            'Education + transport may run in parallel when policy allows',
            'Final authorization blocked until mandatory evidence verified',
            'Checkpoint recommendation does not replace final approval',
          ].map((rule) => (
            <div key={rule} className="rounded-xl border border-line px-4 py-3 text-sm font-medium text-slate-800">
              {rule}
            </div>
          ))}
        </Card>
      </div>
      <Card>
        <h2 className="text-sm font-bold uppercase text-slate-500">Stage preview</h2>
        <div className="mt-4">
          <WorkflowTimeline activeIndex={1} />
        </div>
      </Card>
    </div>
  );
}
