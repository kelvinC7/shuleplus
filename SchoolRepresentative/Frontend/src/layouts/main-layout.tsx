'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LiveTvOutlinedIcon from '@mui/icons-material/LiveTvOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined';
import FeedbackIcon from '@mui/icons-material/Feedback';
import Link from 'next/link';
import { DirectorSidebar } from '@/components/director-sidebar';
import { DirectorTopbar } from '@/components/director-topbar';
import { useConsole } from '@/contexts/console-context';
import { SessionAccessDeniedScreen, SessionLoadingScreen } from '@/components/session-access';
import { DemoModeBadge } from '@/components/demo-mode-badge';
import { isMainRoute, isStandaloneRoute } from '@/lib/nav-config';

/** Pages that draw their own full-width hero: no padding / max-width on <main>. */
const FULL_BLEED_ROUTES = ['/director/overview'];
import { brand } from '@/theme/theme';
import { dashboardBgSx } from '@/theme/sx';

const YOINFO_HREF = '/director/yoinfo';

const MOBILE_TABS = [
  { href: '/director/overview', label: 'Home', icon: <HomeOutlinedIcon /> },
  { href: '/director/teaching-now', label: 'Teaching', icon: <LiveTvOutlinedIcon /> },
  { href: YOINFO_HREF, label: 'yoInfo', icon: null, center: true },
  { href: '/director/approvals', label: 'Approvals', icon: <CheckCircleOutlineIcon /> },
  { href: '/director/console', label: 'Console', icon: <AppsOutlinedIcon /> },
] as const;

/** Raised round button in the middle of the bar. */
function CenterTabIcon({ ringColor, showDot }: { ringColor: string; showDot: boolean }) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: 60,
        height: 60,
        mt: '-30px',
        borderRadius: '50%',
        bgcolor: brand.primary,
        color: brand.navy,
        border: `5px solid ${ringColor}`,
        boxShadow: '0 8px 20px rgba(0,4,53,0.28)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FeedbackIcon sx={{ fontSize: 26 }} />
      {showDot ? (
        <Box
          component="span"
          sx={{
            position: 'absolute',
            top: -1,
            right: -1,
            width: 12,
            height: 12,
            borderRadius: '50%',
            bgcolor: brand.danger,
            border: `2px solid ${ringColor}`,
          }}
        />
      ) : null}
    </Box>
  );
}

function MobileTabBar() {
  const pathname = usePathname();
  const { ctx } = useConsole();
  const value = MOBILE_TABS.findIndex((t) => pathname === t.href);
  const onYoInfo = pathname === YOINFO_HREF;
  const barBg = brand.navy; // navy bar on every main tab
  const hasNew = (ctx?.counts.unreadNotifications ?? 0) > 0 && !onYoInfo;

  return (
    <BottomNavigation
      value={value >= 0 ? value : false}
      showLabels
      sx={{
        position: 'fixed',
        insetInline: 0,
        bottom: 0,
        zIndex: 30,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        bgcolor: brand.navy,
        pb: 'env(safe-area-inset-bottom)',
        display: { xs: 'flex', lg: 'none' },
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        overflow: 'visible',
        '& .MuiBottomNavigationAction-root': {
          minWidth: 0,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'none',
          letterSpacing: 'normal',
          color: 'rgba(255,255,255,0.6)',
          '&.Mui-selected': { color: brand.primary },
        },
        '& .MuiBottomNavigationAction-label': {
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'none',
          letterSpacing: 'normal',
        },
        '& .MuiBottomNavigationAction-label.Mui-selected': {
          fontSize: 11,
          fontWeight: 700,
        },
        '& .MuiBottomNavigationAction-root.yoinfo-tab': {
          overflow: 'visible',
          color: brand.primary,
          fontWeight: 700,
          '& .MuiBottomNavigationAction-label': { fontWeight: 700, mt: 0.25 },
        },
      }}
    >
      {MOBILE_TABS.map((tab) => (
        <BottomNavigationAction
          key={tab.href}
          component={Link}
          href={tab.href}
          label={tab.label}
          disableRipple={'center' in tab}
          className={'center' in tab ? 'yoinfo-tab' : undefined}
          icon={'center' in tab ? <CenterTabIcon ringColor={barBg} showDot={hasNew} /> : tab.icon}
        />
      ))}
    </BottomNavigation>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const { ready, authorized, error, sessionExpired } = useConsole();

  if (!ready) return <SessionLoadingScreen />;
  if (!authorized) return <SessionAccessDeniedScreen error={error} expired={sessionExpired} />;
  return <>{children}</>;
}

export function MainLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { ctx } = useConsole();
  const pathname = usePathname();
  const isMain = isMainRoute(pathname);
  const isStandalone = isStandaloneRoute(pathname);
  const isFullBleed = FULL_BLEED_ROUTES.includes(pathname);

  return (
    <Gate>
      <Box sx={{ ...dashboardBgSx, display: 'flex' }}>
        <DirectorSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            pl: { lg: 'var(--console-sidebar-w)' },
            pb: isStandalone ? 0 : { xs: isMain ? 10 : 2, lg: 0 },
          }}
        >
          {isStandalone ? null : (
            <DirectorTopbar onMenuOpen={() => setMobileOpen(true)} isMain={isMain} />
          )}
          <Box
            component="main"
            sx={
              isStandalone || isFullBleed
                ? { flex: 1, width: '100%', minWidth: 0 }
                : {
                    flex: 1,
                    px: { xs: 1.5, sm: 2.5, md: 3 },
                    py: { xs: 2, sm: 2.5 },
                    maxWidth: 1440,
                    width: '100%',
                    mx: 'auto',
                  }
            }
          >
            {children}
          </Box>
        </Box>
        {isMain ? <MobileTabBar /> : null}
        {ctx?.user?.mode === 'demo' && !isStandalone ? <DemoModeBadge /> : null}
      </Box>
    </Gate>
  );
}
