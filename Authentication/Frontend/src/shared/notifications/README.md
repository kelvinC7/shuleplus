# Frontend Shared Notifications

**UI feedback only** — not a microservice. No backend APIs for toasts.

```
shared/notifications/
├── toast/              # Top-right ephemeral messages (success, error, warning, info, loading, promise)
├── alerts/             # Inline alert banners
├── banners/            # Full-width page banners (maintenance, promo)
├── dialogs/            # Confirmation modals (Delete Student?, etc.)
├── snackbar/           # Bottom-center brief messages
├── loading/            # Full-screen loading overlay
├── notification-center/# Bell dropdown — in-app notifications from Notification Service via IAM proxy
├── hooks/              # useToast, useConfirm, useLoadingOverlay, useNotificationCenter
├── provider.tsx        # NotificationProvider (wraps app)
├── types.ts
└── index.ts
```

## Usage

```tsx
import { NotificationProvider, useToast, useConfirm, NotificationBell } from '@/shared/notifications';

// In layout/providers
<NotificationProvider>{children}</NotificationProvider>

// In components
const toast = useToast();
toast.success('Student Created Successfully');

const confirm = useConfirm();
const ok = await confirm({
  title: 'Delete Student?',
  message: 'This action cannot be undone.',
  confirmLabel: 'Delete',
  variant: 'danger',
});
```

## vs Notification Service

| Frontend `shared/notifications` | Backend `Notification-Service` |
|--------------------------------|------------------------------|
| Toast, dialogs, loading UI     | Email, SMS, Push delivery    |
| Instant user feedback          | OTP/MFA, templates, logs     |
| No API                         | Called by IAM, Finance, HR…  |
