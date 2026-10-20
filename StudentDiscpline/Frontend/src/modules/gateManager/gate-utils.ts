import type { PermissionRequest } from '@/types/discipline';
import { formatTime12h, permissionTypeLabel } from '@/modules/permissions/permission-utils';

export const GATE_SCAN_METHODS = ['QR', 'Card', 'Manual', 'Emergency Override'] as const;

export function formatGateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatGateDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function outsideStatusLabel(row: PermissionRequest) {
  if (row.isOverdue || row.displayStatus === 'Overdue') return 'Overdue';
  return 'Outside';
}

export function permissionSummary(row: PermissionRequest) {
  return {
    student: row.studentName,
    code: row.studentCode,
    className: row.className,
    reference: row.referenceNumber,
    type: permissionTypeLabel(row),
    reason: row.reason,
    departure: formatTime12h(row.departureTime),
    expectedReturn: formatTime12h(row.expectedReturnTime),
  };
}

export function exportGateLogsCsv(
  rows: Array<{
    createdAt: string;
    studentName: string;
    eventType: string;
    gate?: { name?: string } | null;
    actualTime: string;
    officerName?: string | null;
    method: string;
  }>
) {
  const headers = ['Date', 'Student', 'Event', 'Gate', 'Time', 'Officer', 'Method'];
  const lines = rows.map((r) =>
    [
      formatGateDate(r.createdAt),
      r.studentName,
      r.eventType,
      r.gate?.name ?? '',
      formatGateTime(r.actualTime),
      r.officerName ?? '',
      r.method,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gate-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
