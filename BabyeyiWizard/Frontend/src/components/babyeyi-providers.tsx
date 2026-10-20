'use client';

import { NotificationProvider } from '@/shared/notifications';

export function BabyeyiProviders({ children }: { children: React.ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
