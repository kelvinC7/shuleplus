'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getStoredUser, type AuthUser } from '@/lib/auth';
import { SidebarBrand } from '@/components/platform/sidebar-brand';
import { SidebarLogoutButton } from '@/components/platform/sidebar-logout-button';
import { RepProvider, useRepContext } from './rep-context';
import { RepSidebarNav } from './rep-sidebar-nav';
import { RepProfileMenu } from './rep-profile-menu';

function ShellHeader({
  user,
  fullName,
  initials,
}: {
  user: AuthUser | null;
  fullName: string;
  initials: string;
}) {
  const { schools, schoolScope, setSchoolScope } = useRepContext();
  const [profileOpen, setProfileOpen] = useState(false);

  const selectedLabel =
    schoolScope === 'all'
      ? `All schools (${schools.length})`
      : (schools.find((s) => s.id === schoolScope)?.name ?? 'School');

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-white/90 backdrop-blur-xl">
      <div className="relative flex min-h-[56px] items-center justify-end px-4 py-2.5 sm:px-6">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-14 sm:px-24">
          <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-2xl border border-border bg-[#f8f9fc] px-3 py-2 shadow-sm">
            <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted sm:inline">
              Quick switch
            </span>
            <select
              value={schoolScope}
              onChange={(e) => setSchoolScope(e.target.value as 'all' | string)}
              aria-label="Switch assigned school"
              className="max-w-[min(100%,220px)] truncate bg-transparent text-sm font-semibold text-navy outline-none sm:max-w-[280px]"
            >
              <option value="all">All schools ({schools.length})</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="hidden max-w-[140px] truncate text-xs text-muted lg:inline" title={selectedLabel}>
              {selectedLabel}
            </span>
          </div>
        </div>

        <RepProfileMenu
          user={user}
          fullName={fullName}
          initials={initials}
          open={profileOpen}
          onToggle={() => setProfileOpen((v) => !v)}
          onClose={() => setProfileOpen(false)}
        />
      </div>
    </header>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Representative';
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'RP'
    : 'RP';

  function handleLogout() {
    clearSession();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-[#eef1f8]">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-navy/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[min(272px,88vw)] flex-col bg-navy shadow-2xl transition-transform duration-300 lg:w-[272px] lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="shrink-0 border-b border-white/10 px-5 py-5">
          <SidebarBrand href="/school-representative" subtitle="Representative Portal" variant="dark" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <RepSidebarNav pathname={pathname} onNavigate={() => setSidebarOpen(false)} />
        </div>
        <SidebarLogoutButton fullName={fullName} onLogout={handleLogout} />
      </aside>

      <div className="flex min-h-screen flex-col lg:ml-[272px]">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-white px-4 py-2 lg:hidden">
          <button
            type="button"
            className="rounded-xl border border-border p-2 text-navy"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-navy">ShulePlus Representative</span>
        </div>
        <ShellHeader user={user} fullName={fullName} initials={initials} />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

export function RepresentativeShell({ children }: { children: ReactNode }) {
  return (
    <RepProvider>
      <ShellInner>{children}</ShellInner>
    </RepProvider>
  );
}
