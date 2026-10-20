'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
import { type ProvisioningQueueItem } from '@/lib/modules';
import {
  DashboardCard,
  EmptyState,
  PageHeader,
  PrimaryButton,
  StatCard,
} from '@/components/shared';
import { AdminLayout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/shared/notifications';

function provisionHint(item: ProvisioningQueueItem | null, message: string): string {
  if (!item) return sanitizeProvisionMessage(message);
  if (message.includes('ECONNREFUSED') || message.includes('fetch failed') || message.includes('502') || message.includes('unreachable')) {
    return `${sanitizeProvisionMessage(message)} Start the module backend locally, or use hosted URLs when deployed.`;
  }
  if (message.includes('401') || message.toLowerCase().includes('service key')) {
    return `${message} Verify IAM MODULE_PROVISIONING_KEY matches the module SERVICE_API_KEY.`;
  }
  return sanitizeProvisionMessage(message);
}

function sanitizeProvisionMessage(message: string): string {
  return message
    .replace(/\s*—\s*is the service running at https?:\/\/[^\s?]+?\??/gi, '')
    .replace(/\s*Ensure [^.]+\s+is running at https?:\/\/[^\s.]+\.?/gi, '')
    .replace(/fetch failed/gi, 'Module backend unreachable')
    .trim();
}

export default function ModuleProvisioningPage() {
  const platform = usePlatformAdmin();
  const toast = useToast();
  const [queue, setQueue] = useState<ProvisioningQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  function load() {
    setLoading(true);
    api
      .get(`${platform.apiPrefix}/module-provisioning/queue`)
      .then((res) => setQueue(res.data.data))
      .catch(() => setQueue([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform.apiPrefix]);

  async function provision(item: ProvisioningQueueItem) {
    setActionId(item.id);
    try {
      const res = await api.post(
        `${platform.apiPrefix}/module-provisioning/${item.id}/provision`,
        { force: true }
      );
      toast.success(
        res.data?.data?.message ?? 'Tenant provisioned and marked active.',
        'Provisioned'
      );
      load();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Provisioning failed.';
      const detail =
        status === 401 ? `${msg} Sign out and sign in again.` : provisionHint(item, msg);
      toast.error(
        item.module.backendUrl ? `${detail} (${item.module.backendUrl})` : detail,
        'Provisioning failed'
      );
    } finally {
      setActionId(null);
    }
  }

  async function provisionAll(force = false) {
    setBulkBusy(true);
    try {
      const res = await api.post(`${platform.apiPrefix}/module-provisioning/provision-all`, {
        force,
      });
      const data = res.data?.data as {
        succeeded?: number;
        failed?: number;
        results?: { moduleSlug: string; organizationName: string; ok: boolean; error?: string }[];
      };
      const failed = (data.results ?? []).filter((r) => !r.ok);
      toast.success(
        res.data?.message ??
          `Provisioned ${data.succeeded ?? 0} workspace(s)${data.failed ? `, ${data.failed} failed` : ''}.`,
        force ? 'Re-provision complete' : 'Bulk provision'
      );
      if (failed.length > 0) {
        toast.error(
          failed
            .slice(0, 5)
            .map((f) => `${f.organizationName} / ${f.moduleSlug}: ${f.error ?? 'failed'}`)
            .join(' · '),
          'Some workspaces failed'
        );
      }
      load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Bulk provisioning failed.',
        'Bulk provision failed'
      );
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Modules"
        title="Tenant Provisioning"
        description="Create or repair tenant workspaces for assigned modules. Use Provision for one row, Provision all pending for the queue, or Repair all (force) to re-call every module."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={queue.length} />
        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workflow</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign modules → open org Modules page or this queue → Provision one / all → force re-provision when a tenant was marked incorrectly.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <PrimaryButton size="sm" disabled={bulkBusy || queue.length === 0} onClick={() => void provisionAll(false)}>
              {bulkBusy ? 'Working…' : 'Provision all pending'}
            </PrimaryButton>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkBusy}
              onClick={() => void provisionAll(true)}
              title="Re-call every ACTIVE module /tenant/create and set tenantProvisioned true"
            >
              Re-provision all (force)
            </Button>
          </div>
        </div>
      </div>

      <DashboardCard
        title="Queue"
        description="ACTIVE assignments waiting for tenantProvisioned = true"
        action={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            Refresh
          </Button>
        }
        contentClassName="p-0"
      >
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : queue.length === 0 ? (
          <EmptyState
            title="All caught up"
            description="Every assigned module is marked provisioned. Use Repair all if a module still shows Access Denied."
            className="m-4 border-none shadow-none"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Backend</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-medium">{item.organization.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.organization.organizationCode ?? item.organization.slug}
                    </p>
                  </TableCell>
                  <TableCell>{item.module.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.activatedAt ? new Date(item.activatedAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {item.module.backendUrl ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <PrimaryButton
                      size="sm"
                      disabled={actionId === item.id}
                      onClick={() => void provision(item)}
                    >
                      {actionId === item.id ? 'Creating…' : 'Provision'}
                    </PrimaryButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DashboardCard>
    </AdminLayout>
  );
}
