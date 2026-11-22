import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import EventIcon from '@mui/icons-material/Event';
import DateRangeIcon from '@mui/icons-material/DateRange';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CloseIcon from '@mui/icons-material/Close';
import api from '../services/api';
import { formatSchoolTime, getSchoolDateIso } from '../utils/schoolTime';
import { Page, EmptyState } from '../components/ui';
import { brand } from '../theme/theme';
import {
  getTeacherPortalPushState,
  isWebPushEnvironmentSupported,
  subscribeTeacherPortalPush,
} from '../utils/webPushTeacherPortal';

const PAGE_SIZE = 10;

function toIsoDate(value) {
  if (!value) return '';
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}

function formatDayLabel(iso) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso || '—';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function getWeekRange(anchorIso) {
  const base = new Date(`${(anchorIso || getSchoolDateIso() || '').slice(0, 10)}T12:00:00`);
  if (Number.isNaN(base.getTime())) return { start: '', end: '', label: '' };
  const day = base.getDay(); // 0 Sun..6 Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const start = new Date(base);
  start.setDate(base.getDate() + diffToMon);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);
  const fmt = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { start: startIso, end: endIso, label: `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}` };
}

function normalizeTime(row, which) {
  if (which === 'in') {
    if (row?.check_in) return formatSchoolTime(row.check_in) || row.check_in;
    if (row?.entryTime) return formatSchoolTime(row.entryTime) || '';
    if (row?.checkInLabel && row.checkInLabel !== '—') return String(row.checkInLabel);
    return '';
  }
  if (row?.check_out) return formatSchoolTime(row.check_out) || row.check_out;
  if (row?.exitTime) return formatSchoolTime(row.exitTime) || '';
  if (row?.checkOutLabel && row.checkOutLabel !== '—') return String(row.checkOutLabel);
  return '';
}

function normalizeStatus(row) {
  const raw = String(row?.attendanceStatus || row?.status_in || row?.status || '').toUpperCase();
  if (raw === 'ABSENT' || raw === 'MISSED') return 'Absent';
  if (row?.isLate || raw === 'LATE' || String(row?.punctuality || '').toUpperCase() === 'LATE') return 'Late';
  if (raw === 'PRESENT') return 'Present';
  const inT = normalizeTime(row, 'in');
  const outT = normalizeTime(row, 'out');
  if (inT && outT) return 'Completed';
  if (inT) return 'Checked in';
  return row?.status ? String(row.status) : 'No record';
}

function statusStyles(status) {
  if (status === 'Present' || status === 'Completed' || status === 'Checked in') {
    return { bgcolor: 'rgba(22,138,85,0.10)', color: '#168a55', borderColor: 'rgba(22,138,85,0.24)' };
  }
  if (status === 'Late') {
    return { bgcolor: 'rgba(217,144,19,0.12)', color: '#b7791f', borderColor: 'rgba(217,144,19,0.25)' };
  }
  if (status === 'Absent' || status === 'Missed') {
    return { bgcolor: 'rgba(220,38,38,0.10)', color: '#dc2626', borderColor: 'rgba(220,38,38,0.22)' };
  }
  return { bgcolor: 'rgba(100,116,139,0.10)', color: '#64748B', borderColor: 'rgba(100,116,139,0.22)' };
}

export default function ClassAttendance({
  title = 'My Attendance',
  description = 'Your in/out attendance records from card or tab taps.',
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('all'); // all | date | week
  const [selectedDate, setSelectedDate] = useState(getSchoolDateIso() || new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [pushState, setPushState] = useState({ supported: false, permission: 'default', subscribed: false });
  const [pushBusy, setPushBusy] = useState(false);
  const [pushHint, setPushHint] = useState('');
  const [pushDismissed, setPushDismissed] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const lastRefreshRef = useRef(0);

  const load = useCallback(async (opts = {}) => {
    const silent = Boolean(opts.silent);
    if (!silent) setLoading(true);
    setError('');
    try {
      // Teacher gate/card attendance from Attendance module (not classroom lesson scans)
      const res = await api
        .get('/teacher-portal/attendance-module/teacher/history', { params: { scope: 'term' } })
        .catch(() => null);
      let data = res?.data?.success ? res.data.data || [] : [];
      if (!Array.isArray(data) || data.length === 0) {
        const fallback = await api
          .get('/teacher-portal/attendance-module/teacher/history', { params: { scope: 'days', days: 120 } })
          .catch(() => null);
        const fb = fallback?.data?.success ? fallback.data.data || [] : [];
        if (Array.isArray(fb) && fb.length) data = fb;
      }
      const list = (Array.isArray(data) ? data : []).filter((r) => {
        const iso = toIsoDate(r?.date || r?.lessonDate);
        if (!iso) return false;
        const day = new Date(`${iso}T12:00:00`).getDay();
        return day !== 0 && day !== 6; // exclude weekends from My Attendance
      });
      list.sort((a, b) => String(toIsoDate(b?.date || b?.lessonDate)).localeCompare(String(toIsoDate(a?.date || a?.lessonDate))));
      setRows(list);
      setLastUpdatedAt(new Date());
    } catch (e) {
      if (!silent) {
        setError(e?.response?.data?.message || 'Could not load attendance records.');
        setRows([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const state = await getTeacherPortalPushState();
        if (cancelled) return;
        setPushState(state);
        // Auto-subscribe silently if permission already granted (keeps tap alerts working)
        if (state.supported && state.permission === 'granted' && !state.subscribed) {
          try {
            await subscribeTeacherPortalPush();
            if (!cancelled) setPushState(await getTeacherPortalPushState());
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const maybeRefresh = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRefreshRef.current < 4000) return;
      lastRefreshRef.current = now;
      load({ silent: true });
    };
    const onMessage = (event) => {
      const type = event?.data?.type;
      if (type === 'PUSH_NOTIFICATION') {
        const url = String(event?.data?.payload?.url || '');
        if (!url || url.includes('attendance')) maybeRefresh();
      }
    };
    window.addEventListener('focus', maybeRefresh);
    document.addEventListener('visibilitychange', maybeRefresh);
    if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('focus', maybeRefresh);
      document.removeEventListener('visibilitychange', maybeRefresh);
      if ('serviceWorker' in navigator) navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, [load]);

  const enablePush = useCallback(async () => {
    if (!isWebPushEnvironmentSupported()) {
      setPushHint('Push notifications are not supported in this browser.');
      return;
    }
    setPushBusy(true);
    setPushHint('');
    try {
      await subscribeTeacherPortalPush();
      setPushState(await getTeacherPortalPushState());
      setPushHint('Tap in/out notifications are enabled.');
    } catch (e) {
      setPushHint(e?.response?.data?.message || e?.message || 'Could not enable notifications.');
    } finally {
      setPushBusy(false);
    }
  }, []);

  const week = useMemo(() => getWeekRange(selectedDate), [selectedDate]);

  const filtered = useMemo(() => {
    let list = rows;
    if (mode === 'date' && selectedDate) {
      list = list.filter((r) => toIsoDate(r?.date || r?.lessonDate) === selectedDate);
    } else if (mode === 'week' && week.start && week.end) {
      list = list.filter((r) => {
        const d = toIsoDate(r?.date || r?.lessonDate);
        return d && d >= week.start && d <= week.end;
      });
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const date = toIsoDate(r?.date || r?.lessonDate);
      const inT = normalizeTime(r, 'in');
      const outT = normalizeTime(r, 'out');
      const status = normalizeStatus(r);
      const hay = [date, formatDayLabel(date), inT, outT, status, r?.attendanceStatus, r?.punctuality]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, mode, selectedDate, week.start, week.end, query]);

  useEffect(() => {
    setPage(1);
  }, [mode, selectedDate, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const stats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    rows.forEach((r) => {
      const s = normalizeStatus(r);
      if (s === 'Late') late += 1;
      else if (s === 'Absent' || s === 'Missed') absent += 1;
      else if (s === 'Present' || s === 'Completed' || s === 'Checked in') present += 1;
    });
    return { total: rows.length, present, late, absent };
  }, [rows]);

  const tableHeadSx = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: '#64748B',
    bgcolor: '#F8FAFC',
    borderBottom: `1px solid ${brand.border}`,
    whiteSpace: 'nowrap',
    py: 1.25,
  };
  const tableCellSx = {
    fontSize: 13,
    color: brand.text,
    borderBottom: `1px solid ${brand.border}`,
    py: 1.25,
    verticalAlign: 'middle',
  };

  const rangeLabel = mode === 'date'
    ? (selectedDate ? formatDayLabel(selectedDate) : 'Selected date')
    : mode === 'week'
      ? (week.label || 'Selected week')
      : 'All records';

  const showPushPrompt =
    !pushDismissed &&
    pushState.supported &&
    !pushState.subscribed &&
    pushState.permission !== 'denied';

  return (
    <Page>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={1.5}>
          <Box>
            <Typography sx={{ fontSize: { xs: 20, sm: 22 }, fontWeight: 800, color: brand.navy, letterSpacing: '-0.01em' }}>
              {title}
            </Typography>
            <Typography sx={{ fontSize: 13, color: brand.muted, mt: 0.25 }}>
              {description}
            </Typography>
            {lastUpdatedAt && (
              <Typography sx={{ fontSize: 11, color: brand.muted, mt: 0.35 }}>
                Updated {lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => load()}
              disabled={loading}
              sx={{ textTransform: 'none', fontWeight: 700, borderColor: brand.border, flex: { xs: 1, sm: 'unset' } }}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>

        <Collapse in={showPushPrompt || Boolean(pushHint)}>
          <Alert
            icon={<NotificationsActiveIcon fontSize="small" />}
            severity={pushState.subscribed ? 'success' : 'info'}
            action={
              <Stack direction="row" spacing={0.5} alignItems="center">
                {showPushPrompt && (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={enablePush}
                    disabled={pushBusy}
                    sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    {pushBusy ? 'Enabling…' : 'Enable alerts'}
                  </Button>
                )}
                {showPushPrompt && (
                  <IconButton size="small" color="inherit" onClick={() => setPushDismissed(true)} aria-label="Dismiss">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            }
            sx={{ borderRadius: 2, border: `1px solid ${brand.border}` }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>
              {pushState.subscribed ? 'Tap in/out notifications enabled' : 'Get notified when you tap in or out'}
            </Typography>
            <Typography sx={{ fontSize: 12, color: brand.muted, mt: 0.25 }}>
              {pushHint ||
                (pushState.subscribed
                  ? 'You will receive a push alert for each card or tab attendance tap, even when this app is in the background.'
                  : 'Enable push alerts to receive an automatic notification on every card or tab tap (delivered when you are back online if offline).')}
            </Typography>
          </Alert>
        </Collapse>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 180px))' },
            gap: 1.25,
          }}
        >
          {[
            { label: 'Records', value: stats.total },
            { label: 'Present', value: stats.present },
            { label: 'Late', value: stats.late },
            { label: 'Absent', value: stats.absent },
          ].map((s) => (
            <Paper key={s.label} elevation={0} sx={{ p: 1.5, border: `1px solid ${brand.border}`, borderRadius: 2, bgcolor: '#fff' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: brand.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {s.label}
              </Typography>
              <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 800, color: brand.navy, mt: 0.25, lineHeight: 1.1 }}>
                {s.value}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Paper elevation={0} sx={{ border: `1px solid ${brand.border}`, borderRadius: 2, overflow: 'hidden', bgcolor: '#fff' }}>
          <Box sx={{ p: { xs: 1.25, sm: 1.5 }, borderBottom: `1px solid ${brand.border}`, bgcolor: '#fff' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                select
                size="small"
                label="Filter"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                sx={{ minWidth: { xs: '100%', md: 150 } }}
              >
                <MenuItem value="all">All dates</MenuItem>
                <MenuItem value="date">Specific date</MenuItem>
                <MenuItem value="week">Week</MenuItem>
              </TextField>

              {(mode === 'date' || mode === 'week') && (
                <TextField
                  size="small"
                  type="date"
                  label={mode === 'week' ? 'Pick a day in week' : 'Date'}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || getSchoolDateIso())}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: { xs: '100%', md: 200 } }}
                />
              )}

              {mode === 'week' && (
                <Chip
                  icon={<DateRangeIcon sx={{ fontSize: 16 }} />}
                  label={week.label || 'Select a week'}
                  variant="outlined"
                  sx={{ height: 40, borderRadius: 2, fontWeight: 600, color: brand.navy, borderColor: brand.border, bgcolor: '#F8FAFC' }}
                />
              )}

              <TextField
                size="small"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by date, time, status…"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: brand.muted }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.25, flexWrap: 'wrap' }}>
              <EventIcon sx={{ fontSize: 15, color: brand.muted }} />
              <Typography sx={{ fontSize: 12, color: brand.muted, fontWeight: 600 }}>{rangeLabel}</Typography>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.25, display: { xs: 'none', sm: 'block' } }} />
              <Typography sx={{ fontSize: 12, color: brand.muted }}>
                Card or tab tap in/out records · auto-updates when you return
              </Typography>
            </Stack>
          </Box>

          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 7 }}>
              <CircularProgress size={28} />
              <Typography sx={{ mt: 1.5, fontSize: 13, color: brand.muted }}>Loading attendance records…</Typography>
            </Stack>
          ) : error ? (
            <Box sx={{ p: 2 }}>
              <EmptyState title="Could not load records" description={error} />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <EmptyState
                title={rows.length === 0 ? 'No attendance records yet' : 'No matching records'}
                description={
                  rows.length === 0
                    ? 'When you tap your card or tab at the gate, your in and out attendance will appear here.'
                    : 'Try a different date, week, or search term.'
                }
              />
            </Box>
          ) : (
            <>
              {/* Mobile cards */}
              <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' }, p: 1.25 }}>
                {paged.map((row, idx) => {
                  const date = toIsoDate(row?.date || row?.lessonDate);
                  const status = normalizeStatus(row);
                  const inTime = normalizeTime(row, 'in') || '—';
                  const outTime = normalizeTime(row, 'out') || '—';
                  return (
                    <Box key={row?.id || row?.lessonDate || `${date}-${idx}`} sx={{ border: `1px solid ${brand.border}`, borderRadius: 2, p: 1.5, bgcolor: '#fff' }}>
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 700, color: brand.navy, lineHeight: 1.3 }}>
                            {formatDayLabel(date)}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: brand.muted, mt: 0.25 }}>
                            {date || '—'} · Card/tab tap attendance
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={status}
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: 10, height: 22, ...statusStyles(status) }}
                        />
                      </Stack>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#F8FAFC', border: `1px solid ${brand.border}` }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                            <LoginIcon sx={{ fontSize: 14, color: '#168a55' }} />
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: brand.muted, textTransform: 'uppercase' }}>In</Typography>
                          </Stack>
                          <Typography sx={{ fontSize: 14, fontWeight: 700, color: inTime !== '—' ? '#168a55' : brand.muted }}>{inTime}</Typography>
                        </Box>
                        <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#F8FAFC', border: `1px solid ${brand.border}` }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                            <LogoutIcon sx={{ fontSize: 14, color: brand.navy }} />
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: brand.muted, textTransform: 'uppercase' }}>Out</Typography>
                          </Stack>
                          <Typography sx={{ fontSize: 14, fontWeight: 700, color: outTime !== '—' ? brand.navy : brand.muted }}>{outTime}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>

              {/* Desktop table */}
              <TableContainer sx={{ display: { xs: 'none', md: 'block' }, width: '100%', overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={tableHeadSx}>Date</TableCell>
                      <TableCell sx={tableHeadSx}>Day</TableCell>
                      <TableCell sx={tableHeadSx}>In</TableCell>
                      <TableCell sx={tableHeadSx}>Out</TableCell>
                      <TableCell sx={tableHeadSx}>Status</TableCell>
                      <TableCell sx={tableHeadSx}>Source</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paged.map((row, idx) => {
                      const date = toIsoDate(row?.date || row?.lessonDate) || '—';
                      const status = normalizeStatus(row);
                      const inTime = normalizeTime(row, 'in') || '—';
                      const outTime = normalizeTime(row, 'out') || '—';
                      return (
                        <TableRow key={row?.id || row?.lessonDate || `${date}-${idx}`} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell sx={{ ...tableCellSx, fontWeight: 600, whiteSpace: 'nowrap' }}>{date}</TableCell>
                          <TableCell sx={{ ...tableCellSx, whiteSpace: 'nowrap' }}>{date !== '—' ? formatDayLabel(date) : '—'}</TableCell>
                          <TableCell sx={{ ...tableCellSx, color: inTime !== '—' ? '#168a55' : brand.muted, fontWeight: inTime !== '—' ? 700 : 500 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              {inTime !== '—' ? <LoginIcon sx={{ fontSize: 14, color: '#168a55' }} /> : null}
                              <span>{inTime}</span>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ ...tableCellSx, color: outTime !== '—' ? brand.navy : brand.muted, fontWeight: outTime !== '—' ? 700 : 500 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              {outTime !== '—' ? <LogoutIcon sx={{ fontSize: 14, color: brand.navy }} /> : null}
                              <span>{outTime}</span>
                            </Stack>
                          </TableCell>
                          <TableCell sx={tableCellSx}>
                            <Chip
                              size="small"
                              label={status}
                              variant="outlined"
                              sx={{ fontWeight: 700, fontSize: 10, height: 22, ...statusStyles(status) }}
                            />
                          </TableCell>
                          <TableCell sx={{ ...tableCellSx, color: brand.muted, fontSize: 12 }}>Card / Tab</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box
                sx={{
                  px: 1.5,
                  py: 1.25,
                  borderTop: `1px solid ${brand.border}`,
                  bgcolor: '#FAFBFC',
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Typography sx={{ fontSize: 12, color: brand.muted }}>
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} record{filtered.length === 1 ? '' : 's'}
                  {filtered.length !== rows.length ? ` (filtered from ${rows.length})` : ''}
                </Typography>
                {pageCount > 1 && (
                  <Pagination
                    count={pageCount}
                    page={safePage}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                    size="small"
                    shape="rounded"
                    sx={{ alignSelf: { xs: 'center', sm: 'auto' } }}
                  />
                )}
              </Box>
            </>
          )}
        </Paper>
      </Stack>
    </Page>
  );
}
