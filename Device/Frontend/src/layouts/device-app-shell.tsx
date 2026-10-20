'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { DevicePageHeader } from '@/components/device-page-header';
import { DeviceSidebar } from '@/components/device-sidebar';
import { performDeviceSignOut } from '@/utils/sign-out';

function orgDisplayName(organizationName?: string, email?: string): string {
  if (organizationName && organizationName !== 'Loading…') return organizationName;
  if (email) {
    const local = email.split('@')[0] ?? email;
    return local
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  return 'My School';
}

export function DeviceAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { summary, user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="dashboard-bg min-h-screen">
      <DeviceSidebar
        open={open}
        onClose={() => setOpen(false)}
        orgName={orgDisplayName(summary?.organizationName, user?.email)}
        onLogout={() => void performDeviceSignOut()}
      />

      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[272px]">
        <DevicePageHeader onMenuOpen={() => setOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

/** @deprecated Use DeviceAppShell */
export const AppShell = DeviceAppShell;
