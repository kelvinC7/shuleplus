'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { brand } from '@/theme/theme';

export function DirectorPageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
        mb: 2.5,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            color: brand.navy,
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 640, lineHeight: 1.5 }}
          >
            {description}
          </Typography>
        ) : null}
        {meta ? <Box sx={{ mt: 1 }}>{meta}</Box> : null}
      </Box>
      {actions ? (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1,
            flexShrink: 0,
          }}
        >
          {actions}
        </Box>
      ) : null}
    </Box>
  );
}
