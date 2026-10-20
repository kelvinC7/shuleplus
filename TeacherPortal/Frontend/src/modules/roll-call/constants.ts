import type { RollCallRowStatus } from '@/types/roll-call';
import { ATTENDANCE_STATUS_OPTIONS, getAttendanceStatusMeta } from '@/components/attendance-status-ui';

export const STATUS_OPTIONS = ATTENDANCE_STATUS_OPTIONS.filter((s) =>
  ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'].includes(s.value)
) as {
  value: RollCallRowStatus;
  label: string;
  icon: (typeof ATTENDANCE_STATUS_OPTIONS)[number]['icon'];
  tone: string;
  iconClass: string;
}[];

export function statusOption(status: string) {
  return getAttendanceStatusMeta(status);
}

export const ABSENT_REASONS = [
  'Sick',
  'Family Reason',
  'Permission',
  'School Activity',
  'Unknown',
  'Other',
] as const;

export const LATE_REASONS = ['Traffic', 'Permission', 'Family Reason', 'Activity', 'Other'] as const;

export const EXCUSED_REASONS = ['Medical', 'Official School Activity', 'Family', 'Other'] as const;

export function countRows(rows: { status: string }[]) {
  const counts = { total: rows.length, present: 0, late: 0, absent: 0, excused: 0, unmarked: 0 };
  for (const r of rows) {
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
      case 'SICK':
      case 'SCHOOL_ACTIVITY':
        counts.excused++;
        break;
      default:
        counts.unmarked++;
    }
  }
  const marked = counts.present + counts.late + counts.absent + counts.excused;
  counts.unmarked = Math.max(0, counts.total - marked);
  return { ...counts, marked, rate: counts.total ? Math.round((marked / counts.total) * 100) : 0 };
}

export function currentTimeHm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
