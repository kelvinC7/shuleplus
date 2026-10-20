import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import { dismissToast, subscribeToasts, type ToastItem, type ToastKind } from '@/lib/toast';

const ICONS: Record<ToastKind, ReactNode> = {
  success: <CheckCircleRoundedIcon sx={{ fontSize: 22 }} />,
  error: <ErrorRoundedIcon sx={{ fontSize: 22 }} />,
  info: <InfoRoundedIcon sx={{ fontSize: 22 }} />,
  warning: <WarningRoundedIcon sx={{ fontSize: 22 }} />,
};

const TONE: Record<ToastKind, { bar: string; icon: string }> = {
  success: { bar: '#16a34a', icon: '#16a34a' },
  error: { bar: '#dc2626', icon: '#dc2626' },
  info: { bar: '#2563eb', icon: '#2563eb' },
  warning: { bar: '#f59e0b', icon: '#d97706' },
};

function ToastCard({ item }: { item: ToastItem }) {
  const tone = TONE[item.kind];
  return (
    <Alert
      icon={ICONS[item.kind]}
      severity={item.kind}
      variant="outlined"
      onClose={() => dismissToast(item.id)}
      sx={{
        pointerEvents: 'auto',
        width: '100%',
        alignItems: 'center',
        bgcolor: '#fff',
        color: '#0f172a',
        border: '1px solid #e2e8f0',
        borderLeft: `4px solid ${tone.bar}`,
        borderRadius: '12px',
        boxShadow: '0 12px 40px rgba(0, 31, 63, 0.16)',
        py: 0.35,
        px: 0.5,
        animation: 'academic-toast-in 220ms ease-out',
        '& .MuiAlert-icon': { color: tone.icon, mr: 1, py: 0.5 },
        '& .MuiAlert-message': { py: 0.6, pr: 0.5 },
      }}
    >
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, lineHeight: 1.35, color: '#0f172a' }}>
        {item.title}
      </Typography>
    </Alert>
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
        top: { xs: 16, md: 20 },
        right: { xs: 12, md: 20 },
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        width: { xs: 'calc(100vw - 24px)', sm: 380 },
        maxWidth: 380,
        pointerEvents: 'none',
      }}
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </Box>
  );
}
