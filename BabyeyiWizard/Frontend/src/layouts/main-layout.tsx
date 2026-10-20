'use client';

import { ReactNode } from 'react';
import { BabyeyiAppShell } from '@/layouts/babyeyi-app-shell';
import { AcademicPeriodProvider } from '@/contexts/academic-period-context';

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AcademicPeriodProvider>
      <BabyeyiAppShell>{children}</BabyeyiAppShell>
    </AcademicPeriodProvider>
  );
}
