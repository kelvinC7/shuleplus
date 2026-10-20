import { useEffect, useRef, type ReactNode } from 'react';
import {
  Box,
  Typography,
  Divider,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';

const NAVY = '#000435';
const PRIMARY = '#FCB038';

interface SmProfileMenuProps {
  fullName: string;
  initials: string;
  email?: string;
  organizationName?: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
  iamUrl: string;
}

function MenuAction({
  href,
  onClick,
  icon,
  label,
  danger,
}: {
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
  label: string;
  danger?: boolean;
}) {
  const sx = {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    gap: 1.5,
    borderRadius: 2,
    px: 1.5,
    py: 1.25,
    textDecoration: 'none',
    border: 'none',
    bgcolor: 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
    color: danger ? '#dc2626' : NAVY,
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'background-color 0.2s',
    '&:hover': { bgcolor: danger ? 'rgba(239,68,68,0.06)' : '#f8fafc' },
  };

  if (href) {
    return (
      <Box component="a" href={href} onClick={onClick} sx={sx}>
        <Box
          sx={{
            display: 'flex',
            height: 32,
            width: 32,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1.5,
            bgcolor: danger ? 'rgba(239,68,68,0.08)' : 'rgba(0,4,53,0.05)',
            color: danger ? '#dc2626' : 'rgba(0,4,53,0.6)',
            '& svg': { fontSize: 16 },
          }}
        >
          {icon}
        </Box>
        {label}
      </Box>
    );
  }

  return (
    <Box component="button" type="button" onClick={onClick} sx={sx}>
      <Box
        sx={{
          display: 'flex',
          height: 32,
          width: 32,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1.5,
          bgcolor: danger ? 'rgba(239,68,68,0.08)' : 'rgba(0,4,53,0.05)',
          color: danger ? '#dc2626' : 'rgba(0,4,53,0.6)',
          '& svg': { fontSize: 16 },
        }}
      >
        {icon}
      </Box>
      {label}
    </Box>
  );
}

export function SmProfileMenu({
  fullName,
  initials,
  email,
  organizationName,
  open,
  onToggle,
  onClose,
  onLogout,
  iamUrl,
}: SmProfileMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  return (
    <Box ref={ref} sx={{ position: 'relative' }}>
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          border: '1px solid rgba(0,4,53,0.1)',
          borderRadius: 3,
          bgcolor: '#fff',
          py: 0.75,
          pl: 0.75,
          pr: { xs: 1.25, sm: 1.5 },
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          '&:hover': {
            borderColor: 'rgba(252,176,56,0.35)',
            boxShadow: '0 4px 14px -6px rgba(0,4,53,0.15)',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            height: 36,
            width: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
            background: 'linear-gradient(135deg, #000435 0%, #0a0f52 100%)',
            color: PRIMARY,
            fontSize: '0.8125rem',
            fontWeight: 800,
          }}
        >
          {initials}
        </Box>
        <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left' }}>
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: NAVY,
              lineHeight: 1.2,
              maxWidth: 130,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fullName}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.625rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'text.secondary',
            }}
          >
            Org Admin
          </Typography>
        </Box>
        <KeyboardArrowDownIcon
          sx={{
            display: { xs: 'none', sm: 'block' },
            fontSize: 18,
            color: 'rgba(0,4,53,0.4)',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </Box>

      {open ? (
        <Box
          role="menu"
          sx={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            zIndex: 50,
            width: { xs: 'min(calc(100vw - 2rem), 280px)', sm: 280 },
            overflow: 'hidden',
            borderRadius: 3,
            border: '1px solid rgba(0,4,53,0.1)',
            bgcolor: '#fff',
            boxShadow: '0 20px 50px -20px rgba(0,4,53,0.35)',
          }}
        >
          <Box
            sx={{
              borderBottom: '1px solid rgba(0,4,53,0.08)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #fff 100%)',
              px: 2,
              py: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  height: 44,
                  width: 44,
                  shrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #000435 0%, #0a0f52 100%)',
                  color: PRIMARY,
                  fontSize: '0.875rem',
                  fontWeight: 800,
                }}
              >
                {initials}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: NAVY,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {fullName}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {email ?? '—'}
                </Typography>
                {organizationName ? (
                  <Typography
                    sx={{
                      mt: 0.25,
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: PRIMARY,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {organizationName}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          </Box>

          <Box sx={{ p: 1 }}>
            <MenuAction
              href={`${iamUrl}/change-password`}
              onClick={onClose}
              icon={<LockOutlinedIcon />}
              label="Change password"
            />
            <MenuAction
              href={`${iamUrl}/organization-admin`}
              onClick={onClose}
              icon={<HomeOutlinedIcon />}
              label="Dashboard"
            />
            <Divider sx={{ my: 0.75 }} />
            <MenuAction
              onClick={() => {
                onClose();
                onLogout();
              }}
              icon={<LogoutOutlinedIcon />}
              label="Log out"
              danger
            />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
