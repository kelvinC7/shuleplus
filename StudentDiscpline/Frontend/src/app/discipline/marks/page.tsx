'use client';

import { MainLayout } from '@/layouts/main-layout';
import { DisciplineMarksView } from '@/modules/discipline/discipline-marks-view';

export default function DisciplineMarksPage() {
  return (
    <MainLayout>
      <DisciplineMarksView />
    </MainLayout>
  );
}
