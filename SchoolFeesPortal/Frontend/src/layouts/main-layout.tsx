'use client';

import { ReactNode } from 'react';
import { FeesAppShell } from '@/layouts/fees-app-shell';

export function MainLayout({ children }: { children: ReactNode }) {
  return <FeesAppShell>{children}</FeesAppShell>;
}
