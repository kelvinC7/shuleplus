'use client';

import { MainLayout } from '@/layouts/main-layout';
import { DisciplineCasesView } from '@/modules/discipline/discipline-cases-view';

export default function DisciplineCasesPage() {
  return (
    <MainLayout>
      <DisciplineCasesView />
    </MainLayout>
  );
}
