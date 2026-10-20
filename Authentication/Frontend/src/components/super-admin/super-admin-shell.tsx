'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getStoredUser, type AuthUser } from '@/lib/auth';
import { NotificationBell } from '@/shared/notifications';
import { MountedOnly } from '@/components/ui/mounted-only';
import { SidebarBrand } from '@/components/platform/sidebar-brand';
import { PlatformProfileMenu } from '@/components/platform/platform-profile-menu';
import { SidebarLogoutButton } from '@/components/platform/sidebar-logout-button';
import { SUPER_ADMIN_SIDEBAR } from './nav-config';
import { PlatformSidebarNav } from '../platform/platform-sidebar-nav';

interface SuperAdminShellProps {
  children: React.ReactNode;
}

function breadcrumbLabel(pathname: string): string {
  if (pathname === '/super-admin') return 'Dashboard';
  const all = [
    ...(SUPER_ADMIN_SIDEBAR.standalone ?? []),
    ...SUPER_ADMIN_SIDEBAR.sections.flatMap((s) => s.items),
  ];
  const match = all.find((item) =>
    item.href === '/super-admin' ? pathname === item.href : pathname.startsWith(item.href)
  );
  return match?.label ?? 'Super Admin';
}

export function SuperAdminShell({ children }: SuperAdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  function handleLogout() {
    clearSession();
    router.replace('/login');
  }

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Super Admin';
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'S'
    : 'S';

  const pageTitle = useMemo(() => breadcrumbLabel(pathname), [pathname]);

  return (
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
          <SidebarBrand href="/super-admin" subtitle="Super Admin" variant="dark" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <PlatformSidebarNav config={SUPER_ADMIN_SIDEBAR} pathname={pathname} />
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Super Admin</p>
              <p className="truncate font-semibold text-navy">{pageTitle}</p>
            </div>

            <div className="hidden h-8 w-px bg-border lg:block" />

            <div className="min-w-0 flex-1">
              <div className="relative mx-auto max-w-xl">
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
                  placeholder="Search organizations, modules, or users…"
                  className="w-full rounded-xl border border-border bg-[#f4f6fb] py-2.5 pr-14 pl-10 text-sm text-navy outline-none transition placeholder:text-muted/70 focus:border-primary/50 focus:bg-white focus:shadow-sm"
                />
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted sm:inline">
                  ⌘K
                </kbd>
              </div>
            </div>

            <MountedOnly
              fallback={
                <div className="flex shrink-0 items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-navy/5" />
                </div>
              }
            >
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <NotificationBell userId={user?.id} />
                <PlatformProfileMenu
                  user={user}
                  fullName={fullName}
                  initials={initials}
                  roleLabel="Super Admin"
                  open={menuOpen}
                  onToggle={() => setMenuOpen((o) => !o)}
                  onClose={() => setMenuOpen(false)}
                  links={[
                    { href: '/change-password', label: 'Change password', icon: 'lock' },
                    { href: '/super-admin/profile', label: 'Profile', icon: 'user' },
                    { href: '/super-admin', label: 'Dashboard', icon: 'home' },
                  ]}
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
