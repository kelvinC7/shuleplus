'use client';

import { NotificationProvider } from '@/shared/notifications';

export function BudgetProviders({ children }: { children: React.ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
