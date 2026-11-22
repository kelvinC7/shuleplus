import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';

export default function AuditSecurityPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Audit logs & security" description="Account creation, role changes, permission updates, and high-privilege decisions." />
      <Card>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>Secure invitation links with expiry (IAM)</li>
          <li>MFA recommended for final approval and Super Admin accounts</li>
          <li>Session suspension and periodic access reviews</li>
          <li>Separation of duties: checkpoint officers cannot grant final authorization</li>
          <li>Emergency access procedure with mandatory audit logging</li>
        </ul>
      </Card>
    </div>
  );
}
