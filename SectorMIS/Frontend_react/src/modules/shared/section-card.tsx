import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

export function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Box
      sx={{
        borderRadius: 3,
        bgcolor: '#fff',
        boxShadow: '0 2px 14px -4px rgba(0,4,53,0.1)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          px: { xs: 2, sm: 2.5 },
          py: 2,
          borderBottom: '1px solid rgba(0,4,53,0.06)',
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 800, color: '#000435', fontSize: '1rem' }}>{title}</Typography>
          {subtitle ? (
            <Typography sx={{ mt: 0.25, fontSize: '0.8125rem', color: 'text.secondary' }}>{subtitle}</Typography>
          ) : null}
        </Box>
        {action}
      </Box>
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>{children}</Box>
    </Box>
  );
}
