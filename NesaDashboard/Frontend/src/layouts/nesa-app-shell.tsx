'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { NesaPageHeader } from '@/components/nesa-page-header';
import { NesaSidebar } from '@/components/nesa-sidebar';

export function NesaAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { summary, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-bg min-h-screen">
      <NesaSidebar
        open={open}
        onClose={() => setOpen(false)}
        orgName={summary?.organizationName ?? 'NESA Rwanda'}
        onLogout={logout}
      />
      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[272px]">
        <NesaPageHeader onMenuOpen={() => setOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
