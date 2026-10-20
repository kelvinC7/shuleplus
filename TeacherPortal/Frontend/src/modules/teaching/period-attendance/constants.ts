import type { AttendanceStatus } from '@/types/smart-timetable';
import { ATTENDANCE_STATUS_OPTIONS, getAttendanceStatusMeta } from '@/components/attendance-status-ui';

export const STATUS_OPTIONS = ATTENDANCE_STATUS_OPTIONS.filter((s) =>
  ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED', 'SICK', 'SCHOOL_ACTIVITY'].includes(s.value)
) as {
  value: AttendanceStatus;
  label: string;
  icon: (typeof ATTENDANCE_STATUS_OPTIONS)[number]['icon'];
  tone: string;
  iconClass: string;
}[];

export { getAttendanceStatusMeta };

export const LATE_REASONS = ['Traffic', 'Medical', 'Family', 'School Activity', 'Other'] as const;

export const ABSENT_REASONS = [
  'Sick',
  'Family Emergency',
  'Unknown',
  'Suspended',
  'Other',
] as const;

export type SortMode = 'roll' | 'alpha' | 'default';

export type StatusFilter = 'all' | 'marked' | 'unmarked';
