import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import api from '../services/api';
import { formatSchoolTime, getSchoolDateIso } from '../utils/schoolTime';
import { EmptyState } from '../components/ui';
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
  const [query, setQuery] = useState('');

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

  const q = query.trim().toLowerCase();
  const matches = (name, code) => !q || String(name || '').toLowerCase().includes(q) || String(code || '').toLowerCase().includes(q);
  const dayItems = useMemo(() => dayRoster.items.filter((i) => matches(studentName(i), i?.studentCode)), [dayRoster.items, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const weekRows = useMemo(() => weekData.byStudent.filter((s) => matches(s.studentName, s.studentCode)), [weekData.byStudent, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const tally = { total: 0, present: 0, late: 0, absent: 0 };
    if (view === 'day') {
      const sm = dayRoster.summary || {};
      const items = dayRoster.items;
      tally.total = items.length;
      tally.late = items.filter((i) => normalizeDayStatus(i) === 'Late').length;
      tally.present = Number(sm.present ?? items.filter((i) => ['Present', 'Late'].includes(normalizeDayStatus(i))).length);
      tally.absent = Number(sm.absent ?? items.filter((i) => normalizeDayStatus(i) === 'Absent').length);
    } else {
      tally.total = weekData.byStudent.length;
      weekData.byStudent.forEach((s) =>
        Object.values(s.days).forEach((item) => {
          const st = normalizeDayStatus(item);
          if (st === 'Late') tally.late += 1;
          if (st === 'Present' || st === 'Late') tally.present += 1;
          if (st === 'Absent') tally.absent += 1;
        })
      );
    }
    return tally;
  }, [view, dayRoster, weekData]);

  const statusChip = (status) => (
    <Chip size="small" label={status} variant="outlined" sx={{ fontWeight: 700, fontSize: 10, height: 22, ...statusStyles(status) }} />
  );

  const refresh = () => (view === 'day' ? loadDay() : loadWeek());
  const sectionTitle = `${className || 'Select a class'} · ${view === 'day' ? date : weekLabel(date)}`;

  return (
    <ListPage>
      <StickyFilterBar search={query} onSearch={setQuery} searchPlaceholder="Search student or code…">
        <BarSelect
          label="Class"
          value={className}
          onChange={setClassName}
          options={classes}
          allLabel={classes.length === 0 ? (loadingClasses ? 'Loading…' : 'No assigned class') : undefined}
        />
        <BarSelect
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
          ]}
        />
        <Box key="date" sx={{ flex: 1, minWidth: 0 }}>
          <InputBase
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || getSchoolDateIso())}
            inputProps={{ 'aria-label': view === 'week' ? 'Pick a day in week' : 'Date' }}
            sx={{ width: '100%', fontSize: 12, fontWeight: 600, color: brand.navy, py: 0.25, '& input': { py: 0.5, px: 0 } }}
          />
        </Box>
      </StickyFilterBar>

      <ListPageBody>
        <PageTitleRow
          title="Students Attendance"
          subtitle="Tap in/out attendance for students in your assigned class (from Attendance module)."
          actions={
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={refresh}
              disabled={loading || !className}
              sx={{ borderColor: brand.border, fontWeight: 700, textTransform: 'none' }}
            >
              Refresh
            </Button>
          }
        />

        <NavyStats
          stats={[
            { label: 'Students', value: loading ? '—' : stats.total },
            { label: 'Present', value: loading ? '—' : stats.present },
            { label: 'Late', value: loading ? '—' : stats.late },
            { label: 'Absent', value: loading ? '—' : stats.absent },
          ]}
        />

        <SectionPaper title={sectionTitle} count={view === 'day' ? dayItems.length : weekRows.length}>
          {loadingClasses ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 7 }}><CircularProgress size={26} /></Stack>
          ) : !className ? (
            <Box sx={{ p: 2 }}>
              <EmptyState title="No class teacher assignment" description="You are not assigned as a class teacher to any class in Student Management." />
            </Box>
          ) : loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 7 }}>
              <CircularProgress size={26} />
              <Typography sx={{ mt: 1.5, fontSize: 13, color: brand.muted }}>Loading attendance…</Typography>
            </Stack>
          ) : error ? (
            <Box sx={{ p: 2 }}><EmptyState title="Could not load attendance" description={error} /></Box>
          ) : view === 'day' ? (
            dayItems.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <EmptyState
                  title={dayRoster.items.length ? 'No matching students' : 'No students found'}
                  description={dayRoster.items.length ? 'Try a different search term.' : 'No attendance roster found for this class and date.'}
                />
              </Box>
            ) : (
              <>
                {/* Mobile rows */}
                <Stack sx={{ display: { xs: 'flex', md: 'none' } }}>
                  {dayItems.map((item, idx) => {
                    const status = normalizeDayStatus(item);
                    const inT = fmtTime(item?.entryTime || item?.check_in) || '—';
                    const outT = fmtTime(item?.exitTime || item?.check_out) || '—';
                    return (
                      <Box
                        key={studentKey(item) || idx}
                        onClick={() => openStudent(item)}
                        sx={{ px: 1.5, py: 1.25, cursor: 'pointer', bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff', borderBottom: idx < dayItems.length - 1 ? '1px solid rgba(19,33,61,0.06)' : 'none' }}
                      >
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 0.75 }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: brand.navy, lineHeight: 1.3 }}>{studentName(item)}</Typography>
                            <Typography sx={{ fontSize: 11.5, color: brand.muted }}>{item?.studentCode || item?.className || className}</Typography>
                          </Box>
                          {statusChip(status)}
                        </Stack>
                        <Stack direction="row" spacing={2}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <LoginIcon sx={{ fontSize: 14, color: '#168a55' }} />
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: inT !== '—' ? '#168a55' : brand.muted }}>{inT}</Typography>
                          </Stack>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <LogoutIcon sx={{ fontSize: 14, color: brand.navy }} />
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: outT !== '—' ? brand.navy : brand.muted }}>{outT}</Typography>
                          </Stack>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>

                {/* Desktop table */}
                <TableContainer sx={{ display: { xs: 'none', md: 'block' }, width: '100%', overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 700 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...headCellSx, width: 40 }}>#</TableCell>
                        <TableCell sx={headCellSx}>Student</TableCell>
                        <TableCell sx={headCellSx}>Code</TableCell>
                        <TableCell sx={headCellSx}>In</TableCell>
                        <TableCell sx={headCellSx}>Out</TableCell>
                        <TableCell sx={headCellSx}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dayItems.map((item, idx) => {
                        const status = normalizeDayStatus(item);
                        const inT = fmtTime(item?.entryTime || item?.check_in) || '—';
                        const outT = fmtTime(item?.exitTime || item?.check_out) || '—';
                        return (
                          <TableRow
                            key={studentKey(item) || idx}
                            hover
                            onClick={() => openStudent(item)}
                            sx={{ cursor: 'pointer', bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff', '&:last-child td': { borderBottom: 0 } }}
                          >
                            <TableCell sx={{ ...cellSx, color: '#94A3B8', fontSize: 12 }}>{idx + 1}</TableCell>
                            <TableCell sx={{ ...cellSx, fontWeight: 600, color: brand.navy }}>{studentName(item)}</TableCell>
                            <TableCell sx={{ ...cellSx, color: brand.muted }}>{item?.studentCode || '—'}</TableCell>
                            <TableCell sx={{ ...cellSx, color: inT !== '—' ? '#168a55' : brand.muted, fontWeight: inT !== '—' ? 700 : 500 }}>{inT}</TableCell>
                            <TableCell sx={{ ...cellSx, color: outT !== '—' ? brand.navy : brand.muted, fontWeight: outT !== '—' ? 700 : 500 }}>{outT}</TableCell>
                            <TableCell sx={cellSx}>{statusChip(status)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )
          ) : weekRows.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <EmptyState
                title={weekData.byStudent.length ? 'No matching students' : 'No attendance data'}
                description={weekData.byStudent.length ? 'Try a different search term.' : 'No student tap attendance found for this class in the selected week.'}
              />
            </Box>
          ) : (
            <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...headCellSx, position: 'sticky', left: 0, zIndex: 2, width: 40, minWidth: 40 }}>#</TableCell>
                    <TableCell sx={{ ...headCellSx, position: 'sticky', left: 40, zIndex: 2, minWidth: 170, borderRight: '1px solid rgba(19,33,61,0.08)' }}>Student</TableCell>
                    {weekData.days.map((d, i) => (
                      <TableCell key={d} align="center" sx={{ ...headCellSx, minWidth: 96 }}>
                        <Box>{WEEKDAYS[i]}</Box>
                        <Box sx={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'none' }}>{d.slice(5)}</Box>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {weekRows.map((s, idx) => {
                    const bg = idx % 2 === 1 ? '#F8F9FC' : '#fff';
                    return (
                      <TableRow key={s.key} hover sx={{ bgcolor: bg, '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell sx={{ ...cellSx, position: 'sticky', left: 0, zIndex: 1, bgcolor: bg, color: '#94A3B8', fontSize: 12, width: 40, minWidth: 40 }}>{idx + 1}</TableCell>
                        <TableCell
                          onClick={() => openStudent(s)}
                          sx={{ ...cellSx, cursor: 'pointer', position: 'sticky', left: 40, zIndex: 1, bgcolor: bg, minWidth: 170, borderRight: '1px solid rgba(19,33,61,0.08)' }}
                        >
                          <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{s.studentName}</Typography>
                          <Typography noWrap sx={{ fontSize: 11, color: brand.muted }}>{s.studentCode || ''}</Typography>
                        </TableCell>
                        {weekData.days.map((d) => {
                          const item = s.days[d];
                          const status = item ? normalizeDayStatus(item) : '—';
                          const inT = item ? fmtTime(item.entryTime || item.check_in) || '' : '';
                          const outT = item ? fmtTime(item.exitTime || item.check_out) || '' : '';
                          const label = status === '—' ? '—' : status === 'Present' ? 'P' : status === 'Late' ? 'L' : status === 'Absent' ? 'A' : status.slice(0, 1);
                          return (
                            <TableCell key={d} align="center" sx={cellSx}>
                              {status === '—' ? (
                                <Typography sx={{ fontSize: 12, color: '#CBD5E1' }}>—</Typography>
                              ) : (
                                <Tooltip title={`${status}${inT ? ` · In ${inT}` : ''}${outT ? ` · Out ${outT}` : ''}`} arrow>
                                  <Box>
                                    <Chip size="small" label={label} variant="outlined" sx={{ fontWeight: 800, fontSize: 10, height: 22, minWidth: 28, ...statusStyles(status) }} />
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
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </SectionPaper>
      </ListPageBody>

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
              <NavyStats
                stats={[
                  ...(studentDetail.statusBreakdown || []).slice(0, 3).map((b) => ({ label: b.label, value: b.value ?? 0 })),
                  { label: 'Days (period)', value: studentDetail.totalEvents ?? (studentDetail.dailyTrend || []).length },
                ]}
              />
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy, mb: 1 }}>Daily attendance records</Typography>
                {(studentDetail.dailyTrend || []).length === 0 ? (
                  <Typography sx={{ fontSize: 13, color: brand.muted }}>No records in this period.</Typography>
                ) : (
                  <TableContainer sx={{ border: '1px solid rgba(19,33,61,0.08)', maxHeight: 420 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={headCellSx}>Date</TableCell>
                          <TableCell sx={headCellSx}>Status</TableCell>
                          <TableCell sx={headCellSx}>Source</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...(studentDetail.dailyTrend || [])].reverse().map((d, idx) => {
                          const status = d.late > 0 ? 'Late' : d.absent > 0 ? 'Absent' : d.present > 0 ? 'Present' : '—';
                          return (
                            <TableRow key={d.date} sx={{ bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff' }}>
                              <TableCell sx={{ ...cellSx, fontWeight: 600, whiteSpace: 'nowrap' }}>{d.date}</TableCell>
                              <TableCell sx={cellSx}>{statusChip(status)}</TableCell>
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
    </ListPage>
  );
}
