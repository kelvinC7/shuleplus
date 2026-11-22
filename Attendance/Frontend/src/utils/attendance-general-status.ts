import type { AttendanceRecord } from '@/services/attendance-api';

export type GeneralStatusKey = 'PRESENT_ON_TIME' | 'PRESENT_LATE' | 'NOT_CHECKED_OUT' | 'ABSENT' | 'OTHER';

export function deriveGeneralStatus(row: Pick<
  AttendanceRecord,
  'attendanceStatus' | 'punctuality' | 'checkoutStatus' | 'entryTime' | 'display'
>): { key: GeneralStatusKey; label: string; className: string } {
  const attendanceStatus = row.attendanceStatus ?? row.display?.attendanceStatus;
  const punctuality = row.punctuality ?? row.display?.punctuality;
  const checkoutStatus = row.checkoutStatus ?? row.display?.checkoutStatus;

  if (attendanceStatus === 'ABSENT' || (!row.entryTime && attendanceStatus !== 'PRESENT')) {
    return {
      key: 'ABSENT',
      label: 'Absent',
      className: 'text-red-700',
    };
  }
  if (punctuality === 'LATE') {
    return {
      key: 'PRESENT_LATE',
      label: checkoutStatus === 'PENDING' ? 'Late · not checked out' : 'Late',
      className: 'text-amber-700',
    };
  }
  if (checkoutStatus === 'PENDING') {
    return {
      key: 'NOT_CHECKED_OUT',
      label: 'Not checked out',
      className: 'text-sky-700',
    };
  }
  if (attendanceStatus === 'PRESENT') {
    return {
      key: 'PRESENT_ON_TIME',
      label: 'On time',
      className: 'text-emerald-700',
    };
  }
  return {
    key: 'OTHER',
    label: attendanceStatus?.replace(/_/g, ' ') ?? '—',
    className: 'text-slate-600',
  };
}

export type DetailStatusTone = 'present' | 'late' | 'absent' | 'pending' | 'neutral';

export type DetailStatusLine = { label: string; tone: DetailStatusTone };

function humanizeStatus(raw: string) {
  return raw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Same breakdown as on-screen Details indicators (attendance · punctuality · checkout). */
export function deriveDetailStatusLines(row: Pick<
  AttendanceRecord,
  'attendanceStatus' | 'punctuality' | 'checkoutStatus' | 'display'
>): DetailStatusLine[] {
  const attendanceStatus = row.attendanceStatus ?? row.display?.attendanceStatus;
  const punctuality = row.punctuality ?? row.display?.punctuality;
  const checkoutStatus = row.checkoutStatus ?? row.display?.checkoutStatus;

  const lines: DetailStatusLine[] = [];

  if (attendanceStatus) {
    lines.push({
      label: humanizeStatus(attendanceStatus),
      tone: attendanceStatus === 'ABSENT' ? 'absent' : 'present',
    });
  }
  if (punctuality && punctuality !== 'UNKNOWN') {
    lines.push({
      label: humanizeStatus(punctuality),
      tone: punctuality === 'LATE' ? 'late' : 'present',
    });
  }
  if (checkoutStatus === 'COMPLETE') {
    lines.push({ label: 'Checked out', tone: 'neutral' });
  } else if (checkoutStatus === 'PENDING') {
    lines.push({ label: 'Pending checkout', tone: 'pending' });
  } else if (checkoutStatus === 'EARLY_DEPARTURE') {
    lines.push({ label: 'Early out', tone: 'late' });
  }

  return lines;
}

export function generalStatusPdfClass(key: GeneralStatusKey): string {
  switch (key) {
    case 'PRESENT_ON_TIME':
      return 'general-present-on-time';
    case 'PRESENT_LATE':
      return 'general-present-late';
    case 'NOT_CHECKED_OUT':
      return 'general-not-checked-out';
    case 'ABSENT':
      return 'general-absent';
    default:
      return 'general-other';
  }
}

export function detailStatusPdfClass(tone: DetailStatusTone): string {
  return `detail-${tone}`;
}
