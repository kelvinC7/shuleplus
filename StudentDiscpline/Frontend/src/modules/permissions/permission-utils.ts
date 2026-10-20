import type { PermissionRequest } from '@/types/discipline';

export const PERMISSION_TYPES = [
  { id: 'Medical', label: 'Medical', ring: 'ring-rose-200', bg: 'bg-rose-50', text: 'text-rose-900', dot: 'bg-rose-500' },
  { id: 'Family', label: 'Family', ring: 'ring-violet-200', bg: 'bg-violet-50', text: 'text-violet-900', dot: 'bg-violet-500' },
  { id: 'Personal', label: 'Personal', ring: 'ring-sky-200', bg: 'bg-sky-50', text: 'text-sky-900', dot: 'bg-sky-500' },
  { id: 'Emergency', label: 'Emergency', ring: 'ring-red-200', bg: 'bg-red-50', text: 'text-red-900', dot: 'bg-red-500' },
  { id: 'Sports', label: 'Sports', ring: 'ring-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-900', dot: 'bg-emerald-500' },
  { id: 'School Activity', label: 'School Activity', ring: 'ring-amber-200', bg: 'bg-amber-50', text: 'text-amber-900', dot: 'bg-amber-500' },
  { id: 'Other', label: 'Other', ring: 'ring-slate-200', bg: 'bg-slate-50', text: 'text-slate-900', dot: 'bg-slate-500' },
] as const;

export const DESTINATION_PRESETS = [
  'Hospital / Clinic',
  'Home',
  'Family event',
  'Sports venue',
  'Religious institution',
  'Government office',
  'Other location',
] as const;

export const LEAVING_WITH_OPTIONS = [
  'Parent / Guardian',
  'School Staff',
  'Authorized Person',
  'Alone',
  'Other',
] as const;

export const REQUESTED_BY_OPTIONS = [
  'Parent / Guardian',
  'Teacher',
  'Student',
  'School Administrator',
] as const;

export const PERMISSION_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
  'Cancelled',
  'Completed',
  'Overdue',
  'Out',
] as const;

export function formatPermissionDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime12h(time?: string | null) {
  if (!time) return '—';
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h)) return time;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${ampm}`;
}

export function calcDurationMinutes(
  depDate: string,
  depTime: string,
  retDate: string,
  retTime: string
) {
  const start = new Date(`${depDate}T${depTime}:00`);
  const end = new Date(`${retDate}T${retTime}:00`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function formatDuration(minutes?: number | null) {
  if (minutes == null || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function displayStatus(row: PermissionRequest) {
  if (row.isOverdue) return 'Overdue';
  return row.status;
}

export function permissionTypeLabel(row: PermissionRequest) {
  if (row.permissionType === 'Other' && row.customType) return row.customType;
  return row.permissionType;
}

export function exportPermissionsCsv(rows: PermissionRequest[]) {
  const headers = [
    'Reference',
    'Scan Code',
    'Student',
    'Code',
    'Class',
    'Type',
    'Destination',
    'Departure Date',
    'Departure Time',
    'Expected Return Date',
    'Expected Return Time',
    'Requested By',
    'Status',
  ];
  const lines = rows.map((r) =>
    [
      r.referenceNumber,
      r.scanCode ?? '',
      r.studentName,
      r.studentCode ?? '',
      r.className,
      permissionTypeLabel(r),
      r.destination ?? '',
      formatPermissionDate(r.departureDate),
      r.departureTime,
      formatPermissionDate(r.expectedReturnDate),
      r.expectedReturnTime,
      r.requestedByName ?? r.requestedBy,
      displayStatus(r),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `permission-requests-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
