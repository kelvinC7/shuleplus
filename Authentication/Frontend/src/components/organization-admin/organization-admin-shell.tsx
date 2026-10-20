'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getStoredUser, type AuthUser } from '@/lib/auth';
import { NotificationBell, useNotificationCenter } from '@/shared/notifications';
import { MountedOnly } from '@/components/ui/mounted-only';
import { SidebarBrand } from '@/components/platform/sidebar-brand';
import { OrgAdminProfileMenu } from '@/components/organization-admin/org-admin-profile-menu';
import { SidebarLogoutButton } from '@/components/platform/sidebar-logout-button';
import { ModuleStatusModal } from '@/components/organization-admin/module-status-modal';
import { useOrgModuleAlerts } from '@/hooks/use-org-module-alerts';

interface OrganizationAdminShellProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: '/organization-admin', label: 'Home', icon: 'home' },
  { href: '/organization-admin/admissions', label: 'Admissions', icon: 'admissions' },
  { href: '/organization-admin/users', label: 'Users & Access', icon: 'users' },
  { href: '/organization-admin/settings', label: 'Settings', icon: 'settings' },
] as const;

function NavIcon({ name }: { name: string }) {
  if (name === 'home') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z" />
      </svg>
    );
  }
  if (name === 'users') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (name === 'admissions') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" />
      </svg>
    );
  }
  if (name === 'settings') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    );
  }
  return null;
}

function ModuleAlertsSync({
  notifications,
}: {
  notifications: ReturnType<typeof useOrgModuleAlerts>['notifications'];
}) {
  const { setOverlayItems } = useNotificationCenter();

  useEffect(() => {
    setOverlayItems(notifications);
  }, [notifications, setOverlayItems]);

  return null;
}

export function OrganizationAdminShell({ children }: OrganizationAdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { alertState, notifications, showModal, dismissModal } = useOrgModuleAlerts(Boolean(user));

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const orgName = user?.organization?.name ?? 'Organization';
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Administrator';
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'A'
    : 'A';

  function handleLogout() {
    clearSession();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen">
      <ModuleAlertsSync notifications={notifications} />

      {showModal && alertState ? (
        <ModuleStatusModal state={alertState} onDismiss={dismissModal} />
      ) : null}

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
          <SidebarBrand href="/organization-admin" subtitle={orgName} variant="dark" />
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
            Workspace
          </p>
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === '/organization-admin'
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
                  active
                    ? 'bg-primary text-navy shadow-md shadow-primary/20'
                    : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <span className={active ? 'text-navy' : 'text-white/45'}>
                  <NavIcon name={item.icon} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <SidebarLogoutButton fullName={fullName} onLogout={handleLogout} />
      </aside>

      <div className="org-admin-page-bg flex min-h-screen flex-col lg:ml-[260px]">
        <header className="sticky top-0 z-30 border-b border-white/40 bg-white/75 shadow-[0_1px_0_rgba(0,4,53,0.04)] backdrop-blur-xl">
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Organization</p>
              <p className="truncate font-semibold text-navy" suppressHydrationWarning>
                {orgName}
              </p>
            </div>

            <div className="hidden h-8 w-px bg-border lg:block" />

            <div className="min-w-0 flex-1">
              <div className="relative mx-auto max-w-md">
                <svg
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="search"
                  placeholder="Search applications…"
                  className="w-full rounded-xl border border-border bg-[#f4f6fb] py-2.5 pl-10 pr-4 text-sm text-navy outline-none transition placeholder:text-muted/70 focus:border-primary/50 focus:bg-white focus:shadow-sm"
                />
              </div>
            </div>

            <MountedOnly
              fallback={<div className="h-10 w-10 shrink-0 rounded-full bg-navy/5" />}
            >
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <NotificationBell userId={user?.id} />
                <OrgAdminProfileMenu
                  user={user}
                  fullName={fullName}
                  initials={initials}
                  open={menuOpen}
                  onToggle={() => setMenuOpen((o) => !o)}
                  onClose={() => setMenuOpen(false)}
                />
              </div>
            </MountedOnly>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
