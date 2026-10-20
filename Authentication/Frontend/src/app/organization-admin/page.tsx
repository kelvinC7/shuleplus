'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getAccessToken, getRefreshToken, getStoredUser, type AuthUser } from '@/lib/auth';
import type { LicensedModule } from '@/lib/modules';
import { buildModuleLaunchUrl } from '@/lib/module-launch';
import {
  countModulesByLifecycle,
  groupModulesByLifecycle,
  MODULE_LIFECYCLE_META,
  type ModuleLifecycleStatus,
} from '@/lib/module-lifecycle';
import { ModuleLauncherTile } from '@/components/organization-admin/module-launcher-tile';
import { ModuleEnrollmentPanel } from '@/components/organization-admin/module-enrollment-panel';

async function openModule(mod: LicensedModule) {
  if (!mod.frontendUrl) return;

  const user = getStoredUser();
  let token = getAccessToken();
  if (getRefreshToken()) {
    try {
      const { data } = await api.post('/auth/refresh', { refreshToken: getRefreshToken() });
      token = data.data.accessToken;
      localStorage.setItem('accessToken', token!);
    } catch {
      window.location.href = '/login';
      return;
    }
  }

  if (!token) {
    window.location.href = '/login';
    return;
  }

  const roles: string[] = user?.roles ?? [];
  const isOrgAdmin = roles.includes('organization_admin');
  const url = buildModuleLaunchUrl(mod, token, {
    refreshToken: getRefreshToken(),
    isOrgAdmin,
  });
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function StatItem({
  label,
  value,
  loading,
  accent,
  dotClass,
}: {
  label: string;
  value: number;
  loading: boolean;
  accent?: 'default' | 'success' | 'info' | 'warning';
  dotClass?: string;
}) {
  const valueClass =
    accent === 'success'
      ? 'text-emerald-600'
      : accent === 'info'
        ? 'text-sky-600'
        : accent === 'warning'
          ? 'text-amber-600'
          : 'text-navy';

  return (
    <div className="flex flex-1 flex-col items-center px-2 py-3.5 text-center sm:px-4 sm:py-4">
      <div className="flex items-center gap-1.5">
        {dotClass && (
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} aria-hidden />
        )}
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted sm:text-[11px]">
          {label}
        </p>
      </div>
      <p className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${valueClass}`}>
        {loading ? '—' : value}
      </p>
    </div>
  );
}

const STAT_KEYS: {
  key: keyof ReturnType<typeof countModulesByLifecycle>;
  label: string;
  accent?: 'default' | 'success' | 'info' | 'warning';
  status?: ModuleLifecycleStatus;
}[] = [
  { key: 'total', label: 'Total', accent: 'default' },
  { key: 'active', label: 'Active', accent: 'success', status: 'active' },
  { key: 'provisioning', label: 'Provisioning', accent: 'info', status: 'provisioning' },
  { key: 'pending_activation', label: 'Pending', accent: 'warning', status: 'pending_activation' },
];

export default function OrganizationAdminDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [greeting, setGreeting] = useState('Hello');
  const [modules, setModules] = useState<LicensedModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);

  const loadModules = useCallback(async () => {
    setError('');
    try {
      const res = await api.get('/iam/me/modules');
      setModules(res.data.data);
    } catch (err: unknown) {
      const offline =
        (err as { code?: string; message?: string })?.code === 'ERR_NETWORK' ||
        (err as { message?: string })?.message?.includes('Network Error');
      setError(
        offline
          ? 'Could not reach the IAM API. Start Authentication Backend on port 3001, then refresh.'
          : 'Could not load your assigned modules.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUser(getStoredUser());
    setGreeting(getGreeting());
    void loadModules();
  }, [loadModules]);

  const stats = useMemo(() => countModulesByLifecycle(modules), [modules]);
  const moduleGroups = useMemo(() => groupModulesByLifecycle(modules), [modules]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-1 sm:space-y-8 sm:px-0">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-montserrat text-xl font-bold text-navy sm:text-2xl">
              {greeting}, {user?.firstName ?? 'Admin'}
            </h1>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setEnrollmentOpen(true)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-navy shadow-sm transition hover:brightness-105 sm:flex-none sm:px-4 sm:py-2.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add modules
            </button>
            <Link
              href="/organization-admin/users"
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-white/80 px-3 py-2 text-sm font-semibold text-navy backdrop-blur-sm transition hover:bg-white sm:flex-none sm:px-4 sm:py-2.5"
            >
              Users
            </Link>
          </div>
        </div>

        <div className="divide-x divide-border rounded-xl border border-border/80 bg-white/85 shadow-sm backdrop-blur-sm">
          <div className="grid grid-cols-2 sm:flex">
            {STAT_KEYS.map(({ key, label, accent, status }) => (
              <StatItem
                key={key}
                label={label}
                value={stats[key]}
                loading={loading}
                accent={accent}
                dotClass={status ? MODULE_LIFECYCLE_META[status].dotClass : undefined}
              />
            ))}
          </div>
        </div>
      </header>

      <section className="space-y-6">
        <h2 className="text-sm font-semibold text-navy sm:text-base">Applications</h2>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-white sm:h-40" />
            ))}
          </div>
        ) : modules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center">
            <p className="text-sm font-medium text-navy">No modules yet</p>
            <button
              type="button"
              onClick={() => setEnrollmentOpen(true)}
              className="mt-3 text-sm font-semibold text-primary hover:underline"
            >
              Add your first module
            </button>
          </div>
        ) : (
          moduleGroups.map(({ status, meta, modules: groupModules }) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dotClass}`} aria-hidden />
                <h3 className="text-xs font-medium text-navy sm:text-sm">
                  {meta.label}
                  <span className="ml-1.5 font-normal text-muted">({groupModules.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {groupModules.map((mod) => (
                  <ModuleLauncherTile key={mod.slug} mod={mod} onOpen={openModule} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <ModuleEnrollmentPanel
        open={enrollmentOpen}
        onClose={() => setEnrollmentOpen(false)}
        onEnrolled={() => void loadModules()}
      />
    </div>
  );
}
