import { useCallback, useEffect, useMemo, useState } from 'react';
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
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import DateRangeIcon from '@mui/icons-material/DateRange';
import PersonIcon from '@mui/icons-material/Person';
import api from '../services/api';
import { formatSchoolTime, getSchoolDateIso } from '../utils/schoolTime';
import { Page, EmptyState } from '../components/ui';
import { brand } from '../theme/theme';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function toIso(value) {
  if (!value) return '';
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function fmtTime(v) {
  if (!v) return '';
  return formatSchoolTime(v) || String(v);
}

function getWeekStart(anchorIso) {
  const base = new Date(`${(anchorIso || getSchoolDateIso() || '').slice(0, 10)}T12:00:00`);
  if (Number.isNaN(base.getTime())) return getSchoolDateIso() || new Date().toISOString().slice(0, 10);
  const day = base.getDay(); // 0 Sun..6 Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + diffToMon);
  return base.toISOString().slice(0, 10);
}

function getWeekDays(anchorIso) {
  const start = new Date(`${getWeekStart(anchorIso)}T12:00:00`);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function weekLabel(anchorIso) {
  const days = getWeekDays(anchorIso);
  if (!days.length) return '';
  const fmt = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(days[0])} – ${fmt(days[4])}, ${days[4].slice(0, 4)}`;
}

function normalizeDayStatus(item) {
  const s = String(item?.attendanceStatus || item?.status || item?.display?.attendanceStatus || '').toUpperCase();
  const p = String(item?.punctuality || item?.display?.punctuality || '').toUpperCase();
  if (s === 'ABSENT' || s === 'MISSED') return 'Absent';
  if (p === 'LATE' || s === 'LATE') return 'Late';
  if (s === 'EXCUSED') return 'Excused';
  if (s === 'PERMISSION') return 'Permission';
  if (s === 'PRESENT' || s === 'HALF_DAY' || s === 'EARLY_DEPARTURE' || s === 'EXITED_ONLY') return 'Present';
  const inT = fmtTime(item?.entryTime || item?.check_in);
  if (inT) return 'Present';
  return 'Absent';
}

function statusStyles(status) {
  if (status === 'Present') return { bgcolor: 'rgba(22,138,85,0.10)', color: '#168a55', borderColor: 'rgba(22,138,85,0.24)' };
  if (status === 'Late') return { bgcolor: 'rgba(217,144,19,0.12)', color: '#b7791f', borderColor: 'rgba(217,144,19,0.25)' };
  if (status === 'Absent') return { bgcolor: 'rgba(220,38,38,0.10)', color: '#dc2626', borderColor: 'rgba(220,38,38,0.22)' };
  if (status === 'Excused' || status === 'Permission') return { bgcolor: 'rgba(59,130,246,0.10)', color: '#2563eb', borderColor: 'rgba(59,130,246,0.22)' };
  return { bgcolor: 'rgba(100,116,139,0.10)', color: '#64748B', borderColor: 'rgba(100,116,139,0.22)' };
}

function studentKey(item) {
  return String(item?.studentId || item?.studentCode || item?.id || item?.cardNumber || item?.studentName || '').trim();
}

function studentName(item) {
  return item?.studentName || item?.fullName || item?.name || 'Student';
}

export default function ClassStudentsAttendance() {
  const [classes, setClasses] = useState([]);
  const [className, setClassName] = useState('');
  const [view, setView] = useState('day'); // day | week
  const [date, setDate] = useState(getSchoolDateIso() || new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState('');
  const [dayRoster, setDayRoster] = useState({ items: [], summary: null });
  const [weekData, setWeekData] = useState({ days: [], byStudent: [] });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadClasses = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const res = await api.get('/teacher-portal/classes', { params: { scope: 'class_teacher' } }).catch(() => null);
      const data = res?.data?.success ? res.data.data || [] : [];
      const list = Array.isArray(data) ? data.map((x) => (typeof x === 'string' ? x : x?.label || x?.name || x?.className || '')).filter(Boolean) : [];
      setClasses(list);
      setClassName((prev) => (prev && list.includes(prev) ? prev : list[0] || ''));
    } catch {
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  const loadDay = useCallback(async () => {
    if (!className || !date) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/teacher-portal/class-teacher/student-attendance/roster', {
        params: { className, date, page: 1, limit: 200, sortBy: 'name', sortDir: 'asc' },
      });
      const data = res?.data?.success ? res.data.data : null;
      setDayRoster({ items: Array.isArray(data?.items) ? data.items : [], summary: data?.summary || null });
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not load class attendance.');
      setDayRoster({ items: [], summary: null });
    } finally {
      setLoading(false);
    }
  }, [className, date]);

  const loadWeek = useCallback(async () => {
    if (!className) return;
    setLoading(true);
    setError('');
    try {
      const days = getWeekDays(date);
      const results = await Promise.all(
        days.map((d) =>
          api
            .get('/teacher-portal/class-teacher/student-attendance/roster', {
              params: { className, date: d, page: 1, limit: 300, sortBy: 'name', sortDir: 'asc' },
            })
            .then((res) => ({ date: d, items: res?.data?.success ? (res.data.data?.items || []) : [] }))
            .catch(() => ({ date: d, items: [] }))
        )
      );
      const byKey = new Map();
      for (const day of results) {
        for (const item of day.items || []) {
          const key = studentKey(item);
          if (!key) continue;
          if (!byKey.has(key)) {
            byKey.set(key, {
              key,
              studentId: item?.studentId || item?.studentCode || key,
              studentCode: item?.studentCode || null,
              studentName: studentName(item),
              className: item?.className || className,
              days: {},
            });
          }
          byKey.get(key).days[day.date] = item;
          if (!byKey.get(key).studentName || byKey.get(key).studentName === 'Student') {
            byKey.get(key).studentName = studentName(item);
          }
        }
      }
      const rows = [...byKey.values()].sort((a, b) => a.studentName.localeCompare(b.studentName));
      setWeekData({ days, byStudent: rows });
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not load weekly class attendance.');
      setWeekData({ days: getWeekDays(date), byStudent: [] });
    } finally {
      setLoading(false);
    }
  }, [className, date]);

  useEffect(() => {
    if (!className) return;
    if (view === 'day') loadDay();
    else loadWeek();
  }, [className, view, date, loadDay, loadWeek]);

  const openStudent = useCallback(async (student) => {
    const id = student?.studentId || student?.studentCode || student?.id || student?.key;
    if (!id) return;
    setSelectedStudent({ ...student, id });
    setStudentDetail(null);
    setDetailLoading(true);
    try {
      const to = getSchoolDateIso() || new Date().toISOString().slice(0, 10);
      const d = new Date(`${to}T12:00:00`);
      d.setDate(d.getDate() - 180);
      const from = d.toISOString().slice(0, 10);
      const res = await api.get(`/teacher-portal/class-teacher/student-attendance/student/${encodeURIComponent(id)}/performance`, {
        params: { className, from, to },
      });
      setStudentDetail(res?.data?.success ? res.data.data : null);
    } catch {
      setStudentDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [className]);

  const tableHeadSx = {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
    color: '#64748B', bgcolor: '#F8FAFC', borderBottom: `1px solid ${brand.border}`,
    whiteSpace: 'nowrap', py: 1.25,
  };
  const cellSx = { fontSize: 13, color: brand.text, borderBottom: `1px solid ${brand.border}`, py: 1.1, verticalAlign: 'middle' };

  const daySummary = dayRoster.summary || {};
  const presentCount = Number(daySummary.present ?? dayRoster.items.filter((i) => ['Present', 'Late'].includes(normalizeDayStatus(i))).length);
  const absentCount = Number(daySummary.absent ?? dayRoster.items.filter((i) => normalizeDayStatus(i) === 'Absent').length);

  return (
    <Page>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={1.5}>
          <Box>
            <Typography sx={{ fontSize: { xs: 20, sm: 22 }, fontWeight: 800, color: brand.navy, letterSpacing: '-0.01em' }}>
              Class Students Attendance
            </Typography>
            <Typography sx={{ fontSize: 13, color: brand.muted, mt: 0.25 }}>
              Tap in/out attendance for students in your assigned class (from Attendance module).
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => (view === 'day' ? loadDay() : loadWeek())}
            disabled={loading || !className}
            sx={{ textTransform: 'none', fontWeight: 700, borderColor: brand.border, width: { xs: '100%', sm: 'auto' } }}
          >
            Refresh
          </Button>
        </Stack>

        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1.5 }, border: `1px solid ${brand.border}`, borderRadius: 2, bgcolor: '#fff' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              select size="small" label="My class (class teacher)" value={className}
              onChange={(e) => setClassName(e.target.value)}
              disabled={loadingClasses}
              sx={{ minWidth: { xs: '100%', md: 240 } }}
            >
              {classes.length === 0 ? <MenuItem value="">No assigned class</MenuItem> : null}
              {classes.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField
              select size="small" label="View" value={view}
              onChange={(e) => setView(e.target.value)}
              sx={{ minWidth: { xs: '100%', md: 140 } }}
            >
              <MenuItem value="day">Day</MenuItem>
              <MenuItem value="week">Week</MenuItem>
            </TextField>
            <TextField
              size="small" type="date" label={view === 'week' ? 'Pick a day in week' : 'Date'}
              value={date} onChange={(e) => setDate(e.target.value || getSchoolDateIso())}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: { xs: '100%', md: 200 } }}
            />
            {view === 'week' && (
              <Chip icon={<DateRangeIcon sx={{ fontSize: 16 }} />} label={weekLabel(date)} variant="outlined"
                sx={{ height: 40, borderRadius: 2, fontWeight: 600, color: brand.navy, borderColor: brand.border, bgcolor: '#F8FAFC' }} />
            )}
          </Stack>
        </Paper>

        {view === 'day' && dayRoster.items.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, minmax(0,1fr))', sm: 'repeat(3, minmax(0,180px))' }, gap: 1.25 }}>
            {[{ label: 'Students', value: dayRoster.items.length }, { label: 'Present', value: presentCount }, { label: 'Absent', value: absentCount }].map((s) => (
              <Paper key={s.label} elevation={0} sx={{ p: 1.5, border: `1px solid ${brand.border}`, borderRadius: 2, bgcolor: '#fff' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: brand.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</Typography>
                <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 800, color: brand.navy, mt: 0.25, lineHeight: 1.1 }}>{s.value}</Typography>
              </Paper>
            ))}
          </Box>
        )}

        <Paper elevation={0} sx={{ border: `1px solid ${brand.border}`, borderRadius: 2, overflow: 'hidden', bgcolor: '#fff' }}>
          <Box sx={{ px: 1.5, py: 1.25, borderBottom: `1px solid ${brand.border}`, bgcolor: '#fff' }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <GroupsIcon sx={{ fontSize: 16, color: brand.muted }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: brand.navy }}>
                {className || 'Select a class'}
              </Typography>
              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Typography sx={{ fontSize: 12, color: brand.muted }}>
                {view === 'day' ? `Day view · ${date}` : `Week view · ${weekLabel(date)}`}
              </Typography>
              <Typography sx={{ fontSize: 12, color: brand.muted, ml: { sm: 'auto' } }}>Tap a student for attendance history</Typography>
            </Stack>
          </Box>

          {loadingClasses ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 7 }}><CircularProgress size={28} /></Stack>
          ) : !className ? (
            <Box sx={{ p: 2 }}>
              <EmptyState title="No class teacher assignment" description="You are not assigned as a class teacher to any class in Student Management." />
            </Box>
          ) : loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 7 }}>
              <CircularProgress size={28} />
              <Typography sx={{ mt: 1.5, fontSize: 13, color: brand.muted }}>Loading attendance…</Typography>
            </Stack>
          ) : error ? (
            <Box sx={{ p: 2 }}><EmptyState title="Could not load attendance" description={error} /></Box>
          ) : view === 'day' ? (
            dayRoster.items.length === 0 ? (
              <Box sx={{ p: 2 }}><EmptyState title="No students found" description="No attendance roster found for this class and date." /></Box>
            ) : (
              <>
                {/* Mobile cards */}
                <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' }, p: 1.25 }}>
                  {dayRoster.items.map((item, idx) => {
                    const status = normalizeDayStatus(item);
                    const inT = fmtTime(item?.entryTime || item?.check_in) || '—';
                    const outT = fmtTime(item?.exitTime || item?.check_out) || '—';
                    return (
                      <Box key={studentKey(item) || idx} onClick={() => openStudent(item)}
                        sx={{ border: `1px solid ${brand.border}`, borderRadius: 2, p: 1.5, bgcolor: '#fff', cursor: 'pointer', '&:active': { bgcolor: '#F8FAFC' } }}>
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: brand.navy }}>{studentName(item)}</Typography>
                            <Typography sx={{ fontSize: 12, color: brand.muted }}>{item?.studentCode || item?.className || className}</Typography>
                          </Box>
                          <Chip size="small" label={status} variant="outlined" sx={{ fontWeight: 700, fontSize: 10, height: 22, ...statusStyles(status) }} />
                        </Stack>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#F8FAFC', border: `1px solid ${brand.border}` }}>
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                              <LoginIcon sx={{ fontSize: 14, color: '#168a55' }} />
                              <Typography sx={{ fontSize: 10, fontWeight: 700, color: brand.muted, textTransform: 'uppercase' }}>In</Typography>
                            </Stack>
                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: inT !== '—' ? '#168a55' : brand.muted }}>{inT}</Typography>
                          </Box>
                          <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#F8FAFC', border: `1px solid ${brand.border}` }}>
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                              <LogoutIcon sx={{ fontSize: 14, color: brand.navy }} />
                              <Typography sx={{ fontSize: 10, fontWeight: 700, color: brand.muted, textTransform: 'uppercase' }}>Out</Typography>
                            </Stack>
                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: outT !== '—' ? brand.navy : brand.muted }}>{outT}</Typography>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>

                {/* Desktop table */}
                <TableContainer sx={{ display: { xs: 'none', md: 'block' }, width: '100%', overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 760 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={tableHeadSx}>Student</TableCell>
                        <TableCell sx={tableHeadSx}>Code</TableCell>
                        <TableCell sx={tableHeadSx}>In</TableCell>
                        <TableCell sx={tableHeadSx}>Out</TableCell>
                        <TableCell sx={tableHeadSx}>Status</TableCell>
                        <TableCell sx={tableHeadSx}>Card/Tab</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dayRoster.items.map((item, idx) => {
                        const status = normalizeDayStatus(item);
                        const inT = fmtTime(item?.entryTime || item?.check_in) || '—';
                        const outT = fmtTime(item?.exitTime || item?.check_out) || '—';
                        return (
                          <TableRow key={studentKey(item) || idx} hover onClick={() => openStudent(item)}
                            sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}>
                            <TableCell sx={{ ...cellSx, fontWeight: 600 }}>{studentName(item)}</TableCell>
                            <TableCell sx={{ ...cellSx, color: brand.muted }}>{item?.studentCode || '—'}</TableCell>
                            <TableCell sx={{ ...cellSx, color: inT !== '—' ? '#168a55' : brand.muted, fontWeight: inT !== '—' ? 700 : 500 }}>{inT}</TableCell>
                            <TableCell sx={{ ...cellSx, color: outT !== '—' ? brand.navy : brand.muted, fontWeight: outT !== '—' ? 700 : 500 }}>{outT}</TableCell>
                            <TableCell sx={cellSx}>
                              <Chip size="small" label={status} variant="outlined" sx={{ fontWeight: 700, fontSize: 10, height: 22, ...statusStyles(status) }} />
                            </TableCell>
                            <TableCell sx={{ ...cellSx, fontSize: 12, color: brand.muted }}>Tap in/out</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ px: 1.5, py: 1.25, borderTop: `1px solid ${brand.border}`, bgcolor: '#FAFBFC' }}>
                  <Typography sx={{ fontSize: 12, color: brand.muted }}>{dayRoster.items.length} student{dayRoster.items.length === 1 ? '' : 's'} · {date}</Typography>
                </Box>
              </>
            )
          ) : (
            // Week view
            weekData.byStudent.length === 0 ? (
              <Box sx={{ p: 2 }}><EmptyState title="No attendance data" description="No student tap attendance found for this class in the selected week." /></Box>
            ) : (
              <>
                <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 720 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...tableHeadSx, position: { md: 'sticky' }, left: 0, zIndex: 2 }}>Student</TableCell>
                        {weekData.days.map((d, i) => (
                          <TableCell key={d} align="center" sx={tableHeadSx}>
                            <Box>{WEEKDAYS[i]}</Box>
                            <Box sx={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'none' }}>{d.slice(5)}</Box>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {weekData.byStudent.map((s) => (
                        <TableRow key={s.key} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell
                            onClick={() => openStudent(s)}
                            sx={{ ...cellSx, fontWeight: 600, cursor: 'pointer', position: { md: 'sticky' }, left: 0, bgcolor: '#fff', zIndex: 1, minWidth: 180 }}
                          >
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{s.studentName}</Typography>
                            <Typography sx={{ fontSize: 11, color: brand.muted }}>{s.studentCode || ''}</Typography>
                          </TableCell>
                          {weekData.days.map((d) => {
                            const item = s.days[d];
                            const status = item ? normalizeDayStatus(item) : '—';
                            const inT = item ? (fmtTime(item.entryTime || item.check_in) || '') : '';
                            const outT = item ? (fmtTime(item.exitTime || item.check_out) || '') : '';
                            const label = status === '—' ? '—' : status === 'Present' ? 'P' : status === 'Late' ? 'L' : status === 'Absent' ? 'A' : status.slice(0, 1);
                            return (
                              <TableCell key={d} align="center" sx={{ ...cellSx, minWidth: 110 }}>
                                {status === '—' ? (
                                  <Typography sx={{ fontSize: 12, color: '#CBD5E1' }}>—</Typography>
                                ) : (
                                  <Tooltip title={`${status}${inT ? ` · In ${inT}` : ''}${outT ? ` · Out ${outT}` : ''}`} arrow>
                                    <Box>
                                      <Chip size="small" label={label} variant="outlined"
                                        sx={{ fontWeight: 800, fontSize: 10, height: 22, minWidth: 28, ...statusStyles(status) }} />
                                      <Typography sx={{ fontSize: 10, color: brand.muted, mt: 0.35, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                                        {inT || '—'}{inT || outT ? ' / ' : ''}{outT || '—'}
                                      </Typography>
                                    </Box>
                                  </Tooltip>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ px: 1.5, py: 1.25, borderTop: `1px solid ${brand.border}`, bgcolor: '#FAFBFC' }}>
                  <Typography sx={{ fontSize: 12, color: brand.muted }}>
                    {weekData.byStudent.length} student{weekData.byStudent.length === 1 ? '' : 's'} · {weekLabel(date)} · tap a student for history
                  </Typography>
                </Box>
              </>
            )
          )}
        </Paper>
      </Stack>

      <Dialog open={Boolean(selectedStudent)} onClose={() => setSelectedStudent(null)} fullWidth maxWidth="md">
        <DialogTitle sx={{ pr: 6 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonIcon sx={{ color: brand.navy }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: brand.navy, lineHeight: 1.2 }}>
                {selectedStudent?.studentName || 'Student attendance'}
              </Typography>
              <Typography sx={{ fontSize: 12, color: brand.muted }}>
                {selectedStudent?.studentCode || selectedStudent?.className || className} · tap in/out history
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={() => setSelectedStudent(null)} sx={{ position: 'absolute', right: 8, top: 8 }} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2 } }}>
          {detailLoading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>
          ) : !studentDetail ? (
            <EmptyState title="No attendance history" description="Could not load attendance records for this student." />
          ) : (
            <Stack spacing={2}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', sm: 'repeat(4, minmax(0,1fr))' }, gap: 1 }}>
                {(studentDetail.statusBreakdown || []).map((b) => (
                  <Paper key={b.label} elevation={0} sx={{ p: 1.25, border: `1px solid ${brand.border}`, borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: brand.muted, textTransform: 'uppercase' }}>{b.label}</Typography>
                    <Typography sx={{ fontSize: 22, fontWeight: 800, color: brand.navy, mt: 0.25 }}>{b.value ?? 0}</Typography>
                  </Paper>
                ))}
                <Paper elevation={0} sx={{ p: 1.25, border: `1px solid ${brand.border}`, borderRadius: 2 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: brand.muted, textTransform: 'uppercase' }}>Days (period)</Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, color: brand.navy, mt: 0.25 }}>{studentDetail.totalEvents ?? (studentDetail.dailyTrend || []).length}</Typography>
                </Paper>
              </Box>

              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy, mb: 1 }}>Daily attendance records</Typography>
                {(studentDetail.dailyTrend || []).length === 0 ? (
                  <Typography sx={{ fontSize: 13, color: brand.muted }}>No records in this period.</Typography>
                ) : (
                  <TableContainer sx={{ border: `1px solid ${brand.border}`, borderRadius: 2, maxHeight: 420 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={tableHeadSx}>Date</TableCell>
                          <TableCell sx={tableHeadSx}>Status</TableCell>
                          <TableCell sx={tableHeadSx}>Source</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...(studentDetail.dailyTrend || [])].reverse().map((d) => {
                          const status = d.late > 0 ? 'Late' : d.absent > 0 ? 'Absent' : d.present > 0 ? 'Present' : '—';
                          return (
                            <TableRow key={d.date} hover>
                              <TableCell sx={{ ...cellSx, fontWeight: 600, whiteSpace: 'nowrap' }}>{d.date}</TableCell>
                              <TableCell sx={cellSx}>
                                <Chip size="small" label={status} variant="outlined" sx={{ fontWeight: 700, fontSize: 10, height: 22, ...statusStyles(status) }} />
                              </TableCell>
                              <TableCell sx={{ ...cellSx, fontSize: 12, color: brand.muted }}>Card / Tab tap</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
              <Typography sx={{ fontSize: 11, color: brand.muted }}>
                Showing recent attendance history (last ~6 months) from card/tab tap records.
              </Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
