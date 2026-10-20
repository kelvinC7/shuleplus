'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
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

type Plan = {
  id: string;
  code: string;
  name: string;
  period: string;
  amount: number;
  currency: string;
  description: string | null;
  features: string[];
  isActive: boolean;
};

type OrgSub = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  plan: Plan;
  organization: {
    id: string;
    name: string;
    slug: string;
    organizationCode: string | null;
    status: string;
    subscriptionTier: string | null;
  };
};

const PERIODS = ['MONTHLY', 'YEARLY', 'LIFETIME', 'TRIAL', 'ENTERPRISE', 'CUSTOM'] as const;

export default function SubscriptionsPage() {
  const platform = usePlatformAdmin();
  const toast = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<OrgSub[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({
    code: '',
    name: '',
    period: 'MONTHLY',
    amount: 0,
    currency: 'RWF',
    description: '',
  });
  const [assignOrgId, setAssignOrgId] = useState('');
  const [assignPlanId, setAssignPlanId] = useState('');

  function load() {
    setLoading(true);
    Promise.all([
      api.get(`${platform.apiPrefix}/subscription-plans`),
      api.get(`${platform.apiPrefix}/subscriptions`),
      api.get(`${platform.apiPrefix}/organizations`),
    ])
      .then(([p, s, o]) => {
        setPlans(p.data.data);
        setSubs(s.data.data);
        setOrgs(
          (o.data.data as { id: string; name: string }[]).map((x) => ({
            id: x.id,
            name: x.name,
          }))
        );
      })
      .catch(() => {
        setPlans([]);
        setSubs([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform.apiPrefix]);

  async function createPlan() {
    try {
      await api.post(`${platform.apiPrefix}/subscription-plans`, {
        ...planForm,
        amount: Number(planForm.amount),
        features: [],
      });
      setShowPlanForm(false);
      setPlanForm({ code: '', name: '', period: 'MONTHLY', amount: 0, currency: 'RWF', description: '' });
      toast.success('Plan created.', 'Plan created');
      load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to create plan.',
        'Create failed'
      );
    }
  }

  async function assignPlan() {
    if (!assignOrgId || !assignPlanId) return;
    try {
      await api.put(`${platform.apiPrefix}/subscriptions/${assignOrgId}`, { planId: assignPlanId });
      toast.success('Subscription assigned.', 'Assigned');
      setAssignOrgId('');
      setAssignPlanId('');
      load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to assign plan.',
        'Assign failed'
      );
    }
  }

  async function runSubAction(
    orgId: string,
    action: 'activate' | 'suspend' | 'renew' | 'cancel'
  ) {
    try {
      await api.post(`${platform.apiPrefix}/subscriptions/${orgId}/actions`, { action });
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <BackButton href={platform.dashboardPath} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-navy">Subscriptions</h1>
          <p className="mt-1 text-sm text-muted">
            Manual plan management — Trial, Monthly, Yearly, Lifetime, Enterprise, Custom. No payment gateway.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPlanForm((v) => !v)}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-navy hover:bg-primary-hover"
        >
          {showPlanForm ? 'Close form' : 'Create plan'}
        </button>
      </div>

      {showPlanForm && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-navy">New subscription plan</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase text-muted">Code</span>
              <input
                className="input w-full"
                value={planForm.code}
                onChange={(e) => setPlanForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="STANDARD_MONTHLY"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase text-muted">Name</span>
              <input
                className="input w-full"
                value={planForm.name}
                onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Standard Monthly"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase text-muted">Period</span>
              <select
                className="input w-full"
                value={planForm.period}
                onChange={(e) => setPlanForm((f) => ({ ...f, period: e.target.value }))}
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase text-muted">Amount</span>
              <input
                type="number"
                className="input w-full"
                value={planForm.amount}
                onChange={(e) => setPlanForm((f) => ({ ...f, amount: Number(e.target.value) }))}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase text-muted">Description</span>
              <input
                className="input w-full"
                value={planForm.description}
                onChange={(e) => setPlanForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void createPlan()}
            className="mt-4 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-primary"
          >
            Save plan
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-navy">Assign plan to organization</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <select
            className="input min-w-[200px]"
            value={assignOrgId}
            onChange={(e) => setAssignOrgId(e.target.value)}
          >
            <option value="">Select organization</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <select
            className="input min-w-[200px]"
            value={assignPlanId}
            onChange={(e) => setAssignPlanId(e.target.value)}
          >
            <option value="">Select plan</option>
            {plans.filter((p) => p.isActive).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.period})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void assignPlan()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-navy"
          >
            Assign
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-navy/[0.06] bg-white shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-navy">Plans</h2>
          </div>
          {loading ? (
            <p className="p-6 text-sm text-muted">Loading…</p>
          ) : plans.length === 0 ? (
            <p className="p-6 text-sm text-muted">No plans yet. Create one to get started.</p>
          ) : (
            <ul className="divide-y divide-border">
              {plans.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-medium text-navy">{p.name}</p>
                    <p className="text-xs text-muted">
                      {p.code} · {p.period} · {p.amount.toLocaleString()} {p.currency}
                    </p>
                  </div>
                  <Badge variant="outline">{p.isActive ? 'Active' : 'Inactive'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-navy/[0.06] bg-white shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-navy">Organization subscriptions</h2>
          </div>
          {loading ? (
            <p className="p-6 text-sm text-muted">Loading…</p>
          ) : subs.length === 0 ? (
            <p className="p-6 text-sm text-muted">No organization subscriptions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link
                        href={platform.orgSubscriptionPath(s.organization.id)}
                        className="font-medium text-navy hover:text-primary"
                      >
                        {s.organization.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted">{s.plan.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionMenu
                        items={[
                          {
                            label: 'Activate',
                            onClick: () => void runSubAction(s.organization.id, 'activate'),
                          },
                          {
                            label: 'Suspend',
                            onClick: () => void runSubAction(s.organization.id, 'suspend'),
                          },
                          {
                            label: 'Renew',
                            onClick: () => void runSubAction(s.organization.id, 'renew'),
                          },
                          {
                            label: 'Cancel',
                            destructive: true,
                            separatorBefore: true,
                            onClick: () => void runSubAction(s.organization.id, 'cancel'),
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
