import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import SearchIcon from '@mui/icons-material/Search';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';
import { brand } from '../../../theme/theme';

const NAVY = brand.navy;

const headSx = { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: '#9CA3AF', fontWeight: 600, py: 1.5, px: 2 };
const cellSx = { fontSize: 14, py: 1.5, px: 2, borderColor: '#F3F4F6' };

export default function StudentPerformance() {
  const [params, setParams] = useState({});
  const [q, setQ] = useState('');
  const { loading, error, students, filters, selected } = useTeacherMarksAnalytics(params);

  const filtered = students.filter((s) => {
    const hay = `${s.name} ${s.student_uid || ''} ${s.class_name}`.toLowerCase();
    return !q || hay.includes(q.toLowerCase());
  });

  if (loading) return <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={32} sx={{ color: brand.primary }} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: NAVY }}>Student Performance</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: '#6B7280' }}>Ranked by average across your subjects</Typography>
        </Box>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </Stack>

      <TextField
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search students..."
        size="small"
        sx={{ maxWidth: 440 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 16, color: '#9CA3AF' }} />
            </InputAdornment>
          ),
        }}
      />

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#E5E7EB', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={headSx}>Rank</TableCell>
                <TableCell sx={headSx}>Student</TableCell>
                <TableCell sx={headSx}>Class</TableCell>
                <TableCell sx={headSx}>Average</TableCell>
                <TableCell sx={headSx}>Grade</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.student_id} hover sx={{ '&:hover': { bgcolor: 'rgba(245,166,35,0.06)' } }}>
                  <TableCell sx={{ ...cellSx, color: '#9CA3AF', fontWeight: 600 }}>#{s.rank ?? '-'}</TableCell>
                  <TableCell sx={{ ...cellSx, fontWeight: 600, color: NAVY }}>{s.name}</TableCell>
                  <TableCell sx={{ ...cellSx, color: '#6B7280' }}>{s.class_name}</TableCell>
                  <TableCell sx={{ ...cellSx, fontWeight: 700 }}>{s.average_percent != null ? `${s.average_percent}%` : '-'}</TableCell>
                  <TableCell sx={cellSx}>
                    <Box component="span" sx={{ borderRadius: 1, bgcolor: 'rgba(19,33,61,0.05)', px: 1, py: 0.25, fontSize: 12, fontWeight: 700 }}>
                      {s.grade || '-'}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {!filtered.length && <Typography sx={{ py: 5, textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>No students found</Typography>}
      </Paper>
    </Stack>
  );
}
