import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TeacherOrangeHero from './TeacherOrangeHero';
import { brand } from '../theme/theme';
import { pageSx } from '../theme/sx';

export const tpActionBtn = undefined; // legacy class export removed — use MUI Button
export const tpActionBtnPrimary = undefined;

export function TeacherStatGrid({ stats = [] }) {
  if (!stats.length) return null;
  const cols =
    stats.length === 5 ? { xs: 2, sm: 3, lg: 5 } : stats.length === 3 ? { xs: 2, sm: 3 } : stats.length === 2 ? { xs: 2 } : { xs: 2, sm: 4 };

  return (
    <Paper
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: `repeat(${Math.min(2, stats.length)}, 1fr)`,
          sm: `repeat(${cols.sm || cols.xs}, 1fr)`,
          lg: cols.lg ? `repeat(${cols.lg}, 1fr)` : undefined,
        },
        overflow: 'hidden',
        borderRadius: 2,
      }}
    >
      {stats.map((stat, i) => (
        <Box
          key={stat.label}
          sx={{
            px: 2,
            py: 1.75,
            borderRight: {
              xs: i % 2 === 0 && i < stats.length - 1 ? `1px solid ${brand.border}` : 'none',
              sm: i < stats.length - 1 ? `1px solid ${brand.border}` : 'none',
            },
            borderBottom: {
              xs: i < stats.length - 2 ? `1px solid ${brand.border}` : 'none',
              sm: 'none',
            },
          }}
        >
          <Typography sx={{ fontSize: '1.15rem', fontWeight: 600, color: brand.navy, lineHeight: 1.1 }}>
            {stat.value}
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 11, fontWeight: 500, color: brand.muted }}>
            {stat.label}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}

export default function TeacherPageShell({
  title,
  subtitle,
  stats = [],
  actions = null,
  children,
  badgeLabel = 'ShuleTicha · Secure',
}) {
  return (
    <Box sx={{ ...pageSx, minHeight: '100%', pb: { xs: 12, lg: 4 } }}>
      <TeacherOrangeHero title={title} subtitle={subtitle} badgeLabel={badgeLabel} />

      <Box
        sx={{
          position: 'relative',
          zIndex: 20,
          mx: 'auto',
          maxWidth: 1300,
          px: { xs: 2, sm: 3, lg: 4 },
          mt: -4,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          pb: 5,
        }}
      >
        <TeacherStatGrid stats={stats} />
        {actions ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
            {actions}
          </Stack>
        ) : null}
        {children}
      </Box>
    </Box>
  );
}
