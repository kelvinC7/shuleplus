'use client';

import { ModuleCatalogView } from '@/components/modules/module-catalog-view';

export default function RootAdminModuleCatalogPage() {
  return <ModuleCatalogView apiPrefix="/root-admin" backHref="/root-admin" />;
}
