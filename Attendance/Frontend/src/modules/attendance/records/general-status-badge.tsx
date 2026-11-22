'use client';

import { deriveGeneralStatus } from '@/utils/attendance-general-status';
import type { AttendanceRecord } from '@/services/attendance-api';

export function GeneralStatusBadge({ row }: { row: Pick<
  AttendanceRecord,
  'attendanceStatus' | 'punctuality' | 'checkoutStatus' | 'entryTime' | 'display'
> }) {
  const g = deriveGeneralStatus(row);
  return (
    <span className={`text-xs font-semibold uppercase tracking-wide ${g.className}`}>{g.label}</span>
  );
}
