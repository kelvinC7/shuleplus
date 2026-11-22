'use client';

import Chip from '@mui/material/Chip';
import { brand } from '@/theme/theme';

export function DemoModeBadge() {
  return (
    <Chip
      label="Demo mode"
      size="small"
      sx={{
        position: 'fixed',
        bottom: { xs: 72, lg: 16 },
        right: 16,
        zIndex: 40,
        fontWeight: 700,
        fontSize: 11,
        bgcolor: brand.navy,
        color: brand.primary,
        boxShadow: '0 4px 14px rgba(0,4,53,0.25)',
      }}
    />
  );
}
