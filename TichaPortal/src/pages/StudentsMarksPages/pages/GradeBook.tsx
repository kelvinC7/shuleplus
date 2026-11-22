import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { fetchGradebookMatrix } from '../../../services/marksApi';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import { brand } from '../../../theme/theme';

const NAVY = brand.navy;

type Params = { class_name?: string; subject_name?: string };
type Matrix = { columns: { slug: string; label: string }[]; students: { name: string; scores: Record<string, number> }[] };

const scoreColor = (val: number | null | undefined) => {
  if (val == null) return '#D1D5DB';
  if (val >= 80) return '#16A34A';
  if (val >= 60) return '#2563EB';
  if (val >= 50) return '#D97706';
  return '#DC2626';
};

export default function GradeBook() {
  const [params, setParams] = useState<Params>({});
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [search, setSearch] = useState('');
  const { filters, selected } = useTeacherMarksAnalytics(params);

  const loadMatrix = async (p: Params) => {
    if (!p.class_name) {
      setMatrix(null);
      return;
    }
    setLoadingMatrix(true);
    try {
      const res = await fetchGradebookMatrix(p.class_name, p.subject_name);
      if (res?.success) setMatrix(res.data);
    } catch {
      setMatrix(null);
    } finally {
      setLoadingMatrix(false);
    }
  };

  const onFilterChange = (p: Params) => {
    setParams(p);
    loadMatrix(p);
  };

  useEffect(() => {
    if (selected?.class_name && selected.class_name !== params.class_name) {
      const next = { ...params, class_name: selected.class_name, subject_name: selected.subject_name };
      setParams(next);
      loadMatrix(next);
    }
  }, [selected?.class_name, selected?.subject_name]);

  const columns = matrix?.columns || [];
  const students = (matrix?.students || []).filter((s) =>
    !search.trim() || s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: NAVY }}>Grade Book</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: '#6B7280' }}>Live scores from Academic assessments</Typography>
        </Box>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={onFilterChange} showSubject />
      </Stack>

      {!params.class_name ? (
        <Box sx={{ py: 6, textAlign: 'center', borderRadius: 2, border: '1px dashed #E5E7EB', fontSize: 14, color: '#9CA3AF' }}>
          Select a class to load the grade book.
        </Box>
      ) : loadingMatrix ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={32} sx={{ color: brand.primary }} /></Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#E5E7EB', p: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              size="small"
              sx={{ flex: 1, minWidth: 200, maxWidth: 360 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#9CA3AF' }} /></InputAdornment> }}
            />
            <Button
              variant="contained"
              startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />}
              sx={{ bgcolor: NAVY, color: '#fff', textTransform: 'none', '&:hover': { bgcolor: '#24396A' } }}
            >
              Export
            </Button>
          </Paper>

          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: '#E5E7EB', overflow: 'hidden' }}>
            <TableContainer>
              <Table sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                    <TableCell sx={{ fontWeight: 500, color: '#4B5563', position: 'sticky', left: 0, zIndex: 3, bgcolor: '#F9FAFB' }}>Student</TableCell>
                    {columns.map((c) => (
                      <TableCell key={c.slug} align="center" sx={{ fontWeight: 500, color: '#4B5563', whiteSpace: 'nowrap' }}>{c.label}</TableCell>
                    ))}
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#4B5563', bgcolor: '#F9FAFB' }}>Avg</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length + 2} align="center" sx={{ py: 6, color: '#9CA3AF' }}>No students or marks yet</TableCell>
                    </TableRow>
                  ) : (
                    students.map((row, i) => {
                      const vals = columns.map((c) => row.scores?.[c.slug]).filter((v) => v != null) as number[];
                      const avg = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
                      return (
                        <TableRow key={i} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell sx={{ fontWeight: 500, color: NAVY, position: 'sticky', left: 0, zIndex: 2, bgcolor: '#fff', 'tr:hover > &': { bgcolor: '#F5F5F5' } }}>{row.name}</TableCell>
                          {columns.map((c) => {
                            const val = row.scores?.[c.slug];
                            return (
                              <TableCell key={c.slug} align="center" sx={{ fontWeight: 500, color: scoreColor(val) }}>
                                {val != null ? `${val}%` : '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#F9FAFB' }}>{avg != null ? `${avg}%` : '-'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Stack>
  );
}
