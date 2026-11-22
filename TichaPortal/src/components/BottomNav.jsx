import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import GradingOutlinedIcon from '@mui/icons-material/GradingOutlined';
import FeedbackIcon from '@mui/icons-material/Feedback';
import { brand } from '../theme/theme';

const YOINFO_HREF = '/yoinfo';
const YOINFO_PINK = '#EC4899';

const TABS = [
  { path: '/', label: 'Home', icon: <HomeOutlinedIcon /> },
  { path: '/my-teaching', label: 'Teaching', icon: <MenuBookOutlinedIcon /> },
  {
    path: YOINFO_HREF,
    label: 'yoInfo',
    icon: (
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          bgcolor: YOINFO_PINK,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FeedbackIcon sx={{ fontSize: 16 }} />
      </Box>
    ),
    yoinfo: true,
  },
  { path: '/assessments/schedule', label: 'Assess', icon: <AssessmentOutlinedIcon /> },
  { path: '/marks', label: 'Marks', icon: <GradingOutlinedIcon /> },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const value = TABS.findIndex((t) =>
    t.path === '/'
      ? location.pathname === '/' || location.pathname === '/dashboard'
      : location.pathname === t.path || location.pathname.startsWith(`${t.path}/`)
  );
  const barBg = brand.navy;

  return (
    <BottomNavigation
      value={value >= 0 ? value : false}
      showLabels
      onChange={(_, next) => {
        const tab = TABS[next];
        if (tab) navigate(tab.path);
      }}
      sx={{
        position: 'fixed',
        insetInline: 0,
        bottom: 0,
        zIndex: 30,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        bgcolor: barBg,
        pb: 'env(safe-area-inset-bottom)',
        display: { xs: 'flex', lg: 'none' },
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        overflow: 'hidden',
        '& .MuiBottomNavigationAction-root': {
          minWidth: 0,
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'none',
          color: 'rgba(255,255,255,0.6)',
          '&.Mui-selected': { color: brand.primary, fontWeight: 600 },
        },
        '& .MuiBottomNavigationAction-label': {
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'none',
        },
      }}
    >
      {TABS.map((tab) => (
        <BottomNavigationAction
          key={tab.path}
          label={tab.label}
          icon={tab.icon}
          sx={
            tab.yoinfo
              ? {
                  color: YOINFO_PINK,
                  '&.Mui-selected': { color: YOINFO_PINK },
                  '& .MuiBottomNavigationAction-label': { fontWeight: 600 },
                }
              : undefined
          }
        />
      ))}
    </BottomNavigation>
  );
}
