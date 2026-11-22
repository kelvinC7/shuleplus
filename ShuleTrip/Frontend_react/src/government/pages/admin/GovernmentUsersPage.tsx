import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/shared/layouts/portal-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { govApi } from '@/services/api';
import { AddGovernmentUserWizard, type GovOfficial } from '@/government/components/add-government-user-wizard';
import { GOV_ROLE_CATALOG } from '@/government/config/roles';
import { cn } from '@/shared/cn';

export default function GovernmentUsersPage() {
  const [rows, setRows] = useState<GovOfficial[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await govApi.get<{ data: GovOfficial[] }>('/government/admin/officials');
      setRows(data.data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter(
    (r) =>
      r.fullName.toLowerCase().includes(query.toLowerCase()) ||
      r.email.toLowerCase().includes(query.toLowerCase())
  );

  async function setStatus(id: string, status: GovOfficial['status']) {
    await govApi.patch(`/government/admin/officials/${id}`, { status });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Government users"
        description="Searchable register of officials · pair each record with a Shule+ IAM account for login."
        action={
          <Button variant="amber" onClick={() => setWizardOpen(true)}>
            Add government user
          </Button>
        }
      />

      <Card className="mb-4">
        <input
          className="w-full rounded-xl border border-line px-4 py-2.5 text-sm"
          placeholder="Search name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Official</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Jurisdiction</th>
              <th className="px-4 py-3">Final approve</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Cases</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  No officials yet · add your first government user.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const roleLabel = GOV_ROLE_CATALOG.find((c) => c.slug === r.roleSlug)?.label ?? r.roleSlug;
                return (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{r.fullName}</p>
                      <p className="text-xs text-slate-500">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">{roleLabel}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {r.jurisdictionScope}
                      {r.districts.length ? ` · ${r.districts.join(', ')}` : ''}
                    </td>
                    <td className="px-4 py-3">{r.canFinalApprove ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-bold capitalize',
                          r.status === 'active' && 'bg-emerald-50 text-emerald-800',
                          r.status === 'invited' && 'bg-blue-50 text-blue-800',
                          r.status === 'suspended' && 'bg-red-50 text-red-800'
                        )}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.assignedApplicationCount}</td>
                    <td className="px-4 py-3">
                      {r.status !== 'active' ? (
                        <button type="button" className="text-xs font-bold text-navy hover:underline" onClick={() => setStatus(r.id, 'active')}>
                          Activate
                        </button>
                      ) : (
                        <button type="button" className="text-xs font-bold text-red-700 hover:underline" onClick={() => setStatus(r.id, 'suspended')}>
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      <AddGovernmentUserWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={load} />
    </div>
  );
}
