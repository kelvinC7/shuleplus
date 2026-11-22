import { Box, Drawer, Typography } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import DataUsageOutlinedIcon from '@mui/icons-material/DataUsageOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { BRAND_AMBER as AMBER, BRAND_NAVY as NAVY } from '@/shared/brand';
import { useAuth } from '@/contexts/auth-context';

const IAM_URL = import.meta.env.VITE_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

const items = [
  { to: '/sms', label: 'SMS Center', icon: SmsOutlinedIcon, badge: 'New' },
  { to: '/sms/history', label: 'History', icon: HistoryOutlinedIcon },
  { to: '/sms/usage', label: 'Quota', icon: DataUsageOutlinedIcon },
];

function isNavActive(pathname: string, to: string) {
  if (to === '/sms') {
    return pathname === '/sms';
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const { summary } = useAuth();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: NAVY, color: '#fff' }}>
      <Box sx={{ px: 2.5, py: 2.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Box component="img" src="/logo_white.png" alt="Shule+" sx={{ height: 36, mb: 1 }} />
        <Typography sx={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.45)' }}>
          SHULECHAT
        </Typography>
        {summary?.organizationName ? (
          <Typography noWrap sx={{ fontSize: 10, fontWeight: 700, mt: 1, color: AMBER, textTransform: 'uppercase' }}>
            {summary.organizationName}
          </Typography>
        ) : null}
      </Box>

      <Box component="nav" sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 2 }}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.to);
          return (
            <Box
              key={item.to}
              component={Link}
              to={item.to}
              onClick={() => onNavigate?.()}
              sx={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                width: '100%',
                mb: 0.75,
                px: 1.5,
                py: 1.25,
                borderRadius: 2,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 700,
                textAlign: 'left',
                color: active ? NAVY : 'rgba(255,255,255,0.72)',
                bgcolor: active ? AMBER : 'transparent',
                boxShadow: active ? '0 6px 16px rgba(252,176,56,0.28)' : 'none',
                '&:hover': {
                  bgcolor: active ? AMBER : 'rgba(255,255,255,0.06)',
                  color: active ? NAVY : '#fff',
                },
              }}
            >
              <Icon sx={{ fontSize: 18, pointerEvents: 'none' }} />
              <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 'inherit', pointerEvents: 'none' }}>
                {item.label}
              </Typography>
              {item.badge ? (
                <Typography
                  sx={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: NAVY,
                    bgcolor: active ? 'rgba(0,4,53,0.12)' : AMBER,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 0.5,
                    pointerEvents: 'none',
                  }}
                >
                  {item.badge}
                </Typography>
              ) : null}
            </Box>
          );
        })}
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Box
          component="a"
          href={`${IAM_URL}/organization-admin`}
          onClick={onNavigate}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1.25,
            borderRadius: 2,
            color: 'rgba(255,255,255,0.8)',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: '#fff' },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 18 }} />
          Organization dashboard
        </Box>
      </Box>
    </Box>
  );
}

export function ModuleSidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  return (
    <>
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flexShrink: 0,
          width: 280,
          minHeight: 0,
          height: '100%',
          position: 'relative',
          zIndex: 2000,
          pointerEvents: 'auto',
          isolation: 'isolate',
        }}
      >
        <SidebarNav />
      </Box>

      <Drawer
        open={Boolean(mobileOpen)}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { lg: 'none' }, zIndex: 1500 }}
        PaperProps={{ sx: { width: 'min(280px, 88vw)', bgcolor: NAVY } }}
      >
        <SidebarNav onNavigate={onMobileClose} />
      </Drawer>
    </>
  );
}
