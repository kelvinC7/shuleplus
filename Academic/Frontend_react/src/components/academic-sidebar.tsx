import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
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
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import GradingOutlinedIcon from '@mui/icons-material/GradingOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import TaskOutlinedIcon from '@mui/icons-material/TaskOutlined';
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined';
import GradeOutlinedIcon from '@mui/icons-material/GradeOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EventSeatOutlinedIcon from '@mui/icons-material/EventSeatOutlined';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import SensorsOutlinedIcon from '@mui/icons-material/SensorsOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import {
  ACADEMIC_NAV,
  isAcademicNavActive,
  isAcademicNavGroupActive,
  type AcademicNavItem,
} from '@/config/academic-nav';

const NAVY = '#000435';
const PRIMARY = '#FCB038';

export const ACADEMIC_SIDEBAR_WIDTH = 272;

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

function NavIcon({ item }: { item: AcademicNavItem }) {
  const sx = { fontSize: 20 };
  switch (item.icon) {
    case 'home':
      return <HomeOutlinedIcon sx={sx} />;
    case 'subjects':
      return <MenuBookOutlinedIcon sx={sx} />;
    case 'exams':
      return <QuizOutlinedIcon sx={sx} />;
    case 'assessments':
      return <FactCheckOutlinedIcon sx={sx} />;
    case 'reports':
      return <SummarizeOutlinedIcon sx={sx} />;
    case 'analytics':
      return <InsightsOutlinedIcon sx={sx} />;
    case 'dashboard':
    default:
      return <DashboardOutlinedIcon sx={sx} />;
  }
}

function ChildIcon({ href }: { href: string }) {
  if (href.startsWith('/marks') || href.startsWith('/mark-entry')) {
    return <GradingOutlinedIcon sx={{ fontSize: 18 }} />;
  }
  if (href.startsWith('/assessment-templates')) return <AssignmentOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.startsWith('/assignments')) return <TaskOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.startsWith('/assessments')) return <FactCheckOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.includes('/sessions')) return <QuizOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.includes('/timetable') || href.includes('/published')) return <CalendarMonthOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.includes('/seating')) return <EventSeatOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.includes('/invigilator-desk')) return <SupervisorAccountOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.includes('/invigilators')) return <SupervisorAccountOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.includes('/live')) return <SensorsOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.includes('/reports')) return <SummarizeOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.startsWith('/report-cards')) return <SummarizeOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.startsWith('/grading-scales')) return <GradeOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.startsWith('/competency')) return <PsychologyOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.startsWith('/mark-corrections')) return <RateReviewOutlinedIcon sx={{ fontSize: 18 }} />;
  if (href.startsWith('/graduation')) return <WorkspacePremiumOutlinedIcon sx={{ fontSize: 18 }} />;
  return <DashboardOutlinedIcon sx={{ fontSize: 18 }} />;
}

interface AcademicSidebarProps {
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
    for (const item of ACADEMIC_NAV) {
      if (item.children?.length) {
        initial[item.label] = isAcademicNavGroupActive(item.label, pathname);
      }
    }
    return initial;
  });

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const item of ACADEMIC_NAV) {
        if (item.children?.length && isAcademicNavGroupActive(item.label, pathname)) {
          next[item.label] = true;
        }
      }
      return next;
    });
  }, [pathname]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: NAVY, color: '#fff' }}>
      <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', px: 2.5, py: 2.5 }}>
        <Box component={Link} to="/home" onClick={onNavigate} sx={{ display: 'block', textDecoration: 'none' }}>
          <Box
            component="img"
            src="/logo_white.png"
            alt="Shule+"
            sx={{ height: 36, width: 'auto', maxWidth: 180, objectFit: 'contain', objectPosition: 'left', display: 'block' }}
          />
        </Box>
        <Typography sx={{ mt: 2, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.85)' }}>
          Academic
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
          {ACADEMIC_NAV.map((item) => {
            if (item.children?.length) {
              const groupActive = isAcademicNavGroupActive(item.label, pathname);
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
                        const active = isAcademicNavActive(pathname, child.href);
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

            const active = item.href ? isAcademicNavActive(pathname, item.href) : false;
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

export function AcademicSidebar({ mobileOpen, onMobileClose, orgName, onLogout }: AcademicSidebarProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  if (isDesktop) {
    return (
      <Box component="aside" sx={{ position: 'fixed', inset: '0 auto 0 0', width: ACADEMIC_SIDEBAR_WIDTH, zIndex: 40, boxShadow: '4px 0 24px rgba(0,4,53,0.12)' }}>
        <SidebarContent orgName={orgName} onLogout={onLogout} />
      </Box>
    );
  }

  return (
    <Drawer open={mobileOpen} onClose={onMobileClose} ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: ACADEMIC_SIDEBAR_WIDTH, border: 'none' } }}>
      <SidebarContent orgName={orgName} onLogout={onLogout} onNavigate={onMobileClose} />
    </Drawer>
  );
}
