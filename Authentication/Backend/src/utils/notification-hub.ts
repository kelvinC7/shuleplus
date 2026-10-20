import { env } from '../config/env';

/** IAM hosts its own /api/v1/notifications proxy — HTTP loopback must not call JWT routes. */
export function isIamEmbeddedNotificationHub(): boolean {
  const base = (env.NOTIFICATION_SERVICE_URL ?? '').replace(/\/$/, '');
  return base.includes('/api/v1/notifications');
}
