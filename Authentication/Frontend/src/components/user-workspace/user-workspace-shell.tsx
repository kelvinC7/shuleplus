'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getStoredUser, type AuthUser } from '@/lib/auth';
import { NotificationBell } from '@/shared/notifications';
import { MountedOnly } from '@/components/ui/mounted-only';
import { SidebarBrand } from '@/components/platform/sidebar-brand';

interface UserWorkspaceShellProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: '/post-login', label: 'Applications', icon: 'apps' },
] as const;

function NavIcon({ name }: { name: string }) {
  if (name === 'apps') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  return null;
}

export function UserWorkspaceShell({ children }: UserWorkspaceShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const orgName = user?.organization?.name ?? 'Organization';
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'User';
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'U'
    : 'U';

  function handleLogout() {
    clearSession();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen">
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
          <SidebarBrand href="/post-login" subtitle={orgName} />
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
            Workspace
          </p>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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

        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="rounded-2xl bg-white/[0.06] p-4">
            <p className="text-xs font-semibold text-white">Your workspace</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/50">
              Open the applications assigned to your account by your organization admin.
            </p>
          </div>
        </div>
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

            <MountedOnly fallback={<div className="h-10 w-10 shrink-0 rounded-full bg-navy/5" />}>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <NotificationBell userId={user?.id} />

                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((o) => !o)}
                    className="flex items-center gap-2.5 rounded-2xl border border-border bg-white py-1.5 pl-1.5 pr-2.5 transition hover:border-primary/30 hover:shadow-sm sm:pr-3"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-navy-light text-sm font-bold text-primary">
                      {initials}
                    </span>
                    <span className="hidden text-left sm:block">
                      <span className="block max-w-[130px] truncate text-sm font-semibold leading-tight text-navy">
                        {fullName}
                      </span>
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Member
                      </span>
                    </span>
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
                      <div className="border-b border-border bg-[#f8fafc] px-4 py-3">
                        <p className="truncate text-sm font-semibold text-navy">{fullName}</p>
                        <p className="truncate text-xs text-muted">{user?.email ?? '—'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-danger hover:bg-danger/5"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </MountedOnly>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
