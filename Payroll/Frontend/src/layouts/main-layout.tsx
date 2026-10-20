'use client';

import { ReactNode } from 'react';
import { PayrollAppShell } from '@/layouts/payroll-app-shell';

export function MainLayout({ children }: { children: ReactNode }) {
  return <PayrollAppShell>{children}</PayrollAppShell>;
}
