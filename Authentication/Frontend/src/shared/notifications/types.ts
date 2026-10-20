/**
 * Shared notification types — frontend UI only (not backend microservice types).
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'promise' | 'action';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export type BannerVariant = 'info' | 'warning' | 'maintenance' | 'promo';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface InAppNotificationItem {
  id: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  isRead: boolean;
  isArchived: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export interface ToastOptions {
  title?: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  action?: { label: string; onClick: () => void };
}
