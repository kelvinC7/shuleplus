'use client';

import { ConfirmProvider } from './confirm/confirm-dialog';
import { ToastProvider } from './toast/toast';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}
