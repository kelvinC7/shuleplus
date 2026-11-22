'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import { NAV_GROUPS, isNavActive } from '@/lib/nav-config';
import { DirectorSidebarGroup, DirectorSidebarNavLink } from './director-sidebar-nav';
import { useConsole } from '@/contexts/console-context';
import { clearTokens } from '@/shared/auth-token';
import { brand } from '@/theme/theme';
import { scrollSx } from '@/theme/sx';

const SIDEBAR_W = 264;
const OVERVIEW_HREF = '/director/overview';

// Overview is a top-level link (like "Dashboard" in the Ticha portal);
// every other item lives inside its collapsible group.
const OVERVIEW_ITEM = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === OVERVIEW_HREF);
const GROUPS = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.href !== OVERVIEW_HREF) })).filter(
  (g) => g.items.length > 0
);

export function DirectorSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { ctx } = useConsole();

  const badges = {
    approvals: ctx?.counts.pendingApprovals ?? 0,
    notifications: ctx?.counts.unreadNotifications ?? 0,
    tasks: ctx?.counts.overdueTasks ?? 0,
  };

  const signOut = () => {
    clearTokens();
    window.location.href = '/';
  };

  const body = (
    <Box sx={{ display: 'flex', height: '100%', minHeight: 0, flexDirection: 'column', bgcolor: brand.navy, color: '#fff' }}>
      {/* brand */}
      <Box sx={{ p: 2, pb: 1.5, borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component={Link} href={OVERVIEW_HREF} onClick={onClose} sx={{ flex: 1, minWidth: 0, display: 'block', textDecoration: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo_white.png"
              alt="Shule+"
              style={{ display: 'block', height: 32, width: 'auto', maxWidth: 170, objectFit: 'contain', objectPosition: 'left' }}
              draggable={false}
            />
          </Box>
          <IconButton
            onClick={onClose}
            aria-label="Close menu"
            size="small"
            sx={{ color: 'rgba(255,255,255,0.55)', display: { lg: 'none' }, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* nav */}
      <Box sx={{ ...scrollSx, flex: 1, minHeight: 0, pb: 1.5 }}>
        {OVERVIEW_ITEM ? (
          <DirectorSidebarNavLink
            label={OVERVIEW_ITEM.label}
            href={OVERVIEW_ITEM.href}
            icon={OVERVIEW_ITEM.icon}
            active={isNavActive(pathname, OVERVIEW_ITEM.href)}
            onNavigate={onClose}
          />
        ) : null}

        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {GROUPS.map((group) => (
            <DirectorSidebarGroup
              key={group.id}
              label={group.label}
              icon={group.icon}
              items={group.items}
              pathname={pathname}
              badges={badges}
              onNavigate={onClose}
            />
          ))}
        </Box>
      </Box>

      {/* footer */}
      <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <Button
          fullWidth
          onClick={signOut}
          startIcon={<LogoutIcon />}
          sx={{
            minHeight: 36,
            justifyContent: 'center',
            color: 'rgba(254,226,226,0.85)',
            bgcolor: 'transparent',
            border: 'none',
            borderRadius: 0,
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': { bgcolor: 'rgba(239,68,68,0.12)', color: '#fff' },
          }}
        >
          Sign out
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      {/* desktop rail — fixed width, no collapse */}
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
        {body}
      </Box>

      {/* mobile drawer */}
      <Drawer
        open={open}
        onClose={onClose}
        variant="temporary"
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { width: 288, maxWidth: '86vw', bgcolor: brand.navy, boxShadow: 8 },
        }}
      >
        {body}
      </Drawer>
    </>
  );
}
