import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { brand } from '../theme/theme';

/**
 * Mock-aligned page hero: deep navy with amber glow and eyebrow label.
 */
export default function TeacherOrangeHero({
  title,
  subtitle,
  badgeLabel = 'ShuleTicha',
  rightSlot = null,
  children = null,
}) {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: brand.navy,
        color: '#fff',
        pt: 1.75,
        pb: 7,
        '&::after': {
          content: '""',
          position: 'absolute',
          right: -60,
          top: -70,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,166,35,0.2), transparent 65%)',
          pointerEvents: 'none',
        },
      }}
    >
      {rightSlot ? (
        <Box
          sx={{
            position: 'absolute',
            right: 20,
            top: 20,
            zIndex: 30,
            display: { xs: 'none', md: 'flex' },
            maxWidth: 'min(100% - 12rem, 28rem)',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1,
          }}
        >
          {rightSlot}
        </Box>
      ) : null}

      <Box
        sx={{
          position: 'relative',
          zIndex: 10,
          mx: 'auto',
          width: '100%',
          maxWidth: 1300,
          px: { xs: 2.5, sm: 3, md: 4 },
          pt: 0.5,
        }}
      >
        {badgeLabel ? (
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: brand.primary,
            }}
          >
            {badgeLabel}
          </Typography>
        ) : null}
        <Typography
          component="h1"
          sx={{ mt: 0.5, fontSize: { xs: 22, sm: 24 }, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff' }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography
            sx={{ mt: 0.5, maxWidth: 672, fontSize: { xs: 12, md: 14 }, lineHeight: 1.6, color: '#9FB0D3' }}
          >
            {subtitle}
          </Typography>
        ) : null}
        {children ? (
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>{children}</Box>
        ) : null}
      </Box>
    </Box>
  );
}
