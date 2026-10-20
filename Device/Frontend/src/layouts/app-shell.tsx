'use client';

import { ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar, type NavItem } from '@/components/layout/app-sidebar';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { DEVICE_NAV_SECTIONS, pageTitleFromPath } from '@/config/device-nav';
import { useAuth } from '@/contexts/auth-context';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = useMemo<NavItem[]>(
    () =>
      DEVICE_NAV_SECTIONS.map((section) => ({
        label: section.title,
        href: section.items[0]?.href ?? '/dashboard',
        icon: section.icon,
        children: section.items.map((item) => ({ label: item.label, href: item.href })),
      })),
    []
  );

  const title = pageTitleFromPath(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar variant="dark" items={navItems} appName="Digital Attendance" />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          title={title}
          breadcrumbs={['Devices', title]}
          userName={user?.email?.split('@')[0] ?? 'User'}
          userRole="School Admin"
          notificationCount={0}
          messageCount={0}
        />
        <main className="flex-1 overflow-y-auto surface-mesh p-6">{children}</main>
      </div>
    </div>
  );
}
