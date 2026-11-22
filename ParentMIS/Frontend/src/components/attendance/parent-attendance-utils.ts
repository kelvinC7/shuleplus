export interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  notes: string | null;
  cardNumber?: string | null;
  gateName?: string | null;
  source?: string | null;
}

export function statusMeta(status: string) {
  const s = status.toUpperCase();
  if (s === 'PRESENT') {
    return { label: 'Present', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', cell: 'bg-emerald-500 text-white' };
  }
  if (s === 'LATE') {
    return { label: 'Late', pill: 'bg-amber-50 text-amber-700 ring-amber-200', cell: 'bg-amber-400 text-navy' };
  }
  if (s === 'EXCUSED' || s === 'SICK') {
    return { label: s === 'SICK' ? 'Sick' : 'Excused', pill: 'bg-sky-50 text-sky-700 ring-sky-200', cell: 'bg-sky-500 text-white' };
  }
  if (s === 'ABSENT') {
    return { label: 'Absent', pill: 'bg-rose-50 text-rose-700 ring-rose-200', cell: 'bg-rose-500 text-white' };
  }
  return { label: status, pill: 'bg-slate-100 text-slate-500 ring-slate-200', cell: 'bg-slate-100 text-slate-400' };
}

export function formatRecordSource(source: string | null | undefined) {
  if (!source) return 'School gate';
  const u = source.toUpperCase();
  if (u.includes('PARENT') || u.includes('PORTAL')) return 'Parent report';
  return source.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
