import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';
import { brand } from '../../../theme/theme';

const NAVY = brand.navy;

export default function TeacherInsights() {
  const [params, setParams] = useState({});
  const { loading, error, insights, termTrend, interventionPlans, kpis, filters, selected } =
    useTeacherMarksAnalytics(params);

  if (loading) return <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={32} sx={{ color: brand.primary }} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: NAVY }}>Teacher Insights</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: '#6B7280' }}>Live insights from your published marks</Typography>
        </Box>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {insights.map((item, i) => {
          const success = item.type === 'success';
          return (
            <Paper
              key={i}
              variant="outlined"
              sx={{ borderRadius: 2, p: 2.5, bgcolor: success ? '#F0FDF4' : '#FFFBEB', borderColor: success ? '#DCFCE7' : '#FDE68A' }}
            >
              <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                {success
                  ? <TrendingUpIcon sx={{ fontSize: 20, color: '#16A34A', flexShrink: 0 }} />
                  : <WarningAmberIcon sx={{ fontSize: 20, color: '#D97706', flexShrink: 0 }} />}
                <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#1F2937' }}>{item.text}</Typography>
              </Stack>
            </Paper>
          );
        })}
        {!insights.length && (
          <Typography sx={{ gridColumn: 'span 2', py: 4, textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>
            Record marks to generate insights.
          </Typography>
        )}
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#E5E7EB', p: 2.5 }}>
        <Typography sx={{ fontWeight: 600, color: NAVY, mb: 2 }}>Performance trend</Typography>
        {termTrend.length === 0 ? (
          <Typography sx={{ py: 4, textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>No trend data yet</Typography>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={termTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="average" stroke={brand.primary} strokeWidth={2} dot={{ fill: brand.primary, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Paper>

      {interventionPlans.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#E5E7EB', p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <TrackChangesIcon sx={{ fontSize: 18, color: '#F59E0B' }} />
            <Typography sx={{ fontWeight: 600, color: NAVY }}>Suggested interventions</Typography>
            <Typography sx={{ fontSize: 12, color: '#9CA3AF' }}>({kpis.at_risk_count ?? 0} at risk)</Typography>
          </Stack>
          <Stack spacing={1.5}>
            {interventionPlans.map((rec) => {
              const high = rec.priority === 'High';
              return (
                <Box key={rec.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: '#F9FAFB', borderRadius: 1.5, gap: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 500, color: NAVY }}>{rec.student} - {rec.class}</Typography>
                    <Typography sx={{ mt: 0.25, fontSize: 12, color: '#6B7280' }}>{rec.action}</Typography>
                  </Box>
                  <Box component="span" sx={{ flexShrink: 0, borderRadius: 999, px: 1.25, py: 0.5, fontSize: 12, fontWeight: 600, bgcolor: high ? '#FEF2F2' : '#FFFBEB', color: high ? '#DC2626' : '#B45309' }}>
                    {rec.priority}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
