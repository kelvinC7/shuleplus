import type { PeriodTransition, PeriodTransitionAction, SmartLesson } from '@/types/smart-timetable';

export const PERIOD_ALERT_THRESHOLDS = [5, 2, 0] as const;

export type PeriodAlertThreshold = (typeof PERIOD_ALERT_THRESHOLDS)[number];

export interface PeriodAlertPayload {
  threshold: PeriodAlertThreshold;
  minutesRemaining: number;
  current: SmartLesson;
  next: SmartLesson | null;
  transition: PeriodTransition;
}

export function periodAlertStorageKey(
  date: string,
  timetableId: string,
  threshold: PeriodAlertThreshold
) {
  return `shule-period-alert:${date}:${timetableId}:${threshold}`;
}

export function wasPeriodAlertFired(key: string) {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(key) === '1';
}

export function markPeriodAlertFired(key: string) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(key, '1');
}

export function pickPeriodAlertThreshold(
  minutesRemaining: number,
  firedKeys: Set<string>,
  date: string,
  timetableId: string
): PeriodAlertThreshold | null {
  for (const threshold of PERIOD_ALERT_THRESHOLDS) {
    if (minutesRemaining > threshold) continue;
    const key = periodAlertStorageKey(date, timetableId, threshold);
    if (!firedKeys.has(key) && !wasPeriodAlertFired(key)) {
      return threshold;
    }
  }
  return null;
}

export function actionLabel(action: PeriodTransitionAction) {
  switch (action) {
    case 'double_continue':
      return 'Double period — stay in class';
    case 'move':
      return 'Move to next class';
    default:
      return 'Period ending';
  }
}

export function thresholdHeadline(_threshold: PeriodAlertThreshold, minutesRemaining: number) {
  if (minutesRemaining <= 0) return 'Period ended';
  if (minutesRemaining === 1) return '1 minute left';
  return `${minutesRemaining} minutes left`;
}

let audioContext: AudioContext | null = null;

export function showPeriodBrowserNotification(payload: PeriodAlertPayload) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const { current, minutesRemaining } = payload;
  const title =
    minutesRemaining <= 0
      ? 'Your lesson is starting now'
      : `${minutesRemaining} min left — ${current.subjectName}`;
  const body = [current.className, current.room, `${current.startTime}–${current.endTime}`]
    .filter(Boolean)
    .join(' · ');

  try {
    const n = new Notification(title, { body, tag: 'shule-period-reminder', renotify: true });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

export function playPeriodNotificationSound() {
  if (typeof window === 'undefined') return;

  try {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    if (!audioContext) audioContext = new Ctx();
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    const ctx = audioContext;
    const now = ctx.currentTime;

    const playTone = (frequency: number, start: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.05);
    };

    playTone(880, now, 0.18);
    playTone(1174.66, now + 0.2, 0.22);
    playTone(880, now + 0.48, 0.18);
  } catch {
    // Ignore autoplay or audio restrictions.
  }
}
