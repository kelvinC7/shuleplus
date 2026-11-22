import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import PeriodReminderBanner from './PeriodReminderBanner';
import CommandPalette from './CommandPalette';
import { brand } from '../theme/theme';

const TAB_PATHS = ['/', '/dashboard', '/my-teaching', '/assessments', '/assessments/schedule', '/marks', '/yoinfo', '/profile'];
const SIDEBAR_W = 264;

const DashboardLayout = ({ children, title }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const isChatPage = location.pathname.endsWith('/chat');
  const isTabPage = TAB_PATHS.includes(location.pathname);
  const isDesktop = useMediaQuery('(min-width:1200px)', { noSsr: true });
  // Mobile "tab" pages are ordinary sub pages on desktop (back button, no account/scan extras)
  const isMainBar = isTabPage && !isDesktop;
  // yoInfo is a full-screen swipeable feed: no top bar, no extra bottom padding
  const isYoInfo = location.pathname === '/yoinfo';
  // Home: on desktop the hero replaces the top bar (mobile keeps it)
  const isHome = location.pathname === '/' || location.pathname === '/dashboard';
  const shouldShowBottomNav = !isChatPage && isTabPage;
  const mainRef = useRef(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <Box
      className="tp-root"
      sx={{
        display: 'flex',
        height: '100dvh',
        bgcolor: brand.background,
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      {/* Desktop command palette (Ctrl/⌘ + K) */}
      {!isChatPage && <CommandPalette />}

      {/* Desktop sidebar */}
      {!isChatPage && (
        <Box
          component="aside"
          sx={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            height: '100dvh',
            zIndex: 40,
            display: { xs: 'none', lg: 'block' },
            width: SIDEBAR_W,
            overflow: 'hidden',
          }}
        >
          <Sidebar />
        </Box>
      )}

      {/* Mobile drawer sidebar */}
      {!isChatPage && (
        <Drawer
          open={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': {
              width: 'min(304px, 88vw)',
              bgcolor: brand.navy,
              backgroundImage: 'none',
              border: 'none',
            },
          }}
        >
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </Drawer>
      )}

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
          position: 'relative',
          pl: { lg: isChatPage ? 0 : `${SIDEBAR_W}px` },
        }}
      >
        <Box
          sx={{
            display: isChatPage || isYoInfo ? 'none' : isHome ? { xs: 'block', lg: 'none' } : 'block',
          }}
        >
          <TopNav
            title={title}
            onMenuClick={() => setIsSidebarOpen(true)}
            isMain={isMainBar}
          />
        </Box>
        {!isChatPage && !isYoInfo && (!isTabPage || (isDesktop && !isHome)) && <PeriodReminderBanner />}

        <Box
          component="main"
          ref={mainRef}
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative',
            pb: shouldShowBottomNav && !isYoInfo ? 'calc(5.5rem + env(safe-area-inset-bottom))' : 0,
            '@media (min-width: 1200px)': {
              pb: 0,
            },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              zIndex: 10,
              width: '100%',
              minWidth: 0,
              animation: 'fade-in 0.25s ease both',
            }}
          >
            {children}
          </Box>
        </Box>

        {shouldShowBottomNav ? <BottomNav /> : null}
      </Box>
    </Box>
  );
};

export default DashboardLayout;
