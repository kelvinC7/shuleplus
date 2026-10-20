'use client';

import { type ReactNode } from 'react';
import { TransportAppShell } from '@/layouts/transport-app-shell';

export function MainLayout({ children }: { children: ReactNode }) {
  return <TransportAppShell>{children}</TransportAppShell>;
}
