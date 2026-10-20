'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
import { SuperAdminModulePage } from '@/components/super-admin/module-page';
import { SUPER_ADMIN_MODULES } from '@/lib/super-admin-modules';
import { formatNumber, type Organization } from '@/lib/organizations';

const mod = SUPER_ADMIN_MODULES.customers;

const TYPE_LABELS: Record<string, string> = {
  SCHOOL: 'Schools',
  BUSINESS: 'Businesses',
  HOSPITAL: 'Hospitals',
  NGO: 'NGOs',
  FACTORY: 'Factories',
  UNIVERSITY: 'Universities',
  TVET: 'TVET',
  OTHER: 'Other',
};

export default function SuperAdminCustomersPage() {
  const platform = usePlatformAdmin();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [subs, setSubs] = useState<{ status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`${platform.apiPrefix}/organizations`),
      api.get(`${platform.apiPrefix}/subscriptions`).catch(() => ({ data: { data: [] } })),
    ])
      .then(([o, s]) => {
        setOrgs(o.data.data ?? []);
        setSubs(s.data.data ?? []);
      })
      .catch(() => {
        setOrgs([]);
        setSubs([]);
      })
      .finally(() => setLoading(false));
  }, [platform.apiPrefix]);

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    for (const org of orgs) {
      map.set(org.type, (map.get(org.type) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [orgs]);

  const activeSubs = subs.filter((s) => s.status === 'ACTIVE' || s.status === 'TRIAL').length;

  return (
    <SuperAdminModulePage
      title={mod.title}
      description={mod.description}
      features={[...mod.features]}
      actions={[
        { label: 'All organizations', href: platform.organizationsPath },
        { label: 'Subscriptions', href: platform.subscriptionsPath },
      ]}
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Organizations</p>
          <p className="mt-1 font-montserrat text-2xl font-bold text-navy">
            {loading ? '—' : formatNumber(orgs.length)}
          </p>
        </div>
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Active / Trial subs</p>
          <p className="mt-1 font-montserrat text-2xl font-bold text-navy">
            {loading ? '—' : formatNumber(activeSubs)}
          </p>
        </div>
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Active orgs</p>
          <p className="mt-1 font-montserrat text-2xl font-bold text-navy">
            {loading ? '—' : formatNumber(orgs.filter((o) => o.status === 'ACTIVE').length)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(byType.length ? byType : Object.keys(TYPE_LABELS).map((k) => [k, 0] as [string, number])).map(
          ([type, count]) => (
            <div
              key={type}
              className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
            >
              <h3 className="font-poppins-semibold text-navy">{TYPE_LABELS[type] ?? type}</h3>
              <p className="mt-1 text-2xl font-bold text-navy">{formatNumber(count)}</p>
              <p className="mt-1 text-xs text-muted">Profiles, users, modules & subscription</p>
              <Link
                href={platform.organizationsPath}
                className="mt-4 inline-block text-sm font-poppins-semibold text-primary hover:underline"
              >
                Browse {TYPE_LABELS[type] ?? type} →
              </Link>
            </div>
          )
        )}
      </div>
    </SuperAdminModulePage>
  );
}
