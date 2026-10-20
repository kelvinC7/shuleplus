'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  isOrganizationAdmin,
  isPlatformAdmin,
  resolvePostLoginRoute,
  type AuthUser,
} from '@/lib/auth';
import type { LicensedModule } from '@/lib/modules';
import { buildModuleLaunchUrl, buildGateOfficerModuleUrl, tryLaunchGateOfficerPortal } from '@/lib/module-launch';
import {
  countModulesByLifecycle,
  groupModulesByLifecycle,
  MODULE_LIFECYCLE_META,
  type ModuleLifecycleStatus,
} from '@/lib/module-lifecycle';
import { ModuleLauncherTile } from '@/components/organization-admin/module-launcher-tile';
import { useToast } from '@/shared/notifications';

async function getFreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      const { data } = await api.post('/auth/refresh', { refreshToken });
      const token = data.data.accessToken as string;
      localStorage.setItem('accessToken', token);
      return token;
    } catch {
      return getAccessToken();
    }
  }
  return getAccessToken();
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
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

export default function PostLoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [greeting, setGreeting] = useState('Hello');
  const [modules, setModules] = useState<LicensedModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const loadModules = useCallback(async () => {
    try {
      const { data } = await api.get<{ success: boolean; data: LicensedModule[] }>('/iam/me/modules');
      const assigned = (data.data ?? []).filter((m) => m.slug !== 'shulekit-mis');
      setModules(assigned);

      if (assigned.length === 0) {
        setLoading(false);
        return;
      }

      const storedUser = getStoredUser();
      if (storedUser?.defaultLaunch?.entryPath && storedUser.defaultLaunch.frontendUrl) {
        setRedirecting(true);
        const token = await getFreshAccessToken();
        if (!token) {
          clearSession();
          router.replace('/login');
          return;
        }
        const url = buildModuleLaunchUrl(
          {
            slug: storedUser.defaultLaunch.slug,
            name: storedUser.defaultLaunch.name,
            frontendUrl: storedUser.defaultLaunch.frontendUrl,
          },
          token,
          { refreshToken: getRefreshToken(), entryPath: storedUser.defaultLaunch.entryPath },
        );
        if (url) {
          window.location.href = url;
          return;
        }
      }

      const withUrls = assigned.filter((m) => m.frontendUrl);
      if (withUrls.length === 1) {
        setRedirecting(true);
        const token = await getFreshAccessToken();
        if (!token) {
          clearSession();
          router.replace('/login');
          return;
        }
        const url = buildModuleLaunchUrl(withUrls[0], token, {
          refreshToken: getRefreshToken(),
        });
        if (url) {
          window.location.href = url;
          return;
        }
      }

      setLoading(false);
    } catch {
      toast.error(
        'Could not load your assigned modules. Contact your organization admin.',
        'Load failed'
      );
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace('/login');
      return;
    }

    const adminRoute = resolvePostLoginRoute(stored);
    if (adminRoute !== '/post-login') {
      router.replace(adminRoute);
      return;
    }

    if (isPlatformAdmin(stored) || isOrganizationAdmin(stored)) {
      router.replace(stored.dashboardRoute ?? '/organization-admin');
      return;
    }

    setUser(stored);
    setGreeting(getGreeting());

    void (async () => {
      if (stored.gateOfficerLaunch) {
        setRedirecting(true);
        const token = await getFreshAccessToken();
        if (token && tryLaunchGateOfficerPortal(stored, token, getRefreshToken())) {
          return;
        }
        setRedirecting(false);
      }
      await loadModules();
    })();
  }, [loadModules, router]);

  async function openModule(mod: LicensedModule) {
    const token = await getFreshAccessToken();
    if (!token) {
      clearSession();
      router.replace('/login');
      return;
    }
    const url = buildGateOfficerModuleUrl(mod, token, getRefreshToken(), user);
    if (!url) {
      toast.error(`${mod.name} has no frontend URL configured yet.`, 'Unavailable');
      return;
    }
    window.location.href = url;
  }

  const orgName = user?.organization?.name ?? 'Your organization';
  const stats = useMemo(() => countModulesByLifecycle(modules), [modules]);
  const moduleGroups = useMemo(() => groupModulesByLifecycle(modules), [modules]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted">
        Preparing your workspace…
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-border bg-white/85 px-6 py-12 text-center shadow-sm backdrop-blur-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-navy">Opening your application…</p>
          <p className="mt-1 text-xs text-muted">You will be redirected automatically.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-1 sm:space-y-8 sm:px-0">
      <header className="space-y-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-primary">{orgName}</p>
          <h1 className="mt-0.5 font-montserrat text-xl font-bold text-navy sm:text-2xl">
            {greeting}, {user.firstName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Choose a module to open. Access follows your module role (Head vs User).
          </p>
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

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-white sm:h-40" />
            ))}
          </div>
        ) : modules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center">
            <p className="text-sm font-medium text-navy">No applications assigned</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Your account is active, but no modules are assigned yet. Ask your organization admin
              to grant access from Users & Access.
            </p>
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
    </div>
  );
}
