import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import useTpAcademic from '../hooks/useTpAcademic';
import { fetchAssessments } from '../services/teacherPortalApi';
import AssessmentFormSheet from './assessments/AssessmentFormSheet';
import AssessmentRowMenu from './coursesMarks/AssessmentRowMenu.jsx';
import { brand } from '../theme/theme';

const NAVY = brand.navy;
const MUTED = 'rgba(19,33,61,0.45)';
const BORDER = 'rgba(19,33,61,0.08)';

const barSelectSx = {
  fontSize: 12,
  fontWeight: 600,
  color: NAVY,
  bgcolor: 'transparent',
  '&:before, &:after': { borderBottom: 'none !important' },
  '& .MuiSelect-select': { py: 0.75, pr: '24px !important', bgcolor: 'transparent !important' },
  '& .MuiSelect-icon': { fontSize: 18 },
};

const headCellSx = {
  py: 0.85,
  px: { xs: 1, sm: 1.5 },
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#94A3B8',
  bgcolor: '#F8F9FC',
  borderBottom: `1px solid ${BORDER}`,
  whiteSpace: 'nowrap',
};

const cellSx = {
  py: 0.85,
  px: { xs: 1, sm: 1.5 },
  fontSize: 12.5,
  borderBottom: `1px solid rgba(19,33,61,0.05)`,
};

function prettyDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function assessmentTitle(a) {
  return a?.title || a?.name || a?.assessmentName || a?.component?.name || 'Assessment';
}

function assessmentClass(a) {
  return a?.className || a?.class?.name || a?.classLabel || a?.stream || '—';
}

function StatusChip({ status }) {
  const s = String(status || '—').toUpperCase();
  const tone =
    s === 'PUBLISHED' || s === 'CLOSED'
      ? { color: '#065F46', bg: '#ECFDF5', ring: '#A7F3D0' }
      : s === 'OPEN' || s === 'MARK_ENTRY'
        ? { color: '#1E40AF', bg: '#EFF6FF', ring: '#BFDBFE' }
        : s === 'DRAFT'
          ? { color: '#92400E', bg: '#FFFBEB', ring: '#FDE68A' }
          : { color: '#475569', bg: '#F1F5F9', ring: '#E2E8F0' };

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 99,
        px: 1,
        py: 0.15,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        color: tone.color,
        bgcolor: tone.bg,
        boxShadow: `inset 0 0 0 1px ${tone.ring}`,
        whiteSpace: 'nowrap',
      }}
    >
      {status || '—'}
    </Box>
  );
}

export default function TeacherAssessmentsSchedule() {
  const navigate = useNavigate();
  const { term, academicYear, ready, settings } = useTpAcademic();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [createOpen, setCreateOpen] = useState(false);

  const yearOptions = useMemo(() => {
    const fromSettings = settings?.academicYears;
    if (Array.isArray(fromSettings) && fromSettings.length) return fromSettings;
    return academicYear ? [academicYear] : [];
  }, [settings, academicYear]);

  const termOptions = useMemo(() => {
    const fromSettings = settings?.terms;
    if (Array.isArray(fromSettings) && fromSettings.length) return fromSettings;
    return term ? [term] : [];
  }, [settings, term]);

  useEffect(() => {
    if (!ready) return;
    if (!filterYear && (settings?.currentAcademicYear || academicYear)) {
      setFilterYear(settings?.currentAcademicYear || academicYear);
    }
    if (!filterTerm && (settings?.currentTerm || term)) {
      setFilterTerm(settings?.currentTerm || term);
    }
  }, [ready, settings, academicYear, term, filterYear, filterTerm]);

  const load = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAssessments({
        academicYear: filterYear || undefined,
        term: filterTerm || undefined,
      }).catch(() => []);
      setAssessments(Array.isArray(list) ? list : list?.rows || []);
    } catch (e) {
      setError(e?.message || 'Could not load assessments');
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, [ready, filterYear, filterTerm]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let rows = assessments;
    if (filterStatus !== 'ALL') {
      rows = rows.filter((a) => String(a.status || '').toUpperCase() === filterStatus);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((a) =>
        `${assessmentTitle(a)} ${assessmentClass(a)} ${a.subject?.name || a.subjectName || ''}`.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [assessments, filterStatus, search]);

  return (
    <Box sx={{ minHeight: '100%', pb: 5 }}>
      {/* Sticky filter topbar — same language as /marks */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          width: '100%',
          bgcolor: '#fff',
          borderBottom: `1px solid ${BORDER}`,
          boxShadow: '0 2px 8px -4px rgba(19,33,61,0.12)',
        }}
      >
        <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 0.15 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <FormControl variant="standard" size="small" fullWidth>
              <Select
                variant="standard"
                disableUnderline
                displayEmpty
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                sx={barSelectSx}
                inputProps={{ 'aria-label': 'Academic year' }}
                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
              >
                <MenuItem value="">All years</MenuItem>
                {yearOptions.map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} />
          <Box sx={{ flex: 0.85, minWidth: 0 }}>
            <FormControl variant="standard" size="small" fullWidth>
              <Select
                variant="standard"
                disableUnderline
                displayEmpty
                value={filterTerm}
                onChange={(e) => setFilterTerm(e.target.value)}
                sx={barSelectSx}
                inputProps={{ 'aria-label': 'Term' }}
                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
              >
                <MenuItem value="">All terms</MenuItem>
                {termOptions.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <FormControl variant="standard" size="small" fullWidth>
              <Select
                variant="standard"
                disableUnderline
                displayEmpty
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                sx={barSelectSx}
                inputProps={{ 'aria-label': 'Status' }}
                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
              >
                {['ALL', 'DRAFT', 'OPEN', 'MARK_ENTRY', 'CLOSED', 'PUBLISHED'].map((s) => (
                  <MenuItem key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25, display: { xs: 'none', sm: 'block' } }} />
          <Box
            sx={{
              flex: 1.3,
              minWidth: 0,
              position: 'relative',
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
            }}
          >
            <SearchIcon sx={{ position: 'absolute', left: 0, fontSize: 16, color: 'rgba(19,33,61,0.3)', pointerEvents: 'none' }} />
            <Box
              component="input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              sx={{
                width: '100%',
                border: 'none',
                outline: 'none',
                bgcolor: 'transparent',
                pl: 2.75,
                pr: 0.5,
                py: 0.75,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'inherit',
                color: NAVY,
                '&::placeholder': { color: 'rgba(19,33,61,0.35)', fontWeight: 500 },
              }}
            />
          </Box>
        </Stack>
        {/* Search row on mobile */}
        <Box sx={{ display: { xs: 'block', sm: 'none' }, px: 1.5, py: 0.5, borderTop: `1px solid ${BORDER}` }}>
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <SearchIcon sx={{ position: 'absolute', left: 0, fontSize: 16, color: 'rgba(19,33,61,0.3)', pointerEvents: 'none' }} />
            <Box
              component="input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assessments…"
              sx={{
                width: '100%',
                border: 'none',
                outline: 'none',
                bgcolor: 'transparent',
                pl: 2.75,
                pr: 0.5,
                py: 0.75,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'inherit',
                color: NAVY,
                '&::placeholder': { color: 'rgba(19,33,61,0.35)', fontWeight: 500 },
              }}
            />
          </Box>
        </Box>
      </Box>

      <Stack spacing={2} sx={{ p: { xs: 1.25, md: 2, lg: 2.5 }, pb: 5, maxWidth: 1200, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.25}>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: NAVY }}>Assessments</Typography>
            <Typography sx={{ mt: 0.15, fontSize: 12, color: MUTED }}>
              {filtered.length} assessment{filtered.length === 1 ? '' : 's'}
              {filterYear ? ` · ${filterYear}` : ''}
              {filterTerm ? ` · ${filterTerm}` : ''}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setCreateOpen(true)}
            sx={{ height: 36, width: { xs: '100%', sm: 'auto' }, fontSize: 13, textTransform: 'none', fontWeight: 600 }}
          >
            Create
          </Button>
        </Stack>

        {error ? (
          <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 1.5 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 8, color: '#64748B' }}>
            <CircularProgress size={18} sx={{ color: '#B26A00' }} />
            <Typography sx={{ fontSize: 13 }}>Loading assessments…</Typography>
          </Stack>
        ) : (
          <Paper
            component="section"
            elevation={0}
            sx={{
              borderRadius: 2,
              border: `1px solid ${BORDER}`,
              bgcolor: '#fff',
              overflow: 'hidden',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Schedule</Typography>
              <Box
                component="span"
                sx={{
                  ml: 'auto',
                  borderRadius: 999,
                  bgcolor: '#F1F5F9',
                  px: 1,
                  py: 0.25,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#64748B',
                }}
              >
                {filtered.length}
              </Box>
            </Stack>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        ...headCellSx,
                        position: 'sticky',
                        left: 0,
                        zIndex: 12,
                        bgcolor: '#F8F9FC',
                        minWidth: 140,
                        borderRight: 0,
                        boxShadow: `inset -1px 0 0 ${BORDER}`,
                      }}
                    >
                      Assessment
                    </TableCell>
                    <TableCell sx={headCellSx}>Class</TableCell>
                    <TableCell sx={headCellSx}>Subject</TableCell>
                    <TableCell sx={headCellSx}>Date</TableCell>
                    <TableCell sx={headCellSx}>Status</TableCell>
                    <TableCell sx={{ ...headCellSx, textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 5, textAlign: 'center', fontSize: 13, color: '#94A3B8', borderBottom: 0 }}>
                        No assessments match this filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((a, idx) => (
                      <TableRow
                        key={a.id || idx}
                        hover
                        tabIndex={0}
                        role="link"
                        onClick={() => navigate(a.id ? `/assessments/${a.id}/marks` : '/marks')}
                        onKeyDown={(e) => {
                          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            navigate(a.id ? `/assessments/${a.id}/marks` : '/marks');
                          }
                        }}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff',
                          '&:hover': { bgcolor: 'rgba(245,166,35,0.06)' },
                          '&:last-child td': { borderBottom: 0 },
                        }}
                      >
                        <TableCell
                          sx={{
                            ...cellSx,
                            position: 'sticky',
                            left: 0,
                            zIndex: 10,
                            // Solid (never transparent) so scrolled cells can't show through
                            bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff',
                            'tr:hover > &': { bgcolor: '#FEFAF2' },
                            borderRight: 0,
                            boxShadow: `inset -1px 0 0 ${BORDER}`,
                            fontWeight: 600,
                            color: NAVY,
                            maxWidth: 180,
                          }}
                        >
                          <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600, color: NAVY }}>
                            {assessmentTitle(a)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ ...cellSx, color: '#475569', whiteSpace: 'nowrap' }}>
                          {assessmentClass(a)}
                        </TableCell>
                        <TableCell sx={{ ...cellSx, color: '#475569' }}>
                          {a.subject?.name || a.subjectName || '—'}
                        </TableCell>
                        <TableCell sx={{ ...cellSx, color: '#64748B', whiteSpace: 'nowrap' }}>
                          {prettyDate(a.assessmentDate || a.date)}
                        </TableCell>
                        <TableCell sx={cellSx}>
                          <StatusChip status={a.status} />
                        </TableCell>
                        <TableCell sx={{ ...cellSx, textAlign: 'right' }}>
                          <AssessmentRowMenu assessment={a} onChanged={load} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            </Box>

            <Stack sx={{ display: { xs: 'flex', md: 'none' }, p: 1.25, spacing: 1 }}>
              {filtered.length === 0 ? (
                <Typography sx={{ py: 4, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                  No assessments match this filter.
                </Typography>
              ) : (
                filtered.map((a, idx) => (
                  <Box
                    key={a.id || idx}
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(a.id ? `/assessments/${a.id}/marks` : '/marks')}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        navigate(a.id ? `/assessments/${a.id}/marks` : '/marks');
                      }
                    }}
                    sx={{
                      borderRadius: 2,
                      border: `1px solid ${BORDER}`,
                      bgcolor: '#fff',
                      p: 1.5,
                      cursor: 'pointer',
                      transition: 'background-color 120ms ease, box-shadow 120ms ease',
                      '&:active': { bgcolor: '#F8F9FC' },
                      '&:focus-visible': { outline: `2px solid ${NAVY}`, outlineOffset: 2 },
                    }}
                  >
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography noWrap sx={{ fontSize: 14, fontWeight: 700, color: NAVY }}>
                          {assessmentTitle(a)}
                        </Typography>
                        <Typography noWrap sx={{ mt: 0.25, fontSize: 12, color: '#64748B' }}>
                          {assessmentClass(a)}
                          <Box component="span" sx={{ color: 'rgba(19,33,61,0.25)' }}> · </Box>
                          {a.subject?.name || a.subjectName || '—'}
                        </Typography>
                      </Box>
                      <StatusChip status={a.status} />
                    </Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                      <Typography sx={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 600 }}>
                        {prettyDate(a.assessmentDate || a.date)}
                      </Typography>
                      <AssessmentRowMenu assessment={a} onChanged={load} sx={{ mr: -0.5 }} />
                    </Stack>
                  </Box>
                ))
              )}
            </Stack>
          </Paper>
        )}
      </Stack>

      <AssessmentFormSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          void load();
        }}
      />
    </Box>
  );
}
