import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';

export default function SchoolsRegistryPage() {
  return (
    <div>
      <PageHeader title="Schools registry" description="Schools submitting trip applications within your authorized jurisdiction." />
      <Card>
        <p className="text-sm text-slate-600">
          Tenant schools sync from ShuleTrip provisioning. Filter by district and sector from the command centre jurisdiction
          settings in IAM user claims.
        </p>
      </Card>
    </div>
  );
}
