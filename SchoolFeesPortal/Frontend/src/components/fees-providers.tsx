'use client';

import { NotificationProvider } from '@/shared/notifications';

export function FeesProviders({ children }: { children: React.ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
