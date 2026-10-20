'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { DisciplinePageHeader } from '@/components/discipline-page-header';
import { DisciplineSidebar } from '@/components/discipline-sidebar';
import { GateOnlyRedirect } from '@/components/gate-only-redirect';
import { performDisciplineSignOut } from '@/utils/sign-out';

export function DisciplineAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { summary } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-bg min-h-screen">
      <GateOnlyRedirect />
      <DisciplineSidebar
        open={open}
        onClose={() => setOpen(false)}
        orgName={summary?.organizationName ?? 'Loading…'}
        onLogout={() => void performDisciplineSignOut()}
      />
      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[272px]">
        <DisciplinePageHeader onMenuOpen={() => setOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
