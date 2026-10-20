'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { BackButton } from '@/components/root-admin/back-button';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
import {
  formatOrgType,
  payloadSummary,
  type OrganizationRegistration,
} from '@/lib/organization-registrations';
import { formatOrgTypeLabel, type WizardOrgType } from '@/lib/organization-registration';
import { useToast } from '@/shared/notifications';

function StatusChip({ status }: { status: OrganizationRegistration['status'] }) {
  const styles = {
    PENDING: 'bg-amber-500/10 text-amber-700',
    APPROVED: 'bg-success/10 text-success',
    REJECTED: 'bg-danger/10 text-danger',
    DRAFT: 'bg-muted/10 text-muted',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-poppins-semibold ${styles[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function PendingApprovalsList() {
  const router = useRouter();
  const platform = usePlatformAdmin();
  const [items, setItems] = useState<OrganizationRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OrganizationRegistration | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const toast = useToast();

  function load() {
    setLoading(true);
    api
      .get(`${platform.apiPrefix}/organization-registrations?status=PENDING`)
      .then((res) => setItems(res.data.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform.apiPrefix]);

  async function approve(id: string) {
    setActionId(id);
    try {
      const res = await api.post(`${platform.apiPrefix}/organization-registrations/${id}/approve`);
      const orgId = res.data.data.organization.id as string;
      setSelected(null);
      toast.success('Organization approved.', 'Approved');
      load();
      router.push(platform.orgDetailPath(orgId));
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Approval failed.',
        'Approval failed'
      );
    } finally {
      setActionId(null);
    }
  }

  async function reject(id: string) {
    setActionId(id);
    try {
      await api.post(`${platform.apiPrefix}/organization-registrations/${id}/reject`, {
        reviewNotes: rejectNotes || undefined,
      });
      setSelected(null);
      setRejectNotes('');
      toast.success('Registration rejected.', 'Rejected');
      load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Rejection failed.',
        'Rejection failed'
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <BackButton href={platform.dashboardPath} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-navy">Pending Approvals</h1>
          <p className="text-sm text-muted">
            Review organization registrations submitted via the registration wizard.
          </p>
        </div>
        <Link
          href={platform.organizationsRegisterPath}
          className="inline-flex items-center gap-2 rounded-xl border border-primary bg-primary/10 px-5 py-2.5 text-sm font-poppins-semibold text-navy transition hover:bg-primary/20"
        >
          New Registration
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted">Loading pending registrations…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-poppins-semibold text-navy">No pending registrations</p>
            <p className="mt-1 text-sm text-muted">New submissions will appear here for Super Admin review.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-navy/[0.02] text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-poppins-semibold">Organization</th>
                <th className="px-4 py-3 font-poppins-semibold">Type</th>
                <th className="px-4 py-3 font-poppins-semibold">Code</th>
                <th className="px-4 py-3 font-poppins-semibold">Submitted</th>
                <th className="px-4 py-3 font-poppins-semibold">Status</th>
                <th className="px-4 py-3 font-poppins-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const summary = payloadSummary(item.payload);
                return (
                  <tr key={item.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-poppins-semibold text-navy">{item.organizationName}</p>
                      <p className="text-xs text-muted">{summary.adminEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatOrgTypeLabel(item.organizationType as WizardOrgType) ||
                        formatOrgType(item.organizationType)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-navy">
                      {item.organizationCode ?? summary.organizationCodePreview}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="text-sm font-poppins-semibold text-primary hover:underline"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-montserrat text-xl font-bold text-navy">{selected.organizationName}</h2>
                <p className="text-sm text-muted">
                  {formatOrgType(selected.organizationType)} · Code{' '}
                  {selected.organizationCode ?? payloadSummary(selected.payload).organizationCodePreview}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1 text-muted hover:bg-navy/5"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-sm">
              {[
                ['Phone', String(selected.payload.phone ?? '—')],
                ['Email', String(selected.payload.email ?? '—')],
                ['Organization Head', String(selected.payload.organizationHead ?? '—')],
                ['Administrator', String(selected.payload.adminName ?? '—')],
                ['Admin Email', String(selected.payload.adminEmail ?? '—')],
                ['Admin Username', String(selected.payload.adminUsername ?? '—')],
                ['Subscription', String(selected.payload.subscriptionTier ?? 'Standard')],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-border py-2">
                  <span className="text-muted">{label}</span>
                  <span className="max-w-[55%] text-right font-poppins-medium text-navy">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-poppins-semibold uppercase tracking-wide text-muted">
                Rejection notes (optional)
              </label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={2}
                className="input w-full"
                placeholder="Reason if rejecting…"
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={actionId === selected.id}
                onClick={() => reject(selected.id)}
                className="rounded-xl border border-danger/30 px-5 py-2.5 text-sm font-poppins-semibold text-danger transition hover:bg-danger/5 disabled:opacity-50"
              >
                {actionId === selected.id ? 'Processing…' : 'Reject'}
              </button>
              <button
                type="button"
                disabled={actionId === selected.id}
                onClick={() => approve(selected.id)}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-poppins-semibold text-navy transition hover:bg-primary-hover disabled:opacity-50"
              >
                {actionId === selected.id ? 'Processing…' : 'Approve & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
