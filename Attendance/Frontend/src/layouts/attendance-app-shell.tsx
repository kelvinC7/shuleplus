'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AttendancePageHeader } from '@/components/attendance-page-header';
import { AttendanceSidebar } from '@/components/attendance-sidebar';
import { performAttendanceSignOut } from '@/utils/sign-out';
import { useAuth } from '@/contexts/auth-context';
import { cleanDisplayText } from '@/utils/clean-display';

export function AttendanceAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { organizationName } = useAuth();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-bg min-h-screen">
      <AttendanceSidebar
        open={open}
        onClose={() => setOpen(false)}
        orgName={cleanDisplayText(organizationName, 'School')}
        onLogout={() => void performAttendanceSignOut()}
      />
      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[272px]">
        <AttendancePageHeader onMenuOpen={() => setOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
