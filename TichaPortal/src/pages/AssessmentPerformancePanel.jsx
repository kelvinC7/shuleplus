import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { brand } from '../theme/theme';

function Kpi({ label, value, bgcolor, color = '#fff' }) {
  return (
    <Box
      sx={{
        borderRadius: 0,
        bgcolor,
        px: 1.75,
        py: 1.75,
        minHeight: 88,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px -4px rgba(0,0,0,0.2)',
      }}
    >
      <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.72)' }}>
        {label}
      </Typography>
      <Typography sx={{ mt: 1, fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1, color }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function AssessmentPerformancePanel({ performance, maxMark }) {
  if (!performance) {
    return (
      <Box sx={{ px: 3, py: 7, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 14, color: '#64748B' }}>Performance stats appear once marks are entered.</Typography>
      </Box>
    );
  }

  const distMax = Math.max(...performance.distribution.map((d) => d.count), 1);

  return (
    <Stack spacing={3} sx={{ p: { xs: 2.5, sm: 3 } }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.25 }}>
        <Kpi label="Average" value={`${performance.average}%`} bgcolor={brand.navy} />
        <Kpi label="Pass rate" value={`${performance.passRate}%`} bgcolor="#1D4ED8" />
        <Kpi label="Highest" value={`${performance.highest}%`} bgcolor="#047857" />
        <Kpi label="Lowest" value={`${performance.lowest}%`} bgcolor="#B91C1C" />
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 2, border: `1px solid ${brand.border}`, bgcolor: '#fff', p: 2.5, boxShadow: 1 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B' }}>
          Score distribution
        </Typography>
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {performance.distribution.map((d) => (
            <Box key={d.label} sx={{ display: 'grid', gridTemplateColumns: '5.5rem 1fr 2rem', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>{d.label}</Typography>
              <Box sx={{ height: 10, borderRadius: 99, bgcolor: '#F1F5F9', overflow: 'hidden' }}>
                <Box
                  sx={{
                    height: '100%',
                    minWidth: 0,
                    borderRadius: 99,
                    background: 'linear-gradient(to right, #F5A623, #13213D)',
                    width: d.count > 0 ? `${Math.max((d.count / distMax) * 100, 6)}%` : '0%',
                  }}
                />
              </Box>
              <Typography sx={{ textAlign: 'right', fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: brand.navy }}>
                {d.count}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { md: '1fr 1fr' } }}>
        <Box sx={{ borderRadius: 2, border: '1px solid #A7F3D0', bgcolor: 'rgba(236,253,245,0.8)', p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <TrendingUpIcon sx={{ fontSize: 20, color: '#059669' }} />
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: brand.navy }}>Strong performers</Typography>
          </Stack>
          {performance.top.length === 0 ? (
            <Typography sx={{ fontSize: 14, color: '#64748B' }}>No scored marks yet.</Typography>
          ) : (
            <Box sx={{ '& > *:not(:last-child)': { borderBottom: '1px solid rgba(167,243,208,0.6)' } }}>
              {performance.top.map((row) => (
                <Stack key={row.student.id} direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ py: 1.25 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: brand.navy }}>{row.student.fullName}</Typography>
                  <Typography sx={{ flexShrink: 0, fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#047857' }}>
                    {row.score}/{maxMark} ({Math.round(row.pct)}%)
                  </Typography>
                </Stack>
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ borderRadius: 2, border: '1px solid #FECACA', bgcolor: 'rgba(254,242,242,0.8)', p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <TrendingDownIcon sx={{ fontSize: 20, color: '#DC2626' }} />
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: brand.navy }}>Needs support</Typography>
          </Stack>
          {performance.weak.length === 0 ? (
            <Typography sx={{ fontSize: 14, color: '#64748B' }}>No scored marks yet.</Typography>
          ) : (
            <Box sx={{ '& > *:not(:last-child)': { borderBottom: '1px solid rgba(254,202,202,0.6)' } }}>
              {performance.weak.map((row) => (
                <Stack key={row.student.id} direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ py: 1.25 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: brand.navy }}>{row.student.fullName}</Typography>
                  <Typography sx={{ flexShrink: 0, fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#B91C1C' }}>
                    {row.score}/{maxMark} ({Math.round(row.pct)}%)
                  </Typography>
                </Stack>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      <Typography sx={{ textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
        Based on {performance.ranked.length} student{performance.ranked.length !== 1 ? 's' : ''} with marks entered.
      </Typography>
    </Stack>
  );
}
