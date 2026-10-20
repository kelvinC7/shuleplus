'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BackButton } from '@/components/root-admin/back-button';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
import { type Organization } from '@/lib/organizations';
import { type OrganizationModuleAssignment } from '@/lib/modules';
import { useToast } from '@/shared/notifications';

export default function ModuleAssignmentPage() {
  const platform = usePlatformAdmin();
  const toast = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [rows, setRows] = useState<OrganizationModuleAssignment[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`${platform.apiPrefix}/organizations`).then((res) => setOrganizations(res.data.data));
  }, [platform.apiPrefix]);

  useEffect(() => {
    if (!organizationId) {
      setRows([]);
      setSelected([]);
      return;
    }
    setLoading(true);
    api
      .get(`${platform.apiPrefix}/module-assignments/organizations/${organizationId}`)
      .then((res) => {
        const data = res.data.data;
        setRows(data.modules);
        // Pre-select ACTIVE and PENDING so locked onboard modules can be activated with Save
        setSelected(
          data.modules
            .filter(
              (r: OrganizationModuleAssignment) =>
                r.assignment?.status === 'ACTIVE' || r.assignment?.status === 'PENDING'
            )
            .map((r: OrganizationModuleAssignment) => r.module.id)
        );
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [organizationId, platform.apiPrefix]);

  async function saveAssignments() {
    if (!organizationId) return;
    setSaving(true);
    try {
      const assignRes = await api.put(
        `${platform.apiPrefix}/module-assignments/organizations/${organizationId}`,
        { moduleIds: selected }
      );
      const provisioning = assignRes.data?.data?.provisioning as
        | { pending?: number; provisioned?: number; message?: string }
        | undefined;
      if (provisioning?.pending && provisioning.pending > 0) {
        toast.warning(
          `${provisioning.message ?? 'Some tenants still need setup.'} Open Super Admin → Provisioning.`,
          'Modules assigned'
        );
      } else {
        toast.success(
          assignRes.data?.message ??
            'Modules assigned and tenants provisioned (tenantProvisioned = true).',
          'Modules assigned'
        );
      }
      const res = await api.get(`${platform.apiPrefix}/module-assignments/organizations/${organizationId}`);
      setRows(res.data.data.modules);
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to assign modules.',
        'Assignment failed'
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleModule(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const org = organizations.find((o) => o.id === organizationId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackButton href={platform.dashboardPath} />
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-navy">Organization Module Assignment</h1>
        <p className="text-sm text-muted">Choose which modules each organization can use.</p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-poppins-semibold uppercase text-muted">Organization</span>
          <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} className="input w-full">
            <option value="">Select organization</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.slug})
              </option>
            ))}
          </select>
        </label>
      </div>

      {organizationId && (
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted">Loading modules…</div>
          ) : (
            <>
              <div className="border-b border-border bg-navy/[0.02] px-5 py-4">
                <h2 className="font-poppins-semibold text-navy">{org?.name}</h2>
                <p className="text-xs text-muted">Check modules to assign. Dependencies must be selected together.</p>
              </div>
              <div className="divide-y divide-border/60">
                {rows.map(({ module, assignment, dependencies }) => (
                  <label key={module.id} className="flex cursor-pointer items-start gap-4 px-5 py-4 hover:bg-navy/[0.02]">
                    <input
                      type="checkbox"
                      checked={selected.includes(module.id)}
                      onChange={() => toggleModule(module.id)}
                      className="mt-1 rounded border-border"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-poppins-semibold text-navy">{module.name}</span>
                        <span className="text-xs text-muted">v{module.version}</span>
                        {assignment?.status === 'ACTIVE' ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Active</span>
                        ) : null}
                        {assignment?.status === 'PENDING' ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            Locked — pending activation
                          </span>
                        ) : null}
                        {assignment?.status === 'SUSPENDED' ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">Suspended</span>
                        ) : null}
                        {assignment?.tenantProvisioned && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Provisioned</span>
                        )}
                      </div>
                      <p className="text-xs text-muted">{module.category ?? 'General'} · {module.slug}</p>
                      {dependencies.length > 0 && (
                        <p className="mt-1 text-xs text-amber-700">
                          Requires: {dependencies.map((d) => d.name).join(', ')}
                        </p>
                      )}
                      {assignment && (
                        <p className="mt-1 text-xs text-muted">
                          Activated {assignment.activatedAt ? new Date(assignment.activatedAt).toLocaleDateString() : '—'}
                          {assignment.expiresAt ? ` · Expires ${new Date(assignment.expiresAt).toLocaleDateString()}` : ''}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <div className="border-t border-border px-5 py-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveAssignments}
                  className="rounded-xl bg-primary px-6 py-2.5 text-sm font-poppins-semibold text-navy disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Module Assignment'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
