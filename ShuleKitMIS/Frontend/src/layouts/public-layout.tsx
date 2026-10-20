import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, AppBar, Toolbar, Button } from '@mui/material';

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
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 5 }, py: 1 }}>
          <Box component={Link} to="/order" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none', color: 'inherit' }}>
            <Box component="img" src="/logo.png" alt="ShuleKit" sx={{ width: 36, height: 'auto' }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <Typography sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1rem' }}>ShuleKit</Typography>
              <Typography sx={{ fontSize: '0.625rem', color: 'rgba(0,31,63,0.5)' }}>Student Kit MIS</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button component={Link} to="/order/status" size="small" sx={{ color: 'primary.main', fontWeight: 600, textTransform: 'none' }}>
              Check Order Status
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, p: { xs: 3, md: 5 } }}>
        {children}
      </Box>
    </Box>
  );
}
