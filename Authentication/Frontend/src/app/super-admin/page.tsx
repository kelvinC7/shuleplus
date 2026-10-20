'use client';

import { PlatformDashboardView } from '@/components/platform/platform-dashboard-view';

export default function SuperAdminDashboardPage() {
  return (
    <PlatformDashboardView
      apiPrefix="/super-admin"
      roleLabel="SUPER ADMINISTRATOR"
      quickActions={[
        { label: 'Add Organization', href: '/super-admin/organizations/register', primary: true },
        { label: 'Module Catalog', href: '/super-admin/module-catalog' },
        { label: 'Pending Approvals', href: '/super-admin/pending-approvals' },
      ]}
    />
  );
}
