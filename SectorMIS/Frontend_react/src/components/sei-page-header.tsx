import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchSector } from '@/services/sei-api';
import { Box, IconButton, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '@/contexts/auth-context';
import { SmProfileMenu } from '@/components/sm-profile-menu';
import { pageTitleFromPath, searchPlaceholderFromPath } from '@/config/nav';

interface SeiPageHeaderProps {
  onMenuOpen: () => void;
  onLogout: () => void;
}

function displayNameFromEmail(email?: string): string {
  if (!email) return 'SEI Officer';
  const local = email.split('@')[0] ?? email;
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function SeiPageHeader({ onMenuOpen, onLogout }: SeiPageHeaderProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, summary } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  const pageTitle = pageTitleFromPath(pathname);
  const searchPlaceholder = searchPlaceholderFromPath(pathname);
  const displayName = displayNameFromEmail(user?.email);
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const iamUrl = import.meta.env.VITE_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

  useEffect(() => {
    setMenuOpen(false);
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: { xs: 2, sm: 3 }, py: 1.5 }}>
        <IconButton
          onClick={onMenuOpen}
          sx={{ display: { lg: 'none' }, border: '1px solid rgba(0,4,53,0.1)', borderRadius: 2 }}
          aria-label="Open menu"
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ minWidth: 0, flex: { xs: 1, lg: 'none' } }}>
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
            SEI Attendance Intelligence
          </Typography>
          <Typography sx={{ fontSize: { xs: '1rem', sm: '1.125rem' }, fontWeight: 700, color: '#000435', lineHeight: 1.2 }}>
            {pageTitle}
          </Typography>
        </Box>

        <Box sx={{ display: { xs: 'none', lg: 'block' }, flex: 1, maxWidth: 480, mx: 'auto' }}>
          <Box sx={{ position: 'relative' }}>
            <Box
              component="input"
              type="search"
              placeholder={searchPlaceholder}
              aria-label="Search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key !== 'Enter' || !searchQ.trim()) return;
                const res = await searchSector(searchQ.trim());
                if (res.schools[0]) navigate(`/schools/${res.schools[0].id}`);
                else if (pathname.startsWith('/follow-up')) navigate('/follow-up');
              }}
              sx={{
                width: '100%',
                border: '1px solid rgba(0,4,53,0.1)',
                borderRadius: 2.5,
                bgcolor: '#f4f6fb',
                py: 1.25,
                pl: 2,
                pr: 2,
                fontSize: '0.875rem',
                outline: 'none',
                fontFamily: 'inherit',
                '&:focus': { borderColor: 'rgba(252,176,56,0.6)', bgcolor: '#fff' },
              }}
            />
          </Box>
        </Box>

        <Box sx={{ ml: 'auto', flexShrink: 0 }}>
          <SmProfileMenu
            fullName={displayName}
            initials={initials || 'SE'}
            email={user?.email}
            organizationName={summary?.organizationName}
            open={menuOpen}
            onToggle={() => setMenuOpen((o) => !o)}
            onClose={() => setMenuOpen(false)}
            onLogout={onLogout}
            iamUrl={iamUrl}
          />
        </Box>
      </Box>
    </Box>
  );
}
