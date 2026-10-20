'use client';

import { ReactNode } from 'react';
import { BudgetAppShell } from '@/layouts/budget-app-shell';

export function MainLayout({ children }: { children: ReactNode }) {
  return <BudgetAppShell>{children}</BudgetAppShell>;
}
