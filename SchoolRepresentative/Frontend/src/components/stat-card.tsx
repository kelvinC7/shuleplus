'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { brand } from '@/theme/theme';
import { kpiEnterSx } from '@/theme/sx';

export interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  hint?: string;
  icon?: ReactNode;
  valueSx?: object;
  valueClassName?: string;
  onClick?: () => void;
  /** Square tile that sits flush against its neighbours (no radius, shadow or lift). */
  flush?: boolean;
}

export function KpiCard({
  label,
  value,
  delta,
  hint,
  icon,
  valueSx,
  valueClassName,
  onClick,
  flush,
}: KpiCardProps) {
  const subtitle = delta ?? hint;
  const interactive = Boolean(onClick);

  return (
    <Box
      component={interactive ? 'button' : 'div'}
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      title={label}
      sx={{ ...kpiEnterSx,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: { xs: 100, sm: 112 },
        width: '100%',
        p: { xs: 1.75, sm: 2 },
        textAlign: 'left',
        bgcolor: brand.navy,
        borderRadius: flush ? 0 : { xs: 0, sm: 1.5 },
        border: 'none',
        boxShadow: flush ? 'inset -1px -1px 0 rgba(255,255,255,0.08)' : { xs: 'none', sm: '0 2px 14px -4px rgba(0,4,53,0.1)' },
        cursor: interactive ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        font: 'inherit',
        color: 'inherit',
        ...(interactive && {
          '@media (hover: hover)': {
            '&:hover': flush
              ? { bgcolor: brand.navy2 }
              : {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px -8px rgba(0,4,53,0.35)',
                },
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 4px rgba(252,176,56,0.4)`,
          },
        }),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        <Box
          aria-hidden
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: { xs: 30, sm: 40 },
            height: { xs: 30, sm: 40 },
            color: brand.primary,
            flexShrink: 0,
            '& svg': { fontSize: { xs: 20, sm: 22 } },
          }}
        >
          {icon ?? <TrendingUpIcon fontSize="inherit" />}
        </Box>
        <Typography
          sx={{
            flex: 1,
            minWidth: 0,
            pt: 0.5,
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'none',
            letterSpacing: '0.01em',
            lineHeight: 1.35,
            color: 'rgba(255,255,255,0.72)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
          }}
        >
          {label}
        </Typography>
      </Box>

      <Box sx={{ mt: 1.25, minWidth: 0 }}>
        <Typography
          className={valueClassName}
          sx={{
            fontSize: 'clamp(1.3rem, 5.4vw, 1.7rem)',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: brand.white,
            wordBreak: 'break-word',
            ...valueSx,
          }}
        >
          {value}
        </Typography>
        {subtitle ? (
          <Box
            sx={{
              mt: 0.75,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: 10,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.6)',
              overflow: 'hidden',
            }}
          >
            {delta ? <TrendingUpIcon sx={{ fontSize: 11, color: brand.primary, flexShrink: 0 }} /> : null}
            <Typography component="span" noWrap sx={{ fontSize: 10, fontWeight: 500 }}>
              {subtitle}
            </Typography>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export function StatsGrid({
  children,
  columns,
  className,
  sx,
}: {
  children: ReactNode;
  columns?: number;
  className?: string;
  sx?: object;
}) {
  const cols = columns ?? 4;
  return (
    <Box
      className={className}
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: `repeat(${Math.min(cols, 3)}, 1fr)`,
          lg: `repeat(${cols}, 1fr)`,
        },
        gap: { xs: 1.5, sm: 2 },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
