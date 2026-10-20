'use client';

import { NotificationProvider } from '@/shared/notifications';

export function AttendanceProviders({ children }: { children: React.ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
