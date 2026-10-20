const PERIOD_NOTIF_TAG = 'shule-period-reminder';

export function periodNotificationKey(lesson) {
  if (!lesson) return '';
  return `${lesson.class_name ?? ''}:${lesson.start_time ?? ''}:${lesson.subject_name ?? ''}`;
}

export function canUseBrowserNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function showPeriodBrowserNotification(lesson, minutesUntil) {
  if (!canUseBrowserNotifications()) return;
  if (Notification.permission !== 'granted') return;
  if (!lesson) return;

  const subject = lesson.subject_name || 'your lesson';
  const title =
    minutesUntil <= 0
      ? 'Your lesson is starting now'
      : `${minutesUntil} min until ${subject}`;
  const body = [lesson.class_name, `${lesson.start_time} – ${lesson.end_time}`]
    .filter(Boolean)
    .join(' · ');

  try {
    const n = new Notification(title, {
      body,
      tag: PERIOD_NOTIF_TAG,
      renotify: true,
      icon: '/babyeyilogo.png',
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

export async function ensurePeriodNotificationPermission() {
  if (!canUseBrowserNotifications()) {
    throw new Error('This browser does not support notifications.');
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') {
    throw new Error('Notifications are blocked. Enable them in your browser settings for this site.');
  }
  const result = await Notification.requestPermission();
  if (result !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }
  return true;
}
