'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getStoredUser, type AuthUser } from '@/lib/auth';
import { SidebarBrand } from '@/components/platform/sidebar-brand';
import { SidebarLogoutButton } from '@/components/platform/sidebar-logout-button';
import { RepSidebarNav } from '@/components/school-representative/rep-sidebar-nav';
import { CA_SIDEBAR } from './ca-sidebar-config';
import { CaProvider, useCaContext } from './ca-context';

function ShellHeader({ user, fullName, initials }: { user: AuthUser | null; fullName: string; initials: string }) {
  const { organizations, orgScope, setOrgScope, academicYear, financialPeriod } = useCaContext();
  const [profileOpen, setProfileOpen] = useState(false);

  const selectedLabel =
    orgScope === 'all'
      ? `All schools (${organizations.length})`
      : (organizations.find((s) => s.id === orgScope)?.name ?? 'School');

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-white/90 backdrop-blur-xl">
      <div className="relative flex min-h-[56px] flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-end sm:px-6">
        <div className="flex flex-wrap items-center gap-2 sm:absolute sm:inset-0 sm:justify-center sm:px-24">
          <div className="flex max-w-full flex-wrap items-center gap-2 rounded-2xl border border-border bg-[#f8f9fc] px-3 py-2 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Workspace</span>
            <select
              value={orgScope}
              onChange={(e) => setOrgScope(e.target.value as 'all' | string)}
              aria-label="Switch organization"
              className="max-w-[200px] truncate bg-transparent text-sm font-semibold text-navy outline-none sm:max-w-[240px]"
            >
              <option value="all">All assigned ({organizations.length})</option>
              {organizations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="hidden text-xs text-muted lg:inline">{academicYear}</span>
            <span className="hidden text-xs text-muted xl:inline">· {financialPeriod}</span>
          </div>
          <span className="truncate text-xs text-muted sm:hidden" title={selectedLabel}>
            {selectedLabel}
          </span>
        </div>
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-border px-2 py-1.5 text-sm font-semibold text-navy hover:bg-slate-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-xs font-bold text-primary">
              {initials}
            </span>
            <span className="hidden max-w-[120px] truncate sm:inline">{fullName}</span>
          </button>
          {profileOpen ? (
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-border bg-white py-1 shadow-lg">
              <p className="px-3 py-2 text-xs text-muted">Chief Accountant</p>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-navy hover:bg-slate-50"
                onClick={() => {
                  setProfileOpen(false);
                  window.location.href = '/change-password';
                }}
              >
                Change password
              </button>
            </div>
          ) : null}
        </div>
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
  }, [pathname]);

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Chief Accountant';
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'CA'
    : 'CA';

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
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[min(280px,88vw)] flex-col bg-navy shadow-2xl transition-transform duration-300 lg:w-[280px] lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="shrink-0 border-b border-white/10 px-5 py-5">
          <SidebarBrand href="/chief-accountant" subtitle="Finance Management" variant="dark" />
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">Active</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <RepSidebarNav pathname={pathname} onNavigate={() => setSidebarOpen(false)} config={CA_SIDEBAR} />
        </div>
        <SidebarLogoutButton fullName={fullName} onLogout={handleLogout} />
      </aside>
      <div className="flex min-h-screen flex-col lg:ml-[280px]">
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
          <span className="text-sm font-semibold text-navy">ShulePlus Finance</span>
        </div>
        <ShellHeader user={user} fullName={fullName} initials={initials} />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

export function ChiefAccountantShell({ children }: { children: ReactNode }) {
  return (
    <CaProvider>
      <ShellInner>{children}</ShellInner>
    </CaProvider>
  );
}
