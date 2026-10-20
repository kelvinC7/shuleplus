'use client';

import { ReactNode } from 'react';
import { NotificationProvider } from '@/shared/notifications';

export function PayrollProviders({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
