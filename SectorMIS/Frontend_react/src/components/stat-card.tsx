import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';

const NAVY = '#000435';
const GOLD = '#FCB038';

export interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  highlight?: boolean;
}

export function StatCard({ label, value, delta, icon, onClick, href, highlight }: StatCardProps) {
  const clickable = Boolean(onClick || href);

  const sx = {
    display: 'flex',
    minHeight: { xs: 112, sm: 120 },
    flexDirection: 'column',
    borderRadius: 3,
    bgcolor: highlight ? 'rgba(251,191,36,0.08)' : '#fff',
    border: highlight ? '1px solid rgba(252,176,56,0.35)' : '1px solid transparent',
    p: { xs: 2, sm: 2.5 },
    boxShadow: '0 2px 14px -4px rgba(0,4,53,0.1)',
    transition: 'transform 0.3s, box-shadow 0.3s, border-color 0.3s',
    textDecoration: 'none',
    cursor: clickable ? 'pointer' : 'default',
    color: 'inherit',
    '&:hover': clickable
      ? {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px -8px rgba(0,4,53,0.14)',
          borderColor: highlight ? 'rgba(252,176,56,0.55)' : 'rgba(0,4,53,0.08)',
        }
      : {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px -8px rgba(0,4,53,0.14)',
        },
  };

  const content = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
        <Box
          sx={{
            display: 'flex',
            height: 44,
            width: 44,
            shrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            bgcolor: NAVY,
            color: GOLD,
            '& svg': { fontSize: 20 },
          }}
        >
          {icon ?? <TrendingUpOutlinedIcon />}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: NAVY,
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              mt: 0.5,
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              fontWeight: 800,
              lineHeight: 1,
              color: NAVY,
            }}
          >
            {value}
          </Typography>
          {delta ? (
            <Typography
              sx={{
                mt: 0.75,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: '0.75rem',
                fontWeight: 500,
                color: 'rgba(0,4,53,0.5)',
              }}
            >
              {delta}
            </Typography>
          ) : null}
        </Box>
      </Box>
  );

  if (href) {
    return (
      <Box component={Link} to={href} sx={sx}>
        {content}
      </Box>
    );
  }

  return (
    <Box onClick={onClick} sx={sx}>
      {content}
    </Box>
  );
}

export function StatsGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 1.5, sm: 2 },
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
      }}
    >
      {children}
    </Box>
  );
}
