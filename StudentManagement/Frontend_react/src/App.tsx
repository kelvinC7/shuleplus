import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { theme } from '@/shared/theme';
import { TokenBootstrap } from '@/components/token-bootstrap';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { MainLayout } from '@/layouts/main-layout';
import { SESSION_EXPIRED_EVENT } from '@/shared/auth-token';

function Gate({ children }: { children: ReactNode }) {
  const { ready, authorized, error } = useAuth();

  if (!ready) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">Verifying license and tenant…</Typography>
      </Box>
    );
  }

  if (!authorized) {
    const loginUrl = import.meta.env.VITE_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Box sx={{ maxWidth: 400, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>Access Denied</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {error ?? 'Module Not Licensed'}
          </Typography>
          <Button variant="contained" component="a" href={`${loginUrl}/organization-admin`} target="_blank" rel="noopener noreferrer">
            Back to Organization Dashboard
          </Button>
        </Box>
      </Box>
    );
  }

  return <MainLayout>{children}</MainLayout>;
}

export function ModuleLayout() {
  return (
    <AuthProvider>
      <Gate>
        <Outlet />
      </Gate>
    </AuthProvider>
  );
}

export function App() {
  useEffect(() => {
    const onExpired = () => {
      const loginUrl = import.meta.env.VITE_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
      const reopen = window.confirm(
        'Your session expired. Click OK to return to the organization dashboard and open Student Management again.'
      );
      if (reopen) window.location.href = `${loginUrl}/organization-admin`;
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TokenBootstrap />
      <Outlet />
    </ThemeProvider>
  );
}
