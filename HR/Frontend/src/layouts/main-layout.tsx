'use client';

import { ReactNode } from 'react';
import { HrAppShell } from '@/layouts/hr-app-shell';

export function MainLayout({ children }: { children: ReactNode }) {
  return <HrAppShell>{children}</HrAppShell>;
}
