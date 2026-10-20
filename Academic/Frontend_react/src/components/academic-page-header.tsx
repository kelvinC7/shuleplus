import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import { useAuth } from '@/contexts/auth-context';
import { pageTitleFromPath } from '@/config/academic-nav';

interface AcademicPageHeaderProps {
  onMenuOpen: () => void;
  onLogout: () => void;
}

export function AcademicPageHeader({ onMenuOpen, onLogout }: AcademicPageHeaderProps) {
  const { pathname } = useLocation();
  const { user, summary } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const pageTitle = pageTitleFromPath(pathname);
  const iamUrl = import.meta.env.VITE_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

  useEffect(() => {
    setAnchorEl(null);
  }, [pathname]);

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        borderBottom: '1px solid rgba(0,4,53,0.08)',
        bgcolor: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: { xs: 2, sm: 3 },
          py: 1.5,
        }}
      >
        <IconButton
          onClick={onMenuOpen}
          sx={{
            display: { lg: 'none' },
            border: '1px solid rgba(0,4,53,0.1)',
            borderRadius: 2,
          }}
          aria-label="Open menu"
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
            Academic
          </Typography>
          <Typography sx={{ fontSize: { xs: '1rem', sm: '1.125rem' }, fontWeight: 700, color: '#000435', lineHeight: 1.2 }}>
            {pageTitle}
          </Typography>
        </Box>

        <IconButton
          size="small"
          sx={{
            color: '#000435',
            bgcolor: 'rgba(0,4,53,0.05)',
            '&:hover': { bgcolor: 'rgba(0,4,53,0.1)' },
          }}
        >
          <NotificationsNoneIcon sx={{ fontSize: 20 }} />
        </IconButton>

        <Box
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            cursor: 'pointer',
            bgcolor: 'rgba(0,4,53,0.05)',
            '&:hover': { bgcolor: 'rgba(0,4,53,0.1)' },
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#000435',
              color: '#fff',
            }}
          >
            <PersonIcon sx={{ fontSize: 14 }} />
          </Box>
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', lineHeight: 1.2 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'rgba(0,4,53,0.9)' }}>
              {summary?.organizationName ?? 'School'}
            </Typography>
            <Typography sx={{ fontSize: '0.625rem', color: 'rgba(0,4,53,0.5)' }}>
              {user?.email ?? 'User'}
            </Typography>
          </Box>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{
            paper: {
              sx: { mt: 1, minWidth: 200, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
            },
          }}
        >
          <MenuItem component="a" href={`${iamUrl}/organization-admin`} onClick={() => setAnchorEl(null)}>
            <ListItemIcon><HomeOutlinedIcon sx={{ fontSize: 18 }} /></ListItemIcon>
            <ListItemText primary="Organization dashboard" slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }} />
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              onLogout();
            }}
          >
            <ListItemIcon><LogoutIcon sx={{ fontSize: 18 }} /></ListItemIcon>
            <ListItemText primary="Log out" slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }} />
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
