import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Box,
  Collapse,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import { SM_NAV_ITEMS, isSmNavActive, isStudentsGroupActive, isClassesGroupActive, type SmNavItem } from '@/config/nav';

const NAVY = '#000435';
const PRIMARY = '#FCB038';

/** MUI `selected` uses theme primary (navy) on hover — override for sidebar contrast */
const activeNavSx = {
  color: NAVY,
  bgcolor: PRIMARY,
  '&:hover': { bgcolor: PRIMARY, color: NAVY },
  '&.Mui-selected': {
    bgcolor: PRIMARY,
    color: NAVY,
    '&:hover': { bgcolor: PRIMARY, color: NAVY },
  },
};

const inactiveNavSx = {
  color: 'rgba(255,255,255,0.72)',
  bgcolor: 'transparent',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
  '&.Mui-selected': {
    bgcolor: 'transparent',
    color: 'rgba(255,255,255,0.72)',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
  },
};

const activeChildNavSx = {
  color: NAVY,
  bgcolor: PRIMARY,
  '&:hover': { bgcolor: '#fdd067', color: NAVY },
  '&.Mui-selected': {
    bgcolor: PRIMARY,
    color: NAVY,
    '&:hover': { bgcolor: '#fdd067', color: NAVY },
  },
};

const inactiveChildNavSx = {
  color: 'rgba(255,255,255,0.65)',
  bgcolor: 'transparent',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
  '&.Mui-selected': {
    bgcolor: 'transparent',
    color: 'rgba(255,255,255,0.65)',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
  },
};

function NavIcon({ item }: { item: SmNavItem }) {
  const sx = { fontSize: 20 };
  if (item.icon === 'dashboard') return <DashboardOutlinedIcon sx={sx} />;
  if (item.icon === 'classes') return <ClassOutlinedIcon sx={sx} />;
  if (item.icon === 'settings') return <SettingsOutlinedIcon sx={sx} />;
  return <PeopleOutlinedIcon sx={sx} />;
}

function isNavGroupActive(label: string, pathname: string): boolean {
  if (label === 'Students') return isStudentsGroupActive(pathname);
  if (label === 'Classes') return isClassesGroupActive(pathname);
  return false;
}

function ChildIcon({ href }: { href: string }) {
  if (href.includes('head-teachers')) return <ClassOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.includes('missing-information')) return <WarningAmberOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.includes('promotion')) return <TrendingUpOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.includes('reports')) return <AssessmentOutlinedIcon sx={{ fontSize: 18 }} />;
  return <ManageAccountsOutlinedIcon sx={{ fontSize: 18 }} />;
}

interface SmSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  orgName?: string;
  onLogout: () => void;
}

function SidebarContent({
  orgName,
  onLogout,
  onNavigate,
}: {
  orgName?: string;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of SM_NAV_ITEMS) {
      if (item.children?.length) {
        initial[item.label] = isNavGroupActive(item.label, pathname);
      }
    }
    return initial;
  });

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: NAVY, color: '#fff' }}>
      <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', px: 2.5, py: 2.5 }}>
        <Box component={Link} to="/dashboard" onClick={onNavigate} sx={{ display: 'block', textDecoration: 'none' }}>
          <Box
            component="img"
            src="/logo_white.png"
            alt="Shule+"
            sx={{ height: 36, width: 'auto', maxWidth: 180, objectFit: 'contain', objectPosition: 'left', display: 'block' }}
          />
        </Box>
        <Typography sx={{ mt: 2, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.85)' }}>
          Student Management
        </Typography>
        {orgName ? (
          <Typography sx={{ mt: 0.5, fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {orgName}
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 2 }}>
        <Typography sx={{ px: 1.5, mb: 1, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
          Workspace
        </Typography>
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {SM_NAV_ITEMS.map((item) => {
            if (item.children?.length) {
              const groupActive = isNavGroupActive(item.label, pathname);
              const expanded = openGroups[item.label] ?? groupActive;
              return (
                <Box key={item.label}>
                  <ListItemButton
                    onClick={() => toggleGroup(item.label)}
                    sx={{
                      borderRadius: 2,
                      py: 1.25,
                      px: 1.5,
                      color: groupActive ? PRIMARY : 'rgba(255,255,255,0.72)',
                      bgcolor: groupActive ? 'rgba(252,176,56,0.12)' : 'transparent',
                      '&:hover': { bgcolor: groupActive ? 'rgba(252,176,56,0.16)' : 'rgba(255,255,255,0.06)' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                      <NavIcon item={item} />
                    </ListItemIcon>
                    <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 600 } } }} />
                    <ExpandMoreIcon sx={{ fontSize: 18, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.7 }} />
                  </ListItemButton>
                  <Collapse in={expanded}>
                    <List disablePadding sx={{ pl: 1, mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      {item.children.map((child) => {
                        const active = isSmNavActive(pathname, child.href);
                        return (
                          <ListItemButton
                            key={child.href}
                            component={Link}
                            to={child.href}
                            onClick={onNavigate}
                            sx={{
                              borderRadius: 2,
                              py: 1,
                              pl: 2,
                              pr: 1.5,
                              ...(active ? activeChildNavSx : inactiveChildNavSx),
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                              <ChildIcon href={child.href} />
                            </ListItemIcon>
                            <ListItemText primary={child.label} slotProps={{ primary: { sx: { fontSize: '0.8125rem', fontWeight: 600 } } }} />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Collapse>
                </Box>
              );
            }

            const active = item.href ? isSmNavActive(pathname, item.href) : false;
            return (
              <ListItemButton
                key={item.href}
                component={Link}
                to={item.href!}
                onClick={onNavigate}
                sx={{
                  borderRadius: 2,
                  py: 1.25,
                  px: 1.5,
                  ...(active ? activeNavSx : inactiveNavSx),
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                  <NavIcon item={item} />
                </ListItemIcon>
                <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 600 } } }} />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
        <ListItemButton
          onClick={onLogout}
          sx={{
            borderRadius: 2,
            py: 1.25,
            px: 1.5,
            bgcolor: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(248,113,113,0.15)',
            color: 'rgba(254,202,202,0.95)',
            '&:hover': { bgcolor: 'rgba(239,68,68,0.13)' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <LogoutOutlinedIcon sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText primary="Log out" slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 600 } } }} />
        </ListItemButton>
      </Box>
    </Box>
  );
}

export function SmSidebar({ mobileOpen, onMobileClose, orgName, onLogout }: SmSidebarProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const drawerWidth = 272;

  if (isDesktop) {
    return (
      <Box component="aside" sx={{ position: 'fixed', inset: '0 auto 0 0', width: drawerWidth, zIndex: 40, boxShadow: '4px 0 24px rgba(0,4,53,0.12)' }}>
        <SidebarContent orgName={orgName} onLogout={onLogout} />
      </Box>
    );
  }

  return (
    <Drawer open={mobileOpen} onClose={onMobileClose} ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: drawerWidth, border: 'none' } }}>
      <SidebarContent orgName={orgName} onLogout={onLogout} onNavigate={onMobileClose} />
    </Drawer>
  );
}

export const SM_SIDEBAR_WIDTH = 272;
