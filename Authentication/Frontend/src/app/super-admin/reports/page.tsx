'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
import { SuperAdminModulePage } from '@/components/super-admin/module-page';
import { SUPER_ADMIN_MODULES } from '@/lib/super-admin-modules';
import { formatNumber, type Organization } from '@/lib/organizations';

const mod = SUPER_ADMIN_MODULES.reports;

export default function SuperAdminReportsPage() {
  const platform = usePlatformAdmin();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [catalogStats, setCatalogStats] = useState<{
    totalModules?: number;
    activeModules?: number;
    organizationsUsingModules?: number;
  } | null>(null);
  const [queueLen, setQueueLen] = useState(0);
  const [subs, setSubs] = useState<{ status: string; plan?: { period: string } }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`${platform.apiPrefix}/organizations`),
      api.get(`${platform.apiPrefix}/module-catalog/stats`).catch(() => ({ data: { data: null } })),
      api.get(`${platform.apiPrefix}/module-provisioning/queue`).catch(() => ({ data: { data: [] } })),
      api.get(`${platform.apiPrefix}/subscriptions`).catch(() => ({ data: { data: [] } })),
    ])
      .then(([o, c, q, s]) => {
        setOrgs(o.data.data ?? []);
        setCatalogStats(c.data.data);
        setQueueLen((q.data.data ?? []).length);
        setSubs(s.data.data ?? []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [platform.apiPrefix]);

  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const org of orgs) {
      const key = org.status === 'DISABLED' ? 'BLOCKED' : org.status;
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [orgs]);

  const subByPeriod = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of subs) {
      const period = s.plan?.period ?? 'UNKNOWN';
      map[period] = (map[period] ?? 0) + 1;
    }
    return map;
  }, [subs]);

  return (
    <SuperAdminModulePage
      title={mod.title}
      description="Live platform snapshot from organizations, modules, provisioning, and subscriptions."
      features={[...mod.features]}
      actions={[
        { label: 'Organizations', href: platform.organizationsPath },
        { label: 'Subscriptions', href: platform.subscriptionsPath },
        { label: 'Provisioning', href: `${platform.basePath}/module-provisioning` },
      ]}
    >
      {loading ? (
        <p className="text-sm text-muted">Loading report…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Organizations" value={orgs.length} />
            <Stat label="Catalog modules" value={catalogStats?.totalModules ?? 0} />
            <Stat label="Orgs with modules" value={catalogStats?.organizationsUsingModules ?? 0} />
            <Stat label="Pending provision" value={queueLen} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-navy">Organization status</h3>
              <ul className="mt-3 space-y-2">
                {Object.entries(statusBreakdown).map(([status, count]) => (
                  <li key={status} className="flex justify-between text-sm">
                    <span className="text-muted">{status}</span>
                    <span className="font-semibold text-navy">{formatNumber(count)}</span>
                  </li>
                ))}
                {Object.keys(statusBreakdown).length === 0 && (
                  <li className="text-sm text-muted">No organizations yet.</li>
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-navy">Subscriptions by period</h3>
              <ul className="mt-3 space-y-2">
                {Object.entries(subByPeriod).map(([period, count]) => (
                  <li key={period} className="flex justify-between text-sm">
                    <span className="text-muted">{period}</span>
                    <span className="font-semibold text-navy">{formatNumber(count)}</span>
                  </li>
                ))}
                {Object.keys(subByPeriod).length === 0 && (
                  <li className="text-sm text-muted">
                    No subscriptions yet.{' '}
                    <Link href={platform.subscriptionsPath} className="text-primary hover:underline">
                      Create a plan
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </SuperAdminModulePage>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-montserrat text-2xl font-bold text-navy">{formatNumber(value)}</p>
    </div>
  );
}
