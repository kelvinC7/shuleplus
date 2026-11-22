import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';

export default function PoliciesPage() {
  return (
    <div>
      <PageHeader title="Policies & requirements" description="Learner-transport policy references, age restrictions, and configurable legal rules per jurisdiction." />
      <Card>
        <p className="text-sm text-slate-600">
          Upload policy versions with effective dates. Trip applications reference the active policy version at submission time.
        </p>
      </Card>
    </div>
  );
}
