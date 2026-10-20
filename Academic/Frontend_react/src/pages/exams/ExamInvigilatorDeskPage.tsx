import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Drawer, FormControl, IconButton, InputLabel, LinearProgress, MenuItem, Select, TextField, Typography,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import { useNavigate } from 'react-router-dom';
import {
  examApiDetails,
  examApiError,
  fetchInvigilatorDesk,
  fetchInvigilatorLists,
  fetchInvigilatorRoom,
  invigilatorDeskEligibility,
  invigilatorDeskEntry,
  type ExamEligibilityCheck,
  type InvigilatorDeskRoom,
  type InvigilatorDeskStudent,
} from '@/modules/exams/exam-api';
import { AMBER, NAVY, dateLabel } from '@/modules/exams/exam-ui';
import { toast } from '@/lib/toast';
import { useAuth } from '@/contexts/auth-context';
import { clearToken } from '@/shared/auth-token';

const SIDEBAR_W = 248;
type Section = 'dashboard' | 'rooms' | 'students' | 'lists' | 'qr' | 'schedule' | 'instructions' | 'profile' | 'help';
type Phase = 'UPCOMING' | 'LIVE' | 'COMPLETED';
type ScanFeedback = {
  kind: 'ok' | 'already' | 'wrong' | 'error' | 'blocked';
  title: string;
  body: string;
  name?: string;
  extra?: string;
};

const NAV: Array<{ group: string; items: Array<{ id: Section; label: string; icon: typeof DashboardOutlinedIcon }> }> = [
  {
    group: 'MAIN',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: DashboardOutlinedIcon },
      { id: 'rooms', label: 'My Rooms', icon: MeetingRoomOutlinedIcon },
      { id: 'students', label: 'Students', icon: PeopleOutlinedIcon },
      { id: 'lists', label: 'Exam lists', icon: ListAltOutlinedIcon },
    ],
  },
  {
    group: 'EXAM',
    items: [
      { id: 'schedule', label: 'Exam Schedule', icon: CalendarMonthOutlinedIcon },
      { id: 'qr', label: 'QR Attendance', icon: QrCode2OutlinedIcon },
      { id: 'instructions', label: 'Exam Instructions', icon: MenuBookOutlinedIcon },
    ],
  },
  {
    group: 'ACCOUNT',
    items: [
      { id: 'profile', label: 'My Profile', icon: PersonOutlinedIcon },
      { id: 'help', label: 'Help', icon: HelpOutlineOutlinedIcon },
    ],
  },
];

function rwandaDateTime(date: string, time: string) {
  const t = (time || '00:00').length === 5 ? `${time}:00` : time || '00:00:00';
  return new Date(`${date}T${t}+02:00`);
}

function examPhase(room: InvigilatorDeskRoom, now = Date.now()): Phase {
  const start = rwandaDateTime(room.examDate, room.startTime).getTime();
  const end = rwandaDateTime(room.examDate, room.endTime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return room.examPhase ?? 'UPCOMING';
  if (now < start) return 'UPCOMING';
  if (now > end) return 'COMPLETED';
  return 'LIVE';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function attendanceOf(student: InvigilatorDeskStudent, phase: Phase): 'Present' | 'Absent' | 'Pending' | 'Late' {
  if (student.checkInAt) return student.status === 'LATE' ? 'Late' : 'Present';
  if (phase === 'COMPLETED') return 'Absent';
  return 'Pending';
}

function statusChip(label: ReturnType<typeof attendanceOf>) {
  if (label === 'Present') return { color: 'success' as const, text: 'Present' };
  if (label === 'Late') return { color: 'info' as const, text: 'Late' };
  if (label === 'Absent') return { color: 'error' as const, text: 'Absent' };
  return { color: 'warning' as const, text: 'Pending' };
}

function phaseMeta(phase: Phase) {
  if (phase === 'LIVE') return { label: 'LIVE', color: '#16a34a', bg: '#dcfce7' };
  if (phase === 'COMPLETED') return { label: 'COMPLETED', color: '#64748b', bg: '#f1f5f9' };
  return { label: 'UPCOMING', color: '#d97706', bg: '#fef3c7' };
}

function parseCode(raw: string) {
  return raw.trim();
}

function rwandaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kigali' }).format(new Date());
}

function slotLabel(code: string) {
  if (code === 'MORNING') return 'Morning';
  if (code === 'AFTERNOON') return 'Afternoon';
  if (code === 'EVENING') return 'Evening';
  return code.replace(/_/g, ' ');
}

function pickExamDate(dates: string[]) {
  if (!dates.length) return 'ALL';
  const today = rwandaToday();
  if (dates.includes(today)) return today;
  return dates.find((d) => d >= today) ?? dates[0];
}

function Stat({ value, label, tone = NAVY }: { value: string | number; label: string; tone?: string }) {
  return (
    <Box sx={{ p: 1.5, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2.5, minWidth: 0 }}>
      <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, color: tone, lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ mt: 0.6, fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Typography>
    </Box>
  );
}

export default function ExamInvigilatorDeskPage() {
  const { summary, deskOnly, user } = useAuth();
  const navigate = useNavigate();
  const iamUrl = import.meta.env.VITE_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
  const [manualCode, setManualCode] = useState('');
  const [section, setSection] = useState<Section>('dashboard');
  const [mobileNav, setMobileNav] = useState(false);
  const [rooms, setRooms] = useState<InvigilatorDeskRoom[]>([]);
  const [actorName, setActorName] = useState('');
  const [roomKey, setRoomKey] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [slotFilter, setSlotFilter] = useState('ALL');
  const [sessionFilter, setSessionFilter] = useState('ALL');
  const [dateReady, setDateReady] = useState(false);
  const [students, setStudents] = useState<InvigilatorDeskStudent[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [profile, setProfile] = useState<InvigilatorDeskStudent | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanMode, setScanMode] = useState<'attendance' | 'eligibility'>('attendance');
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
  const [lists, setLists] = useState<Array<{ room: InvigilatorDeskRoom; students: InvigilatorDeskStudent[]; allowed: number; blocked: number }>>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [listRoomKey, setListRoomKey] = useState('');
  const [listQuery, setListQuery] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScanRef = useRef('');

  const examDates = useMemo(() => [...new Set(rooms.map((r) => r.examDate))].sort(), [rooms]);
  const sessions = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach((r) => map.set(r.sessionId, r.sessionName));
    return [...map.entries()];
  }, [rooms]);
  const visibleRooms = useMemo(
    () => rooms.filter((r) =>
      (dateFilter === 'ALL' || r.examDate === dateFilter)
      && (slotFilter === 'ALL' || r.slotCode === slotFilter)
      && (sessionFilter === 'ALL' || r.sessionId === sessionFilter),
    ),
    [rooms, dateFilter, slotFilter, sessionFilter],
  );
  const sittings = useMemo(
    () => [...new Set(rooms
      .filter((r) => (dateFilter === 'ALL' || r.examDate === dateFilter) && (sessionFilter === 'ALL' || r.sessionId === sessionFilter))
      .map((r) => r.slotCode))],
    [rooms, dateFilter, sessionFilter],
  );
  const room = visibleRooms.find((r) => r.key === roomKey) ?? visibleRooms[0] ?? null;
  const phase = room ? examPhase(room, now) : 'UPCOMING';
  const firstName = (actorName || 'Invigilator').split(' ')[0];

  async function reloadDesk() {
    const data = await fetchInvigilatorDesk();
    setActorName(data.actor.name);
    setRooms(data.rooms);
    const dates = [...new Set(data.rooms.map((r) => r.examDate))].sort();
    if (!dateReady) {
      setDateFilter(pickExamDate(dates));
      setDateReady(true);
    }
  }

  async function reloadRoom(target = room) {
    if (!target) { setStudents([]); return; }
    const data = await fetchInvigilatorRoom({
      roomName: target.roomName,
      sessionId: target.sessionId,
      examDate: target.examDate,
      slotCode: target.slotCode,
    });
    setStudents(data.students);
  }

  useEffect(() => { reloadDesk().catch((e) => setError(examApiError(e))); }, []);
  useEffect(() => { if (room) reloadRoom(room).catch((e) => setError(examApiError(e))); }, [roomKey, room?.key]);
  useEffect(() => {
    if (slotFilter !== 'ALL' && sittings.length && !sittings.includes(slotFilter)) setSlotFilter('ALL');
  }, [sittings, slotFilter]);
  useEffect(() => {
    if (!visibleRooms.some((r) => r.key === roomKey)) setRoomKey(visibleRooms[0]?.key ?? '');
  }, [visibleRooms, roomKey]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!scanOpen) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
        if (!Detector || !videoRef.current) return;
        const detector = new Detector({ formats: ['qr_code'] });
        const loop = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue;
            if (value && lastScanRef.current !== value) {
              lastScanRef.current = value;
              await record(value);
              setTimeout(() => { if (lastScanRef.current === value) lastScanRef.current = ''; }, 2500);
            }
          } catch { /* keep scanning */ }
          if (!cancelled) requestAnimationFrame(() => { void loop(); });
        };
        void loop();
      } catch {
        if (!cancelled) {
          setError('Allow camera access to scan student smart cards.');
          toast.error('Allow camera access to scan student smart cards.');
        }
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [scanOpen, roomKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.fullName.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q));
  }, [students, query]);

  const counts = useMemo(() => {
    const present = students.filter((s) => attendanceOf(s, phase) === 'Present' || attendanceOf(s, phase) === 'Late').length;
    const absent = students.filter((s) => attendanceOf(s, phase) === 'Absent').length;
    const pending = students.filter((s) => attendanceOf(s, phase) === 'Pending').length;
    const allowed = students.filter((s) => s.examAllowed !== false).length;
    const blocked = students.filter((s) => s.examAllowed === false).length;
    return { assigned: students.length, present, absent, pending, allowed, blocked };
  }, [students, phase]);

  function showEligibility(result: ExamEligibilityCheck) {
    if (!result.published || result.status === 'NO_LIST') {
      setScanFeedback({
        kind: 'error',
        title: 'No published examination list',
        name: result.studentName,
        body: result.message || 'School Fees has not published an examination list yet.',
      });
      return;
    }
    if (result.allowed) {
      setScanFeedback({
        kind: 'ok',
        title: 'ALLOWED TO SIT EXAM',
        name: result.studentName,
        body: `${result.studentCode} · ${result.className || ''} · ${result.roomName || ''} · ${result.examName || result.subjectName || ''}`.trim(),
        extra: result.status === 'MANUALLY_ALLOWED'
          ? `Manually approved${result.reason ? ` · ${result.reason}` : ''}. ALLOWED TO ENTER.`
          : 'This student may enter the examination.',
      });
      return;
    }
    setScanFeedback({
      kind: 'blocked',
      title: 'NOT ALLOWED TO SIT EXAM',
      name: result.studentName,
      body: `${result.studentCode} · ${result.className || ''} · ${result.roomName || ''} · ${result.examName || result.subjectName || ''}`.trim(),
      extra: result.balance != null
        ? `Outstanding balance RWF ${Number(result.balance).toLocaleString()}. ${result.reason || 'Please contact the school office.'}`
        : result.message || 'Student is not allowed to enter this examination.',
    });
  }

  async function checkEligibility(raw: string) {
    if (!raw.trim()) return;
    setBusy(true); setError('');
    try {
      const result = await invigilatorDeskEligibility({
        studentCode: parseCode(raw),
        academicYear: room?.academicYear,
        term: room?.term,
      });
      showEligibility(result);
    } catch (e) {
      setScanFeedback({ kind: 'error', title: 'Could not check examination list', body: examApiError(e) });
    } finally { setBusy(false); }
  }

  async function openLists() {
    setSection('lists');
    setMobileNav(false);
    if (lists.length || listsLoading) return;
    setListsLoading(true);
    setError('');
    try {
      const data = await fetchInvigilatorLists();
      setLists(data.rooms);
      setListRoomKey(data.rooms[0]?.room.key ?? '');
    } catch (e) {
      setError(examApiError(e));
    } finally {
      setListsLoading(false);
    }
  }

  useEffect(() => {
    if (section === 'lists') void openLists();
  }, [section]);

  function showListStudent(student: InvigilatorDeskStudent, listRoom: InvigilatorDeskRoom) {
    const noList = student.examDecision === 'NO_LIST';
    showEligibility({
      studentCode: student.studentCode,
      published: !noList,
      allowed: student.examAllowed !== false,
      status: student.examDecision || (student.examAllowed === false ? 'NOT_ALLOWED' : 'ALLOWED'),
      studentName: student.fullName,
      className: student.className,
      examName: listRoom.subjectName || student.subjectName,
      roomName: student.roomName || listRoom.roomName,
      subjectName: listRoom.subjectName,
      academicYear: listRoom.academicYear,
      term: listRoom.term,
      financialStatus: student.financialStatus || undefined,
      balance: student.feeBalance ?? undefined,
      reason: student.exceptionReason,
      message: noList ? 'School Fees has not published an examination list for this class yet.' : undefined,
    });
  }

  async function record(raw: string) {
    if (scanMode === 'eligibility') {
      await checkEligibility(raw);
      return;
    }
    if (!room || !raw.trim() || phase !== 'LIVE') return;
    setBusy(true); setError('');
    try {
      const result = await invigilatorDeskEntry({
        roomName: room.roomName,
        sessionId: room.sessionId,
        examDate: room.examDate,
        slotCode: room.slotCode,
        studentCode: parseCode(raw),
        method: 'QR',
      });
      await reloadRoom(room);
      const att = result.attendance;
      const name = att?.fullName || students.find((s) => s.studentCode === parseCode(raw))?.fullName;
      if (result.already) {
        setScanFeedback({
          kind: 'already',
          title: 'Already recorded',
          body: `${name || 'This student'} is already present${att?.checkInAt ? ` · scanned ${new Date(att.checkInAt).toLocaleTimeString()}` : ''}.`,
          name,
        });
      } else {
        const elig = result.eligibility;
        setScanFeedback({
          kind: 'ok',
          title: 'EXAMINATION ELIGIBILITY CONFIRMED',
          body: `${name || 'Student'} · ${room.subjectName} · ${room.roomName}`,
          name,
          extra: elig?.status === 'MANUALLY_ALLOWED'
            ? `Financial status: balance remaining${elig.balance != null ? ` · RWF ${Number(elig.balance).toLocaleString()}` : ''}. Examination status: manually approved${elig.reason ? ` · ${elig.reason}` : ''}. ALLOWED TO SIT EXAM.`
            : 'ALLOWED TO SIT EXAM',
        });
      }
    } catch (e) {
      const details = examApiDetails(e);
      const msg = examApiError(e);
      if (details?.code === 'EXAM_NOT_ALLOWED' || /EXAMINATION ACCESS NOT AUTHORIZED/i.test(msg)) {
        setScanFeedback({
          kind: 'blocked',
          title: 'EXAMINATION ACCESS NOT AUTHORIZED',
          name: details?.studentName,
          body: `${details?.studentCode || ''} · ${details?.className || ''}`,
          extra: `Outstanding balance ${details?.balance != null ? `RWF ${Number(details.balance).toLocaleString()}` : ''}. Examination status: NOT ALLOWED. Please contact the school office.`,
        });
      } else {
        const wrong = /not assigned to this room/i.test(msg);
        setScanFeedback({
          kind: wrong ? 'wrong' : 'error',
          title: wrong ? 'Student not assigned to this room' : 'Could not record attendance',
          body: msg,
        });
      }
    } finally { setBusy(false); }
  }

  useEffect(() => {
    if (!scanFeedback || scanFeedback.kind === 'error' || scanFeedback.kind === 'wrong' || scanFeedback.kind === 'blocked') return;
    const t = setTimeout(() => setScanFeedback(null), 2800);
    return () => clearTimeout(t);
  }, [scanFeedback]);

  function openRoom(key: string) {
    setRoomKey(key);
    setSection('dashboard');
    setMobileNav(false);
  }

  function handleLogout() {
    clearToken();
    window.location.href = `${iamUrl}/login`;
  }

  const school = summary?.organizationName || 'School';
  const rate = counts.assigned ? Math.round((counts.present / counts.assigned) * 1000) / 10 : 0;
  const dateCaption = dateFilter === 'ALL'
    ? 'all examination days'
    : dateLabel(dateFilter, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  const examFilters = rooms.length ? (
    <Box sx={{ mb: 2, p: 1.5, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2.5 }}>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, mb: 1 }}>
        Examination day
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.25 }}>
        <Chip
          size="small"
          label="All days"
          color={dateFilter === 'ALL' ? 'warning' : 'default'}
          onClick={() => { setDateFilter('ALL'); setSlotFilter('ALL'); }}
          sx={{ fontWeight: 700 }}
        />
        {examDates.map((d) => (
          <Chip
            key={d}
            size="small"
            label={dateLabel(d, { weekday: 'short', day: 'numeric', month: 'short' })}
            color={dateFilter === d ? 'warning' : 'default'}
            onClick={() => { setDateFilter(d); setSlotFilter('ALL'); }}
            sx={{ fontWeight: 700 }}
          />
        ))}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {sessions.length > 1 ? (
          <FormControl size="small" sx={{ minWidth: 180, bgcolor: '#fff' }}>
            <InputLabel>Examination</InputLabel>
            <Select label="Examination" value={sessionFilter} onChange={(e) => { setSessionFilter(e.target.value); setSlotFilter('ALL'); }}>
              <MenuItem value="ALL">All examinations</MenuItem>
              {sessions.map(([id, name]) => <MenuItem key={id} value={id}>{name}</MenuItem>)}
            </Select>
          </FormControl>
        ) : null}
        <FormControl size="small" sx={{ minWidth: 160, bgcolor: '#fff' }}>
          <InputLabel>Sitting</InputLabel>
          <Select label="Sitting" value={slotFilter} onChange={(e) => setSlotFilter(e.target.value)}>
            <MenuItem value="ALL">All sittings</MenuItem>
            {sittings.map((code) => <MenuItem key={code} value={code}>{slotLabel(code)}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>
      <Typography sx={{ mt: 1, fontSize: '0.78rem', color: '#64748b' }}>
        Showing rooms you must invigilate on {dateCaption}
        {slotFilter !== 'ALL' ? ` · ${slotLabel(slotFilter)}` : ''}
        {` · ${visibleRooms.length} room${visibleRooms.length === 1 ? '' : 's'}`}.
      </Typography>
    </Box>
  ) : null;

  const sidebar = (
    <Box sx={{
      width: SIDEBAR_W,
      minWidth: SIDEBAR_W,
      height: '100%',
      bgcolor: NAVY,
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Box sx={{ px: 2, py: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', letterSpacing: 0.6 }}>INVIGILATOR DESK</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', mt: 0.3 }}>{school}</Typography>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', py: 1.5 }}>
        {NAV.map((group) => (
          <Box key={group.group} sx={{ mb: 1.5 }}>
            <Typography sx={{ px: 2, mb: 0.5, fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: 'rgba(255,255,255,0.4)' }}>{group.group}</Typography>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <Box
                  key={item.id}
                  onClick={() => { if (item.id === 'lists') void openLists(); else { setSection(item.id); setMobileNav(false); } }}
                  sx={{
                    mx: 1,
                    px: 1.25,
                    py: 0.85,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    bgcolor: active ? 'rgba(252,176,56,0.18)' : 'transparent',
                    color: active ? AMBER : 'rgba(255,255,255,0.82)',
                    '&:hover': { bgcolor: active ? 'rgba(252,176,56,0.18)' : 'rgba(255,255,255,0.06)' },
                  }}
                >
                  <Icon sx={{ fontSize: 18 }} />
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: active ? 800 : 600 }}>{item.label}</Typography>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
      <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {!deskOnly ? (
          <Button fullWidth startIcon={<ArrowBackOutlinedIcon />} onClick={() => navigate('/dashboard')} sx={{ mb: 1, textTransform: 'none', color: 'rgba(255,255,255,0.85)', justifyContent: 'flex-start' }}>
            Academic home
          </Button>
        ) : null}
        <Box sx={{ px: 1, py: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', mb: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.82rem' }}>{firstName}</Typography>
          <Typography sx={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)' }}>Invigilator</Typography>
        </Box>
        <Button fullWidth startIcon={<LogoutOutlinedIcon />} onClick={handleLogout} sx={{ textTransform: 'none', color: NAVY, bgcolor: AMBER, fontWeight: 800, '&:hover': { bgcolor: '#fdd067' } }}>
          Sign out
        </Button>
      </Box>
    </Box>
  );

  const roomCard = (r: InvigilatorDeskRoom) => {
    const p = examPhase(r, now);
    const meta = phaseMeta(p);
    const selected = room?.key === r.key;
    return (
      <Box
        key={r.key}
        onClick={() => openRoom(r.key)}
        sx={{
          p: 1.4,
          bgcolor: '#fff',
          borderRadius: 2,
          border: selected ? `2px solid ${AMBER}` : '1px solid #e2e8f0',
          cursor: 'pointer',
          minHeight: 148,
          display: 'flex',
          flexDirection: 'column',
          '&:hover': { boxShadow: '0 8px 20px rgba(0,4,53,0.08)', transform: 'translateY(-1px)' },
          transition: 'all 0.15s ease',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.82rem' }}>{r.roomName.toUpperCase()}</Typography>
          <Box sx={{ px: 0.8, py: 0.15, borderRadius: 99, bgcolor: meta.bg, color: meta.color, fontSize: '0.62rem', fontWeight: 800 }}>{meta.label}</Box>
        </Box>
        <Typography sx={{ fontWeight: 800, mt: 0.7, fontSize: '0.95rem' }}>{r.subjectName || r.sessionName}</Typography>
        <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{r.classNames.join(', ') || '—'}</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', mt: 0.6 }}>{dateLabel(r.examDate)}</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{r.startTime} – {r.endTime}</Typography>
        <Box sx={{ mt: 'auto', pt: 0.8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>{r.studentCount} students</Typography>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: NAVY }}>Open →</Typography>
        </Box>
      </Box>
    );
  };

  const studentTable = (
    <Box sx={{ bgcolor: '#fff', borderRadius: 2.5, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '52px 1.6fr 1fr 0.8fr 130px 120px 70px', px: 2, py: 1, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        {['#', 'Student', 'Student code', 'Class', 'Exam list', 'Attendance', ''].map((h) => (
          <Typography key={h} sx={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{h}</Typography>
        ))}
      </Box>
      {filtered.length ? filtered.map((s, i) => {
        const label = attendanceOf(s, phase);
        const chip = statusChip(label);
        return (
          <Box
            key={s.studentId}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr auto', md: '52px 1.6fr 1fr 0.8fr 130px 120px 70px' },
              px: 2,
              py: 1,
              borderBottom: '1px solid #f1f5f9',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: i % 2 ? '#fafbfc' : '#fff',
            }}
          >
            <Typography sx={{ fontWeight: 700, color: NAVY, display: { xs: 'none', md: 'block' } }}>{String(i + 1).padStart(2, '0')}</Typography>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{s.fullName}</Typography>
              <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', display: { md: 'none' } }}>{s.studentCode} · {s.className}</Typography>
            </Box>
            <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.85rem' }}>{s.studentCode}</Typography>
            <Typography sx={{ display: { xs: 'none', md: 'block' } }}>{s.className}</Typography>
            <Chip
              size="small"
              color={s.examAllowed === false ? 'error' : s.examDecision === 'MANUALLY_ALLOWED' ? 'warning' : 'success'}
              label={s.examAllowed === false ? 'Not allowed' : s.examDecision === 'MANUALLY_ALLOWED' ? 'Manual' : 'Allowed'}
              sx={{ display: { xs: 'none', md: 'inline-flex' } }}
            />
            <Chip size="small" color={chip.color} label={chip.text} />
            <Button size="small" onClick={() => setProfile(s)} sx={{ textTransform: 'none', fontWeight: 700 }}>View</Button>
          </Box>
        );
      }) : (
        <Typography sx={{ p: 2, color: '#94a3b8' }}>No students in this room yet. Generate seating first.</Typography>
      )}
    </Box>
  );

  const selectedRoomPanel = room ? (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2.5, border: '1px solid #e2e8f0', mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.15rem' }}>{room.roomName}</Typography>
            <Typography sx={{ fontWeight: 700 }}>{room.subjectName || room.sessionName} · {room.classNames.join(', ')}</Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>{dateLabel(room.examDate)} · {room.startTime}–{room.endTime}</Typography>
          </Box>
          <Chip size="small" label={phase === 'LIVE' ? 'Exam in progress' : phase === 'COMPLETED' ? 'Exam ended' : 'Exam not started'} color={phase === 'LIVE' ? 'success' : phase === 'COMPLETED' ? 'default' : 'warning'} />
        </Box>
        <Box sx={{ mt: 1.75, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1 }}>
          {[
            ['Course', room.subjectName || room.sessionName],
            ['Class', room.classNames.join(', ') || '—'],
            ['Room', room.roomName],
            ['Date', dateLabel(room.examDate)],
            ['Time', `${room.startTime} – ${room.endTime}`],
            ['Exam status', phase === 'LIVE' ? 'IN PROGRESS' : phase === 'COMPLETED' ? 'COMPLETED' : 'NOT STARTED'],
          ].map(([k, v]) => (
            <Box key={k}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{k}</Typography>
              <Typography sx={{ fontWeight: 700, color: NAVY }}>{v}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 1.25, mt: 1.5 }}>
          <Stat value={counts.assigned} label="Students" />
          <Stat value={counts.allowed} label="Allowed" tone="#16a34a" />
          <Stat value={counts.blocked} label="Not allowed" tone="#dc2626" />
          <Stat value={counts.present} label="Present" tone="#16a34a" />
          <Stat value={`${rate}%`} label="Attendance" />
        </Box>
        <LinearProgress variant="determinate" value={counts.assigned ? (counts.present / counts.assigned) * 100 : 0} sx={{ mt: 1.5, height: 8, borderRadius: 99, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#16a34a' } }} />
        <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mt: 0.6 }}>{counts.present} / {counts.assigned} present{counts.pending ? ` · ${counts.pending} pending` : ''}</Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search student or code"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{ startAdornment: <SearchOutlinedIcon sx={{ mr: 1, color: '#94a3b8', fontSize: 18 }} /> }}
          sx={{ flex: 1, minWidth: 220, bgcolor: '#fff' }}
        />
        <Button
          variant="contained"
          disabled={phase !== 'LIVE' || busy}
          startIcon={<QrCode2OutlinedIcon />}
          onClick={() => { if (phase === 'LIVE') setScanOpen(true); }}
          sx={{ textTransform: 'none', fontWeight: 800, bgcolor: phase === 'LIVE' ? AMBER : '#cbd5e1', color: NAVY, '&:hover': { bgcolor: '#fdd067' } }}
        >
          Scan QR
        </Button>
      </Box>
      {phase !== 'LIVE' ? (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          {phase === 'UPCOMING'
            ? `Scanner unavailable. Attendance opens when the exam starts at ${room.startTime}.`
            : 'QR attendance is closed. This examination has ended. Unscanned students are marked absent.'}
        </Alert>
      ) : (
        <Alert severity="success" sx={{ mb: 1.5 }}>Exam in progress · scan the Super Admin student smart card to mark present.</Alert>
      )}
      {studentTable}
    </Box>
  ) : null;

  const workspace = (
    <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 2.5 } }}>
      {error ? <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert> : null}

      {(section === 'dashboard' || section === 'rooms') && (
        <>
          {section === 'dashboard' ? (
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>{greeting()}, {firstName}</Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.88rem' }}>Here is your examination supervision schedule.</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.25, mt: 1.75 }}>
                <Stat value={visibleRooms.length} label="My rooms" />
                <Stat value={counts.assigned} label="Selected room students" />
                <Stat value={counts.present} label="Present" tone="#16a34a" />
                <Stat value={counts.absent} label="Absent" tone="#dc2626" />
              </Box>
              <Box sx={{ mt: 2, p: 2, bgcolor: '#fff', borderRadius: 2.5, border: '1px solid #e2e8f0', maxWidth: 560 }}>
                <Typography sx={{ fontWeight: 800, color: NAVY }}>Scan smart card — exam list</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.82rem', mt: 0.5, mb: 1.25 }}>
                  Scan the Super Admin student QR, or open Manual to see only students seated in your allocated rooms with the published examination list.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={<QrCode2OutlinedIcon />}
                    onClick={() => { setScanMode('eligibility'); setScanOpen(true); }}
                    sx={{ textTransform: 'none', fontWeight: 800, bgcolor: AMBER, color: NAVY }}
                  >
                    Scan student QR
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ListAltOutlinedIcon />}
                    onClick={() => { void openLists(); }}
                    sx={{ textTransform: 'none', fontWeight: 800, borderColor: NAVY, color: NAVY }}
                  >
                    Manual
                  </Button>
                </Box>
              </Box>
            </Box>
          ) : (
            <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.2rem', mb: 1.5 }}>My examination rooms</Typography>
          )}
          {examFilters}
          {!rooms.length ? (
            <Alert severity="info">No examination rooms are assigned to you yet.</Alert>
          ) : !visibleRooms.length ? (
            <Alert severity="info">No rooms assigned to you on {dateCaption}. Choose another examination day to see the rooms you must invigilate.</Alert>
          ) : (
            <>
              <Typography sx={{ fontWeight: 800, color: NAVY, mb: 1 }}>My examination rooms</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 1.25, mb: 2.5 }}>
                {visibleRooms.map(roomCard)}
              </Box>
              {selectedRoomPanel}
            </>
          )}
        </>
      )}

      {section === 'lists' && (
        <Box>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.2rem', mb: 0.5 }}>Manual — allocated room lists</Typography>
          <Typography sx={{ color: '#64748b', mb: 2, fontSize: '0.85rem' }}>
            Only students seated in rooms assigned to you. Allowed / Not Allowed comes from the published School Fees examination list.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<QrCode2OutlinedIcon />}
              onClick={() => { setScanMode('eligibility'); setScanOpen(true); }}
              sx={{ textTransform: 'none', fontWeight: 800, bgcolor: AMBER, color: NAVY }}
            >
              Scan student QR
            </Button>
            <TextField
              size="small"
              placeholder="Search student or code"
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              InputProps={{ startAdornment: <SearchOutlinedIcon sx={{ mr: 1, color: '#94a3b8', fontSize: 18 }} /> }}
              sx={{ flex: 1, minWidth: 220, bgcolor: '#fff' }}
            />
          </Box>
          {listsLoading ? (
            <Alert severity="info">Loading your allocated examination lists…</Alert>
          ) : !lists.length ? (
            <Alert severity="info">No allocated rooms with seating yet.</Alert>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {lists.map((row) => (
                  <Chip
                    key={row.room.key}
                    label={`${row.room.roomName} · ${row.students.length} · ${row.blocked} blocked`}
                    color={row.room.key === (lists.find((r) => r.room.key === listRoomKey)?.room.key ?? lists[0]?.room.key) ? 'warning' : 'default'}
                    onClick={() => setListRoomKey(row.room.key)}
                  />
                ))}
              </Box>
              {(() => {
                const selected = lists.find((row) => row.room.key === listRoomKey) ?? lists[0];
                if (!selected) return null;
                const q = listQuery.trim().toLowerCase();
                const rows = q
                  ? selected.students.filter((s) => s.fullName.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q) || s.className.toLowerCase().includes(q))
                  : selected.students;
                return (
                  <Box>
                    <Typography sx={{ fontWeight: 800, color: NAVY, mb: 0.5 }}>
                      {selected.room.roomName} · {selected.room.subjectName}
                    </Typography>
                    <Typography sx={{ color: '#64748b', fontSize: '0.8rem', mb: 1.5 }}>
                      {selected.room.classNames.join(', ')} · {dateLabel(selected.room.examDate)} · {selected.room.startTime}–{selected.room.endTime} · {selected.allowed} allowed · {selected.blocked} not allowed
                    </Typography>
                    <Box sx={{ bgcolor: '#fff', borderRadius: 2.5, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      {rows.length ? rows.map((s) => (
                        <Box
                          key={s.studentId}
                          onClick={() => showListStudent(s, selected.room)}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 1,
                            px: 2,
                            py: 1.25,
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: '#f8fafc' },
                          }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>{s.fullName}</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.studentCode} · {s.className} · Seat {s.seatCode || '—'}</Typography>
                          </Box>
                          <Chip
                            size="small"
                            color={s.examAllowed === false ? 'error' : s.examDecision === 'MANUALLY_ALLOWED' ? 'warning' : s.examDecision === 'NO_LIST' ? 'warning' : 'success'}
                            label={s.examAllowed === false ? 'Not allowed' : s.examDecision === 'MANUALLY_ALLOWED' ? 'Manually approved' : s.examDecision === 'NO_LIST' ? 'No list' : 'Allowed'}
                          />
                        </Box>
                      )) : (
                        <Typography sx={{ p: 2, color: '#94a3b8' }}>No students in this allocated room match the search.</Typography>
                      )}
                    </Box>
                  </Box>
                );
              })()}
            </>
          )}
        </Box>
      )}

      {section === 'students' && (
        <>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.2rem', mb: 0.5 }}>Students</Typography>
          <Typography sx={{ color: '#64748b', mb: 2, fontSize: '0.85rem' }}>{room ? `${room.roomName} · ${room.subjectName}` : 'Select a room'} · {counts.assigned} assigned · {counts.present} present · {counts.absent} absent</Typography>
          {examFilters}
          {visibleRooms.length ? (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {visibleRooms.map((r) => (
                <Chip key={r.key} label={r.roomName} color={r.key === room?.key ? 'warning' : 'default'} onClick={() => setRoomKey(r.key)} />
              ))}
            </Box>
          ) : rooms.length ? (
            <Alert severity="info" sx={{ mb: 2 }}>No rooms assigned to you on {dateCaption}.</Alert>
          ) : null}
          {selectedRoomPanel}
        </>
      )}

      {section === 'qr' && (
        <Box>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.2rem', mb: 1 }}>QR attendance</Typography>
          <Typography sx={{ color: '#64748b', mb: 2, fontSize: '0.85rem' }}>Examination presence from the Super Admin student smart card. This is not gate entry or exit.</Typography>
          {examFilters}
          {room ? (
            <Box sx={{ p: 2.5, bgcolor: '#fff', borderRadius: 2.5, border: '1px solid #e2e8f0', maxWidth: 520 }}>
              <Typography sx={{ fontWeight: 800 }}>{room.subjectName} · {room.roomName}</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mb: 1.5 }}>{dateLabel(room.examDate)} · {room.startTime}–{room.endTime}</Typography>
              <Chip size="small" label={phase === 'LIVE' ? 'Exam in progress' : phase === 'COMPLETED' ? 'Closed' : 'Locked'} color={phase === 'LIVE' ? 'success' : 'default'} sx={{ mb: 1.5 }} />
              <Typography sx={{ fontWeight: 800, mb: 1 }}>{counts.present} / {counts.assigned} present</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<QrCode2OutlinedIcon />}
                  onClick={() => { setScanMode('eligibility'); setScanOpen(true); }}
                  sx={{ textTransform: 'none', fontWeight: 800, borderColor: NAVY, color: NAVY }}
                >
                  Check exam list
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ListAltOutlinedIcon />}
                  onClick={() => { void openLists(); }}
                  sx={{ textTransform: 'none', fontWeight: 800, borderColor: NAVY, color: NAVY }}
                >
                  Manual
                </Button>
                {phase === 'LIVE' ? (
                  <Button variant="contained" startIcon={<QrCode2OutlinedIcon />} onClick={() => { setScanMode('attendance'); setScanOpen(true); }} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: AMBER, color: NAVY }}>
                    Mark present
                  </Button>
                ) : (
                  <Alert severity="info" sx={{ flex: 1 }}>
                    {phase === 'UPCOMING' ? `Attendance scanner opens at ${room.startTime}. You can still check the exam list now.` : 'Attendance closed. You can still check the exam list.'}
                  </Alert>
                )}
              </Box>
            </Box>
          ) : <Alert severity="info">No room assigned.</Alert>}
        </Box>
      )}

      {section === 'schedule' && (
        <Box>
          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1.2rem', mb: 1.5 }}>Exam schedule</Typography>
          {examFilters}
          {visibleRooms.length ? visibleRooms.map((r) => {
            const p = examPhase(r, now);
            return (
              <Box key={r.key} sx={{ p: 1.5, mb: 1, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>{r.roomName} · {r.subjectName}</Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>{r.classNames.join(', ')} · {dateLabel(r.examDate)} · {r.startTime}–{r.endTime}</Typography>
                </Box>
                <Chip size="small" label={phaseMeta(p).label} />
              </Box>
            );
          }) : (
            <Alert severity="info">No rooms assigned to you on {dateCaption}.</Alert>
          )}
        </Box>
      )}

      {section === 'instructions' && (
        <Box sx={{ maxWidth: 640, bgcolor: '#fff', p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, mb: 1 }}>Exam instructions</Typography>
          <Typography sx={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.7 }}>
            Open your assigned room, wait until the exam starts, then scan each student’s Super Admin smart-card QR.
            That records examination presence only — not school gate entry or exit.
            Students assigned to another room cannot be marked present here.
            Fee eligibility comes from the published School Fees examination list. You cannot override an unpaid student from this desk.
            After the exam ends, anyone not scanned is absent.
          </Typography>
        </Box>
      )}

      {section === 'profile' && (
        <Box sx={{ maxWidth: 420, bgcolor: '#fff', p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, mb: 1 }}>My profile</Typography>
          <Typography><strong>Name</strong> · {actorName || 'Invigilator'}</Typography>
          <Typography sx={{ mt: 0.5 }}><strong>Email</strong> · {user?.email || '—'}</Typography>
          <Typography sx={{ mt: 0.5 }}><strong>Role</strong> · Invigilator</Typography>
          <Typography sx={{ mt: 0.5 }}><strong>School</strong> · {school}</Typography>
        </Box>
      )}

      {section === 'help' && (
        <Box sx={{ maxWidth: 640, bgcolor: '#fff', p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
          <Typography sx={{ fontWeight: 800, color: NAVY, mb: 1 }}>Help</Typography>
          <Typography sx={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.7 }}>
            Dashboard shows your rooms and the selected room’s students.
            Scan student QR checks only students seated in your allocated rooms against the published examination list.
            Manual opens the student lists for those rooms. Scan QR for attendance is locked until the exam start time.
            Use View on a student row to open their profile on the right.
            Sign out from the bottom of the sidebar when you finish.
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: deskOnly ? '100vh' : '100%', minHeight: deskOnly ? '100vh' : 640, bgcolor: '#eef2f7' }}>
      <Box sx={{ display: { xs: 'none', md: 'block' }, height: '100%' }}>{sidebar}</Box>
      <Drawer open={mobileNav} onClose={() => setMobileNav(false)} PaperProps={{ sx: { bgcolor: NAVY } }}>
        {sidebar}
      </Drawer>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, px: 1.5, py: 1, bgcolor: NAVY, color: '#fff' }}>
          <IconButton onClick={() => setMobileNav(true)} sx={{ color: '#fff' }}><MenuOutlinedIcon /></IconButton>
          <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Invigilator desk</Typography>
        </Box>
        {workspace}
      </Box>

      <Drawer anchor="right" open={Boolean(profile)} onClose={() => setProfile(null)} PaperProps={{ sx: { width: { xs: '100%', sm: 360 } } }}>
        {profile ? (
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontWeight: 800, color: NAVY }}>Student profile</Typography>
              <IconButton onClick={() => setProfile(null)}><CloseOutlinedIcon /></IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
              <Avatar src={profile.photoUrl || undefined} sx={{ width: 96, height: 96, mb: 1.5, bgcolor: '#e2e8f0', color: NAVY, fontWeight: 800 }}>
                {profile.fullName.slice(0, 1)}
              </Avatar>
              <Typography sx={{ fontWeight: 800, textAlign: 'center' }}>{profile.fullName}</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>Student code: {profile.studentCode}</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.85rem', color: '#475569' }}>{profile.className}</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: '#475569' }}>{profile.roomName} · {profile.subjectName}</Typography>
            <Box sx={{ my: 2, height: 1, bgcolor: '#e2e8f0' }} />
            <Typography sx={{ fontWeight: 800, mb: 1 }}>Examination attendance</Typography>
            <Chip size="small" color={statusChip(attendanceOf(profile, phase)).color} label={statusChip(attendanceOf(profile, phase)).text} />
            <Typography sx={{ mt: 1.5, fontWeight: 800 }}>Examination eligibility</Typography>
            <Chip
              size="small"
              sx={{ mt: 0.75 }}
              color={profile.examAllowed === false ? 'error' : profile.examDecision === 'MANUALLY_ALLOWED' ? 'warning' : 'success'}
              label={profile.examAllowed === false ? 'NOT ALLOWED' : profile.examDecision === 'MANUALLY_ALLOWED' ? 'MANUALLY APPROVED' : 'ALLOWED TO SIT EXAM'}
            />
            {profile.financialStatus === 'NOT_CLEARED' ? (
              <Typography sx={{ mt: 1, fontSize: '0.85rem' }}>
                Financial status: balance remaining{profile.feeBalance != null ? ` · RWF ${Number(profile.feeBalance).toLocaleString()}` : ''}
              </Typography>
            ) : null}
            {profile.exceptionReason ? (
              <Typography sx={{ mt: 0.5, fontSize: '0.85rem' }}>Reason: {profile.exceptionReason}</Typography>
            ) : null}
            <Typography sx={{ mt: 1.25, fontSize: '0.85rem' }}><strong>Scanned</strong> · {profile.checkInAt ? new Date(profile.checkInAt).toLocaleTimeString() : '—'}</Typography>
            <Typography sx={{ mt: 0.5, fontSize: '0.85rem' }}><strong>Method</strong> · {profile.method === 'QR' ? 'QR smart card' : profile.method || '—'}</Typography>
            <Button fullWidth sx={{ mt: 3, textTransform: 'none' }} onClick={() => setProfile(null)}>Close</Button>
          </Box>
        ) : null}
      </Drawer>

      <Dialog open={scanOpen} onClose={() => setScanOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {scanMode === 'eligibility' ? 'Check examination list' : 'Scan student smart card'}
          <IconButton onClick={() => setScanOpen(false)}><CloseOutlinedIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 12, background: '#000', minHeight: 220 }} />
          <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mt: 1.5, textAlign: 'center' }}>
            {scanMode === 'eligibility'
              ? 'Scan the Super Admin student smart card. Only students seated in your allocated rooms are checked against the published School Fees list.'
              : `Scan the Super Admin student smart card. Only students assigned to ${room?.roomName || 'this room'} are accepted.`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Or enter student code"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualCode.trim()) {
                  void record(manualCode);
                  setManualCode('');
                }
              }}
            />
            <Button
              disabled={busy || !manualCode.trim()}
              onClick={() => { void record(manualCode); setManualCode(''); }}
              sx={{ textTransform: 'none', fontWeight: 800, whiteSpace: 'nowrap' }}
            >
              Record
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(scanFeedback)} onClose={() => setScanFeedback(null)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 3 }}>
          <Typography sx={{ fontSize: '1.6rem', mb: 1 }}>{scanFeedback?.kind === 'ok' ? '✓' : scanFeedback?.kind === 'already' ? 'ℹ' : '⚠'}</Typography>
          <Typography sx={{ fontWeight: 800, color: scanFeedback?.kind === 'blocked' ? '#b91c1c' : NAVY, mb: 1 }}>{scanFeedback?.title}</Typography>
          {scanFeedback?.name ? <Typography sx={{ fontWeight: 700 }}>{scanFeedback.name}</Typography> : null}
          <Typography sx={{ color: '#64748b', fontSize: '0.85rem', mt: 0.5 }}>{scanFeedback?.body}</Typography>
          {scanFeedback?.extra ? <Typography sx={{ color: '#334155', fontSize: '0.85rem', mt: 1.25, fontWeight: 600 }}>{scanFeedback.extra}</Typography> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScanFeedback(null)} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
