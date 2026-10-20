'use client';

import { SuperAdminModulePage } from '@/components/super-admin/module-page';
import { SUPER_ADMIN_MODULES } from '@/lib/super-admin-modules';

const mod = SUPER_ADMIN_MODULES.notifications;

export default function SuperAdminNotificationsPage() {
  return (
    <SuperAdminModulePage
      title={mod.title}
      description={mod.description}
      features={[...mod.features]}
      actions={[
        { label: 'Broadcast Email', href: '#' },
        { label: 'Broadcast SMS', href: '#' },
        { label: 'Schedule', href: '#' },
      ]}
    />
  );
}
