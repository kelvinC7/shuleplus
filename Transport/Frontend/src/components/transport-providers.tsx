'use client';

import { NotificationProvider } from '@/shared/notifications';

export function TransportProviders({ children }: { children: React.ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
