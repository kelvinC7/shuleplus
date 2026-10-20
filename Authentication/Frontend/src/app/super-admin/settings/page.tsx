'use client';

import { SuperAdminModulePage } from '@/components/super-admin/module-page';
import { SUPER_ADMIN_MODULES } from '@/lib/super-admin-modules';

const mod = SUPER_ADMIN_MODULES.settings;

export default function SuperAdminSettingsPage() {
  return (
    <SuperAdminModulePage
      title={mod.title}
      description={mod.description}
      features={[...mod.features]}
    />
  );
}
