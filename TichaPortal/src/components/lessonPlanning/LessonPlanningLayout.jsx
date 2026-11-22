import { Link, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import { brand } from '../../theme/theme';

const TABS = [
  { path: '/lesson-planning/all', label: 'All plans', short: 'Plans' },
  { path: '/lesson-planning/book', label: 'Download book', short: 'Book' },
  { path: '/lesson-planning/performance', label: 'Performance', short: 'Stats' },
];

export const LESSON_TABS_HEIGHT = 42;

/**
 * Same shell pattern as /marks and /assessments:
 *  1. sticky full-width square tabs at the very top
 *  2. optional sticky filter bar right under the tabs (`filterBar`)
 *  3. padded page content (title, actions, children)
 */
export default function LessonPlanningLayout({ title, subtitle, actions, filterBar, children }) {
  const location = useLocation();

  return (
    <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column', pb: { xs: 10, md: 4 } }}>
      {/* Sticky tabs — full width, square */}
      <Box
        role="tablist"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 22,
          display: 'flex',
          height: LESSON_TABS_HEIGHT,
          bgcolor: '#fff',
          borderBottom: '1px solid rgba(19,33,61,0.08)',
        }}
      >
        {TABS.map((tab) => {
          const active = location.pathname === tab.path || location.pathname.startsWith(`${tab.path}/`);
          return (
            <ButtonBase
              key={tab.path}
              component={Link}
              to={tab.path}
              role="tab"
              aria-selected={active}
              sx={{
                flex: 1,
                minWidth: 0,
                borderRadius: 0,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.01em',
                color: active ? brand.navy : 'rgba(19,33,61,0.45)',
                borderBottom: active ? `2px solid ${brand.navy}` : '2px solid transparent',
                bgcolor: active ? 'rgba(19,33,61,0.03)' : 'transparent',
                '&:hover': { color: brand.navy, bgcolor: 'rgba(19,33,61,0.04)' },
              }}
            >
              <Box component="span" sx={{ display: { sm: 'none' } }}>{tab.short}</Box>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{tab.label}</Box>
            </ButtonBase>
          );
        })}
      </Box>

      {/* Sticky filter bar under the tabs */}
      {filterBar ? (
        <Box
          sx={{
            position: 'sticky',
            top: LESSON_TABS_HEIGHT,
            zIndex: 20,
            bgcolor: '#fff',
            borderBottom: '1px solid rgba(19,33,61,0.08)',
            boxShadow: '0 2px 8px -4px rgba(19,33,61,0.12)',
          }}
        >
          {filterBar}
        </Box>
      ) : null}

      <Stack
        spacing={2}
        sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: { xs: 1.25, md: 2, lg: 2.5 } }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={1.25}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: brand.navy }}>{title}</Typography>
            {subtitle ? (
              <Typography sx={{ mt: 0.15, fontSize: 12, color: 'rgba(19,33,61,0.45)' }}>{subtitle}</Typography>
            ) : null}
          </Box>
          {actions ? (
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}>
              {actions}
            </Stack>
          ) : null}
        </Stack>

        {children}
      </Stack>
    </Box>
  );
}
