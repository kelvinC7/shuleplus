import type { SmartAttendanceRow } from '@/types/smart-timetable';

const KEY = 'teacher_portal_attendance_drafts';

type DraftMap = Record<
  string,
  { rows: SmartAttendanceRow[]; savedAt: number; offline?: boolean }
>;

function readAll(): DraftMap {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as DraftMap;
  } catch {
    return {};
  }
}

export function saveDraft(sessionId: string, rows: SmartAttendanceRow[], offline = false) {
  const all = readAll();
  all[sessionId] = { rows, savedAt: Date.now(), offline };
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function loadDraft(sessionId: string): SmartAttendanceRow[] | null {
  return readAll()[sessionId]?.rows ?? null;
}

export function clearDraft(sessionId: string) {
  const all = readAll();
  delete all[sessionId];
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function listOfflineDrafts(): string[] {
  return Object.entries(readAll())
    .filter(([, v]) => v.offline)
    .map(([id]) => id);
}
