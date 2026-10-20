'use client';

import { RepresentativesManagementView } from '@/components/super-admin/representatives-management-view';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';

export default function SuperAdminRepresentativesPage() {
  usePlatformAdmin();
  return <RepresentativesManagementView />;
}
