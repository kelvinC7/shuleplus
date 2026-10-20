'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, ChevronDown, Bell } from 'lucide-react';

import { SidebarBrand } from '@/components/layout/sidebar-brand';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { ChildSwitcher } from '@/components/layout/child-switcher';
import { useAuth } from '@/contexts/auth-context';
import { clearTokens } from '@/shared/auth-token';
import { SessionAccessDeniedScreen } from '@/components/session-access';
import { cn } from '@/lib/utils';

const BARE_PATHS = ['/login'];

export function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, authorized, summary, user, error, parentName, linkedStudents } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const bare = BARE_PATHS.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`),
  );

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!bare && ready && !user) {
      router.replace('/login');
    }
  }, [bare, ready, user, router]);

  if (bare) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authorized || !user) {
    return (
      <SessionAccessDeniedScreen
        error={error ?? 'Sign in with your parent phone to open Parent Portal.'}
        moduleName="Parent Portal"
        primaryHref="/login"
        primaryLabel="Go to Parent Login"
      />
    );
  }

  const subtitle = summary?.student?.fullName
    ? summary.student.fullName
    : undefined;

  const pageTitle = pathname === '/dashboard' ? 'Dashboard'
    : pathname === '/fees' ? 'Fees & Payments'
    : pathname === '/transactions' ? 'Transactions'
    : pathname === '/timetable' ? 'Timetable'
    : pathname === '/academic' || pathname === '/exams' ? 'Marks'
    : pathname === '/profile' ? 'Profile'
    : pathname === '/communication' ? 'Messages'
    : pathname === '/notifications' ? 'Notifications'
    : pathname === '/documents' ? 'Documents'
    : pathname === '/events' ? 'Events'
    : pathname === '/store' ? 'School Store'
    : pathname === '/shulecard' ? 'ShuleCard'
    : pathname === '/timeline' ? 'Activity Timeline'
    : 'Parent Portal';

  return (
    <div className="dashboard-bg min-h-screen">
      <div className="flex min-h-screen">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-navy/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[272px] shrink-0 flex-col bg-navy shadow-2xl transition-transform duration-300 lg:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
            !desktopOpen && 'lg:hidden'
          )}
        >
          <div className="shrink-0 border-b border-white/10 px-5 py-5">
            <SidebarBrand href="/dashboard" subtitle={subtitle} />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <SidebarNav />
          </div>
          <div className="shrink-0 border-t border-white/10 p-4">
            <button
              onClick={() => { clearTokens(); router.replace('/login'); }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div
          className={cn(
            'flex min-h-screen min-w-0 flex-1 flex-col',
            desktopOpen && 'lg:ml-[272px]'
          )}
        >
          {/* Header */}
          <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border/60 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setMobileOpen(true);
                } else {
                  setDesktopOpen((prev) => !prev);
                }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-white text-navy transition-colors hover:bg-slate-50 lg:hidden"
            >
              <Menu size={18} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Parent Portal</p>
              <h1 className="truncate text-lg font-bold text-navy">{pageTitle}</h1>
            </div>

            <div className="flex items-center gap-2">
              <ChildSwitcher />

              <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-white text-muted transition-colors hover:bg-slate-50 hover:text-navy">
                <Bell size={18} />
                <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-primary text-[8px] font-bold text-navy shadow-sm">3</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((p) => !p)}
                  className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-white px-3 py-2 transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy text-[11px] font-bold text-primary">
                    {(parentName ?? user?.email ?? 'P')[0].toUpperCase()}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-semibold text-navy leading-tight">{parentName || 'Parent'}</p>
                    <p className="text-[10px] text-muted">
                      {linkedStudents.length > 1
                        ? `${linkedStudents.length} children`
                        : user?.roles?.[0] ?? 'parent'}
                    </p>
                  </div>
                  <ChevronDown size={14} className="text-muted" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-border/60 bg-white p-1.5 shadow-soft-lg">
                      <button
                        onClick={() => { setUserMenuOpen(false); window.location.href = '/dashboard'; }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-navy transition-colors hover:bg-slate-50"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => { clearTokens(); router.replace('/login'); }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-danger transition-colors hover:bg-red-50"
                      >
                        <LogOut size={15} />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
