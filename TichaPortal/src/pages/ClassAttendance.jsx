import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import RefreshIcon from '@mui/icons-material/Refresh';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CloseIcon from '@mui/icons-material/Close';
import api from '../services/api';
import { formatSchoolTime, getSchoolDateIso } from '../utils/schoolTime';
import { EmptyState } from '../components/ui';
import TablePagination from '../components/TablePagination';
import {
  ListPage,
  StickyFilterBar,
  BarSelect,
  ListPageBody,
  PageTitleRow,
  NavyStats,
  SectionPaper,
  headCellSx,
  cellSx,
} from '../components/ListPageKit';
import { brand } from '../theme/theme';
import {
  getTeacherPortalPushState,
  isWebPushEnvironmentSupported,
  subscribeTeacherPortalPush,
} from '../utils/webPushTeacherPortal';


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
  const [pageSize, setPageSize] = useState(10);
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

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

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

  const dateInputSx = {
    width: '100%',
    fontSize: 12,
    fontWeight: 600,
    color: brand.navy,
    py: 0.25,
    '& input': { py: 0.5, px: 0 },
  };

  return (
    <ListPage>
      <StickyFilterBar search={query} onSearch={setQuery} searchPlaceholder="Search date, time, status…">
        <BarSelect
          label="Filter"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'all', label: 'All dates' },
            { value: 'date', label: 'Specific date' },
            { value: 'week', label: 'Week' },
          ]}
        />
        {mode === 'date' || mode === 'week' ? (
          <Box key="date" sx={{ flex: 1, minWidth: 0 }}>
            <InputBase
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value || getSchoolDateIso())}
              inputProps={{ 'aria-label': mode === 'week' ? 'Pick a day in week' : 'Date' }}
              sx={dateInputSx}
            />
          </Box>
        ) : null}
      </StickyFilterBar>

      <ListPageBody>
        <PageTitleRow
          title={title}
          subtitle={`${description}${lastUpdatedAt ? ` · Updated ${lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`}
          actions={
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => load()}
              disabled={loading}
              sx={{ borderColor: brand.border, fontWeight: 700, textTransform: 'none' }}
            >
              Refresh
            </Button>
          }
        />

        <Collapse in={showPushPrompt || Boolean(pushHint)}>
          <Alert
            icon={<NotificationsActiveIcon fontSize="small" />}
            severity={pushState.subscribed ? 'success' : 'info'}
            action={
              <Stack direction="row" spacing={0.5} alignItems="center">
                {showPushPrompt && (
                  <Button color="inherit" size="small" onClick={enablePush} disabled={pushBusy} sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>
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
            sx={{ borderRadius: 1, border: `1px solid ${brand.border}` }}
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

        <NavyStats
          stats={[
            { label: 'Records', value: loading ? '—' : stats.total },
            { label: 'Present', value: loading ? '—' : stats.present },
            { label: 'Late', value: loading ? '—' : stats.late },
            { label: 'Absent', value: loading ? '—' : stats.absent },
          ]}
        />

        <SectionPaper title={rangeLabel} count={filtered.length}>
          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 7 }}>
              <CircularProgress size={26} />
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
              {/* Mobile rows */}
              <Stack sx={{ display: { xs: 'flex', md: 'none' } }}>
                {paged.map((row, idx) => {
                  const date = toIsoDate(row?.date || row?.lessonDate);
                  const status = normalizeStatus(row);
                  const inTime = normalizeTime(row, 'in') || '—';
                  const outTime = normalizeTime(row, 'out') || '—';
                  return (
                    <Box
                      key={row?.id || row?.lessonDate || `${date}-${idx}`}
                      sx={{
                        px: 1.5,
                        py: 1.25,
                        bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff',
                        borderBottom: idx < paged.length - 1 ? '1px solid rgba(19,33,61,0.06)' : 'none',
                      }}
                    >
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 0.75 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: brand.navy, lineHeight: 1.3 }}>{formatDayLabel(date)}</Typography>
                          <Typography sx={{ fontSize: 11.5, color: brand.muted }}>{date || '—'} · Card/tab tap</Typography>
                        </Box>
                        <Chip size="small" label={status} variant="outlined" sx={{ fontWeight: 700, fontSize: 10, height: 22, ...statusStyles(status) }} />
                      </Stack>
                      <Stack direction="row" spacing={2}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <LoginIcon sx={{ fontSize: 14, color: '#168a55' }} />
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: inTime !== '—' ? '#168a55' : brand.muted }}>{inTime}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <LogoutIcon sx={{ fontSize: 14, color: brand.navy }} />
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: outTime !== '—' ? brand.navy : brand.muted }}>{outTime}</Typography>
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>

              {/* Desktop table */}
              <TableContainer sx={{ display: { xs: 'none', md: 'block' }, width: '100%', overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 640 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headCellSx}>Date</TableCell>
                      <TableCell sx={headCellSx}>Day</TableCell>
                      <TableCell sx={headCellSx}>In</TableCell>
                      <TableCell sx={headCellSx}>Out</TableCell>
                      <TableCell sx={headCellSx}>Status</TableCell>
                      <TableCell sx={headCellSx}>Source</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paged.map((row, idx) => {
                      const date = toIsoDate(row?.date || row?.lessonDate) || '—';
                      const status = normalizeStatus(row);
                      const inTime = normalizeTime(row, 'in') || '—';
                      const outTime = normalizeTime(row, 'out') || '—';
                      return (
                        <TableRow
                          key={row?.id || row?.lessonDate || `${date}-${idx}`}
                          hover
                          sx={{ bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff', '&:last-child td': { borderBottom: 0 } }}
                        >
                          <TableCell sx={{ ...cellSx, fontWeight: 600, color: brand.navy, whiteSpace: 'nowrap' }}>{date}</TableCell>
                          <TableCell sx={{ ...cellSx, whiteSpace: 'nowrap' }}>{date !== '—' ? formatDayLabel(date) : '—'}</TableCell>
                          <TableCell sx={{ ...cellSx, color: inTime !== '—' ? '#168a55' : brand.muted, fontWeight: inTime !== '—' ? 700 : 500 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              {inTime !== '—' ? <LoginIcon sx={{ fontSize: 14, color: '#168a55' }} /> : null}
                              <span>{inTime}</span>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ ...cellSx, color: outTime !== '—' ? brand.navy : brand.muted, fontWeight: outTime !== '—' ? 700 : 500 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              {outTime !== '—' ? <LogoutIcon sx={{ fontSize: 14, color: brand.navy }} /> : null}
                              <span>{outTime}</span>
                            </Stack>
                          </TableCell>
                          <TableCell sx={cellSx}>
                            <Chip size="small" label={status} variant="outlined" sx={{ fontWeight: 700, fontSize: 10, height: 22, ...statusStyles(status) }} />
                          </TableCell>
                          <TableCell sx={{ ...cellSx, color: brand.muted }}>Card / Tab</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                page={safePage}
                totalPages={pageCount}
                total={filtered.length}
                pageSize={pageSize}
                itemCount={paged.length}
                pageStartIndex={(safePage - 1) * pageSize}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                  setPageSize(n);
                  setPage(1);
                }}
              />
            </>
          )}
        </SectionPaper>
      </ListPageBody>
    </ListPage>
  );
}
