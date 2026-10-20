'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { TeacherPageHeader } from '@/components/teacher-page-header';
import { TeacherSidebar } from '@/components/teacher-sidebar';
import { PeriodNotifications } from '@/components/period-transition-banner';
import { performTeacherSignOut } from '@/utils/sign-out';

export function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { summary, avanceAccess } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-bg min-h-screen">
      <TeacherSidebar
        open={open}
        onClose={() => setOpen(false)}
        orgName={summary?.organizationName ?? 'Loading…'}
        avanceAccess={avanceAccess}
        onLogout={() => void performTeacherSignOut()}
      />

      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[272px]">
        <TeacherPageHeader onMenuOpen={() => setOpen(true)} />
        <PeriodNotifications />
        <main className="flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
