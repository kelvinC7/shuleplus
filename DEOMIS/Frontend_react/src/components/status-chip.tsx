import { Chip } from '@mui/material';
import type { SchoolStatus } from '@/types';

const MAP: Record<SchoolStatus, { label: string; color: string; bg: string }> = {
  normal: { label: 'Normal', color: '#166534', bg: 'rgba(34,197,94,0.15)' },
  monitoring: { label: 'Monitoring', color: '#a16207', bg: 'rgba(234,179,8,0.18)' },
  attention: { label: 'Attention', color: '#b91c1c', bg: 'rgba(239,68,68,0.14)' },
  offline: { label: 'Offline', color: '#374151', bg: 'rgba(107,114,128,0.2)' },
};

export function StatusChip({ status }: { status: SchoolStatus | string }) {
  const cfg = MAP[status as SchoolStatus] ?? MAP.monitoring;
  return (
    <Chip
      size="small"
      label={cfg.label}
      sx={{
        fontWeight: 700,
        fontSize: '0.6875rem',
        color: cfg.color,
        bgcolor: cfg.bg,
        border: 'none',
      }}
    />
  );
}
