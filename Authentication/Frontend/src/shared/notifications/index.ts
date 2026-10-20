/**
 * ShulePlus Frontend Shared Notifications
 *
 * UI-only feedback layer — NOT the Notification Service microservice.
 * Backend delivery lives in /Notification-Service.
 */

export type * from './types';

// Providers
export { NotificationProvider } from './provider';

// Toast (top-right ephemeral messages)
export { ToastProvider, useToast } from './toast/toast';

// Alerts & banners (inline / page-level)
export { AlertBanner } from './alerts/alert-banner';
export { PageBanner } from './banners/banner';

// Dialogs (confirmation modals)
export { DialogProvider, useConfirm } from './dialogs/confirm-dialog';

// Loading overlay
export { LoadingProvider, useLoadingOverlay } from './loading/loading-overlay';

// Snackbar (bottom-center)
export { Snackbar } from './snackbar/snackbar';

// In-app notification center (bell dropdown)
export {
  NotificationCenterProvider,
  NotificationBell,
  useNotificationCenter,
} from './notification-center/notification-center';

export * from './hooks';
