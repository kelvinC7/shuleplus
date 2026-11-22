import { useEffect, useState, type ReactNode } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { dismissToast, subscribeToasts, type ToastItem, type ToastKind } from '@/lib/toast';

const NAVY = '#000435';

const ICONS: Record<ToastKind, ReactNode> = {
  success: <CheckCircleRoundedIcon sx={{ fontSize: 20 }} />,
  error: <ErrorRoundedIcon sx={{ fontSize: 20 }} />,
  info: <InfoRoundedIcon sx={{ fontSize: 20 }} />,
  warning: <WarningRoundedIcon sx={{ fontSize: 20 }} />,
};

const TONE: Record<
  ToastKind,
  { accent: string; iconBg: string; iconColor: string; label: string }
> = {
  success: { accent: '#16a34a', iconBg: '#ecfdf5', iconColor: '#15803d', label: 'Success' },
  error: { accent: '#dc2626', iconBg: '#fef2f2', iconColor: '#b91c1c', label: 'Error' },
  info: { accent: '#2563eb', iconBg: '#eff6ff', iconColor: '#1d4ed8', label: 'Info' },
  warning: { accent: '#d97706', iconBg: '#fffbeb', iconColor: '#b45309', label: 'Notice' },
};

function ToastCard({ item }: { item: ToastItem }) {
  const tone = TONE[item.kind];
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        pointerEvents: 'auto',
        width: '100%',
        display: 'flex',
        gap: 1.25,
        alignItems: 'flex-start',
        bgcolor: '#fff',
        border: '1px solid #e2e8f0',
        borderLeft: `4px solid ${tone.accent}`,
        borderRadius: '14px',
        boxShadow: '0 16px 48px rgba(0, 4, 53, 0.12)',
        p: 1.5,
        pr: 1,
        animation: 'academic-toast-in 240ms ease-out',
        '@keyframes academic-toast-in': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          bgcolor: tone.iconBg,
          color: tone.iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {ICONS[item.kind]}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, pt: 0.15 }}>
        <Typography
          component="span"
          sx={{
            display: 'block',
            fontSize: '0.6875rem',
            fontWeight: 800,
            color: tone.iconColor,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            mb: 0.35,
          }}
        >
          {tone.label}
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.35, color: NAVY }}>
          {item.title}
        </Typography>
        {item.detail ? (
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.45, color: '#64748b', mt: 0.5 }}>
            {item.detail}
          </Typography>
        ) : null}
      </Box>
      <IconButton
        size="small"
        aria-label="Dismiss"
        onClick={() => dismissToast(item.id)}
        sx={{ color: '#94a3b8', mt: -0.25, mr: -0.25 }}
      >
        <CloseRoundedIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  );
}

export function AcademicToaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (!items.length) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        pointerEvents: 'none',
        top: { xs: 'auto', md: 20 },
        bottom: { xs: 16, md: 'auto' },
        left: { xs: 12, md: 'auto' },
        right: { xs: 12, md: 20 },
        width: { xs: 'auto', sm: 400 },
        maxWidth: { xs: 'none', sm: 400 },
      }}
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </Box>
  );
}
