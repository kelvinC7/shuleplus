'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { TimetableTabProvider } from '@/contexts/timetable-tab-context';
import { TimetablePageHeader } from '@/components/timetable-page-header';
import { TimetableSidebar } from '@/components/timetable-sidebar';
import { performTimetableSignOut } from '@/utils/sign-out';

export function TimetableAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { summary } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <TimetableTabProvider>
      <div className="dashboard-bg min-h-screen">
        <TimetableSidebar
          open={open}
          onClose={() => setOpen(false)}
          orgName={summary?.organizationName ?? 'Loading…'}
          onLogout={() => void performTimetableSignOut()}
        />

        <div className="flex min-h-screen min-w-0 flex-col lg:ml-[272px]">
          <TimetablePageHeader onMenuOpen={() => setOpen(true)} />
          <main className="flex-1 bg-white px-4 py-5 sm:px-6 sm:py-6 lg:max-w-[1600px]">{children}</main>
        </div>
      </div>
    </TimetableTabProvider>
  );
}
