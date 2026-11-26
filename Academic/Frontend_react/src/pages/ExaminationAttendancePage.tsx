import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import {
  listExaminationAttendance,
  listExaminationTypes,
  type ExaminationAttendanceRecord,
} from '@/services/api';

const NAVY = '#000435';
const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const;

function StatCard({ label, value, icon, tone, sub }: { label: string; value: number | string; icon: React.ReactNode; tone: string; sub?: string }) {
  return (
    <Paper elevation={0} sx={{ p: 2.25, border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: '#fff', minWidth: 170, flex: 1, position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: -18, right: -18, width: 72, height: 72, borderRadius: '50%', bgcolor: `${tone}14` }} />
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: `${tone}18`, color: tone, display: 'grid', placeItems: 'center' }}>{icon}</Box>
        <Box>
          <Typography sx={{ fontSize: '1.45rem', fontWeight: 800, color: NAVY, lineHeight: 1.1 }}>{value}</Typography>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
          {sub ? <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{sub}</Typography> : null}
        </Box>
      </Stack>
    </Paper>
  );
}

function statusChip(status: string) {
  const map: Record<string, { color: 'success' | 'error' | 'warning' | 'default' | 'info'; label: string }> = {
    PRESENT: { color: 'success', label: 'Present' },
    ABSENT: { color: 'error', label: 'Absent' },
    LATE: { color: 'warning', label: 'Late' },
    EXCUSED: { color: 'info', label: 'Excused' },
  };
  const c = map[status] || { color: 'default' as const, label: status };
  return <Chip size="small" color={c.color} label={c.label} sx={{ fontWeight: 700, minWidth: 84 }} />;
}

function fmtDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ExaminationAttendancePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<ExaminationAttendanceRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, excused: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [filterOptions, setFilterOptions] = useState<{ rooms: any[]; classes: any[] }>({ rooms: [], classes: [] });
  const [examTypes, setExamTypes] = useState<any[]>([]);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [term, setTerm] = useState('');
  const [examTypeId, setExamTypeId] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await listExaminationAttendance({
        page, limit: 20,
        search: search || undefined,
        term: term || undefined,
        examinationTypeId: examTypeId || undefined,
        className: classFilter || undefined,
        roomId: roomId || undefined,
        status: status || undefined,
      });
      setRows(data.rows || []);
      setStats(data.stats || { total: 0, present: 0, absent: 0, late: 0, excused: 0 });
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      setFilterOptions(data.filters || { rooms: [], classes: [] });
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load examination attendance');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [page, search, term, examTypeId, classFilter, roomId, status]);

  useEffect(() => {
    (async () => {
      try { const types = await listExaminationTypes(); setExamTypes(Array.isArray(types) ? types : []); } catch { setExamTypes([]); }
    })();
  }, []);

  const termOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.examinationList?.term) set.add(r.examinationList.term); });
    ['Term 1', 'Term 2', 'Term 3'].forEach((t) => set.add(t));
    return [...set];
  }, [rows]);

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of filterOptions.classes || []) {
      const name = String(c.name || c.className || '').trim();
      if (name) map.set(name, name);
    }
    return [...map.values()].sort((a, b) => a.localeCompare(b));
  }, [filterOptions.classes]);

  const roomOptions = useMemo(() => filterOptions.rooms || [], [filterOptions.rooms]);

  function resetFilters() {
    setSearch(''); setSearchInput(''); setTerm(''); setExamTypeId(''); setClassFilter(''); setRoomId(''); setStatus(''); setPage(1);
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 }, maxWidth: 1600, mx: 'auto' }}>
      <Stack spacing={2.25}>
        <Box>
          <Typography sx={{ fontSize: { xs: '1.35rem', md: '1.75rem' }, fontWeight: 800, color: NAVY, letterSpacing: '-0.02em' }}>Examination Attendance</Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.92rem', mt: 0.25 }}>Track student attendance across examination rooms, sessions, and classes.</Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <StatCard label="Total Records" value={stats.total} icon={<FactCheckOutlinedIcon />} tone="#2563eb" sub="All attendance marks" />
          <StatCard label="Present" value={stats.present} icon={<CheckCircleOutlinedIcon />} tone="#059669" />
          <StatCard label="Absent" value={stats.absent} icon={<CancelOutlinedIcon />} tone="#dc2626" />
          <StatCard label="Late" value={stats.late} icon={<AccessTimeOutlinedIcon />} tone="#d97706" />
          <StatCard label="Excused" value={stats.excused} icon={<EventBusyOutlinedIcon />} tone="#0891b2" />
        </Stack>

        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden', bgcolor: '#fff' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', bgcolor: '#fbfdff' }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ lg: 'center' }} justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <FilterAltOutlinedIcon sx={{ color: '#64748b', fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: '0.95rem' }}>Filters</Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" startIcon={<RefreshOutlinedIcon />} onClick={() => void load()} sx={{ textTransform: 'none', borderRadius: 2 }}>Refresh</Button>
                <Button size="small" variant="text" onClick={resetFilters} sx={{ textTransform: 'none', color: '#64748b' }}>Clear</Button>
              </Stack>
            </Stack>
            <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' }, gap: 1.25 }}>
              <TextField
                size="small"
                placeholder="Search student, class, note..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setSearch(searchInput.trim()); } }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlinedIcon sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
              />
              <FormControl size="small"><InputLabel>Examination Type</InputLabel>
                <Select label="Examination Type" value={examTypeId} onChange={(e) => { setExamTypeId(String(e.target.value)); setPage(1); }}>
                  <MenuItem value="">All types</MenuItem>
                  {examTypes.map((t: any) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small"><InputLabel>Term</InputLabel>
                <Select label="Term" value={term} onChange={(e) => { setTerm(String(e.target.value)); setPage(1); }}>
                  <MenuItem value="">All terms</MenuItem>
                  {termOptions.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small"><InputLabel>Class / Stream</InputLabel>
                <Select label="Class / Stream" value={classFilter} onChange={(e) => { setClassFilter(String(e.target.value)); setPage(1); }}>
                  <MenuItem value="">All classes</MenuItem>
                  {classOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small"><InputLabel>Room</InputLabel>
                <Select label="Room" value={roomId} onChange={(e) => { setRoomId(String(e.target.value)); setPage(1); }}>
                  <MenuItem value="">All rooms</MenuItem>
                  {roomOptions.map((r: any) => <MenuItem key={r.id} value={r.id}>{r.roomName}{r.roomNumber ? ` (${r.roomNumber})` : ''}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small"><InputLabel>Status</InputLabel>
                <Select label="Status" value={status} onChange={(e) => { setStatus(String(e.target.value)); setPage(1); }}>
                  <MenuItem value="">All statuses</MenuItem>
                  {STATUSES.map((s) => <MenuItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {error ? <Alert severity="error" sx={{ m: 2 }}>{error}</Alert> : null}

          <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  {['Date / Session', 'Student', 'Class', 'Room', 'Exam Type', 'Status', 'Reason / Note', 'Marked By'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#334155', whiteSpace: 'nowrap', py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} sx={{ py: 8, textAlign: 'center' }}><CircularProgress size={28} /></TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} sx={{ py: 8, textAlign: 'center', color: '#64748b' }}>No attendance records found for the selected filters.</TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>{fmtDate(r.examDate)}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{r.sessionName || (r.session === 'MORNING' ? 'Morning' : 'Afternoon')}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>{r.studentName}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{r.studentCode || '—'}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>{r.className || '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.room?.roomName || '—'}{r.room?.roomNumber ? ` (${r.room.roomNumber})` : ''}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>{r.examinationList?.examinationType?.name || '—'}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{r.examinationList?.term || ''}{r.examinationList?.academicYear ? ` · ${r.examinationList.academicYear}` : ''}</Typography>
                    </TableCell>
                    <TableCell>{statusChip(r.status)}</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <Typography sx={{ fontSize: '0.82rem', color: r.notes ? '#334155' : '#94a3b8' }}>{r.notes || '—'}</Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography sx={{ fontSize: '0.8rem', color: '#475569' }}>{r.markedByName || '—'}</Typography>
                      {r.markedAt ? <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{new Date(r.markedAt).toLocaleString()}</Typography> : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
            <Typography sx={{ fontSize: '0.82rem', color: '#64748b' }}>
              Showing {rows.length ? (pagination.page - 1) * pagination.limit + 1 : 0}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
            </Typography>
            <Pagination
              page={pagination.page}
              count={pagination.pages}
              onChange={(_, p) => setPage(p)}
              color="primary"
              shape="rounded"
              size="small"
              sx={{ '& .Mui-selected': { bgcolor: `${NAVY} !important`, color: '#fff' } }}
            />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
