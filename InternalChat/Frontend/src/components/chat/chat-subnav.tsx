import { Box } from '@mui/material';
import { Link } from 'react-router-dom';
import { ACCENT, ACCENT_BORDER, ACCENT_FADED, GLASS, PRIMARY } from '@/shared/styles';
import ForumIcon from '@mui/icons-material/Forum';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

interface ChatSubNavProps {
  activeTab: 'chat' | 'admin';
  showAdmin?: boolean;
}

const TABS = [
  { name: 'Chats', tabName: 'chat' as const, icon: <ForumIcon /> },
  { name: 'Admin', tabName: 'admin' as const, icon: <AdminPanelSettingsIcon /> },
];

export function ChatSubNav({ activeTab, showAdmin = true }: ChatSubNavProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: { xs: 1.25, sm: 2, md: 4 },
        py: { xs: 0.25, md: 0 },
        bgcolor: GLASS,
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${ACCENT_BORDER}`,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        flexShrink: 0,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {TABS.filter((t) => showAdmin || t.tabName !== 'admin').map((tab) => {
        const isActive = activeTab === tab.tabName;
        return (
          <Box
            key={tab.tabName}
            component={Link}
            to={`/${tab.tabName}`}
            sx={{
              px: { xs: 1.5, md: 2 },
              py: { xs: 1.1, md: 1.5 },
              minHeight: { xs: 44, md: 'auto' },
              display: 'flex',
              alignItems: 'center',
              gap: 0.8,
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? ACCENT : 'rgba(0,0,0,0.45)',
              borderBottom: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
              textDecoration: 'none',
              transition: 'all 0.2s',
              '&:hover': {
                color: PRIMARY,
                '& .MuiSvgIcon-root': { color: ACCENT },
              },
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                '& .MuiSvgIcon-root': {
                  fontSize: 16,
                  color: isActive ? ACCENT : ACCENT_FADED,
                  transition: 'all 0.2s',
                },
              }}
            >
              {tab.icon}
            </Box>
            {tab.name}
          </Box>
        );
      })}
    </Box>
  );
}
