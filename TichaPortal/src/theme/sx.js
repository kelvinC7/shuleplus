import { brand } from './theme';

export const pageSx = {
  animation: 'fade-in 0.25s ease both',
};

export const dashboardBgSx = {
  minHeight: '100dvh',
  bgcolor: brand.background,
};

export const scrollSx = {
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(245,166,35,0.45) transparent',
  '&::-webkit-scrollbar': { width: 6 },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(245,166,35,0.4)',
    borderRadius: 999,
  },
};
