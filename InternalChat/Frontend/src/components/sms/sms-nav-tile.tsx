import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { SMS_AMBER, SMS_NAVY } from './sms-theme';

type Props = {
  to: string;
  title: string;
  icon: ReactNode;
};

export function SmsNavTile({ to, title, icon }: Props) {
  return (
    <Box
      component={Link}
      to={to}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 2,
        borderRadius: 2,
        bgcolor: '#fff',
        border: '1px solid rgba(0,4,53,0.08)',
        textDecoration: 'none',
        color: SMS_NAVY,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': {
          borderColor: SMS_AMBER,
          boxShadow: '0 8px 24px rgba(0,4,53,0.06)',
        },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(252,176,56,0.15)',
          color: SMS_AMBER,
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{title}</Typography>
    </Box>
  );
}
