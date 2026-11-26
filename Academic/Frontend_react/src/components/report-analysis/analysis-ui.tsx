import type { ReactNode } from 'react';
import { Box, Chip, Paper, Stack, Typography, type StackProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReportAnalysisBand } from '@/types/report-analysis';

export const NAVY = '#000435';
export const AMBER = '#FCB038';
export const MUTED = '#64748b';
export const BORDER = '#e2e8f0';

type Responsive<T> = T | Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', T>>;
type FlexProps = Omit<StackProps, 'alignItems' | 'justifyContent' | 'flexWrap'> & {
  alignItems?: Responsive<string>;
  justifyContent?: Responsive<string>;
  flexWrap?: Responsive<string>;
};

/** Stack with alignItems / justifyContent / flexWrap applied through sx (MUI v9 Stack has no such props). */
export function Flex({ alignItems, justifyContent, flexWrap, sx, ...rest }: FlexProps) {
  return (
    <Stack
      {...rest}
      sx={{ alignItems, justifyContent, flexWrap, ...(sx as Record<string, unknown>) } as SxProps<Theme>}
    />
  );
}

export function fmtPct(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function fmtDelta(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)} pts`;
}

export function deltaColor(value: number | null | undefined) {
  if (value == null) return MUTED;
  if (value > 0) return '#047857';
  if (value < 0) return '#b91c1c';
  return MUTED;
}

export function BandChip({ band, size = 'small' }: { band: ReportAnalysisBand | null | undefined; size?: 'small' | 'medium' }) {
  if (!band) {
    return <Chip size={size} label="No marks" sx={{ fontWeight: 700, bgcolor: '#f1f5f9', color: MUTED }} />;
  }
  return (
    <Chip
      size={size}
      label={band.label}
      sx={{
        fontWeight: 700,
        color: band.color,
        bgcolor: `${band.color}1A`,
        border: `1px solid ${band.color}40`,
      }}
    />
  );
}

export function Section({
  title,
  subtitle,
  action,
  children,
  id,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <Paper
      id={id}
      elevation={0}
      sx={{ borderRadius: 3, border: `1px solid ${BORDER}`, bgcolor: '#fff', overflow: 'hidden', minWidth: 0 }}
    >
      <Flex
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={{ px: { xs: 2, md: 2.5 }, pt: 2, pb: 1.5 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1rem' }}>{title}</Typography>
          {subtitle ? <Typography sx={{ fontSize: '0.8125rem', color: MUTED, mt: 0.25 }}>{subtitle}</Typography> : null}
        </Box>
        {action}
      </Flex>
      <Box sx={{ px: { xs: 2, md: 2.5 }, pb: 2.5, minWidth: 0 }}>{children}</Box>
    </Paper>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  accent,
  deltaText,
  deltaTone,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: string;
  deltaText?: string | null;
  deltaTone?: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        border: `1px solid ${BORDER}`,
        p: { xs: 1.75, md: 2.25 },
        bgcolor: '#fff',
        minWidth: 0,
      }}
    >
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: accent }} />
      <Typography sx={{ fontSize: { xs: '0.6875rem', md: '0.75rem' }, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: { xs: '1.5rem', md: '1.85rem' }, fontWeight: 800, color: NAVY, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      {deltaText ? (
        <Typography sx={{ mt: 0.5, fontSize: '0.8125rem', fontWeight: 700, color: deltaTone ?? MUTED }}>{deltaText}</Typography>
      ) : null}
      {hint ? <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: MUTED }}>{hint}</Typography> : null}
    </Paper>
  );
}

export function DistributionBar({
  items,
}: {
  items: Array<{ label: string; color: string; count: number; percent: number }>;
}) {
  const total = items.reduce((n, i) => n + i.count, 0);
  return (
    <Box>
      <Box
        role="img"
        aria-label="Performance distribution"
        sx={{ display: 'flex', height: 18, borderRadius: 999, overflow: 'hidden', bgcolor: '#f1f5f9' }}
      >
        {total > 0
          ? items
              .filter((i) => i.count > 0)
              .map((i) => (
                <Box
                  key={i.label}
                  title={`${i.label}: ${i.count}`}
                  sx={{ width: `${(i.count / total) * 100}%`, bgcolor: i.color, transition: 'width 300ms ease' }}
                />
              ))
          : null}
      </Box>
      <Box sx={{ mt: 1.5, display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr 1fr', md: `repeat(${Math.min(items.length, 4)}, 1fr)` } }}>
        {items.map((i) => (
          <Flex key={i.label} direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: i.color, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: '0.75rem', color: MUTED, fontWeight: 600 }}>{i.label}</Typography>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 800, color: NAVY }}>
                {i.count} <Box component="span" sx={{ fontSize: '0.75rem', color: MUTED, fontWeight: 600 }}>· {i.percent.toFixed(1)}%</Box>
              </Typography>
            </Box>
          </Flex>
        ))}
      </Box>
    </Box>
  );
}

export function ProgressBar({ value, color, max = 100 }: { value: number | null; color: string; max?: number }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <Box sx={{ height: 8, borderRadius: 999, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
      <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color, borderRadius: 999, transition: 'width 300ms ease' }} />
    </Box>
  );
}
