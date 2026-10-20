'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
import {
  type ModuleControlResponse,
  type ModuleControlRow,
  type ModuleProvisionLog,
} from '@/lib/modules';
import { ActionMenu } from '@/components/ui/action-menu';
import { BackButton } from '@/components/root-admin/back-button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/shared/notifications';

function statusChip(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'PENDING':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'SUSPENDED':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'EXPIRED':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-navy/5 text-navy border-border';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'PENDING':
      return 'Locked';
    case 'SUSPENDED':
      return 'Disabled';
    case 'EXPIRED':
      return 'Expired';
    default:
      return status;
  }
}

function tenantChip(row: ModuleControlRow) {
  if (row.tenantProvisioned) return { label: 'Provisioned', className: 'bg-emerald-50 text-emerald-800' };
  if (row.provisionLastError || row.provisionAttempts > 0)
    return { label: 'Failed', className: 'bg-rose-50 text-rose-800' };
  return { label: 'Not provisioned', className: 'bg-slate-100 text-slate-600' };
}

export default function OrganizationModulesPage() {
  const params = useParams();
  const platform = usePlatformAdmin();
  const toast = useToast();
  const orgId = params.id as string;

  const [data, setData] = useState<ModuleControlResponse | null>(null);
  const [logs, setLogs] = useState<ModuleProvisionLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api
      .get(`${platform.apiPrefix}/organizations/${orgId}/module-control`)
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  function loadLogs(moduleId?: string) {
    const qs = moduleId ? `?moduleId=${moduleId}` : '';
    api
      .get(`${platform.apiPrefix}/organizations/${orgId}/provision-logs${qs}`)
      .then((res) => {
        setLogs(res.data.data);
        setShowLogs(true);
      })
      .catch(() => setLogs([]));
  }

  useEffect(() => {
    if (orgId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, platform.apiPrefix]);

  async function runAction(
    moduleId: string,
    action: 'activate' | 'deactivate' | 'lock' | 'unlock' | 'hide' | 'show' | 'remove' | 'reset'
  ) {
    if (action === 'remove' && !confirm('Remove this module from the organization?')) return;
    setBusy(true);
    try {
      const res = await api.patch(
        `${platform.apiPrefix}/organizations/${orgId}/modules/${moduleId}`,
        { action }
      );
      setData(res.data.data);
      toast.success(res.data.message ?? `Module ${action} applied.`, 'Module updated');
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          `Failed to ${action} module.`,
        'Action failed'
      );
    } finally {
      setBusy(false);
    }
  }

  async function provision(moduleId: string, force = false) {
    setBusy(true);
    try {
      const res = await api.post(
        `${platform.apiPrefix}/organizations/${orgId}/modules/${moduleId}/provision`,
        { force }
      );
      toast.success(
        res.data?.data?.message ?? (force ? 'Re-provisioned.' : 'Provisioned.'),
        force ? 'Re-provisioned' : 'Provisioned'
      );
      load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Provisioning failed.',
        'Provisioning failed'
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-28 animate-pulse rounded-3xl bg-white/60" />
        <div className="h-64 animate-pulse rounded-2xl bg-white/60" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <BackButton href={platform.organizationsPath} label="Back to Organizations" />
        <p className="font-semibold text-navy">Organization not found.</p>
      </div>
    );
  }

  const { organization, modules, stats } = data;
  const provisionPct =
    stats.total === 0 ? 0 : Math.round((stats.provisioned / stats.total) * 100);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <BackButton href={platform.orgDetailPath(orgId)} label="Back to organization" />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy to-navy-light p-6 text-white shadow-lg sm:p-8">
        <span aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Module control</p>
            <h1 className="mt-1 font-montserrat text-2xl font-bold">{organization.name}</h1>
            <p className="mt-1 text-sm text-white/60">
              {organization.organizationCode ?? organization.slug} · {organization.subscriptionTier ?? 'No plan'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`${platform.basePath}/module-assignment?organizationId=${orgId}`}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
            >
              Bulk assign
            </Link>
            <Link
              href={`${platform.basePath}/module-provisioning`}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-navy transition hover:bg-primary-hover"
            >
              Provisioning queue
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Assigned', value: stats.total },
          { label: 'Active', value: stats.active },
          { label: 'Locked / Disabled', value: stats.locked + stats.disabled },
          { label: 'Provisioned', value: `${stats.provisioned} (${provisionPct}%)` },
          {
            label: 'Last activity',
            value: stats.lastActivityAt
              ? new Date(stats.lastActivityAt).toLocaleString()
              : '—',
          },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{s.label}</p>
            <p className="mt-1 font-montserrat text-lg font-bold text-navy sm:text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy/[0.06] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold text-navy">Assigned modules</h2>
            <p className="text-sm text-muted">Activate, lock, provision, or hide each module</p>
          </div>
          <button
            type="button"
            onClick={() => loadLogs()}
            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-navy hover:border-primary"
          >
            View logs
          </button>
        </div>

        {modules.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-navy">No modules assigned</p>
            <p className="mt-1 text-sm text-muted">Use Bulk assign to choose modules for this organization.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((row) => {
                const tenant = tenantChip(row);
                return (
                  <TableRow key={row.assignmentId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-navy"
                          style={{ backgroundColor: `${row.module.color ?? '#FCB038'}33` }}
                        >
                          {(row.module.shortName ?? row.module.name).slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-medium text-navy">{row.module.name}</p>
                          <p className="text-xs text-muted">
                            {row.module.slug}
                            {row.isHidden ? ' · Hidden' : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusChip(row.status)}`}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={tenant.className}>
                        {tenant.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted">{row.subscriptionPlan ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <ActionMenu
                        items={[
                          {
                            label: 'Activate',
                            disabled: busy || row.status === 'ACTIVE',
                            onClick: () => void runAction(row.moduleId, 'activate'),
                          },
                          {
                            label: 'Deactivate',
                            disabled: busy || row.status === 'SUSPENDED',
                            onClick: () => void runAction(row.moduleId, 'deactivate'),
                          },
                          {
                            label: 'Lock',
                            disabled: busy || row.status === 'PENDING',
                            onClick: () => void runAction(row.moduleId, 'lock'),
                          },
                          {
                            label: 'Unlock',
                            disabled: busy || row.status !== 'PENDING',
                            onClick: () => void runAction(row.moduleId, 'unlock'),
                          },
                          {
                            label: row.tenantProvisioned ? 'Re-Provision' : 'Provision',
                            disabled: busy,
                            separatorBefore: true,
                            onClick: () => void provision(row.moduleId, row.tenantProvisioned),
                          },
                          {
                            label: 'Reset provision',
                            disabled: busy,
                            onClick: () => void runAction(row.moduleId, 'reset'),
                          },
                          {
                            label: row.isHidden ? 'Show' : 'Hide',
                            disabled: busy,
                            separatorBefore: true,
                            onClick: () => void runAction(row.moduleId, row.isHidden ? 'show' : 'hide'),
                          },
                          {
                            label: 'View logs',
                            onClick: () => loadLogs(row.moduleId),
                          },
                          {
                            label: 'Remove',
                            destructive: true,
                            separatorBefore: true,
                            disabled: busy,
                            onClick: () => void runAction(row.moduleId, 'remove'),
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {showLogs && (
        <div className="overflow-hidden rounded-2xl border border-navy/[0.06] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold text-navy">Provision &amp; lifecycle logs</h2>
            <button
              type="button"
              onClick={() => setShowLogs(false)}
              className="text-xs font-semibold text-muted hover:text-navy"
            >
              Close
            </button>
          </div>
          {logs.length === 0 ? (
            <p className="p-6 text-sm text-muted">No logs yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium text-navy">
                      {log.action}
                      {log.moduleSlug ? ` · ${log.moduleSlug}` : ''}
                    </p>
                    <p className={log.success ? 'text-muted' : 'text-destructive'}>
                      {log.message ?? (log.success ? 'OK' : 'Failed')}
                    </p>
                  </div>
                  <p className="text-xs text-muted">{new Date(log.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
