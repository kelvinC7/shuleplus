import type { ReactNode } from 'react';
import { useState } from 'react';
import { Box, Typography, AppBar, Toolbar, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { ArrowBack, Person, Logout } from '@mui/icons-material';
import { useAuth } from '@/contexts/auth-context';

const IAM_URL = import.meta.env.VITE_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

export function MainLayout({ children }: { children: ReactNode }) {
  const { summary, user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  return (
    <Box
      sx={{
        height: '100vh',
        bgcolor: '#f8fafc',
        backgroundImage:
          'radial-gradient(circle at top right, rgba(0, 17, 33, 0.15), transparent), radial-gradient(circle at bottom left, rgba(0, 17, 33, 0.15), transparent)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <AppBar
        position="relative"
        elevation={0}
        sx={{ bgcolor: '#001121', borderBottom: '1px solid rgba(255,255,255,0.2)', zIndex: 1100 }}
      >
        <Toolbar
          sx={{
            justifyContent: 'space-between',
            px: { xs: 2, md: 4 },
            py: 1,
            minHeight: 'auto',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={() => window.open(`${IAM_URL}/organization-admin`, '_self')}
              sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
              aria-label="Back to organization dashboard"
            >
              <ArrowBack />
            </IconButton>
            <Box component="img" src="/logo_white.png" alt="Logo" sx={{ height: { xs: 32, md: 40 } }} />
            <Typography
              variant="h6"
              sx={{ color: '#fff', fontWeight: 600, ml: 1, cursor: 'pointer', '&:hover': { color: 'rgba(255,255,255,0.85)' } }}
            >
              Internal Chat
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {summary?.organizationName && (
              <Box
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '2px',
                  cursor: 'pointer',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  transition: 'all 0.2s',
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                  }}
                >
                  <Person sx={{ fontSize: 14 }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#fff' }}>
                    {summary.organizationName}
                  </Typography>
                  <Typography sx={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.8)' }}>
                    {user?.email ?? 'User'}
                  </Typography>
                </Box>
              </Box>
            )}

            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              slotProps={{
                paper: {
                  sx: { mt: 1, minWidth: 180, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
                },
              }}
            >
              <MenuItem onClick={() => setAnchorEl(null)}>
                <ListItemIcon><Person sx={{ fontSize: 18 }} /></ListItemIcon>
                <ListItemText primary="Profile" slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }} />
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  window.location.href = `${IAM_URL}/organization-admin`;
                }}
              >
                <ListItemIcon><Logout sx={{ fontSize: 18 }} /></ListItemIcon>
                <ListItemText primary="Logout" slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }} />
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </Box>
    </Box>
  );
}
