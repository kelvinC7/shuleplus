'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PlatformPageHeader } from '@/components/platform-page-header';
import { PlatformSidebar } from '@/components/platform-sidebar';
import { performModuleSignOut } from '@/utils/sign-out';

interface PlatformAppShellProps {
  children: ReactNode;
  searchPlaceholder?: string;
}

export function PlatformAppShell({
  children,
  searchPlaceholder = 'Search products, stores, suppliers…',
}: PlatformAppShellProps) {
  const pathname = usePathname();
  const { summary } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-bg min-h-screen">
      <PlatformSidebar
        open={open}
        onClose={() => setOpen(false)}
        orgName={summary?.organizationName ?? 'Loading…'}
        moduleLabel="inventory"
        onLogout={() => void performModuleSignOut()}
      />

      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[272px]">
        <PlatformPageHeader onMenuOpen={() => setOpen(true)} searchPlaceholder={searchPlaceholder} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
