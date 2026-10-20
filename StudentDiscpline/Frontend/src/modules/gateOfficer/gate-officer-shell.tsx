'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { GATE_OFFICER_NAV_ITEMS, isDisciplineNavActive } from '@/config/discipline-nav';
import { useAuth } from '@/contexts/auth-context';
import { DisciplineSidebarNavLink } from '@/components/discipline-sidebar-nav';
import { DisciplinePageHeader } from '@/components/discipline-page-header';
import { GateOnlyRedirect } from '@/components/gate-only-redirect';
import { SignOutControl } from '@/components/sign-out-control';
import { performDisciplineSignOut } from '@/utils/sign-out';

/** Dedicated sidebar + shell for gate officers only (Student Discipline /gate portal). */
export function GateOfficerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { summary, gateOfficer } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-bg min-h-screen">
      <GateOnlyRedirect />

      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-[#000435]/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`platform-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(272px,88vw)] flex-col bg-[#000435] shadow-2xl transition-transform duration-300 lg:w-[272px] lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Gate management navigation"
      >
        <div className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-5 sm:py-5">
          <Link href="/gate" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fcb038]/70">
            <Image src="/logo.png" alt="Shule+" width={140} height={42} className="h-8 w-auto brightness-0 invert sm:h-9" priority />
          </Link>
          <p className="mt-1.5 text-[11px] font-medium tracking-wide text-white/45">student discipline · gate</p>
          <p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#fcb038]/90">
            {summary?.organizationName ?? 'Loading…'}
          </p>
          {gateOfficer ? (
            <p className="mt-1 truncate text-xs text-white/70">{gateOfficer.fullName}</p>
          ) : null}
        </div>

        <nav className="hr-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-3 sm:py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Gate Officers</p>
          <ul className="ml-3 space-y-0.5 border-l border-white/10 pl-3">
            {GATE_OFFICER_NAV_ITEMS.map((item) => (
              <DisciplineSidebarNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={isDisciplineNavActive(pathname, item.href)}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3 sm:p-4">
          <SignOutControl variant="sidebar" onLogout={() => void performDisciplineSignOut()} />
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[272px]">
        <DisciplinePageHeader onMenuOpen={() => setOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
