'use client';

import { MainLayout } from '@/layouts/main-layout';
import { DisciplineReportsView } from '@/modules/reports/discipline-reports-view';

export default function ReportsPage() {
  return (
    <MainLayout>
      <DisciplineReportsView />
    </MainLayout>
  );
}
