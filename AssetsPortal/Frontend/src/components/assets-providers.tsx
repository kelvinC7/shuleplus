'use client';

import { NotificationProvider } from '@/shared/notifications';

export function AssetsProviders({ children }: { children: React.ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
