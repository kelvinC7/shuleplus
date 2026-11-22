import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { SMS_AMBER, SMS_NAVY } from './sms-theme';

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
  icon?: ReactNode;
};

export function SmsStatCard({ label, value, hint, accent, icon }: Props) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid rgba(0,4,53,0.07)',
        bgcolor: '#fff',
        minWidth: 0,
        width: '100%',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5, mb: 0.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,4,53,0.45)' }}>{label}</Typography>
        {icon ? <Box sx={{ color: accent ? SMS_AMBER : 'rgba(0,4,53,0.25)', '& svg': { fontSize: 18 } }}>{icon}</Box> : null}
      </Box>
      <Typography sx={{ fontSize: 26, fontWeight: 800, color: accent ? SMS_AMBER : SMS_NAVY, lineHeight: 1.1 }}>
        {value}
      </Typography>
      {hint ? (
        <Typography sx={{ fontSize: 10, color: 'rgba(0,4,53,0.4)', mt: 0.5, noWrap: true, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}
