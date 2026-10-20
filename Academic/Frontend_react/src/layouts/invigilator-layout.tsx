import type { ReactNode } from 'react';
import { Box } from '@mui/material';

export function InvigilatorLayout({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ height: '100vh', overflow: 'hidden', bgcolor: '#eef2f7' }}>
      {children}
    </Box>
  );
}
