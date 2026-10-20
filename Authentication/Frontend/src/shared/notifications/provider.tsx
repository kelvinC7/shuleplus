'use client';

import { ToastProvider } from './toast/toast';
import { DialogProvider } from './dialogs/confirm-dialog';
import { LoadingProvider } from './loading/loading-overlay';
import { NotificationCenterProvider } from './notification-center/notification-center';

/**
 * Unified frontend notification UI provider.
 * Toast, dialogs, loading overlay, and in-app notification center — NOT a backend API.
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DialogProvider>
        <LoadingProvider>
          <NotificationCenterProvider>{children}</NotificationCenterProvider>
        </LoadingProvider>
      </DialogProvider>
    </ToastProvider>
  );
}
