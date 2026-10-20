'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ProcurementPageHeader } from '@/components/procurement-page-header';
import { ProcurementSidebar } from '@/components/procurement-sidebar';
import { isManageUserAllowedPath } from '@/utils/permissions';

export function ProcurementAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isManageUser } = useAuth();
  const [open, setOpen] = useState(false);

  const orgName =
    user?.email?.split('@')[0]?.replace(/[._-]/g, ' ') ?? 'Organization';

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isManageUser) return;
    if (!isManageUserAllowedPath(pathname)) {
      router.replace('/dashboard');
    }
  }, [isManageUser, pathname, router]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="dashboard-bg min-h-screen">
      <ProcurementSidebar
        open={open}
        onClose={() => setOpen(false)}
        orgName={orgName}
      />

      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[272px]">
        <ProcurementPageHeader onMenuOpen={() => setOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
