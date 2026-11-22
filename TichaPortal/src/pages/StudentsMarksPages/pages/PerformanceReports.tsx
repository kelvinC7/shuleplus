import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';
import { brand } from '../../../theme/theme';

const NAVY = brand.navy;
const PIE_COLORS = ['#22c55e', '#3b82f6', brand.primary, '#13213D', '#ef4444'];

const chartPaperSx = { borderRadius: 2, borderColor: '#E5E7EB', p: 2.5 };

export default function PerformanceReports() {
  const [params, setParams] = useState({});
  const { loading, error, monthlyProgress, gradeDistribution, passRateTrend, kpis, filters, selected } =
    useTeacherMarksAnalytics(params);

  if (loading) return <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={32} sx={{ color: brand.primary }} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: NAVY }}>Performance Reports</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: '#6B7280' }}>
            Pass rate {kpis.pass_rate != null ? `${kpis.pass_rate}%` : '-'} - Avg {kpis.average_percent != null ? `${kpis.average_percent}%` : '-'}
          </Typography>
        </Box>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        <Paper variant="outlined" sx={chartPaperSx}>
          <Typography sx={{ fontWeight: 600, color: NAVY, mb: 2 }}>Monthly progress</Typography>
          {monthlyProgress.length === 0 ? (
            <Typography sx={{ py: 4, textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>No data</Typography>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="average" stroke={brand.primary} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Paper>

        <Paper variant="outlined" sx={chartPaperSx}>
          <Typography sx={{ fontWeight: 600, color: NAVY, mb: 2 }}>Grade distribution</Typography>
          {gradeDistribution.every((g) => !g.count) ? (
            <Typography sx={{ py: 4, textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>No distribution data</Typography>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={gradeDistribution.filter((g) => g.count > 0)} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={90} label>
                  {gradeDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Paper>
      </Box>

      {passRateTrend.length > 0 && (
        <Paper variant="outlined" sx={chartPaperSx}>
          <Typography sx={{ fontWeight: 600, color: NAVY, mb: 2 }}>Pass rate by period</Typography>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={passRateTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke={NAVY} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Stack>
  );
}
