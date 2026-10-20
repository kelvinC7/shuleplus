'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getStoredUser, type AuthUser } from '@/lib/auth';
import { NotificationBell } from '@/shared/notifications';
import { MountedOnly } from '@/components/ui/mounted-only';
import { SidebarBrand } from '@/components/platform/sidebar-brand';
import { PlatformProfileMenu } from '@/components/platform/platform-profile-menu';
import { SidebarLogoutButton } from '@/components/platform/sidebar-logout-button';
import { ROOT_ADMIN_SIDEBAR } from './nav-config';
import { PlatformSidebarNav } from '../platform/platform-sidebar-nav';

interface RootAdminShellProps {
  children: React.ReactNode;
}

function breadcrumbLabel(pathname: string): string {
  if (pathname === '/root-admin') return 'Dashboard';
  const all = [
    ...(ROOT_ADMIN_SIDEBAR.standalone ?? []),
    ...ROOT_ADMIN_SIDEBAR.sections.flatMap((s) => s.items),
  ];
  const match = all.find((item) =>
    item.href === '/root-admin' ? pathname === item.href : pathname.startsWith(item.href)
  );
  return match?.label ?? 'Root Admin';
}

export function RootAdminShell({ children }: RootAdminShellProps) {
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

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Root Admin';
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'R'
    : 'R';

  const pageTitle = useMemo(() => breadcrumbLabel(pathname), [pathname]);

  return (
    <div className="dashboard-bg flex min-h-screen">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-navy/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] flex-col bg-navy shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="shrink-0 border-b border-white/10 px-5 py-5">
          <SidebarBrand href="/root-admin" subtitle="Root Admin" variant="dark" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <PlatformSidebarNav config={ROOT_ADMIN_SIDEBAR} pathname={pathname} />
        </div>

        <SidebarLogoutButton fullName={fullName} onLogout={handleLogout} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-white/95 px-4 py-3 shadow-[0_1px_0_rgba(0,4,53,0.04)] backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="rounded-xl border border-border p-2 text-navy transition hover:border-primary/40 lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Root Admin</p>
                <p className="truncate font-semibold text-navy">{pageTitle}</p>
              </div>
            </div>

            <MountedOnly
              fallback={
                <div className="flex items-center gap-2">
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
                  roleLabel="Root Admin"
                  open={menuOpen}
                  onToggle={() => setMenuOpen((o) => !o)}
                  onClose={() => setMenuOpen(false)}
                  links={[
                    { href: '/change-password', label: 'Change password', icon: 'lock' },
                    { href: '/root-admin/settings', label: 'Settings', icon: 'settings' },
                    { href: '/root-admin', label: 'Dashboard', icon: 'home' },
                  ]}
                />
              </div>
            </MountedOnly>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>

        <footer className="shrink-0 border-t border-border/60 px-6 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-navy/60">
            Managed by <span className="text-primary">EDUPOTO</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
