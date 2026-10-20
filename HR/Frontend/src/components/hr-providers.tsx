'use client';

import { NotificationProvider } from '@/shared/notifications';

export function HrProviders({ children }: { children: React.ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
