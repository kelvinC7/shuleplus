import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { GOV_ROLE_CATALOG } from '@/government/config/roles';

const PERMISSION_GROUPS = [
  { id: 'dashboard.view', label: 'View command centre & alerts' },
  { id: 'applications.view', label: 'View applications in jurisdiction' },
  { id: 'applications.assign', label: 'Assign reviewers' },
  { id: 'applications.request_corrections', label: 'Request corrections' },
  { id: 'documents.verify', label: 'Verify / reject documents' },
  { id: 'safety.verify', label: 'Complete safety checks' },
  { id: 'checkpoint.inspect', label: 'Checkpoint inspections' },
  { id: 'decisions.approve', label: 'Approve / reject / conditions' },
  { id: 'monitoring.view', label: 'Trip monitoring (read-only)' },
  { id: 'admin.all', label: 'Super Admin configuration' },
];

export default function RolesPermissionsPage() {
  return (
    <div>
      <PageHeader
        title="Roles & permissions"
        description="Default templates per role · Super Admin can extend with explicit toggles; final approval cannot be granted by document access alone."
      />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-line bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Permission</th>
              {GOV_ROLE_CATALOG.slice(0, 6).map((r) => (
                <th key={r.slug} className="px-2 py-3 text-center">
                  {r.label.split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((p) => (
              <tr key={p.id} className="border-b border-line">
                <td className="px-4 py-2 font-medium text-slate-800">{p.label}</td>
                {GOV_ROLE_CATALOG.slice(0, 6).map((r) => {
                  const on = r.defaultPermissions.includes(p.id) || r.defaultPermissions.includes('admin.all');
                  return (
                    <td key={r.slug} className="px-2 py-2 text-center">
                      {on ? '✓' : 'N/A'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
