import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import SearchIcon from '@mui/icons-material/Search';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';
import { brand } from '../../../theme/theme';

const NAVY = brand.navy;

const gradeTone = (grade?: string) => {
  if (grade === 'A') return { bg: '#F0FDF4', color: '#16A34A' };
  if (grade === 'B') return { bg: '#EFF6FF', color: '#2563EB' };
  if (grade === 'C') return { bg: '#FFFBEB', color: '#B45309' };
  return { bg: '#FEF2F2', color: '#DC2626' };
};

export default function StudentProfiles() {
  const [params, setParams] = useState({});
  const [search, setSearch] = useState('');
  const { loading, error, students, filters, selected } = useTeacherMarksAnalytics(params);

  const filtered = students.filter((s) =>
    !search.trim() || s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={32} sx={{ color: brand.primary }} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: NAVY }}>Student Profiles</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: '#6B7280' }}>Performance snapshot from your marks</Typography>
        </Box>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </Stack>

      <TextField
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search student..."
        size="small"
        sx={{ maxWidth: 440 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#9CA3AF' }} /></InputAdornment> }}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
        {filtered.map((s) => {
          const tone = gradeTone(s.grade);
          return (
            <Paper key={s.id} variant="outlined" sx={{ borderRadius: 2, borderColor: '#E5E7EB', p: 2, transition: 'box-shadow 0.15s', '&:hover': { boxShadow: 3 } }}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{s.name}</Typography>
                  <Typography sx={{ mt: 0.25, fontSize: 12, color: '#6B7280' }}>{s.class_name}</Typography>
                </Box>
                {s.grade && (
                  <Box component="span" sx={{ borderRadius: 1, px: 1, py: 0.5, fontSize: 12, fontWeight: 700, bgcolor: tone.bg, color: tone.color }}>
                    {s.grade}
                  </Box>
                )}
              </Stack>
              <Typography sx={{ mt: 1.5, fontSize: 24, fontWeight: 700, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>
                {s.average != null ? `${s.average}%` : '-'}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#9CA3AF' }}>Term average</Typography>
              {s.at_risk && (
                <Typography sx={{ mt: 1, fontSize: 12, fontWeight: 500, color: '#DC2626' }}>At risk - below 40%</Typography>
              )}
            </Paper>
          );
        })}
        {!filtered.length && (
          <Typography sx={{ gridColumn: '1 / -1', py: 6, textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>No student data yet</Typography>
        )}
      </Box>
    </Stack>
  );
}
