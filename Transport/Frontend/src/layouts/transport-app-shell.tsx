'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { TransportPageHeader } from '@/components/transport-page-header';
import { TransportSidebar } from '@/components/transport-sidebar';
import { performAttendanceSignOut } from '@/utils/sign-out';
import { useAuth } from '@/contexts/auth-context';

export function TransportAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { organizationName } = useAuth();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-bg min-h-screen">
      <TransportSidebar
        open={open}
        onClose={() => setOpen(false)}
        orgName={organizationName ?? 'School'}
        onLogout={() => void performAttendanceSignOut()}
      />
      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[272px]">
        <TransportPageHeader onMenuOpen={() => setOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
