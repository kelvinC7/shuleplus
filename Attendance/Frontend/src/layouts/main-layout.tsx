'use client';

import { type ReactNode } from 'react';
import { AttendanceAppShell } from '@/layouts/attendance-app-shell';

export function MainLayout({ children }: { children: ReactNode }) {
  return <AttendanceAppShell>{children}</AttendanceAppShell>;
}
