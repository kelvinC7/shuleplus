'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { brand } from '@/theme/theme';

export function PanelCard({
  title,
  subtitle,
  action,
  children,
  sx,
  className,
  bodyClassName,
  bodySx,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  sx?: object;
  className?: string;
  bodyClassName?: string;
  bodySx?: object;
}) {
  return (
    <Card className={className} sx={{ overflow: 'hidden', ...sx }}>
      {(title || action) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            px: { xs: 2, sm: 2.5 },
            pt: 2,
            pb: title || subtitle ? 1 : 0,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {title ? (
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: brand.navy, fontSize: '0.9375rem' }}>
                {title}
              </Typography>
            ) : null}
            {subtitle ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
        </Box>
      )}
      <CardContent
        className={bodyClassName}
        sx={{ px: { xs: 2, sm: 2.5 }, pt: title ? 1 : 2, pb: 2, '&:last-child': { pb: 2 }, ...bodySx }}
      >
        {children}
      </CardContent>
    </Card>
  );
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  height = 280,
  className,
  sx,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  height?: number;
  className?: string;
  sx?: object;
}) {
  return (
    <PanelCard title={title} subtitle={subtitle} action={action} className={className} sx={sx}>
      <Box sx={{ width: '100%', height, minHeight: height }}>{children}</Box>
    </PanelCard>
  );
}
