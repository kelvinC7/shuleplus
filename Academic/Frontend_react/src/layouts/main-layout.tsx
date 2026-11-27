import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Alert } from '@mui/material';
import { useAuth } from '@/contexts/auth-context';
import { clearToken } from '@/shared/auth-token';
import { AcademicSidebar, ACADEMIC_SIDEBAR_WIDTH } from '@/components/academic-sidebar';
import { AcademicPageHeader } from '@/components/academic-page-header';
import { pageTitleFromPath } from '@/config/academic-nav';

export function MainLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { summary, seeAll, accessLevel, deskOnly } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const page = pageTitleFromPath(pathname);
    document.title = page === 'Home' ? 'ShulePlus | Academic' : `ShulePlus | ${page}`;
  }, [pathname]);

  function handleLogout() {
    clearToken();
    const iamUrl = import.meta.env.VITE_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
    window.location.href = `${iamUrl}/organization-admin`;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6fb' }}>
      <AcademicSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        orgName={summary?.organizationName}
        onLogout={handleLogout}
      />

      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          ml: { lg: `${ACADEMIC_SIDEBAR_WIDTH}px` },
        }}
      >
        <AcademicPageHeader onMenuOpen={() => setMobileOpen(true)} onLogout={handleLogout} />
        <Box
          component="main"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            minHeight: 0,
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 3 },
          }}
        >
          {!deskOnly && (
            <Alert
              severity={seeAll ? 'success' : 'info'}
              variant="outlined"
              sx={{ mb: 2, borderRadius: 2 }}
            >
              {seeAll
                ? 'Organization-wide view: you can see every user’s academic data.'
                : `Showing your data only (${accessLevel}): you can see and edit the records you created.`}
            </Alert>
          )}
          {children}
        </Box>
      </Box>
    </Box>
  );
}
