import type { SxProps, Theme } from '@mui/material/styles';
import { brand } from './theme';

/** Page enter animation */
export const pageSx: SxProps<Theme> = {
  animation: 'fade-in 0.25s ease both',
};

/** App shell background with soft brand wash */
export const dashboardBgSx: SxProps<Theme> = {
  minHeight: '100dvh',
  bgcolor: brand.background,
  backgroundImage: `
    radial-gradient(circle at 12% 8%, rgba(252, 176, 56, 0.07), transparent 38%),
    radial-gradient(circle at 88% 92%, rgba(0, 4, 53, 0.05), transparent 42%)
  `,
  backgroundAttachment: 'fixed',
};

/** Thin gold scrollbar for side panels */
export const scrollSx: SxProps<Theme> = {
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(252, 176, 56, 0.45) transparent',
  '&::-webkit-scrollbar': { width: 6 },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(252, 176, 56, 0.4)',
    borderRadius: 999,
  },
};

export const kpiEnterSx: SxProps<Theme> = {
  animation: 'scale-in 0.35s ease both',
};
