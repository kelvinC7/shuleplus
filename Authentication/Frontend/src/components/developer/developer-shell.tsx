'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  clearDeveloperSession,
  getDeveloperUser,
  setDeveloperSession,
  type DeveloperUser,
} from '@/lib/developer-auth';
import { fetchDeveloperMe } from '@/lib/developer-api';
import { MountedOnly } from '@/components/ui/mounted-only';
import { SidebarBrand } from '@/components/platform/sidebar-brand';
import { SidebarLogoutButton } from '@/components/platform/sidebar-logout-button';
import { PlatformSidebarNav } from '@/components/platform/platform-sidebar-nav';
import { DEVELOPER_SIDEBAR, developerPageTitle } from './nav-config';

export type DeveloperEnvironment = 'SANDBOX' | 'PRODUCTION';

type DeveloperPortalContextValue = {
  user: DeveloperUser | null;
  environment: DeveloperEnvironment;
  setEnvironment: (env: DeveloperEnvironment) => void;
  refreshUser: () => Promise<void>;
};

const DeveloperPortalContext = createContext<DeveloperPortalContextValue | null>(null);

export function useDeveloperPortal() {
  const ctx = useContext(DeveloperPortalContext);
  if (!ctx) throw new Error('useDeveloperPortal must be used within DeveloperShell');
  return ctx;
}

const ENV_STORAGE_KEY = 'developerPortalEnvironment';

function readStoredEnvironment(user: DeveloperUser | null): DeveloperEnvironment {
  if (typeof window === 'undefined') return 'SANDBOX';
  const stored = localStorage.getItem(ENV_STORAGE_KEY) as DeveloperEnvironment | null;
  if (stored === 'PRODUCTION' && user?.allowedEnvironments.includes('PRODUCTION')) return 'PRODUCTION';
  return 'SANDBOX';
}

export function DeveloperShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<DeveloperUser | null>(null);
  const [environment, setEnvironmentState] = useState<DeveloperEnvironment>('SANDBOX');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const me = await fetchDeveloperMe();
      const token = localStorage.getItem('developerAccessToken');
      const refresh = localStorage.getItem('developerRefreshToken');
      if (token && refresh) {
        setDeveloperSession(token, refresh, me);
      }
      setUser(me);
      setEnvironmentState(readStoredEnvironment(me));
    } catch {
      setUser(getDeveloperUser());
    }
  }, []);

  useEffect(() => {
    const stored = getDeveloperUser();
    setUser(stored);
    setEnvironmentState(readStoredEnvironment(stored));
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  function setEnvironment(env: DeveloperEnvironment) {
    if (env === 'PRODUCTION' && !user?.allowedEnvironments.includes('PRODUCTION')) return;
    setEnvironmentState(env);
    localStorage.setItem(ENV_STORAGE_KEY, env);
  }

  function handleLogout() {
    clearDeveloperSession();
    router.replace('/developers/login');
  }

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Developer';
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'D'
    : 'D';
  const pageTitle = useMemo(() => developerPageTitle(pathname), [pathname]);
  const canUseProduction = user?.allowedEnvironments.includes('PRODUCTION') ?? false;

  return (
    <DeveloperPortalContext.Provider value={{ user, environment, setEnvironment, refreshUser }}>
      <div className="dashboard-bg min-h-screen">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-navy/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] flex-col bg-navy shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="shrink-0 border-b border-white/10 px-5 py-5">
            <SidebarBrand href="/developers" subtitle="Developer Portal" variant="dark" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <PlatformSidebarNav config={DEVELOPER_SIDEBAR} pathname={pathname} />
          </div>

          <SidebarLogoutButton fullName={fullName} onLogout={handleLogout} />
        </aside>

        <div className="flex min-h-screen flex-col lg:ml-[260px]">
          <header className="sticky top-0 z-30 border-b border-border/60 bg-white/95 shadow-[0_1px_0_rgba(0,4,53,0.04)] backdrop-blur-xl">
            <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
              <button
                type="button"
                className="shrink-0 rounded-xl border border-border p-2 text-navy transition hover:border-primary/40 lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </button>

              <div className="hidden min-w-0 shrink-0 sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Developer Portal</p>
                <p className="truncate font-semibold text-navy">{pageTitle}</p>
              </div>

              <div className="hidden h-8 w-px bg-border lg:block" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy">{user?.partner.name ?? 'Partner organization'}</p>
                <p className="truncate text-xs text-muted">{user?.email ?? ''}</p>
              </div>

              <MountedOnly
                fallback={<div className="h-10 w-10 rounded-full bg-navy/5" />}
              >
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as DeveloperEnvironment)}
                    className="rounded-xl border border-border bg-[#f4f6fb] px-3 py-2 text-sm font-medium text-navy outline-none focus:border-primary/50"
                    aria-label="API environment"
                  >
                    <option value="SANDBOX">Sandbox</option>
                    <option value="PRODUCTION" disabled={!canUseProduction}>
                      Production{canUseProduction ? '' : ' (not assigned)'}
                    </option>
                  </select>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-primary"
                    title={fullName}
                  >
                    {initials}
                  </div>
                </div>
              </MountedOnly>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        </div>
      </div>
    </DeveloperPortalContext.Provider>
  );
}

export { StatCard, PageHeader, EmptyState } from './developer-page-ui';
