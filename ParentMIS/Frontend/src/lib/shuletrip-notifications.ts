export type NotificationChannel = 'inApp' | 'push' | 'sms';

export interface TripNotificationRow {
  event: string;
  inApp: boolean;
  push: boolean;
  sms: 'yes' | 'optional' | 'no';
}

/** Default ShuleTrip notification matrix (school can override via trip.notifications). */
export const SHULETRIP_NOTIFICATION_MATRIX: TripNotificationRow[] = [
  { event: 'Trip announced', inApp: true, push: true, sms: 'optional' },
  { event: 'Consent reminder', inApp: true, push: true, sms: 'optional' },
  { event: 'Approval confirmed', inApp: true, push: true, sms: 'optional' },
  { event: 'Bus departed', inApp: true, push: true, sms: 'optional' },
  { event: 'Arrived destination', inApp: true, push: true, sms: 'optional' },
  { event: 'Return started', inApp: true, push: true, sms: 'optional' },
  { event: 'Arrived school', inApp: true, push: true, sms: 'optional' },
  { event: 'Trip cancelled', inApp: true, push: true, sms: 'yes' },
  { event: 'Emergency alert', inApp: true, push: true, sms: 'yes' },
  { event: 'Gallery published', inApp: true, push: true, sms: 'optional' },
];

export function channelLabel(ch: 'yes' | 'optional' | 'no' | boolean): string {
  if (ch === true) return '✓';
  if (ch === false) return '-';
  if (ch === 'yes') return 'Yes';
  if (ch === 'optional') return 'Optional';
  return '-';
}
