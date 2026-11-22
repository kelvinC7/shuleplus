import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  AppBar,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { ModuleSidebar } from '@/components/layout/module-sidebar';
import { Person, Logout } from '@mui/icons-material';
import { useAuth } from '@/contexts/auth-context';
import { BRAND_AMBER, BRAND_NAVY } from '@/shared/brand';
import { clearGlobalModalLock } from '@/shared/main-pane-modal';

const IAM_URL = import.meta.env.VITE_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

export function MainLayout() {
  const { pathname, key: locationKey } = useLocation();
  const { summary, user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const open = Boolean(anchorEl);

  useEffect(() => {
    setMobileNav(false);
    clearGlobalModalLock();
    const main = document.getElementById('shulechat-main-scroll');
    main?.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  const outletModule = pathname.startsWith('/sms')
    ? 'sms'
    : pathname.startsWith('/admin')
      ? 'admin'
      : pathname.startsWith('/chat')
        ? 'chat'
        : 'module';

  return (
    <Box
      sx={{
        height: { xs: '100dvh', md: '100vh' },
        bgcolor: '#f8fafc',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <ModuleSidebar mobileOpen={mobileNav} onMobileClose={() => setMobileNav(false)} />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: '#fff',
            color: BRAND_NAVY,
            borderBottom: '1px solid rgba(0,4,53,0.08)',
            display: { xs: 'flex', lg: 'none' },
          }}
        >
          <Toolbar sx={{ minHeight: 52, px: 1.5, gap: 1 }}>
            <IconButton onClick={() => setMobileNav(true)} aria-label="Open menu" sx={{ color: BRAND_NAVY }}>
              <MenuIcon />
            </IconButton>
            <Typography sx={{ flex: 1, fontWeight: 800, fontSize: '1rem' }}>ShuleChat</Typography>
            {summary?.organizationName ? (
              <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{ color: BRAND_NAVY, bgcolor: 'rgba(0,4,53,0.05)' }}
                aria-label="Account menu"
              >
                <Person sx={{ fontSize: 20 }} />
              </IconButton>
            ) : null}
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            alignItems: 'center',
            justifyContent: 'flex-end',
            px: 3,
            py: 1.25,
            bgcolor: '#fff',
            borderBottom: '1px solid rgba(0,4,53,0.08)',
          }}
        >
          {summary?.organizationName ? (
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                cursor: 'pointer',
                border: '1px solid rgba(0,4,53,0.1)',
                '&:hover': { bgcolor: 'rgba(0,4,53,0.03)' },
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: BRAND_NAVY,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Person sx={{ fontSize: 16 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 700, fontSize: '0.8rem', color: BRAND_NAVY }}>
                  {summary.organizationName}
                </Typography>
                <Typography noWrap sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  {user?.email ?? 'User'}
                </Typography>
              </Box>
            </Box>
          ) : null}
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{
            paper: { sx: { mt: 1, minWidth: 180, borderRadius: 2 } },
          }}
        >
          <MenuItem onClick={() => setAnchorEl(null)}>
            <ListItemIcon>
              <Person sx={{ fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              window.location.href = `${IAM_URL}/organization-admin`;
            }}
          >
            <ListItemIcon>
              <Logout sx={{ fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </MenuItem>
        </Menu>

        <Box
          id="shulechat-main-scroll"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            minHeight: 0,
            maxWidth: '100%',
            position: 'relative',
            isolation: 'isolate',
            WebkitOverflowScrolling: 'touch',
            backgroundImage:
              'radial-gradient(circle at top right, rgba(0, 4, 53, 0.06), transparent), radial-gradient(circle at bottom left, rgba(252, 176, 56, 0.05), transparent)',
          }}
        >
          <Outlet key={`${outletModule}-${pathname}-${locationKey}`} />
        </Box>
      </Box>
    </Box>
  );
}
