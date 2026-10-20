'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
import { ActionMenu } from '@/components/ui/action-menu';
import { BackButton } from '@/components/root-admin/back-button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/shared/notifications';

type Plan = {
  id: string;
  code: string;
  name: string;
  period: string;
  amount: number;
  currency: string;
};

type SubPayload = {
  organization: {
    id: string;
    name: string;
    slug: string;
    organizationCode: string | null;
    status: string;
    subscriptionTier: string | null;
  };
  subscription: {
    id: string;
    status: string;
    startsAt: string;
    endsAt: string | null;
    renewedAt: string | null;
    cancelledAt: string | null;
    notes: string | null;
    plan: Plan;
  } | null;
};

export default function OrgSubscriptionPage() {
  const params = useParams();
  const platform = usePlatformAdmin();
  const toast = useToast();
  const orgId = params.orgId as string;
  const [data, setData] = useState<SubPayload | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState('');

  function load() {
    Promise.all([
      api.get(`${platform.apiPrefix}/subscriptions/${orgId}`),
      api.get(`${platform.apiPrefix}/subscription-plans`),
    ])
      .then(([s, p]) => {
        setData(s.data.data);
        setPlans(p.data.data);
        setPlanId(s.data.data.subscription?.plan?.id ?? '');
      })
      .catch(() => setData(null));
  }

  useEffect(() => {
    if (orgId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, platform.apiPrefix]);

  async function assign() {
    if (!planId) return;
    try {
      await api.put(`${platform.apiPrefix}/subscriptions/${orgId}`, { planId });
      toast.success('Plan assigned.', 'Assigned');
      load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed.',
        'Assign failed'
      );
    }
  }

  async function run(action: 'activate' | 'suspend' | 'renew' | 'cancel' | 'upgrade' | 'downgrade') {
    try {
      await api.post(`${platform.apiPrefix}/subscriptions/${orgId}/actions`, {
        action,
        ...(action === 'upgrade' || action === 'downgrade' ? { planId } : {}),
      });
      toast.success(`Subscription ${action} applied.`, 'Subscription updated');
      load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          `Failed to ${action}.`,
        'Action failed'
      );
    }
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <BackButton href={platform.subscriptionsPath} />
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  const sub = data.subscription;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackButton href={platform.subscriptionsPath} label="Back to subscriptions" />
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-navy">{data.organization.name}</h1>
        <p className="text-sm text-muted">
          {data.organization.organizationCode ?? data.organization.slug} · Org status{' '}
          {data.organization.status}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Current subscription</p>
            <p className="mt-1 font-montserrat text-2xl font-bold text-navy">
              {sub?.plan.name ?? data.organization.subscriptionTier ?? 'No plan'}
            </p>
            {sub && (
              <p className="mt-1 text-sm text-muted">
                {sub.plan.period} · started {new Date(sub.startsAt).toLocaleDateString()}
                {sub.endsAt ? ` · ends ${new Date(sub.endsAt).toLocaleDateString()}` : ''}
              </p>
            )}
          </div>
          {sub && <Badge variant="outline">{sub.status}</Badge>}
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1 text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase text-muted">Plan</span>
            <select className="input w-full" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">Select plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.period})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void assign()}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-navy"
          >
            {sub ? 'Change plan' : 'Assign plan'}
          </button>
          {sub && (
            <ActionMenu
              items={[
                { label: 'Activate', onClick: () => void run('activate') },
                { label: 'Suspend', onClick: () => void run('suspend') },
                { label: 'Renew', onClick: () => void run('renew') },
                { label: 'Upgrade to selected', onClick: () => void run('upgrade') },
                { label: 'Downgrade to selected', onClick: () => void run('downgrade') },
                {
                  label: 'Cancel',
                  destructive: true,
                  separatorBefore: true,
                  onClick: () => void run('cancel'),
                },
              ]}
            />
          )}
        </div>
      </div>

      <Link href={platform.orgModulesPath(orgId)} className="text-sm font-semibold text-primary hover:underline">
        Open module control →
      </Link>
    </div>
  );
}
