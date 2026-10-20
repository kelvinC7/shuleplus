import type { AttendanceStatus, SmartAttendanceRow, SmartLesson } from '@/types/smart-timetable';
import type { SortMode } from './constants';

export function formatTodayLabel(dateIso: string, dayOfWeek: string) {
  const d = new Date(`${dateIso}T12:00:00`);
  return `${dayOfWeek}, ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function minutesRemaining(endTime: string): number | null {
  const now = new Date();
  const [eh, em] = endTime.split(':').map(Number);
  const end = new Date(now);
  end.setHours(eh, em, 0, 0);
  const diff = Math.round((end.getTime() - now.getTime()) / 60000);
  return diff > 0 ? diff : null;
}

export function currentTimeHm() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

export function computeMinutesLate(scheduledStart: string, arrivalTime: string) {
  const [sh, sm] = scheduledStart.split(':').map(Number);
  const [ah, am] = arrivalTime.split(':').map(Number);
  const diff = ah * 60 + am - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

export function sortRows(rows: SmartAttendanceRow[], mode: SortMode) {
  const copy = [...rows];
  if (mode === 'roll') {
    copy.sort((a, b) => Number(a.rollNumber ?? 999) - Number(b.rollNumber ?? 999));
  } else if (mode === 'alpha') {
    copy.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }
  return copy;
}

export function isMarkedStatus(status: string) {
  return status !== 'UNMARKED' && status !== '' && status != null;
}

export function countByStatus(rows: SmartAttendanceRow[]) {
  const counts = {
    total: rows.length,
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    medical: 0,
    unmarked: 0,
    marked: 0,
    other: 0,
  };
  for (const r of rows) {
    if (!isMarkedStatus(r.status)) {
      counts.unmarked++;
      continue;
    }
    counts.marked++;
    switch (r.status) {
      case 'PRESENT':
        counts.present++;
        break;
      case 'LATE':
        counts.late++;
        break;
      case 'ABSENT':
        counts.absent++;
        break;
      case 'EXCUSED':
        counts.excused++;
        break;
      case 'SICK':
        counts.medical++;
        break;
      default:
        counts.other++;
    }
  }
  return counts;
}

export function lessonAttendanceState(lesson: SmartLesson) {
  if (lesson.attendanceDone) return 'submitted' as const;
  if (lesson.phase === 'current') return 'active' as const;
  if (lesson.phase === 'upcoming') return 'upcoming' as const;
  return 'past' as const;
}

export function canOpenLessonForAttendance(lesson: SmartLesson) {
  if (lesson.attendanceDone) return true;
  if (lesson.phase === 'current') return true;
  if (lesson.phase === 'past') return true;
  if (lesson.phase === 'upcoming') return false;
  return false;
}

export function bulkSetStatus(rows: SmartAttendanceRow[], status: AttendanceStatus) {
  return rows.map((r) => ({
    ...r,
    status,
    ...(status === 'PRESENT'
      ? { reason: null, arrivalTime: null, minutesLate: null, notes: null }
      : {}),
  }));
}

/** New roster rows start as Present; saved rows keep their stored status. */
export function defaultUnmarkedPresent(rows: SmartAttendanceRow[]): SmartAttendanceRow[] {
  return rows.map((r) => {
    if (isMarkedStatus(r.status)) return r;
    return {
      ...r,
      status: 'PRESENT',
      reason: null,
      arrivalTime: null,
      minutesLate: null,
      notes: null,
    };
  });
}
