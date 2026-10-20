'use client';

import { ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { MODULE_NAV } from '@/config/navigation';
import { useAuth } from '@/contexts/auth-context';

const PAGE_META: Record<string, { title: string; breadcrumbs: string[] }> = {
  '/dashboard': { title: 'Dashboard', breadcrumbs: ['Home', 'Dashboard'] },
  '/records': { title: 'Records', breadcrumbs: ['Home', 'Records', 'All Records'] },
  '/records/new': { title: 'Create Record', breadcrumbs: ['Home', 'Records', 'Create'] },
  '/onboarding': { title: 'Onboarding', breadcrumbs: ['Home', 'Onboarding'] },
  '/analytics': { title: 'Analytics', breadcrumbs: ['Home', 'Analytics & Reports'] },
  '/calendar': { title: 'Calendar', breadcrumbs: ['Home', 'Calendar & Schedule'] },
  '/notifications': { title: 'Notifications', breadcrumbs: ['Home', 'Notifications'] },
  '/users': { title: 'Users', breadcrumbs: ['Home', 'Users'] },
  '/audit-log': { title: 'Audit Log', breadcrumbs: ['Home', 'Audit Log'] },
  '/settings': { title: 'Settings', breadcrumbs: ['Home', 'Settings'] },
  '/help': { title: 'Help', breadcrumbs: ['Home', 'Help & Documentation'] },
  '/profile': { title: 'Profile', breadcrumbs: ['Home', 'Profile'] },
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isOrgAdmin, summary } = useAuth();

  const nav = useMemo(
    () => MODULE_NAV.filter((item) => !item.adminOnly || isOrgAdmin),
    [isOrgAdmin]
  );

  const meta = useMemo(() => {
    if (pathname.startsWith('/records/') && pathname !== '/records/new') {
      return { title: 'Record Details', breadcrumbs: ['Home', 'Records', 'Details'] };
    }
    return PAGE_META[pathname] ?? { title: 'Sample Module', breadcrumbs: ['Home'] };
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar variant="dark" items={nav} appName="Sample Module" />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          title={meta.title}
          breadcrumbs={meta.breadcrumbs}
          userName={user?.email?.split('@')[0] ?? 'User'}
          userRole={isOrgAdmin ? 'Organization Admin' : 'Module User'}
          notificationCount={5}
          messageCount={2}
        />
        <main className="flex-1 overflow-y-auto surface-mesh p-6">{children}</main>
      </div>
    </div>
  );
}
