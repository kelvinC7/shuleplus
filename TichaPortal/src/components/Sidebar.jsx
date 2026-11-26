import { useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import GradingOutlinedIcon from '@mui/icons-material/GradingOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { useAuth } from '../context/AuthContext';
import useChatUnread from '../hooks/useChatUnread';
import { brand } from '../theme/theme';
import { scrollSx } from '../theme/sx';

function pathIsActive(location, path) {
  if (!path) return false;
  if (location.pathname === path) return true;
  if (path !== '/' && location.pathname.startsWith(`${path}/`)) return true;
  return false;
}

function NavRow({ to, end, icon: Icon, label, badge, onClose, active }) {
  return (
    <Box
      component={NavLink}
      to={to}
      end={end}
      onClick={onClose}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        width: '100%',
        minHeight: 40,
        px: 2,
        py: 0.75,
        borderRadius: 0,
        textDecoration: 'none',
        color: active ? brand.navy : 'rgba(255,255,255,0.72)',
        bgcolor: active ? brand.primary : 'transparent',
        border: '1px solid transparent',
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        '&:hover': {
          bgcolor: active ? brand.primary : 'rgba(255,255,255,0.06)',
          color: active ? brand.navy : '#fff',
        },
      }}
    >
      {Icon ? <Icon sx={{ fontSize: 20, opacity: 1, flexShrink: 0 }} /> : null}
      <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </Box>
      {badge > 0 ? (
        <Box
          component="span"
          sx={{
            minWidth: 20,
            height: 18,
            px: 0.6,
            borderRadius: 0,
            fontSize: 10,
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: brand.primary,
            color: brand.navy,
          }}
        >
          {badge > 99 ? '99+' : badge}
        </Box>
      ) : null}
    </Box>
  );
}

function NavGroup({ icon: Icon, name, subItems, onClose, location }) {
  const hasActive = subItems.some((s) => pathIsActive(location, s.path));
  const [open, setOpen] = useState(hasActive);

  return (
    <Box sx={{ mb: 0.25 }}>
      <Button
        fullWidth
        onClick={() => setOpen((v) => !v)}
        sx={{
          justifyContent: 'flex-start',
          color: hasActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
          bgcolor: 'transparent',
          px: 2,
          py: 0.75,
          minHeight: 36,
          borderRadius: 0,
          fontSize: 11,
          fontWeight: hasActive ? 700 : 600,
          letterSpacing: '0.02em',
          textTransform: 'none',
          gap: 1.5,
          '& .MuiSvgIcon-root': { color: hasActive ? brand.primary : 'inherit' },
          '&:hover': {
            bgcolor: 'rgba(255,255,255,0.04)',
            color: hasActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.75)',
          },
        }}
      >
        {Icon ? <Icon sx={{ fontSize: 20, opacity: 1 }} /> : null}
        <Box component="span" sx={{ flex: 1, textAlign: 'left' }}>
          {name}
        </Box>
        <ExpandMoreIcon
          sx={{
            fontSize: 16,
            transform: open ? 'none' : 'rotate(-90deg)',
            transition: 'transform 0.2s',
            opacity: 0.6,
          }}
        />
      </Button>
      <Collapse in={open}>
        <Box sx={{ pl: 1.5, py: 0.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {subItems.map((s) => (
            <NavRow
              key={s.path}
              to={s.path}
              label={s.name}
              onClose={onClose}
              active={pathIsActive(location, s.path)}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

export default function Sidebar({ onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const unreadCount = useChatUnread() ?? 0;

  const navSections = useMemo(
    () => [
      {
        label: 'Classroom',
        items: [
          {
            type: 'group',
            icon: MenuBookOutlinedIcon,
            name: 'Teaching',
            subItems: [
              { name: 'Students', path: '/students' },
              { name: 'My Teaching', path: '/my-teaching' },
              { name: 'My Courses', path: '/my-courses' },
              { name: 'Homework', path: '/homework' },
              { name: 'Timetable', path: '/timetable' },
              { name: 'Examinations', path: '/examinations' },
              { name: 'Examination Lists', path: '/examination-lists' },
            ],
          },
          {
            type: 'group',
            icon: HowToRegOutlinedIcon,
            name: 'Attendance',
            subItems: [
              { name: 'Class Attendance', path: '/class-attendance' },
              { name: 'My Attendance', path: '/my-attendance' },
              { name: 'Period Attendance', path: '/period-attendance' },
              // { name: 'Round Roll Call', path: '/round-roll-call' }, // hidden on TichaPortal for now — uncomment to bring it back
              { name: 'Students Attendance', path: '/class-students-attendance' },
            ],
          },
          {
            type: 'group',
            icon: GradingOutlinedIcon,
            name: 'Marks & Assessments',
            subItems: [
              { name: 'Assessments', path: '/assessments/schedule' },
              { name: 'Marks hub', path: '/marks' },
            ],
          },
          {
            type: 'group',
            icon: AutoStoriesOutlinedIcon,
            name: 'Lesson planning',
            subItems: [
              { name: 'Generate lesson plan', path: '/lesson-planning/generate' },
              { name: 'All lesson plans', path: '/lesson-planning/all' },
              { name: 'Download plan book', path: '/lesson-planning/book' },
              { name: 'Course performance', path: '/lesson-planning/performance' },
            ],
          },
          {
            type: 'group',
            icon: QrCodeScannerOutlinedIcon,
            name: 'Classroom scan',
            subItems: [{ name: 'Scan to enter', path: '/class-room-scan' }],
          },
        ],
      },
      {
        label: 'Services',
        items: [
          {
            type: 'group',
            icon: BusinessOutlinedIcon,
            name: 'School Services & Tools',
            subItems: [
              { name: 'Ticha Avance', path: '/shule-avance' },
              { name: 'My Payroll', path: '/payroll' },
              { name: 'Repayment Schedule', path: '/repayment-schedule' },
              { name: 'TichaDeals', path: '/ticha-deals' },
              { name: 'Permissions', path: '/permissions' },
              { name: 'School calendar', path: '/school-calendar' },
            ],
          },
          {
            type: 'link',
            icon: ChatOutlinedIcon,
            name: 'Parent messages',
            path: '/parent-messages',
            badge: unreadCount,
          },
        ],
      },
      {
        label: 'Account',
        items: [{ type: 'link', icon: GridViewRoundedIcon, name: 'Console', path: '/console' },
          { type: 'link', icon: PersonOutlineIcon, name: 'My Profile', path: '/profile' }],
      },
    ],
    [unreadCount]
  );

  const handleLogout = () => {
    logout?.();
    navigate('/login');
    onClose?.();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        width: '100%',
        bgcolor: brand.navy,
        color: '#fff',
      }}
    >
      <Box sx={{ p: 2, pb: 1.5, borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            component={NavLink}
            to="/"
            onClick={onClose}
            sx={{ flex: 1, minWidth: 0, display: 'block', textDecoration: 'none' }}
          >
            <Box
              component="img"
              src="/logo_white.png"
              alt="Shule+"
              sx={{ height: 32, width: 'auto', maxWidth: 170, objectFit: 'contain', objectPosition: 'left' }}
            />
          </Box>
          {onClose ? (
            <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.55)', display: { lg: 'none' } }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Box>

      </Box>

      <Box sx={{ ...scrollSx, flex: 1, px: 0, pt: 0, pb: 1.5 }}>
        <NavRow
          to="/"
          end
          icon={DashboardOutlinedIcon}
          label="Dashboard"
          onClose={onClose}
          active={pathIsActive(location, '/') || location.pathname === '/dashboard'}
        />

        {navSections.map((section) => (
          <Box key={section.label} sx={{ mt: 2 }}>
            <Typography sx={{ px: 2, pb: 0.75, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
              {section.label}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {section.items.map((item) =>
                item.type === 'link' ? (
                  <NavRow
                    key={item.path}
                    to={item.path}
                    icon={item.icon}
                    label={item.name}
                    badge={item.badge}
                    onClose={onClose}
                    active={pathIsActive(location, item.path)}
                  />
                ) : (
                  <NavGroup
                    key={item.name}
                    icon={item.icon}
                    name={item.name}
                    subItems={item.subItems}
                    onClose={onClose}
                    location={location}
                  />
                )
              )}
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <Button
          fullWidth
          onClick={handleLogout}
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
            '&:hover': { bgcolor: 'rgba(239,68,68,0.12)', color: '#fff' },
          }}
        >
          Sign out
        </Button>
      </Box>
    </Box>
  );
}
