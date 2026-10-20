import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Box, AppBar, Toolbar, Button } from '@mui/material';

const IAM_URL = (import.meta.env.VITE_IAM_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: 'url(/my_bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'transparent', color: 'primary.main' }}>
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 5 }, py: 2 }}>
          <Box component={Link} to="/landing" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none', color: 'inherit' }}>
            <Box component="img" src="/logo.png" alt="Internal Chat" sx={{ height: 50, width: 'auto' }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button component={Link} to="/chat" size="small" sx={{ color: 'primary.main', fontWeight: 600, textTransform: 'none' }}>
              Open Chat
            </Button>
            <Button component="a" href={`${IAM_URL}/organization-admin`} target="_blank" rel="noopener noreferrer" size="small" sx={{ color: 'primary.main', fontWeight: 600, textTransform: 'none' }}>
              Staff Login
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>
    </Box>
  );
}
