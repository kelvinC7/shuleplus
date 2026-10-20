'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  exportToCsv,
  formatNumber,
  timeAgo,
  type Organization,
  type OrgStatus,
} from '@/lib/organizations';
import { StatusBadge } from '@/components/root-admin/organizations/status-badge';
import { OrgDrawer } from '@/components/root-admin/organizations/org-drawer';
import { OrgCredentialsModal } from '@/components/platform/org-credentials-modal';
import { ActionMenu } from '@/components/ui/action-menu';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';

const FILTERS: { label: string; value: 'ALL' | OrgStatus }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Disabled / Blocked', value: 'DISABLED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

type ViewMode = 'table' | 'grid';

export function OrganizationsList() {
  const platform = usePlatformAdmin();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | OrgStatus>('ALL');
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [credentialsOrg, setCredentialsOrg] = useState<Organization | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api
      .get(`${platform.apiPrefix}/organizations`)
      .then((res) => setOrgs(res.data.data))
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false));
  }

  async function setStatus(org: Organization, status: OrgStatus) {
    setBusyId(org.id);
    try {
      await api.patch(`${platform.apiPrefix}/organizations/${org.id}`, { status });
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteOrg(org: Organization) {
    if (!confirm(`Permanently delete ${org.name}? This cannot be undone.`)) return;
    setBusyId(org.id);
    try {
      await api.delete(`${platform.apiPrefix}/organizations/${org.id}`);
      load();
    } finally {
      setBusyId(null);
    }
  }

  function orgActions(org: Organization) {
    return [
      {
        label: 'View',
        href: `${platform.organizationsPath}/${org.id}`,
      },
      {
        label: 'Modules',
        href: platform.orgModulesPath(org.id),
      },
      {
        label: 'Credentials',
        onClick: () => setCredentialsOrg(org),
      },
      {
        label: 'Quick view',
        onClick: () => setDrawerId(org.id),
      },
      {
        label: org.status === 'ACTIVE' ? 'Suspend' : 'Activate',
        separatorBefore: true,
        disabled: busyId === org.id,
        onClick: () => void setStatus(org, org.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'),
      },
      {
        label: 'Block',
        disabled: busyId === org.id || org.status === 'DISABLED',
        onClick: () => void setStatus(org, 'DISABLED'),
      },
      {
        label: 'Delete',
        destructive: true,
        separatorBefore: true,
        disabled: busyId === org.id,
        onClick: () => void deleteOrg(org),
      },
    ];
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform.apiPrefix]);

  const filtered = useMemo(() => {
    return orgs.filter((o) => {
      const matchesSearch =
        !search ||
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.slug.toLowerCase().includes(search.toLowerCase()) ||
        (o.email ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'ALL' || o.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [orgs, search, filter]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-navy">Organizations</h1>
          <p className="mt-1 text-sm text-muted">
            {orgs.length} total · {filtered.length} shown
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {platform.scope === 'super-admin' && (
            <>
              <Link
                href={platform.pendingApprovalsPath}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
              >
                Pending Approvals
              </Link>
              <Link
                href={platform.organizationsRegisterPath}
                className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-primary/20"
              >
                Register Organization
              </Link>
            </>
          )}
          <Link
            href={platform.organizationsNewPath}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-primary-hover"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Org
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-navy/[0.06] bg-white p-3 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, or email…"
            suppressHydrationWarning
            className="w-full rounded-xl border border-border bg-[#f8fafc] py-2.5 pl-9 pr-4 text-sm text-navy outline-none transition focus:border-primary focus:bg-white"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-navy transition hover:border-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
            {FILTERS.find((f) => f.value === filter)?.label}
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-xl">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    setFilter(f.value);
                    setFilterOpen(false);
                  }}
                  className={`block w-full px-4 py-2 text-left text-sm transition hover:bg-navy/5 ${
                    filter === f.value ? 'font-semibold text-primary' : 'text-navy'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex rounded-xl border border-border bg-[#f8fafc] p-1">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              viewMode === 'table' ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
            Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              viewMode === 'grid' ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            Grid
          </button>
        </div>

        <button
          type="button"
          onClick={() => exportToCsv(filtered)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-navy transition hover:border-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-white/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white/60 p-12 text-center">
          <p className="font-semibold text-navy">No organizations found</p>
          <p className="mt-1 text-sm text-muted">
            {orgs.length === 0 ? 'Create your first organization to get started.' : 'Try a different search or filter.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="overflow-hidden rounded-2xl border border-navy/[0.06] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-wide text-muted">
                  <th className="px-5 py-3.5">Organization</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Users</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Plan</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Last active</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filtered.map((org) => (
                  <tr key={org.id} className="transition hover:bg-primary/[0.03]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/[0.06] font-bold text-navy">
                          {org.name[0]?.toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold text-navy">{org.name}</p>
                          <p className="text-xs uppercase tracking-wide text-muted">{org.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={org.status} />
                    </td>
                    <td className="px-4 py-4 font-semibold text-navy">{formatNumber(org._count?.users ?? 0)}</td>
                    <td className="px-4 py-4 text-navy">{org.type}</td>
                    <td className="px-4 py-4 text-navy">{org.subscriptionTier ?? 'Free'}</td>
                    <td className="max-w-[180px] truncate px-4 py-4 text-muted">{org.email ?? '—'}</td>
                    <td className="px-4 py-4 text-muted">{timeAgo(org.updatedAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`${platform.organizationsPath}/${org.id}`}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
                        >
                          Manage
                        </Link>
                        <ActionMenu items={orgActions(org)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((org) => (
            <div
              key={org.id}
              className="group flex flex-col rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy/10 to-primary/10 font-bold text-navy">
                    {org.name[0]?.toUpperCase()}
                  </span>
                  <div>
                    <h2 className="font-semibold text-navy">{org.name}</h2>
                    <p className="text-xs uppercase tracking-wider text-muted">{org.slug}</p>
                  </div>
                </div>
                <StatusBadge status={org.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
                  <p className="font-semibold text-navy">{formatNumber(org._count?.users ?? 0)}</p>
                  <p className="text-[11px] text-muted">Users</p>
                </div>
                <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
                  <p className="font-semibold text-navy">{org.subscriptionTier ?? 'Free'}</p>
                  <p className="text-[11px] text-muted">Plan</p>
                </div>
                <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
                  <p className="font-semibold text-navy">{org.type}</p>
                  <p className="text-[11px] text-muted">Type</p>
                </div>
                <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
                  <p className="font-semibold text-navy">{timeAgo(org.updatedAt)}</p>
                  <p className="text-[11px] text-muted">Last active</p>
                </div>
              </div>

              {org.email && (
                <p className="mt-3 truncate text-xs text-muted">{org.email}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <Link
                  href={`${platform.organizationsPath}/${org.id}`}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-navy transition hover:bg-primary-hover"
                >
                  Manage
                </Link>
                <ActionMenu items={orgActions(org)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <OrgDrawer orgId={drawerId} onClose={() => setDrawerId(null)} onChanged={load} />
      <OrgCredentialsModal
        org={credentialsOrg}
        apiPrefix={platform.apiPrefix}
        onClose={() => setCredentialsOrg(null)}
        onSaved={load}
      />
    </div>
  );
}
