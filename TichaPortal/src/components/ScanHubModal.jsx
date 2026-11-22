import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import ReplayIcon from '@mui/icons-material/Replay';
import BottomSheet from './BottomSheet';
import ConductMarksModal from './ConductMarksModal';
import { useTpToast } from './TpToast';
import useTpAcademic from '../hooks/useTpAcademic';
import api from '../services/api';
import {
  fetchLessonAttendance,
  fetchTeacherToday,
  saveLessonAttendance,
  startLesson,
  tpAcademicParams,
} from '../services/teacherPortalApi';
import { startFastQrScanner } from '../utils/classRoomQrScanner';
import { isClassQr, parseClassQr, parseStudentCode } from '../utils/scanParse';
import { classLabelsMatch } from '../utils/classMatch';
import { resolveStudentPhotoUrl } from '../utils/studentDisplay';
import { brand } from '../theme/theme';

const SCANNER_ID = 'scan-hub-reader';

const norm = (v) => String(v ?? '').trim().toLowerCase();
const studentClass = (s) => s?.class_name || s?.className || s?.grade || s?.class || '';
const initialsOf = (name) =>
  String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

function toStatus(v) {
  const s = String(v || 'PRESENT').toUpperCase();
  return s === 'PERMISSION' ? 'EXCUSED' : s;
}

const actionBtnSx = {
  justifyContent: 'flex-start',
  gap: 1.5,
  px: 2,
  py: 1.5,
  borderRadius: 0,
  textTransform: 'none',
  fontWeight: 700,
  fontSize: 14,
  color: brand.navy,
  '& .MuiSvgIcon-root': { color: brand.navy, fontSize: 22 },
};

/**
 * Universal scanner: student card → identity / attendance / conduct marks;
 * class QR → enter / exit / view students. Uses only existing backend endpoints.
 */
export default function ScanHubModal({ open, onClose }) {
  const toast = useTpToast();
  const navigate = useNavigate();
  const { term, academicYear } = useTpAcademic();

  const sessionRef = useRef(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const rosterCache = useRef(new Map()); // class name -> students[]

  const [stage, setStage] = useState('scan'); // scan | student | class | unknown
  const [raw, setRaw] = useState('');
  const [student, setStudent] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [working, setWorking] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [conductOpen, setConductOpen] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const stopCamera = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    try {
      await session?.stop?.();
    } catch {
      /* stream may already be stopped */
    }
    if (mountedRef.current) {
      setCameraOn(false);
      setCameraStarting(false);
    }
  }, []);

  /* ---------- student lookup (existing endpoints) ---------- */
  const findStudent = useCallback(async (code) => {
    const match = (s) => [s.student_code, s.id, s.row_id, s.student_id, s.adm].some((v) => v && norm(v) === norm(code));

    // 1. Direct lookup (works if the backend honours a code filter)
    try {
      const res = await api.get('/teacher-portal/students', {
        params: { scope: 'school', student_code: code, search: code },
      });
      const hit = (res.data?.data || []).find(match);
      if (hit) return hit;
    } catch {
      /* fall through to roster search */
    }

    // 2. Search class rosters (same calls Students / Attendance already make)
    const clsRes = await api.get('/teacher-portal/classes', { params: { scope: 'school' } }).catch(() => null);
    const classes = Array.isArray(clsRes?.data?.data) ? clsRes.data.data : [];
    for (let i = 0; i < classes.length; i += 4) {
      const batch = classes.slice(i, i + 4);
      const lists = await Promise.all(
        batch.map(async (cn) => {
          if (rosterCache.current.has(cn)) return [cn, rosterCache.current.get(cn)];
          const r = await api
            .get('/teacher-portal/students', { params: { scope: 'attendance', class_name: cn, className: cn } })
            .catch(() => null);
          const list = Array.isArray(r?.data?.data) ? r.data.data : [];
          rosterCache.current.set(cn, list);
          return [cn, list];
        })
      );
      for (const [cn, list] of lists) {
        const hit = list.find(match);
        if (hit) return { ...hit, class_name: studentClass(hit) || cn };
      }
    }
    return null;
  }, []);

  /* ---------- handle a decoded scan ---------- */
  const handleDecoded = useCallback(
    async (decoded) => {
      if (busyRef.current) return;
      busyRef.current = true;
      void navigator.vibrate?.(60);
      const text = String(decoded || '').trim();
      await stopCamera();
      if (!mountedRef.current) return;
      setRaw(text);

      if (isClassQr(text)) {
        setStage('class');
        busyRef.current = false;
        return;
      }

      setWorking(true);
      try {
        const found = await findStudent(parseStudentCode(text));
        if (!mountedRef.current) return;
        setStudent(found);
        setStage(found ? 'student' : 'unknown');
      } finally {
        if (mountedRef.current) setWorking(false);
        busyRef.current = false;
      }
    },
    [findStudent, stopCamera]
  );
  const handleDecodedRef = useRef(handleDecoded);
  handleDecodedRef.current = handleDecoded;

  const startCamera = useCallback(async () => {
    if (sessionRef.current) return;
    setCameraStarting(true);
    try {
      const container = document.getElementById(SCANNER_ID);
      if (!container) throw new Error('Scanner mount missing');
      const session = await startFastQrScanner({
        container,
        onDecode: (d) => void handleDecodedRef.current(d),
      });
      if (!mountedRef.current) {
        await session.stop?.();
        return;
      }
      sessionRef.current = session;
      setCameraOn(true);
    } catch {
      sessionRef.current = null;
      if (mountedRef.current) {
        setCameraOn(false);
        toast.error('Camera unavailable. Allow camera access for this site, then tap Retry.');
      }
    } finally {
      if (mountedRef.current) setCameraStarting(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open || stage !== 'scan') {
      void stopCamera();
      return undefined;
    }
    const t = setTimeout(() => void startCamera(), 200);
    return () => clearTimeout(t);
  }, [open, stage, startCamera, stopCamera]);

  useEffect(() => {
    if (!open) {
      setStage('scan');
      setRaw('');
      setStudent(null);
      setConductOpen(false);
      busyRef.current = false;
    }
  }, [open]);

  const scanAgain = () => {
    setStudent(null);
    setRaw('');
    busyRef.current = false;
    setStage('scan');
  };

  const handleCapture = async () => {
    const session = sessionRef.current;
    if (!session?.snapScan || snapping) return;
    setSnapping(true);
    try {
      const v = await session.snapScan();
      if (!v) toast.error('Could not read the code. Hold the card closer and try again.');
    } catch {
      toast.error('Could not read the code. Hold the card closer and try again.');
    } finally {
      if (mountedRef.current) setSnapping(false);
    }
  };

  /* ---------- class actions ---------- */
  const classScan = async () => {
    setWorking(true);
    try {
      const res = await api.post('/teacher-portal/class-room/scan', { qr_token: parseClassQr(raw) });
      if (!res.data?.success) {
        toast.error(res.data?.message || 'Scan was not accepted.', 8000);
        return;
      }
      toast.success(res.data.message || 'Recorded for this period.', 6000);
      onClose?.();
    } catch (e) {
      const body = e.response?.data;
      toast.error(body?.message || body?.data?.message || 'Scan failed. Try again.', 8000);
    } finally {
      if (mountedRef.current) setWorking(false);
    }
  };

  const viewStudents = () => {
    onClose?.();
    navigate('/students');
  };

  /* ---------- student actions ---------- */
  const markAttendance = async (status) => {
    if (!student) return;
    setWorking(true);
    try {
      const cls = studentClass(student);
      const today = await fetchTeacherToday(tpAcademicParams(term, academicYear));
      const lessons = Array.isArray(today?.lessons) ? today.lessons : [];
      const current = today?.current ? [today.current] : [];
      const lesson = [...current, ...lessons.filter((l) => l.phase === 'current')].find((l) =>
        classLabelsMatch(l.className || l.class, cls)
      );
      if (!lesson) {
        toast.error(
          `No lesson in progress for ${cls || 'this student’s class'}. Use Period attendance instead.`,
          7000
        );
        return;
      }
      let sessionId = lesson.sessionId;
      if (!sessionId) {
        const started = await startLesson({ timetableId: lesson.timetableId || lesson.id, skipQr: true });
        sessionId = started?.id || started?.sessionId;
      }
      if (!sessionId) throw new Error('No lesson session');

      // Keep the rest of the register intact: load it, change one row, save without submitting.
      const saved = await fetchLessonAttendance(sessionId);
      const code = student.student_code || student.id;
      const rows = (saved?.rows || []).map((r) => ({
        studentCode: r.studentCode || r.id,
        fullName: r.fullName,
        gender: r.gender,
        className: r.className || cls,
        status: toStatus(r.status),
        notes: r.notes || r.reason || '',
      }));
      const idx = rows.findIndex((r) => norm(r.studentCode) === norm(code));
      const row = {
        studentCode: code,
        fullName: student.name,
        gender: student.gender || '-',
        className: cls,
        status,
        notes: 'Marked by card scan',
      };
      if (idx >= 0) rows[idx] = { ...rows[idx], status, notes: rows[idx].notes || row.notes };
      else rows.push(row);
      await saveLessonAttendance(sessionId, rows, false);
      toast.success(`${student.name} marked ${status === 'LATE' ? 'late' : 'present'}.`);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not mark attendance. Try Period attendance.', 7000);
    } finally {
      if (mountedRef.current) setWorking(false);
    }
  };

  /* ---------- UI ---------- */
  const titles = {
    scan: ['Scan', 'Student card or class code'],
    student: ['Student card', student?.name || ''],
    class: ['Class code', 'Choose what to do'],
    unknown: ['Scan', 'Code not recognised'],
  }[stage];

  const photo = resolveStudentPhotoUrl(student?.student_photo_url || student?.photo);

  return (
    <>
      <style>{`
        #${SCANNER_ID} video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
        #${SCANNER_ID} { width: 100%; height: 100%; }
      `}</style>
      <BottomSheet
        open={open}
        onClose={() => {
          void stopCamera();
          onClose?.();
        }}
        title={titles[0]}
        subtitle={titles[1]}
        maxWidth={560}
      >
        {stage === 'scan' && (
          <Stack spacing={2} sx={{ p: 2.5 }}>
            <Box
              sx={{
                position: 'relative',
                aspectRatio: '4 / 3',
                overflow: 'hidden',
                borderRadius: 2,
                bgcolor: brand.navy,
              }}
            >
              <Box id={SCANNER_ID} sx={{ position: 'absolute', inset: 0 }} />
              {cameraOn && (
                <Box sx={{ pointerEvents: 'none', position: 'absolute', inset: 24, zIndex: 10, borderRadius: 1.5, border: '2px solid', borderColor: brand.primary }} />
              )}
              {(cameraStarting || working) && (
                <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ position: 'absolute', inset: 0, zIndex: 20, bgcolor: 'rgba(19,33,61,0.7)' }}>
                  <CircularProgress size={28} sx={{ color: '#fff' }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                    {working ? 'Looking up…' : 'Starting camera…'}
                  </Typography>
                </Stack>
              )}
              {!cameraOn && !cameraStarting && !working && (
                <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ position: 'absolute', inset: 0, zIndex: 20 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Camera is not active</Typography>
                  <Button onClick={() => void startCamera()} sx={{ bgcolor: brand.primary, color: brand.navy, fontWeight: 800, px: 2, '&:hover': { bgcolor: brand.primary } }}>
                    Retry
                  </Button>
                </Stack>
              )}
            </Box>
            <Button
              fullWidth
              disabled={!cameraOn || snapping || working}
              onClick={handleCapture}
              startIcon={snapping ? <CircularProgress size={18} color="inherit" /> : <CameraAltIcon />}
              sx={{ height: 48, bgcolor: brand.primary, color: brand.navy, fontWeight: 800, textTransform: 'uppercase', '&:hover': { bgcolor: brand.primary }, '&.Mui-disabled': { opacity: 0.5 } }}
            >
              {snapping ? 'Reading…' : 'Capture'}
            </Button>
            <Typography sx={{ fontSize: 12, textAlign: 'center', color: brand.muted }}>
              Point at a student card or a classroom QR. It is detected automatically.
            </Typography>
          </Stack>
        )}

        {stage === 'student' && student && (
          <Box>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 2.5 }}>
              <Avatar src={photo || undefined} sx={{ width: 64, height: 64, bgcolor: brand.navy, color: brand.primary, fontWeight: 800 }}>
                {initialsOf(student.name)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 17, fontWeight: 800, color: brand.navy }}>{student.name}</Typography>
                <Typography sx={{ fontSize: 13, color: brand.muted }}>
                  {[studentClass(student), student.student_code || student.id].filter(Boolean).join(' · ')}
                </Typography>
                {student.gender ? <Typography sx={{ fontSize: 12, color: brand.muted }}>{student.gender}</Typography> : null}
              </Box>
            </Stack>
            <Box sx={{ borderTop: `1px solid ${brand.border}` }}>
              <Button fullWidth disabled={working} onClick={() => markAttendance('PRESENT')} sx={actionBtnSx}>
                <CheckCircleOutlineIcon /> Mark present
              </Button>
              <Button fullWidth disabled={working} onClick={() => markAttendance('LATE')} sx={{ ...actionBtnSx, borderTop: `1px solid ${brand.border}` }}>
                <AccessTimeIcon /> Mark late
              </Button>
              <Button fullWidth disabled={working} onClick={() => setConductOpen(true)} sx={{ ...actionBtnSx, borderTop: `1px solid ${brand.border}` }}>
                <GavelOutlinedIcon /> Conduct marks
              </Button>
              <Button fullWidth onClick={scanAgain} sx={{ ...actionBtnSx, borderTop: `1px solid ${brand.border}` }}>
                <ReplayIcon /> Scan another
              </Button>
            </Box>
          </Box>
        )}

        {stage === 'class' && (
          <Box>
            <Typography sx={{ px: 2.5, py: 2, fontSize: 13, color: brand.muted }}>
              Classroom code detected.
            </Typography>
            <Box sx={{ borderTop: `1px solid ${brand.border}` }}>
              <Button fullWidth disabled={working} onClick={classScan} sx={actionBtnSx}>
                <LoginIcon /> Enter class
              </Button>
              <Button fullWidth disabled={working} onClick={classScan} sx={{ ...actionBtnSx, borderTop: `1px solid ${brand.border}` }}>
                <LogoutIcon /> Exit class
              </Button>
              <Button fullWidth onClick={viewStudents} sx={{ ...actionBtnSx, borderTop: `1px solid ${brand.border}` }}>
                <PeopleOutlineIcon /> View students
              </Button>
              <Button fullWidth onClick={scanAgain} sx={{ ...actionBtnSx, borderTop: `1px solid ${brand.border}` }}>
                <ReplayIcon /> Scan another
              </Button>
            </Box>
          </Box>
        )}

        {stage === 'unknown' && (
          <Box sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: brand.navy }}>No matching student found</Typography>
            <Typography sx={{ mt: 0.5, fontSize: 12.5, color: brand.muted, wordBreak: 'break-all' }}>
              Scanned: {raw}
            </Typography>
            <Button fullWidth onClick={scanAgain} sx={{ ...actionBtnSx, mt: 2, px: 0 }}>
              <ReplayIcon /> Scan again
            </Button>
          </Box>
        )}
      </BottomSheet>

      <ConductMarksModal
        isOpen={conductOpen}
        onClose={() => setConductOpen(false)}
        initialStudent={student}
        students={student ? [student] : []}
        className={studentClass(student)}
      />
    </>
  );
}
