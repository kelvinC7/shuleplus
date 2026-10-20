'use client';

import { ToastProvider } from './toast/toast';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
