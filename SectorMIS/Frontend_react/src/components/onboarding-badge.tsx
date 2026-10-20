import { Chip } from '@mui/material';

const LABELS: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  ready: { label: 'Live', color: 'success' },
  no_attendance: { label: 'No Attendance', color: 'error' },
  no_students: { label: 'No enrollments', color: 'warning' },
  partial: { label: 'Partial data', color: 'warning' },
};

export function OnboardingBadge({ status }: { status?: string }) {
  const key = status ?? 'partial';
  const meta = LABELS[key] ?? LABELS.partial;
  return <Chip size="small" label={meta.label} color={meta.color} variant="outlined" sx={{ fontWeight: 700 }} />;
}
