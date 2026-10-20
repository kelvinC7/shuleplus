import Chip from '@mui/material/Chip';

export function reqStatusChip(status: string) {
  const map: Record<string, { bg: string; fg: string }> = {
    PENDING: { bg: '#fef3c7', fg: '#92400e' },
    APPROVED: { bg: '#dbeafe', fg: '#1e40af' },
    PAID: { bg: '#dcfce7', fg: '#166534' },
    DELIVERED: { bg: '#e0e7ff', fg: '#3730a3' },
    CANCELLED: { bg: '#fee2e2', fg: '#991b1b' },
  };
  const s = map[status] ?? map.PENDING;
  return <Chip label={status} size="small" sx={{ bgcolor: s.bg, color: s.fg, fontWeight: 600 }} />;
}

export function deliveryChip(method: string) {
  const label = method === 'AT_HOME' ? 'Home' : 'At School';
  const color = method === 'AT_HOME' ? '#1e40af' : '#92400e';
  return <Chip label={label} size="small" variant="outlined" sx={{ color, fontWeight: 600 }} />;
}
