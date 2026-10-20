'use client';

import { ReactNode } from 'react';
import { AssetsAppShell } from '@/layouts/assets-app-shell';

export function MainLayout({ children }: { children: ReactNode }) {
  return <AssetsAppShell>{children}</AssetsAppShell>;
}
