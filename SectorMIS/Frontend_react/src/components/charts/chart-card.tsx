import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  metric?: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
}

export function ChartCard({ title, subtitle, metric, headerAction, children }: ChartCardProps) {
  return (
    <Box
      sx={{
        borderRadius: 3,
        bgcolor: '#fff',
        p: { xs: 2, sm: 3 },
        boxShadow: '0 2px 14px -4px rgba(0,4,53,0.08)',
        border: '1px solid rgba(0,4,53,0.06)',
        height: '100%',
      }}
    >
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: { xs: '0.8125rem', sm: '0.875rem' },
              fontWeight: 700,
              color: '#000435',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography sx={{ mt: 0.25, fontSize: '0.75rem', color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          ) : null}
          {metric ? <Box sx={{ mt: 1.5 }}>{metric}</Box> : null}
        </Box>
        {headerAction ? <Box sx={{ flexShrink: 0 }}>{headerAction}</Box> : null}
      </Box>
      {children}
    </Box>
  );
}
