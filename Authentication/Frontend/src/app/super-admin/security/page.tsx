'use client';

import { SuperAdminModulePage } from '@/components/super-admin/module-page';
import { SUPER_ADMIN_MODULES } from '@/lib/super-admin-modules';

const mod = SUPER_ADMIN_MODULES.security;

export default function SuperAdminSecurityPage() {
  return (
    <SuperAdminModulePage
      title={mod.title}
      description={mod.description}
      features={[...mod.features]}
      actions={[{ label: 'View Audit Logs', href: '/super-admin/activity-logs' }]}
    />
  );
}
