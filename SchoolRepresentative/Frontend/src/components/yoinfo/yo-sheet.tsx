'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

const brandText = '#000435';

/**
 * Bottom sheet scoped to the feed column (not the whole window), so it lines up
 * with the 460px feed on desktop and sits above the feed but below the tab bar.
 */
export function YoSheet({
  open,
  onClose,
  title,
  height = '72%',
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  height?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Box
      aria-hidden={!open}
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 6,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <Box
        onClick={onClose}
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: 'rgba(0,2,31,0.55)',
          opacity: open ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />
      <Box
        role="dialog"
        aria-label={title}
        sx={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          maxWidth: { lg: 460 },
          height,
          bgcolor: '#fff',
          color: brandText,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: open ? 'translateY(0)' : 'translateY(105%)',
          visibility: open ? 'visible' : 'hidden',
          transition: open
            ? 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s'
            : 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 0.3s',
          boxShadow: '0 -12px 40px rgba(0,4,53,0.35)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', py: 1.5, borderBottom: '1px solid #E5E8EF', flexShrink: 0 }}>
          <Box sx={{ position: 'absolute', top: 6, width: 36, height: 4, borderRadius: 2, bgcolor: '#D5D9E3' }} />
          <Typography sx={{ fontSize: 14, fontWeight: 800, mt: 0.5 }}>{title}</Typography>
          <IconButton onClick={onClose} aria-label="Close" size="small" sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>{open ? children : null}</Box>
        {footer ? <Box sx={{ flexShrink: 0, borderTop: '1px solid #E5E8EF' }}>{footer}</Box> : null}
      </Box>
    </Box>
  );
}
