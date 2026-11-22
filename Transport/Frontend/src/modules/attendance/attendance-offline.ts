import type { OfflineAttendanceEvent } from '@/services/transport-api';

const QUEUE_KEY = 'shule_transport_attendance_offline_v1';

export function readOfflineQueue(): OfflineAttendanceEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineAttendanceEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeOfflineQueue(events: OfflineAttendanceEvent[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(events));
}

export function enqueueOffline(event: OfflineAttendanceEvent) {
  const q = readOfflineQueue();
  if (q.some((e) => e.idempotencyKey === event.idempotencyKey)) return;
  q.push(event);
  writeOfflineQueue(q);
}

export function removeOfflineKeys(keys: string[]) {
  const set = new Set(keys);
  writeOfflineQueue(readOfflineQueue().filter((e) => !set.has(e.idempotencyKey)));
}

export function newIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
