'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { AssetsPageHeader } from '@/components/assets-page-header';
import { AssetsSidebar } from '@/components/assets-sidebar';
import { performAssetsSignOut } from '@/utils/sign-out';

export function AssetsAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { summary } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-bg min-h-screen">
      <AssetsSidebar
        open={open}
        onClose={() => setOpen(false)}
        orgName={summary?.organizationName ?? 'Loading…'}
        onLogout={() => void performAssetsSignOut()}
      />

      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[272px]">
        <AssetsPageHeader onMenuOpen={() => setOpen(true)} />
        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
