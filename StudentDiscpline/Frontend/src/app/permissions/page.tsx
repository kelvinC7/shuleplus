'use client';

import { MainLayout } from '@/layouts/main-layout';
import { PermissionsView } from '@/modules/permissions/permissions-view';

export default function PermissionsPage() {
  return (
    <MainLayout>
      <PermissionsView />
    </MainLayout>
  );
}
