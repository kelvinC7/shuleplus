'use client';

import type { ReactNode } from 'react';
import { TimetableAppShell } from '@/layouts/timetable-app-shell';

export function MainLayout({ children }: { children: ReactNode }) {
  return <TimetableAppShell>{children}</TimetableAppShell>;
}
