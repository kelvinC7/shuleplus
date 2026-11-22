import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SuperAdminOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin · system overview"
        description="Workflow health, government user onboarding, permission boundaries, and security audit entry points."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          { title: 'Government users', desc: 'Create officials, assign roles, jurisdiction, and invitation status.', href: '/government/admin/users' },
          { title: 'Roles & permissions', desc: 'Permission matrix for dashboards, documents, safety, and decisions.', href: '/government/admin/roles' },
          { title: 'Approval workflow', desc: 'Stages, parallel review, routing by trip category and destination.', href: '/government/admin/workflow' },
          { title: 'Authorities', desc: 'Configure authorities and geographic boundaries.', href: '/government/admin/authorities' },
          { title: 'Audit & security', desc: 'Account changes, decisions, and separation of duties.', href: '/government/admin/security' },
        ].map((item) => (
          <Card key={item.href}>
            <h3 className="font-bold text-navy">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
            <Link to={item.href} className="mt-4 inline-block">
              <Button variant="outline">Open</Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
