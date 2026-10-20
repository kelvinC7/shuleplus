'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PayrollPageHeader } from '@/components/payroll-page-header';
import { PayrollSidebar } from '@/components/payroll-sidebar';
import { performPayrollSignOut } from '@/utils/sign-out';

export function PayrollAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { summary } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-bg min-h-screen">
      <PayrollSidebar
        open={open}
        onClose={() => setOpen(false)}
        orgName={String(summary?.organizationName ?? 'Loading…')}
        onLogout={() => void performPayrollSignOut()}
      />

      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden lg:ml-[272px]">
        <PayrollPageHeader onMenuOpen={() => setOpen(true)} />
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
