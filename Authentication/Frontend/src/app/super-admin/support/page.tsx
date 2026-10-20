'use client';

import { SuperAdminModulePage } from '@/components/super-admin/module-page';
import { SUPER_ADMIN_MODULES } from '@/lib/super-admin-modules';

const mod = SUPER_ADMIN_MODULES.support;

export default function SuperAdminSupportPage() {
  return (
    <SuperAdminModulePage
      title={mod.title}
      description={mod.description}
      features={[...mod.features]}
      actions={[{ label: 'Open Tickets', href: '#' }]}
    />
  );
}
