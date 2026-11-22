'use client';

import Chip from '@mui/material/Chip';
import { alpha } from '@mui/material/styles';
import { brand } from '@/theme/theme';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' | 'good' | 'bad' | 'warn' | 'review' | 'attention';

const TONE_MAP: Record<string, { bg: string; color: string }> = {
  success: { bg: alpha(brand.success, 0.12), color: brand.success },
  good: { bg: alpha(brand.success, 0.12), color: brand.success },
  warning: { bg: alpha(brand.warning, 0.14), color: brand.warning },
  warn: { bg: alpha(brand.warning, 0.14), color: brand.warning },
  review: { bg: alpha(brand.warning, 0.14), color: brand.warning },
  danger: { bg: alpha(brand.danger, 0.12), color: brand.danger },
  bad: { bg: alpha(brand.danger, 0.12), color: brand.danger },
  attention: { bg: alpha(brand.danger, 0.12), color: brand.danger },
  info: { bg: alpha(brand.info, 0.12), color: brand.info },
  neutral: { bg: alpha(brand.navy, 0.06), color: brand.muted },
  primary: { bg: alpha(brand.primary, 0.18), color: brand.navy },
};

export function statusTone(status: string | null | undefined): Tone {
  const s = (status ?? '').toLowerCase();
  if (['approved', 'active', 'present', 'paid', 'completed', 'success', 'open', 'resolved', 'good', 'pass'].some((k) => s.includes(k)))
    return 'success';
  if (['pending', 'waiting', 'review', 'draft', 'scheduled', 'in progress'].some((k) => s.includes(k))) return 'warning';
  if (['rejected', 'failed', 'overdue', 'absent', 'cancelled', 'blocked', 'critical', 'urgent', 'high'].some((k) => s.includes(k)))
    return 'danger';
  if (['info', 'new', 'processing', 'medium'].some((k) => s.includes(k))) return 'info';
  return 'neutral';
}

export function StatusBadge({
  label,
  value,
  tone,
  size = 'small',
  className,
}: {
  label?: string;
  value?: string | null;
  tone?: Tone;
  size?: 'small' | 'medium';
  className?: string;
}) {
  const text = (label ?? value ?? '—').toString();
  const resolved = tone ?? statusTone(text);
  const t = TONE_MAP[resolved] ?? TONE_MAP.neutral;
  return (
    <Chip
      label={text}
      size={size}
      className={className}
      sx={{
        height: size === 'small' ? 22 : 28,
        fontSize: size === 'small' ? 10 : 12,
        fontWeight: 700,
        bgcolor: t.bg,
        color: t.color,
        border: 'none',
        textTransform: 'capitalize',
        '& .MuiChip-label': { px: 1 },
      }}
    />
  );
}
