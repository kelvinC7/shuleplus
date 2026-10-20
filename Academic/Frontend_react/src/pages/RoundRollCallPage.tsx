import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  TablePagination,
  Tabs,
  Tab,
} from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import {
  getRoundRollCallAnalytics,
  getRoundRollCallSession,
  listRoundRollCalls,
  smListClasses,
  type RoundRollCallAnalytics,
  type RoundRollCallSessionDetail,
  type RoundRollCallSummary,
} from '@/services/api';

const flatFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: '#fff',
    boxShadow: 'none',
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: '#cbd5e1' },
    '&.Mui-focused fieldset': { borderColor: '#000435', borderWidth: 1 },
  },
};

function statusChip(status?: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'present') return { bg: 'rgba(34,197,94,0.12)', color: '#15803d', label: 'Present' };
  if (s === 'absent') return { bg: 'rgba(239,68,68,0.1)', color: '#b91c1c', label: 'Absent' };
  if (s === 'excused') return { bg: 'rgba(59,130,246,0.1)', color: '#1d4ed8', label: 'Excused' };
  return { bg: '#f1f5f9', color: '#64748b', label: status || '—' };
}

function BarRow({
  label,
  present,
  absent,
  excused,
  max,
}: {
  label: string;
  present: number;
  absent: number;
  excused: number;
  max: number;
}) {
  const total = present + absent + excused || 1;
  const scale = max > 0 ? 100 / max : 0;
  const w = (n: number) => `${Math.max(2, n * scale)}%`;
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: '#64748b', tabularNums: true }}>
          P {present} · A {absent} · E {excused}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', bgcolor: '#f1f5f9' }}>
        <Box sx={{ width: w(present), bgcolor: '#22c55e' }} title="Present" />
        <Box sx={{ width: w(absent), bgcolor: '#ef4444' }} title="Absent" />
        <Box sx={{ width: w(excused), bgcolor: '#3b82f6' }} title="Excused" />
      </Box>
      <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8', mt: 0.25 }}>{total} marks in range</Typography>
    </Box>
  );
}

export default function RoundRollCallPage() {
  const { settings } = useAcademicSettings();
  const [tab, setTab] = useState(0);
  const [classOptions, setClassOptions] = useState<string[]>([]);

  const [academicYear, setAcademicYear] = useState(settings?.currentAcademicYear || '');
  const [term, setTerm] = useState(settings?.currentTerm || '');
  const [classFilter, setClassFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const [rows, setRows] = useState<RoundRollCallSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

  const [analytics, setAnalytics] = useState<RoundRollCallAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [viewSession, setViewSession] = useState<RoundRollCallSessionDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    if (settings?.currentAcademicYear && !academicYear) setAcademicYear(settings.currentAcademicYear);
    if (settings?.currentTerm && !term) setTerm(settings.currentTerm);
  }, [settings, academicYear, term]);

  useEffect(() => {
    smListClasses()
      .then((list: { name?: string; stream?: string | null }[]) => {
        const names = (list ?? [])
          .map((c) => (c.stream ? `${c.name} ${c.stream}` : c.name || ''))
          .filter(Boolean)
          .sort();
        setClassOptions(names);
      })
      .catch(() => setClassOptions([]));
  }, []);

  const filterParams = useMemo(
    () => ({
      class_name: classFilter || undefined,
      date: dayFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      academic_year: academicYear || undefined,
      q: search.trim() || undefined,
    }),
    [classFilter, dayFilter, dateFrom, dateTo, academicYear, search]
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRoundRollCalls({
        page: page + 1,
        limit: rowsPerPage,
        ...filterParams,
      });
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filterParams]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await getRoundRollCallAnalytics(filterParams);
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [filterParams]);

  useEffect(() => {
    if (tab === 0 && !viewSession) loadList();
  }, [tab, viewSession, loadList]);

  useEffect(() => {
    if (tab === 1) loadAnalytics();
  }, [tab, loadAnalytics]);

  const openView = async (id: string) => {
    setViewLoading(true);
    try {
      const data = await getRoundRollCallSession(id);
      setViewSession(data);
    } catch {
      setViewSession(null);
    } finally {
      setViewLoading(false);
    }
  };

  const classChartMax = useMemo(() => {
    if (!analytics?.byClass?.length) return 1;
    return Math.max(
      ...analytics.byClass.map((c) => c.present + c.absent + c.excused),
      1
    );
  }, [analytics]);

  const kpi = analytics?.totals;

  return (
    <Box sx={{ minHeight: '100%', bgcolor: '#f4f6f9', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          py: 2,
          bgcolor: '#fff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <FactCheckOutlinedIcon sx={{ color: '#000435', fontSize: 22 }} />
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, color: '#000435' }}>Round roll call</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
            School-wide rolls from the teacher portal — register, filters, and analytics.
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton
            size="small"
            onClick={() => (tab === 0 ? loadList() : loadAnalytics())}
            sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ px: { xs: 2, md: 3 }, pt: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setViewSession(null);
          }}
          sx={{
            mb: 2,
            minHeight: 40,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 40 },
          }}
        >
          <Tab label="Roll register" />
          <Tab label="Analytics & charts" />
        </Tabs>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(6, 1fr)' },
            gap: 1.5,
            mb: 2,
            p: 2,
            bgcolor: '#fff',
            borderRadius: 3,
            border: '1px solid #e2e8f0',
          }}
        >
          <TextField
            select
            size="small"
            label="Academic year"
            value={academicYear}
            onChange={(e) => {
              setAcademicYear(e.target.value);
              setPage(0);
            }}
            sx={flatFieldSx}
          >
            {(settings?.academicYears ?? []).map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Term (reference)"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            sx={flatFieldSx}
            helperText="Use date range for roll data"
          >
            <MenuItem value="">—</MenuItem>
            {(settings?.terms ?? []).map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Class"
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setPage(0);
            }}
            sx={flatFieldSx}
          >
            <MenuItem value="">All classes</MenuItem>
            {classOptions.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="date"
            label="Day"
            InputLabelProps={{ shrink: true }}
            value={dayFilter}
            onChange={(e) => {
              setDayFilter(e.target.value);
              setPage(0);
            }}
            sx={flatFieldSx}
          />
          <TextField
            size="small"
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            sx={flatFieldSx}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            sx={flatFieldSx}
          />
        </Box>
      </Box>

      {tab === 1 && (
        <Box sx={{ px: { xs: 2, md: 3 }, pb: 3, flex: 1 }}>
          {analyticsLoading ? (
            <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={28} sx={{ color: '#000435' }} />
            </Box>
          ) : !analytics ? (
            <Typography sx={{ textAlign: 'center', color: '#64748b', py: 6 }}>No analytics for this filter.</Typography>
          ) : (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                  gap: 1.5,
                  mb: 2,
                }}
              >
                {[
                  { label: 'Roll sessions', value: kpi?.sessions ?? 0, color: '#000435' },
                  { label: 'Present marks', value: kpi?.present ?? 0, color: '#16a34a' },
                  { label: 'Absent marks', value: kpi?.absent ?? 0, color: '#dc2626' },
                  { label: 'Excused marks', value: kpi?.excused ?? 0, color: '#2563eb' },
                ].map((k) => (
                  <Box
                    key={k.label}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      bgcolor: '#fff',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: k.color, tabularNums: true }}>
                      {k.value}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      {k.label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2.5, bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                  <Typography sx={{ fontWeight: 700, mb: 2, color: '#000435' }}>By class</Typography>
                  {analytics.byClass.length === 0 ? (
                    <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>No data</Typography>
                  ) : (
                    analytics.byClass.map((c) => (
                      <BarRow
                        key={c.class_name}
                        label={c.class_name}
                        present={c.present}
                        absent={c.absent}
                        excused={c.excused}
                        max={classChartMax}
                      />
                    ))
                  )}
                </Box>
                <Box sx={{ p: 2.5, bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                  <Typography sx={{ fontWeight: 700, mb: 2, color: '#000435' }}>Recent days</Typography>
                  {analytics.byDay.length === 0 ? (
                    <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>No data</Typography>
                  ) : (
                    analytics.byDay.map((d) => (
                      <BarRow
                        key={d.date}
                        label={d.date}
                        present={d.present}
                        absent={d.absent}
                        excused={d.excused}
                        max={classChartMax}
                      />
                    ))
                  )}
                </Box>
              </Box>
            </>
          )}
        </Box>
      )}

      {tab === 0 && (
        <Box sx={{ px: { xs: 2, md: 3 }, pb: 3, flex: 1 }}>
          {viewSession ? (
            <Box sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => setViewSession(null)} size="small">
                  Back
                </Button>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>{viewSession.roll_label}</Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {viewSession.class_name} · {viewSession.date} · {viewSession.teacher_name || 'Teacher'}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={`Present ${viewSession.stats?.present ?? 0}/${viewSession.stats?.total ?? 0}`}
                  sx={{ bgcolor: 'rgba(34,197,94,0.1)', color: '#15803d', fontWeight: 700 }}
                />
              </Box>
              <TableContainer sx={{ maxHeight: 520 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {['#', 'Adm no.', 'Student', 'Status', 'Remarks'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.68rem', bgcolor: '#f8fafc' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(viewSession.roster ?? []).map((r, i) => {
                      const st = statusChip(r.status);
                      return (
                        <TableRow key={r.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.adm || '—'}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{r.name || '—'}</TableCell>
                          <TableCell>
                            <Chip label={st.label} size="small" sx={{ bgcolor: st.bg, color: st.color, fontWeight: 700, height: 22 }} />
                          </TableCell>
                          <TableCell sx={{ color: '#64748b', fontSize: '0.82rem' }}>{r.remarks || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <>
              <TextField
                size="small"
                placeholder="Search roll, class, teacher…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                sx={{ mb: 2, width: { xs: '100%', sm: 320 }, ...flatFieldSx }}
              />
              <TableContainer sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Date', 'Roll', 'Class', 'Teacher', 'Present', 'Absent', 'Excused', ''].map((h) => (
                        <TableCell key={h || 'a'} sx={{ fontWeight: 700, fontSize: '0.68rem', bgcolor: '#f8fafc' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading || viewLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                          <CircularProgress size={28} />
                        </TableCell>
                      </TableRow>
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#64748b' }}>
                          No roll calls found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.date}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.roll_label}</TableCell>
                          <TableCell>{row.class_name}</TableCell>
                          <TableCell>{row.teacher_name || '—'}</TableCell>
                          <TableCell sx={{ color: '#16a34a', fontWeight: 700 }}>
                            {row.present}/{row.total}
                          </TableCell>
                          <TableCell sx={{ color: '#dc2626' }}>{row.absent}</TableCell>
                          <TableCell sx={{ color: '#2563eb' }}>{row.excused}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => openView(row.id)}>
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <TablePagination
                  component="div"
                  count={total}
                  page={page}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </TableContainer>
            </>
          )}
        </Box>
      )}

    </Box>
  );
}
