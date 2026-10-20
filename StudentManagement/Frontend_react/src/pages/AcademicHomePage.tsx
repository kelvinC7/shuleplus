import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

const AMBER = '#FCB038';
const NAVY = '#000435';

const apps = [
  { icon: '/svg-shapes/students.svg', label: 'Students', path: '/students' },
  { icon: '/svg-shapes/classes.svg', label: 'Classes', path: '/classes' },
  { icon: '/svg-shapes/subjects.svg', label: 'Subjects', path: '/subjects' },
  { icon: '/svg-shapes/examination.svg', label: 'Examinations', path: '/examinations' },
  { icon: '/svg-shapes/marks-entry.svg', label: 'Marks Entry', path: '/marks' },
  { icon: '/svg-shapes/report-cards.svg', label: 'Report Cards', path: '/report-cards' },
  { icon: '/svg-shapes/analytics.svg', label: 'Analytics', path: '/analytics' },
  { icon: '/svg-shapes/graduation.svg', label: 'Graduation', path: '/graduation' },
];

function AppTile({ icon, label, path }: { icon: string; label: string; path?: string }) {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.25,
        width: 104,
        cursor: path ? 'pointer' : 'default',
        textDecoration: 'none',
        '&:hover .tile-icon': path
          ? {
              transform: 'translateY(-8px) scale(1.06)',
              boxShadow: `0 18px 36px rgba(0, 4, 53, 0.18), 0 0 0 1px ${AMBER}55, 0 0 24px ${AMBER}40`,
              background: `linear-gradient(145deg, #ffffff 0%, #FFF8EC 55%, #FFE8B8 100%)`,
            }
          : {},
        '&:hover .tile-label': path ? { color: AMBER } : {},
        '&:hover .tile-glow': path ? { opacity: 1, transform: 'scale(1.15)' } : {},
      }}
    >
      <Box sx={{ position: 'relative', width: 80, height: 80 }}>
        <Box
          className="tile-glow"
          sx={{
            position: 'absolute',
            inset: -6,
            borderRadius: '22px',
            background: `radial-gradient(circle at 50% 40%, ${AMBER}55, transparent 70%)`,
            opacity: 0,
            transition: 'all 0.35s ease',
            pointerEvents: 'none',
          }}
        />
        <Box
          className="tile-icon"
          sx={{
            position: 'relative',
            width: 80,
            height: 80,
            borderRadius: '18px',
            bgcolor: '#fff',
            background: 'linear-gradient(160deg, #ffffff 0%, #F8FAFC 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(0, 4, 53, 0.08), 0 1px 0 rgba(255,255,255,0.9) inset',
            border: '1px solid rgba(0, 4, 53, 0.06)',
            transition: 'all 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <Box
            component="img"
            src={icon}
            alt={label}
            sx={{ width: 48, height: 48, objectFit: 'contain', display: 'block' }}
          />
        </Box>
      </Box>
      <Typography
        className="tile-label"
        sx={{
          color: NAVY,
          fontSize: '0.8125rem',
          textAlign: 'center',
          fontWeight: 600,
          letterSpacing: '0.01em',
          lineHeight: 1.25,
          transition: 'color 0.25s ease',
        }}
      >
        {label}
      </Typography>
    </Box>
  );

  if (path) {
    return (
      <Link to={path} style={{ textDecoration: 'none' }}>
        {content}
      </Link>
    );
  }
  return content;
}

export default function AcademicHomePage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        flex: 1,
        background: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(252, 176, 56, 0.12), transparent 55%),
          radial-gradient(ellipse 60% 40% at 100% 100%, rgba(0, 4, 53, 0.04), transparent 50%),
          #F4F6F9
        `,
      }}
    >
      <Box sx={{ py: 8, pb: 6, display: 'flex', justifyContent: 'center', flexGrow: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))',
            gap: '40px 28px',
            maxWidth: 920,
            width: '100%',
            px: 4,
            justifyItems: 'center',
          }}
        >
          {apps.map((app) => (
            <AppTile key={app.path ?? app.label} {...app} />
          ))}
        </Box>
      </Box>

      <Box sx={{ width: '100%', py: 6, mt: 'auto' }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography sx={{ color: NAVY, fontWeight: 900, fontSize: '1.125rem', letterSpacing: -0.5 }}>
            Shule<span style={{ color: AMBER }}>Plus</span>
          </Typography>
          <Typography sx={{ color: 'rgba(0,4,53,0.55)', fontSize: '11px', fontWeight: 500, mt: 0.5 }}>
            Elevating Education through Technology
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
