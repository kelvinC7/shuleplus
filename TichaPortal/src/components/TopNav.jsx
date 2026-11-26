import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import ScanHubModal from './ScanHubModal';
import { useAuth } from '../context/AuthContext';
import {
  resolveTeacherPhotoUrl,
  teacherDisplayName,
  teacherInitials,
} from '../utils/teacherDisplay';
import { brand } from '../theme/theme';

function resolveTitle(pathname, title) {
  if (title) return title;
  if (pathname === '/ticha-ai') return 'Ticha AI';
  if (pathname === '/shule-avance') return 'Ticha Avance';
  if (pathname === '/repayment-schedule') return 'Repayment Schedule';
  if (pathname === '/my-teaching') return 'My Teaching';
  if (pathname === '/homework') return 'Homework';
  if (pathname === '/my-courses') return 'My Courses';
  if (pathname.startsWith('/examinations')) return 'Examinations';
  if (pathname === '/assessments') return 'Courses & Marks';
  if (pathname === '/assessments/schedule') return 'Assessments';
  if (pathname.startsWith('/assessments/')) return 'Assessment marks';
  if (pathname.startsWith('/marks')) return 'Marks';
  if (pathname === '/period-attendance') return 'Period attendance';
  if (pathname === '/round-roll-call') return 'Round roll call';
  if (pathname === '/console') return 'Console';
  if (pathname === '/profile') return 'My Profile';
  if (pathname === '/' || pathname === '/dashboard') return 'Dashboard';
  return 'Teacher Portal';
}

/**
 * @param {{ title?: string, onMenuClick?: () => void, isMain?: boolean }} props
 * isMain: primary tab routes — menu + account.
 * !isMain: secondary pages — navy bar, back only (like schoolrep).
 */
const TopNav = ({ title, onMenuClick, isMain = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { teacher, logout } = useAuth();
  const [anchor, setAnchor] = useState(null);
  const [photoError, setPhotoError] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    setPhotoError(false);
  }, [teacher?.photo]);

  const displayName = teacherDisplayName(teacher);
  const initials = teacherInitials(teacher);
  const photoUrl = resolveTeacherPhotoUrl(teacher?.photo);
  const showPhoto = photoUrl && !photoError;
  const pageTitle = resolveTitle(location.pathname, title);

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const handleLogout = () => {
    setAnchor(null);
    logout?.();
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        zIndex: 30,
        ...(!isMain && {
          backgroundColor: { xs: brand.navy, lg: 'rgba(255,255,255,0.92)' },
          borderBottom: { xs: 'none', lg: `1px solid ${brand.border}` },
          color: { xs: '#fff', lg: 'inherit' },
          boxShadow: { xs: 'none', lg: '0 1px 0 rgba(19,33,61,0.06)' },
        }),
      }}
    >
      <Toolbar sx={{ gap: 1, px: { xs: 1.5, md: 2.5 }, minHeight: 56 }}>
        {isMain ? (
          <IconButton
            onClick={onMenuClick}
            aria-label="Open menu"
            sx={{ display: { lg: 'none' }, color: brand.navy }}
          >
            <MenuIcon />
          </IconButton>
        ) : (
          <IconButton
            onClick={goBack}
            aria-label="Go back"
            sx={{
              color: { xs: '#fff', lg: brand.navy },
              ml: -0.5,
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        )}

        <Typography
          noWrap
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: 15,
            fontWeight: 700,
            color: isMain ? brand.navy : { xs: '#fff', lg: brand.navy },
          }}
        >
          {pageTitle}
        </Typography>

        {isMain ? (
          <>
            {/* Scan: student cards + class codes */}
            <IconButton onClick={() => setScanOpen(true)} aria-label="Scan card or class code" sx={{ p: 0.75 }}>
              <Box component="img" src="/shule-card.png" alt="" sx={{ width: 28, height: 28, objectFit: 'contain' }} />
            </IconButton>
            {/* Mobile: console shortcut (replaces avatar) */}
            <IconButton
              onClick={() => navigate('/console')}
              aria-label="Open console"
              sx={{ display: { xs: 'inline-flex', lg: 'none' }, color: brand.navy }}
            >
              <GridViewRoundedIcon />
            </IconButton>
            {/* Desktop: account menu */}
            <IconButton
              onClick={(e) => setAnchor(e.currentTarget)}
              sx={{ p: 0.5, display: { xs: 'none', lg: 'inline-flex' } }}
              aria-label="Account menu"
            >
              <Avatar
                src={showPhoto ? photoUrl : undefined}
                alt={displayName}
                onError={() => setPhotoError(true)}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: brand.navy,
                  color: brand.primary,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {initials}
              </Avatar>
            </IconButton>
          </>
        ) : null}

        <ScanHubModal open={scanOpen} onClose={() => setScanOpen(false)} />

        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { width: 220, mt: 1, borderRadius: 2 } }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{displayName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {teacher?.email || teacher?.phone || 'Teacher'}
            </Typography>
          </Box>
          <Divider />
          <MenuItem
            onClick={() => {
              setAnchor(null);
              navigate('/profile');
            }}
            sx={{ gap: 1, fontSize: 13 }}
          >
            <PersonOutlineIcon fontSize="small" /> Profile
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAnchor(null);
              navigate('/permissions');
            }}
            sx={{ gap: 1, fontSize: 13 }}
          >
            <SettingsOutlinedIcon fontSize="small" /> Permissions
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ gap: 1, fontSize: 13, color: 'error.main' }}>
            <LogoutIcon fontSize="small" /> Log out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default TopNav;
