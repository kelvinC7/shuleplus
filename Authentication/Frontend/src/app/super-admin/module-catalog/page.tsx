'use client';

import { ModuleCatalogView } from '@/components/modules/module-catalog-view';

export default function SuperAdminModuleCatalogPage() {
  return <ModuleCatalogView apiPrefix="/super-admin" backHref="/super-admin/modules" />;
}
