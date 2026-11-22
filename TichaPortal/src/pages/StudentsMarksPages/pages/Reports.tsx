import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';
import { brand } from '../../../theme/theme';

const NAVY = brand.navy;
const AMBER = brand.primary;
const chartPaperSx = { borderRadius: 2, borderColor: '#E5E7EB', p: 2.5 };

export default function Reports() {
  const [params, setParams] = useState({});
  const { loading, error, classPerformance, subjectScores, termTrend, assessments, filters, selected } =
    useTeacherMarksAnalytics(params);

  if (loading) return <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={32} sx={{ color: AMBER }} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: NAVY }}>Academic Reports</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: '#6B7280' }}>Live class and subject performance</Typography>
        </Box>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        <Paper variant="outlined" sx={chartPaperSx}>
          <Typography sx={{ fontWeight: 600, color: NAVY, mb: 2 }}>Class performance</Typography>
          {classPerformance.length === 0 ? (
            <Typography sx={{ py: 4, textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>No data</Typography>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={classPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="average" fill={NAVY} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Paper>

        <Paper variant="outlined" sx={chartPaperSx}>
          <Typography sx={{ fontWeight: 600, color: NAVY, mb: 2 }}>Subject scores</Typography>
          {subjectScores.length === 0 ? (
            <Typography sx={{ py: 4, textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>No data</Typography>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={subjectScores}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="average" fill={AMBER} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Paper>
      </Box>

      <Paper variant="outlined" sx={chartPaperSx}>
        <Typography sx={{ fontWeight: 600, color: NAVY, mb: 2 }}>Term trend</Typography>
        {termTrend.length === 0 ? (
          <Typography sx={{ py: 4, textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>No trend data</Typography>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={termTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="average" stroke={AMBER} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#E5E7EB', overflow: 'hidden' }}>
        <Typography sx={{ px: 2.5, py: 2, fontWeight: 600, color: NAVY }}>Recent assessments</Typography>
        <Divider />
        {assessments.slice(0, 8).map((a) => (
          <Box key={a.id} sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, borderBottom: '1px solid #F3F4F6' }}>
            <Box component="span" sx={{ fontWeight: 500 }}>{a.name}</Box>
            <Box component="span" sx={{ color: '#6B7280' }}>{a.class} - {a.averageScore != null ? `${a.averageScore}%` : '-'}</Box>
          </Box>
        ))}
        {!assessments.length && <Typography sx={{ px: 2.5, py: 4, textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>No assessments</Typography>}
      </Paper>
    </Stack>
  );
}
