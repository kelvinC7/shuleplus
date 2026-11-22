'use client';

import type { ReactNode } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { brand } from '@/theme/theme';
import { FormError, FormFooterButton } from '@/components/form-kit';

/**
 * Minimal bottom sheet used by every "create" form (task, meeting, broadcast,
 * circular). Same look as the Yo Info composer: rounded top, drag handle, centred
 * title, quiet fields and one pill call-to-action pinned at the bottom.
 */
export function FormSheet({
  open,
  onClose,
  title,
  children,
  error,
  submitLabel,
  onSubmit,
  submitDisabled,
  submitIcon,
  busy,
  header,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  error?: string | null;
  submitLabel: string;
  onSubmit: () => void;
  submitDisabled?: boolean;
  submitIcon?: ReactNode;
  busy?: boolean;
  /** Optional strip under the title (e.g. a segmented switch). */
  header?: ReactNode;
}) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={busy ? undefined : onClose}
      PaperProps={{
        role: 'dialog',
        'aria-label': title,
        sx: {
          width: '100%',
          maxWidth: 520,
          mx: 'auto',
          maxHeight: '92dvh',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          bgcolor: '#fff',
          color: brand.navy,
          boxShadow: '0 -12px 40px rgba(0,4,53,0.28)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0,2,31,0.55)' } } }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 1.5,
          borderBottom: '1px solid #E5E8EF',
          flexShrink: 0,
        }}
      >
        <Box sx={{ position: 'absolute', top: 6, width: 36, height: 4, borderRadius: 2, bgcolor: '#D5D9E3' }} />
        <Typography sx={{ fontSize: 14, fontWeight: 800, mt: 0.5 }}>{title}</Typography>
        <IconButton onClick={onClose} aria-label="Close" size="small" sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', px: 2, pt: 1.5, pb: 2 }}>
        {header}
        {children}
      </Box>

      <Box sx={{ flexShrink: 0, borderTop: '1px solid #E5E8EF', p: 1.5, pb: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
        <FormError message={error ?? null} />
        <FormFooterButton onClick={onSubmit} disabled={busy || submitDisabled} startIcon={submitIcon}>
          {busy ? 'Please wait…' : submitLabel}
        </FormFooterButton>
      </Box>
    </Drawer>
  );
}
