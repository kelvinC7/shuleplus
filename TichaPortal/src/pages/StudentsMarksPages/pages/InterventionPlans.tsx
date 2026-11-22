import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';
import { brand } from '../../../theme/theme';

const NAVY = brand.navy;

export default function InterventionPlans() {
  const [params, setParams] = useState({});
  const { loading, error, interventionPlans, atRiskStudents, filters, selected } = useTeacherMarksAnalytics(params);

  if (loading) return <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={32} sx={{ color: brand.primary }} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: NAVY }}>Intervention Plans</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: '#6B7280' }}>{atRiskStudents.length} students below 40% average</Typography>
        </Box>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </Stack>

      <Stack spacing={1.5}>
        {interventionPlans.map((plan) => {
          const high = plan.priority === 'High';
          return (
            <Paper key={plan.id} variant="outlined" sx={{ borderRadius: 2, borderColor: '#E5E7EB', p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                <TrackChangesIcon sx={{ fontSize: 18, color: '#F59E0B', mt: 0.25 }} />
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{plan.student}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#6B7280' }}>{plan.class} - {plan.issue}</Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 14, color: '#4B5563' }}>{plan.action}</Typography>
                </Box>
              </Stack>
              <Box
                component="span"
                sx={{
                  flexShrink: 0,
                  borderRadius: 999,
                  px: 1.25,
                  py: 0.5,
                  fontSize: 12,
                  fontWeight: 600,
                  bgcolor: high ? '#FEF2F2' : '#FFFBEB',
                  color: high ? '#DC2626' : '#B45309',
                }}
              >
                {plan.priority}
              </Box>
            </Paper>
          );
        })}
        {!interventionPlans.length && (
          <Box sx={{ py: 6, textAlign: 'center', borderRadius: 2, border: '1px dashed #E5E7EB', fontSize: 14, color: '#9CA3AF' }}>
            No intervention plans needed right now.
          </Box>
        )}
      </Stack>
    </Stack>
  );
}
