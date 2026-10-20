'use client';

import { MainLayout } from '@/layouts/main-layout';
import { PermissionDetailView } from '@/modules/permissions/permission-detail-view';
import { useParams } from 'next/navigation';

export default function PermissionDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');

  return (
    <MainLayout>
      <PermissionDetailView id={id} />
    </MainLayout>
  );
}
