'use client';

import type { ReactNode } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { brand } from '@/theme/theme';
import { scrollSx } from '@/theme/sx';

export function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  status,
  children,
  footer,
  width = 420,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  status?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number | string;
}) {
  const widthMap: Record<string, number> = { sm: 360, md: 480, lg: 640, xl: 800 };
  const resolvedWidth = typeof width === 'string' ? (widthMap[width] ?? 480) : width;
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: resolvedWidth },
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          borderBottom: `1px solid ${brand.border}`,
          px: { xs: 2.5, sm: 3 },
          py: 2,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: brand.navy, fontSize: { xs: '1rem', sm: '1.125rem' } }}>
              {title}
            </Typography>
            {status}
          </Box>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <IconButton onClick={onClose} aria-label="Close" size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Box sx={{ ...scrollSx, flex: 1, px: { xs: 2.5, sm: 3 }, py: 2 }}>
        {children}
      </Box>
      {footer ? (
        <Box
          sx={{
            borderTop: `1px solid ${brand.border}`,
            bgcolor: 'rgba(248,249,252,0.7)',
            px: { xs: 2.5, sm: 3 },
            py: 2,
          }}
        >
          {footer}
        </Box>
      ) : null}
    </Drawer>
  );
}

export function DrawerSection({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Box component="section" sx={{ mb: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 1.25 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', fontSize: 11, letterSpacing: '0.08em' }}
        >
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}

export function FieldList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        borderRadius: 1.5,
        border: `1px solid ${brand.border}`,
        bgcolor: 'rgba(248,249,252,0.5)',
        overflow: 'hidden',
      }}
    >
      {items.map((item, i) => (
        <Box
          key={item.label}
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            px: 2,
            py: 1.25,
            borderTop: i === 0 ? 'none' : `1px solid ${brand.border}`,
          }}
        >
          <Typography component="dt" variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {item.label}
          </Typography>
          <Typography
            component="dd"
            variant="caption"
            sx={{ m: 0, fontWeight: 600, color: brand.navy, textAlign: 'right' }}
          >
            {item.value ?? '—'}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
