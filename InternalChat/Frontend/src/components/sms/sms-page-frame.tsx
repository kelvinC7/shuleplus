import { Box, CircularProgress, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { SMS_AMBER, SMS_NAVY } from './sms-theme';

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  loading?: boolean;
  error?: string | null;
  children: ReactNode;
};

export function SmsPageFrame({ title, subtitle, actions, loading, error, children }: Props) {
  return (
    <Box
      sx={{
        p: { xs: 1.25, sm: 2, md: 3 },
        pb: { xs: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))', md: 3 },
        overflow: 'auto',
        flex: 1,
        minHeight: 0,
        fontFamily: "'Montserrat', sans-serif",
        width: '100%',
      }}
    >
      <Box sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            flexWrap: 'wrap',
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: { xs: 1.25, sm: 2 },
            mb: { xs: 2, md: 2.5 },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: { xs: 20, sm: 22, md: 26 },
                fontWeight: 800,
                color: SMS_NAVY,
                letterSpacing: -0.02,
                lineHeight: 1.2,
              }}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: 'rgba(0,4,53,0.5)', mt: 0.5 }}>{subtitle}</Typography>
            ) : null}
          </Box>
          {actions ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, width: { xs: '100%', sm: 'auto' } }}>{actions}</Box>
          ) : null}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 8, justifyContent: 'center' }}>
            <CircularProgress size={20} sx={{ color: SMS_AMBER }} />
          </Box>
        ) : null}

        {!loading && error ? (
          <Box sx={{ p: 1.5, mb: 2, borderRadius: 1.5, bgcolor: 'rgba(185,28,28,0.06)', border: '1px solid rgba(185,28,28,0.15)' }}>
            <Typography sx={{ fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>{error}</Typography>
          </Box>
        ) : null}

        {!loading ? children : null}
      </Box>
    </Box>
  );
}
