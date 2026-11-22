import { useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import SearchIcon from '@mui/icons-material/Search';
import GroupsIcon from '@mui/icons-material/Groups';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';
import { brand } from '../../../theme/theme';

const NAVY = brand.navy;
const headSx = { fontWeight: 500, color: '#4B5563', bgcolor: '#F9FAFB', fontSize: 14 };

export default function Assessments() {
  const [params, setParams] = useState({});
  const [search, setSearch] = useState('');
  const { loading, error, assessments, filters, selected } = useTeacherMarksAnalytics(params);

  const filtered = assessments.filter((a) =>
    !search.trim() || a.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={32} sx={{ color: brand.primary }} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: NAVY }}>Assessments</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: '#6B7280' }}>Your assessments from Academic module</Typography>
        </Box>
        <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
          <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
          <Button
            component={Link}
            to="/assessments/create"
            variant="contained"
            sx={{ bgcolor: NAVY, color: '#fff', textTransform: 'none', '&:hover': { bgcolor: '#24396A' } }}
          >
            Create assessment
          </Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#E5E7EB', overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #E5E7EB' }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assessments..."
            size="small"
            sx={{ maxWidth: 360 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#9CA3AF' }} /></InputAdornment> }}
          />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={headSx}>Name</TableCell>
                <TableCell sx={headSx}>Class</TableCell>
                <TableCell sx={headSx}>Subject</TableCell>
                <TableCell sx={headSx}>Date</TableCell>
                <TableCell align="center" sx={headSx}>Max</TableCell>
                <TableCell align="center" sx={headSx}>Done</TableCell>
                <TableCell align="center" sx={headSx}>Missing</TableCell>
                <TableCell align="center" sx={headSx}>Avg</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, fontSize: 14, color: '#9CA3AF' }}>
                    No assessments found. Create one from Courses & Marks.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((a) => (
                  <TableRow key={a.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ fontSize: 14, fontWeight: 500, color: NAVY }}>{a.name}</TableCell>
                    <TableCell sx={{ fontSize: 14 }}>{a.class}</TableCell>
                    <TableCell sx={{ fontSize: 14 }}>{a.subject}</TableCell>
                    <TableCell sx={{ fontSize: 14, color: '#6B7280' }}>{a.date || '-'}</TableCell>
                    <TableCell align="center" sx={{ fontSize: 14 }}>{a.maxMarks}</TableCell>
                    <TableCell align="center" sx={{ fontSize: 14 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ color: '#16A34A' }}>
                        <GroupsIcon sx={{ fontSize: 14 }} /> {a.completed}
                      </Stack>
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 14 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ color: '#EF4444' }}>
                        <ScheduleIcon sx={{ fontSize: 14 }} /> {a.missing}
                      </Stack>
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: 14, fontWeight: 600 }}>
                      {a.averageScore != null ? `${a.averageScore}%` : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  );
}
