'use client';

import { MainLayout } from '@/layouts/main-layout';
import { DashboardView } from '@/modules/dashboard/dashboard-view';

export default function DashboardPage() {
  return (
    <MainLayout>
      <DashboardView />
    </MainLayout>
  );
}
