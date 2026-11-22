import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';
import { brand } from '../../../theme/theme';

const NAVY = brand.navy;

export default function AtRiskStudents() {
  const [params, setParams] = useState({});
  const { loading, error, atRiskStudents, filters, selected } = useTeacherMarksAnalytics(params);

  const critical = atRiskStudents.filter((s) => s.risk === 'Critical');
  const high = atRiskStudents.filter((s) => s.risk === 'High');

  if (loading) return <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={32} sx={{ color: brand.primary }} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  const cards = [
    { label: 'Critical', value: critical.length, color: '#B91C1C', bg: 'rgba(254,226,226,0.5)', border: '#FECACA' },
    { label: 'High', value: high.length, color: NAVY, bg: 'rgba(243,245,250,0.5)', border: '#CBD5E8' },
    { label: 'Total', value: atRiskStudents.length, color: NAVY, bg: 'rgba(255,251,235,0.5)', border: '#FDE68A' },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: NAVY }}>At-Risk Students</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: '#6B7280' }}>Students below 50% in your classes</Typography>
        </Box>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        {cards.map((card) => (
          <Paper key={card.label} variant="outlined" sx={{ borderRadius: 3, borderColor: card.border, bgcolor: card.bg, p: 2 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: card.color }}>{card.label}</Typography>
            <Typography sx={{ fontSize: 30, fontWeight: 900, color: card.color }}>{card.value}</Typography>
          </Paper>
        ))}
      </Box>

      {atRiskStudents.length === 0 ? (
        <Paper variant="outlined" sx={{ py: 8, textAlign: 'center', borderRadius: 2, borderColor: '#E5E7EB' }}>
          <WarningAmberIcon sx={{ fontSize: 28, color: '#F59E0B', mb: 1.5 }} />
          <Typography sx={{ fontWeight: 600, color: NAVY }}>No at-risk students</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: '#6B7280' }}>All students are at or above the pass threshold.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {atRiskStudents.map((s) => {
            const criticalRow = s.risk === 'Critical';
            return (
              <Paper key={s.student_id} variant="outlined" sx={{ borderRadius: 2, borderColor: '#E5E7EB', p: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{s.name}</Typography>
                  <Typography sx={{ mt: 0.25, fontSize: 12, color: '#6B7280' }}>{s.class} - {s.reason}</Typography>
                </Box>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography sx={{ fontSize: 18, fontWeight: 900, color: '#DC2626' }}>{s.average}%</Typography>
                  <Box
                    component="span"
                    sx={{
                      borderRadius: 999,
                      px: 1,
                      py: 0.5,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      bgcolor: criticalRow ? '#FEE2E2' : '#E3E9F5',
                      color: criticalRow ? '#991B1B' : NAVY,
                    }}
                  >
                    {s.risk}
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
