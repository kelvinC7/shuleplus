export type ReportKind = 'standard' | 'midterm' | 'beginning';

export function normalizeReportKind(value: unknown): ReportKind {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'midterm') return 'midterm';
  if (v === 'beginning') return 'beginning';
  return 'standard';
}
