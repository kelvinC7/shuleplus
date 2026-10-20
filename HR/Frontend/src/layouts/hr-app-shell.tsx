'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { HrPageHeader } from '@/components/hr-page-header';
import { HrSidebar } from '@/components/hr-sidebar';
import { performHrSignOut } from '@/utils/sign-out';

export function HrAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { summary } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-bg min-h-screen">
      <HrSidebar
        open={open}
        onClose={() => setOpen(false)}
        orgName={summary?.organizationName ?? 'Loading…'}
        onLogout={() => void performHrSignOut()}
      />

      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[272px]">
        <HrPageHeader onMenuOpen={() => setOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
