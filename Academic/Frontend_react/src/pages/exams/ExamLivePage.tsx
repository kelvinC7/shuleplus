import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, MenuItem, Select,
  Tab, Tabs, TextField, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { examApiError, examCheckIn, examExit, examSubmit, fetchExamLive, startExam } from '@/modules/exams/exam-api';
import { classLevelOf, examLevels, examPapers } from '@/modules/exams/exam-class';
import { downloadAttendancePdf } from '@/modules/exams/exam-pdf';
import { toast } from '@/lib/toast';
import type { ExamAttendance, ExamSchedule } from '@/modules/exams/exam-types';
import { AMBER, ExamToolbar, Kpi, NAVY, NeedSession, dateLabel } from '@/modules/exams/exam-ui';
import { useExamWorkspace } from '@/modules/exams/use-exam-workspace';
import { useAuth } from '@/contexts/auth-context';

const TABS = [
  { label: 'Active exams', path: '/exams/live' },
  { label: 'Attendance', path: '/exams/live/attendance' },
  { label: 'QR', path: '/exams/live/qr' },
  { label: 'Manual', path: '/exams/live/manual' },
  { label: 'RFID', path: '/exams/live/rfid' },
  { label: 'Submission', path: '/exams/live/submission' },
  { label: 'Early', path: '/exams/live/early' },
  { label: 'Exit', path: '/exams/live/exit' },
];

type AttendanceRow = ExamAttendance & { scheduleId: string };

export default function ExamLivePage() {
  const workspace = useExamWorkspace();
  const { session } = workspace;
  const { summary } = useAuth();
  const schoolName = summary?.organizationName || 'School';
  const logoUrl = summary?.logoUrl;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tab = Math.max(0, TABS.findIndex((t) => t.path === pathname));
  const [live, setLive] = useState<ExamSchedule[]>([]);
  const [paperKey, setPaperKey] = useState('');
  const [levelKey, setLevelKey] = useState('');
  const [roomName, setRoomName] = useState('');
  const [query, setQuery] = useState('');
  const [earlyReason, setEarlyReason] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [wrongRoom, setWrongRoom] = useState('');

  async function reloadLive() {
    if (!session) return;
    const rows = await fetchExamLive(session.id);
    setLive(rows);
  }

  useEffect(() => { reloadLive().catch(() => setLive([])); }, [session?.id]);

  const levels = useMemo(() => examLevels(live), [live]);
  const papers = useMemo(() => {
    const scoped = levelKey ? live.filter((s) => classLevelOf(s.className) === levelKey) : live;
    return examPapers(scoped);
  }, [live, levelKey]);
  const paper = papers.find((p) => p.key === paperKey) ?? papers[0] ?? null;
  const paperSchedules = useMemo(
    () => live.filter((s) => (paper ? paper.scheduleIds.includes(s.id) : true) && (!levelKey || classLevelOf(s.className) === levelKey)),
    [live, paper, levelKey],
  );
  const rooms = useMemo(() => {
    const fromPaper = paper?.rooms ?? [];
    const fromSession = (session?.rooms ?? []).map((r) => r.name);
    return [...new Set([...fromPaper, ...fromSession, ...paperSchedules.flatMap((s) => (s.rooms ?? []).map((r) => r.name))])].filter(Boolean);
  }, [paper, session, paperSchedules]);

  const attendances: AttendanceRow[] = useMemo(() => {
    const map = new Map<string, AttendanceRow>();
    for (const s of paperSchedules) {
      const source = (s.attendances?.length ? s.attendances : (s.seats ?? []).map((seat) => ({
        id: seat.id,
        studentId: seat.studentId,
        studentCode: seat.studentCode,
        fullName: seat.fullName,
        className: seat.className,
        roomName: seat.roomName,
        seatCode: seat.seatCode,
        status: 'NOT_ARRIVED' as const,
        lateMinutes: 0,
      })));
      for (const a of source) {
        if (roomName && a.roomName !== roomName) continue;
        if (!map.has(a.studentId)) map.set(a.studentId, { ...a, scheduleId: s.id });
      }
    }
    return [...map.values()].sort((a, b) => a.roomName.localeCompare(b.roomName) || (a.seatCode || '').localeCompare(b.seatCode || '') || a.fullName.localeCompare(b.fullName));
  }, [paperSchedules, roomName]);

  const kpis = {
    present: attendances.filter((a) => a.checkInAt).length,
    late: attendances.filter((a) => a.status === 'LATE').length,
    absent: attendances.filter((a) => a.status === 'ABSENT' || a.status === 'NOT_ARRIVED').length,
    submitted: attendances.filter((a) => a.submitAt).length,
    total: attendances.length,
  };
  const remaining = Math.max(0, (kpis.present || 0) - (kpis.submitted || 0));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return attendances;
    return attendances.filter((a) => a.fullName.toLowerCase().includes(q) || a.studentCode.toLowerCase().includes(q));
  }, [attendances, query]);
  const liveNow = paperSchedules.some((s) => s.status === 'IN_PROGRESS');

  async function check(code: string, method: 'MANUAL' | 'QR' | 'RFID') {
    const studentCode = code.includes('|') ? code.split('|')[3] : code;
    const row = attendances.find((a) => a.studentCode === studentCode.trim() || a.studentId === studentCode.trim());
    const scheduleId = row?.scheduleId || paperSchedules[0]?.id;
    if (!scheduleId) return;
    setBusy(true); setError(''); setInfo(''); setWrongRoom('');
    try {
      const result = await examCheckIn({ scheduleId, studentCode: studentCode.trim(), roomName: roomName || undefined, method });
      setInfo(result.already ? (result.message || 'Already checked in') : `${method} check-in recorded`);
      await reloadLive();
    } catch (e) {
      const msg = examApiError(e);
      if (/WRONG EXAM ROOM/i.test(msg)) setWrongRoom(msg);
      else setError(msg);
    } finally { setBusy(false); }
  }

  async function submit(code: string, early = false) {
    const row = attendances.find((a) => a.studentCode === code.trim() || a.studentId === code.trim());
    const scheduleId = row?.scheduleId || paperSchedules[0]?.id;
    if (!scheduleId) return;
    setBusy(true); setError('');
    try {
      await examSubmit({ scheduleId, studentCode: code.trim(), earlyReason: early ? earlyReason || 'Early submission' : undefined, method: 'MANUAL' });
      setInfo('Submission recorded');
      await reloadLive();
    } catch (e) { setError(examApiError(e)); }
    finally { setBusy(false); }
  }

  async function startPaper() {
    setBusy(true); setError('');
    try {
      for (const s of paperSchedules) {
        if (s.status !== 'IN_PROGRESS') await startExam(s.id);
      }
      await reloadLive();
    } catch (e) { setError(examApiError(e)); }
    finally { setBusy(false); }
  }

  async function downloadList() {
    if (!session) return;
    try {
      await downloadAttendancePdf({
        session,
        schoolName,
        rows: attendances,
        examName: paper ? `${paper.subjectName} · ${paper.level}` : levelKey || undefined,
        roomName: roomName || undefined,
        logoUrl,
      });
      toast.success('Attendance list downloaded');
    } catch (e) {
      const msg = examApiError(e) || 'Could not generate the attendance PDF.';
      setError(msg);
      toast.error(msg);
    }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f9' }}>
      <ExamToolbar
        workspace={workspace}
        extra={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button disabled={!attendances.length} startIcon={<DownloadIcon />} onClick={downloadList} sx={{ textTransform: 'none', fontWeight: 800, color: NAVY }}>Download list</Button>
            <Button onClick={() => reloadLive()} sx={{ textTransform: 'none' }}>Refresh</Button>
          </Box>
        }
      />
      <Tabs value={tab} onChange={(_, v) => navigate(TABS[v].path)} sx={{ bgcolor: '#fff', px: 2 }}>
        {TABS.map((t) => <Tab key={t.path} label={t.label} />)}
      </Tabs>
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {!session ? <NeedSession /> : (
          <>
            {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
            {info ? <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert> : null}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Select size="small" value={levelKey} displayEmpty onChange={(e) => { setLevelKey(e.target.value); setPaperKey(''); setRoomName(''); }} sx={{ minWidth: 140 }}>
                <MenuItem value="">All classes</MenuItem>
                {levels.map((lv) => <MenuItem key={lv.key} value={lv.key}>{lv.level}</MenuItem>)}
              </Select>
              <Select size="small" value={paper?.key ?? ''} onChange={(e) => { setPaperKey(e.target.value); setRoomName(''); }} sx={{ minWidth: 200 }}>
                {papers.map((p) => <MenuItem key={p.key} value={p.key}>{p.subjectName}</MenuItem>)}
              </Select>
              <Select size="small" value={roomName} onChange={(e) => setRoomName(e.target.value)} sx={{ minWidth: 160 }}>
                <MenuItem value="">All rooms</MenuItem>
                {rooms.map((r) => {
                  const cap = (session.rooms ?? []).find((x) => x.name === r)?.capacity;
                  return <MenuItem key={r} value={r}>{r}{cap ? ` · ${cap}` : ''}</MenuItem>;
                })}
              </Select>
              {paperSchedules.length && !liveNow ? (
                <Button variant="contained" disabled={busy} onClick={startPaper} sx={{ bgcolor: NAVY, textTransform: 'none' }}>Start attendance</Button>
              ) : liveNow ? <Chip color="success" label="LIVE" /> : null}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(6, 1fr)' }, gap: 2, mb: 2 }}>
              <Kpi label="Students" value={kpis.total} />
              <Kpi label="Present" value={kpis.present} tone="#16a34a" />
              <Kpi label="Late" value={kpis.late} tone="#d97706" />
              <Kpi label="Absent" value={kpis.absent} tone="#dc2626" />
              <Kpi label="Submitted" value={kpis.submitted} tone="#0f766e" />
              <Kpi label="Remaining" value={remaining} />
            </Box>

            {pathname === '/exams/live' && papers.map((p) => {
              const rows = live.filter((s) => p.scheduleIds.includes(s.id));
              const present = rows.reduce((n, s) => n + (s.kpis?.present ?? 0), 0);
              const total = p.studentCount;
              return (
                <Box key={p.key} sx={{ p: 2, mb: 1.25, bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 800 }}>{p.subjectName} · {p.level}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{dateLabel(p.date)} · {p.startTime}–{p.endTime} · {p.rooms.join(', ')}</Typography>
                    <Chip size="small" sx={{ mt: 0.75 }} label={rows.some((s) => s.status === 'IN_PROGRESS') ? 'IN_PROGRESS' : rows[0]?.status} color={rows.some((s) => s.status === 'IN_PROGRESS') ? 'success' : 'default'} />
                  </Box>
                  <Box sx={{ minWidth: 180 }}>
                    <Typography sx={{ fontSize: '0.75rem' }}>Attendance {present}/{total}</Typography>
                    <LinearProgress variant="determinate" value={total ? (present / total) * 100 : 0} sx={{ my: 0.7, height: 8, borderRadius: 99 }} />
                    <Button size="small" onClick={() => { setPaperKey(p.key); setLevelKey(p.level); navigate('/exams/live/attendance'); }} sx={{ textTransform: 'none' }}>Open</Button>
                  </Box>
                </Box>
              );
            })}

            {(pathname.endsWith('/attendance') || pathname.endsWith('/manual') || pathname.endsWith('/qr') || pathname.endsWith('/rfid')) && (
              <Box sx={{ p: 2.5, bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 800 }}>
                    {pathname.endsWith('/qr') ? 'Scan student QR' : pathname.endsWith('/rfid') ? 'RFID / ShuleCard' : 'Manual attendance'}
                    {roomName ? ` · ${roomName}` : ' · All rooms'}
                  </Typography>
                  <Button size="small" startIcon={<DownloadIcon />} disabled={!attendances.length} onClick={downloadList} sx={{ textTransform: 'none', fontWeight: 800 }}>Download list</Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                  <TextField fullWidth size="small" placeholder={pathname.endsWith('/rfid') ? 'Tap card or enter student code' : 'Student code or QR payload'} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') check(query, pathname.endsWith('/qr') ? 'QR' : pathname.endsWith('/rfid') ? 'RFID' : 'MANUAL'); }} />
                  <Button variant="contained" disabled={busy} onClick={() => check(query, pathname.endsWith('/qr') ? 'QR' : pathname.endsWith('/rfid') ? 'RFID' : 'MANUAL')} sx={{ bgcolor: AMBER, color: NAVY, fontWeight: 800, textTransform: 'none' }}>Record</Button>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.7fr 70px 110px 110px', px: 1, py: 0.8, bgcolor: '#f8fafc', borderRadius: 1, mb: 0.5 }}>
                  {['Student', 'Class', 'Room', 'Seat', 'Status', ''].map((h) => (
                    <Typography key={h} sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{h}</Typography>
                  ))}
                </Box>
                {filtered.map((a) => (
                  <Box key={a.id} sx={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.7fr 70px 110px 110px', px: 1, py: 1, borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{a.fullName}</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{a.studentCode}</Typography>
                    </Box>
                    <Typography>{a.className}</Typography>
                    <Typography>{a.roomName}</Typography>
                    <Typography sx={{ fontWeight: 800, color: NAVY }}>{a.seatCode || '—'}</Typography>
                    <Chip size="small" label={a.status.replace('_', ' ')} color={a.status === 'PRESENT' ? 'success' : a.status === 'LATE' ? 'warning' : a.status === 'ABSENT' ? 'error' : 'default'} />
                    {a.checkInAt ? (
                      <Typography sx={{ fontSize: '0.75rem' }}>{new Date(a.checkInAt).toLocaleTimeString()}</Typography>
                    ) : (
                      <Button size="small" disabled={busy} onClick={() => check(a.studentCode, 'MANUAL')} sx={{ textTransform: 'none' }}>Mark present</Button>
                    )}
                  </Box>
                ))}
              </Box>
            )}

            {(pathname.endsWith('/submission') || pathname.endsWith('/early') || pathname.endsWith('/exit')) && (
              <Box sx={{ p: 2.5, bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                {pathname.endsWith('/early') ? <TextField fullWidth sx={{ mb: 2 }} label="Early submission reason" value={earlyReason} onChange={(e) => setEarlyReason(e.target.value)} /> : null}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField fullWidth size="small" placeholder="Student code" value={query} onChange={(e) => setQuery(e.target.value)} />
                  {pathname.endsWith('/exit')
                    ? <Button variant="contained" disabled={busy} onClick={async () => { const row = attendances.find((a) => a.studentCode === query.trim()); if (row) { await examExit({ scheduleId: row.scheduleId, studentCode: query.trim() }); await reloadLive(); } }} sx={{ textTransform: 'none' }}>Record exit</Button>
                    : <Button variant="contained" disabled={busy} onClick={() => submit(query, pathname.endsWith('/early'))} sx={{ textTransform: 'none' }}>{pathname.endsWith('/early') ? 'Confirm early submission' : 'Mark submitted'}</Button>}
                </Box>
                <Typography sx={{ mb: 1, fontWeight: 700 }}>Submission progress {kpis.submitted}/{kpis.present || kpis.total}</Typography>
                <LinearProgress variant="determinate" value={kpis.present ? (kpis.submitted / kpis.present) * 100 : 0} sx={{ height: 10, borderRadius: 99, mb: 2, '& .MuiLinearProgress-bar': { bgcolor: AMBER } }} />
                {attendances.map((a) => (
                  <Box key={a.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.8, borderBottom: '1px solid #f8fafc' }}>
                    <Typography>{a.fullName} · {a.roomName} {a.seatCode}</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>{a.status}{a.submitAt ? ` · ${new Date(a.submitAt).toLocaleTimeString()}` : ''}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}
      </Box>

      <Dialog open={Boolean(wrongRoom)} onClose={() => setWrongRoom('')} slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle>Wrong exam room</DialogTitle>
        <DialogContent>{wrongRoom} Attendance was not recorded.</DialogContent>
        <DialogActions><Button onClick={() => setWrongRoom('')}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
