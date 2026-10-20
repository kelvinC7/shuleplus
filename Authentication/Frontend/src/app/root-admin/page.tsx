'use client';

import { PlatformDashboardView } from '@/components/platform/platform-dashboard-view';

export default function RootAdminDashboard() {
  return (
    <PlatformDashboardView
      apiPrefix="/root-admin"
      roleLabel="ROOT ADMINISTRATOR"
      quickActions={[
        { label: 'New Organization', href: '/root-admin/organizations/new', primary: true },
        { label: 'Module Catalog', href: '/root-admin/module-catalog' },
        { label: 'System Health', href: '/root-admin/system-health' },
      ]}
    />
  );
}
