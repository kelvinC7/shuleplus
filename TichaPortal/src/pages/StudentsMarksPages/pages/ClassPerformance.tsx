import { useState } from 'react';
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import GroupsIcon from '@mui/icons-material/Groups';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';
import { brand } from '../../../theme/theme';

const NAVY = brand.navy;
const AMBER = brand.primary;

export default function ClassPerformance() {
  const [params, setParams] = useState({});
  const { loading, error, classPerformance, filters, selected } = useTeacherMarksAnalytics(params);

  if (loading) return <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={32} sx={{ color: AMBER }} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  const stat = (label: string, value: ReactNode, valueColor?: string) => (
    <Box sx={{ borderRadius: 2, bgcolor: '#F9FAFB', p: 1.5 }}>
      <Typography sx={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase' }}>{label}</Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 700, color: valueColor || NAVY }}>{value}</Typography>
    </Box>
  );

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: NAVY }}>Class Performance</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: '#6B7280' }}>Compare classes you teach</Typography>
        </Box>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </Stack>

      {classPerformance.length === 0 ? (
        <Typography sx={{ py: 6, textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>No class performance data yet</Typography>
      ) : (
        <>
          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#E5E7EB', p: 2.5 }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={classPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="average" radius={[6, 6, 0, 0]}>
                  {classPerformance.map((_, i) => <Cell key={i} fill={i === 0 ? AMBER : NAVY} opacity={1 - i * 0.08} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          {classPerformance.map((c) => (
            <Paper key={c.name} variant="outlined" sx={{ borderRadius: 2, borderColor: '#E5E7EB', p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <GroupsIcon sx={{ fontSize: 18, color: NAVY }} />
                <Typography sx={{ fontSize: 18, fontWeight: 600, color: NAVY }}>{c.name}</Typography>
                <Typography sx={{ fontSize: 12, color: '#9CA3AF' }}>#{c.rank}</Typography>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                {stat('Average', `${c.average ?? '-'}%`)}
                {stat('Pass rate', `${c.passRate ?? '-'}%`, '#D97706')}
                {stat('Students', c.student_count)}
                {stat('Subjects', c.subject_count)}
              </Box>
            </Paper>
          ))}
        </>
      )}
    </Stack>
  );
}
