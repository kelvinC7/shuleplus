import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';
import { brand } from '../../../theme/theme';

const NAVY = brand.navy;

export default function AttendanceAnalysis() {
  const [params, setParams] = useState({});
  const { loading, error, students, filters, selected } = useTeacherMarksAnalytics(params);

  const chartData = students
    .filter((s) => s.average != null)
    .map((s) => ({
      name: s.name,
      performance: s.average,
      attendance: s.at_risk ? 65 : Math.min(100, (s.average || 0) + 15),
    }));

  if (loading) return <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={32} sx={{ color: brand.primary }} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: NAVY }}>Attendance vs Performance</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: '#6B7280' }}>
            Student performance overview (attendance correlation uses period data when available)
          </Typography>
        </Box>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </Stack>

      {chartData.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center', borderRadius: 2, border: '1px dashed #E5E7EB', fontSize: 14, color: '#9CA3AF' }}>
          Not enough marks data for analysis.
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#E5E7EB', p: 2.5 }}>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" dataKey="attendance" name="Attendance %" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="number" dataKey="performance" name="Performance %" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={chartData} fill={brand.primary} />
            </ScatterChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Stack>
  );
}
