import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import DocumentScannerOutlinedIcon from '@mui/icons-material/DocumentScannerOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import api from '../services/api';
import ClassRoomScanSheet from '../components/ClassRoomScanSheet';
import TeacherOrangeHero from '../components/TeacherOrangeHero';
import { useTpToast } from '../components/TpToast';
import { applyCameraFocus, startFastQrScanner } from '../utils/classRoomQrScanner';
import { formatSchoolTime } from '../utils/schoolTime';
import { fetchTeacherToday, tpAcademicParams } from '../services/teacherPortalApi';
import useTpAcademic from '../hooks/useTpAcademic';

const NAVY = '#13213D';
const AMBER = '#F5A623';
const SCANNER_ID = 'teacher-class-qr-reader';

function parseQrPayload(raw) {
  const s = String(raw || '').trim();
  if (/\/v\/[^/?#\s]+/i.test(s)) return s;
  const babyeyi = s.match(/BABYEYICLS:([a-f0-9]+)/i);
  if (babyeyi) return babyeyi[1];
  const prefixed =
    s.match(/\b(\d{3,})-QR-CLS-(\d+)\b/i) ||
    s.match(/\b(\d{3,})-QR-CLASS-(\d+)\b/i) ||
    s.match(/\b([A-Z0-9]{3,})-QR-CLS-(\d+)\b/i);
  if (prefixed) return `${prefixed[1]}-QR-CLS-${prefixed[2]}`.toUpperCase();
  const bare = s.match(/QR-CLS-\d+/i) || s.match(/QR-CLASS-\d+/i);
  if (bare) return bare[0].toUpperCase().replace('QR-CLASS', 'QR-CLS');
  const monPref =
    s.match(/\b(\d{3,})-QR-MON-(\d+)\b/i) ||
    s.match(/\b([A-Z0-9]{3,})-QR-MON-(\d+)\b/i);
  if (monPref) return `${monPref[1]}-QR-MON-${monPref[2]}`.toUpperCase();
  const monBare = s.match(/QR-MON-\d+/i);
  if (monBare) return monBare[0].toUpperCase();
  return s;
}

function hm(value) {
  return formatSchoolTime(value);
}

const ivoryPaperSx = {
  bgcolor: '#fff',
  border: `1px solid rgba(19,33,61,0.10)`,
  borderRadius: '24px',
  overflow: 'hidden',
};

export default function ClassRoomScan() {
  const toast = useTpToast();
  const { ready, term, academicYear } = useTpAcademic();
  const [searchParams] = useSearchParams();
  const initialScanOut = searchParams.get('scan') === 'out';
  const forceClassView = searchParams.get('view') === 'class';

  const sessionRef = useRef(null);
  const viewportRef = useRef(null);
  const processingRef = useRef(false);
  const mountedRef = useRef(true);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [scanMode, setScanMode] = useState('');

  const [today, setToday] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanOutMode, setScanOutMode] = useState(initialScanOut);
  const [showClassScanSheet, setShowClassScanSheet] = useState(initialScanOut);
  const [classScanMode, setClassScanMode] = useState(initialScanOut ? 'out' : 'in');

  const loadToday = useCallback(async () => {
    try {
      const data = await fetchTeacherToday(tpAcademicParams(term, academicYear));
      if (mountedRef.current) setToday(data || null);
    } catch {
      if (mountedRef.current) setToday(null);
    }
  }, [term, academicYear]);

  const loadActive = useCallback(async () => {
    const [activeRes, historyRes] = await Promise.all([
      api.get('/teacher-portal/class-period/active').catch(() => null),
      api.get('/teacher-portal/class-period/history').catch(() => null),
    ]);
    if (!mountedRef.current) return;
    if (activeRes?.data?.success) setActive(activeRes.data.data);
    if (historyRes?.data?.success) setHistory(historyRes.data.data || []);
  }, []);

  const stopSessionOnly = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session?.stop) {
      try {
        await session.stop();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const stopCamera = useCallback(async () => {
    await stopSessionOnly();
    if (mountedRef.current) {
      setCameraOn(false);
      setCameraStarting(false);
    }
  }, [stopSessionOnly]);

  const submitScan = useCallback(
    async (tokenOrRaw) => {
      if (processingRef.current) return;
      const raw = String(tokenOrRaw || '').trim();
      void navigator.vibrate?.(50);
      const qr_token = parseQrPayload(raw);
      if (!qr_token) {
        toast.error('Invalid QR code.');
        return;
      }
      processingRef.current = true;
      setLoading(true);

      try {
        const res = await api.post('/teacher-portal/class-room/scan', { qr_token });
        if (res.data?.success) {
          const msg = res.data.message || 'Entry recorded for this period.';
          toast.success(msg, 6000);
          await Promise.all([loadActive(), loadToday()]);
          setShowScanner(false);
          setScanOutMode(false);
          await stopCamera();
        } else {
          const msg = res.data?.message || 'Scan was not accepted.';
          toast.error(msg, 8000);
        }
      } catch (e) {
        const body = e.response?.data;
        const msg = body?.message || body?.data?.message || 'Scan failed. Try Capture again.';
        toast.error(msg, 8000);
      } finally {
        setLoading(false);
        processingRef.current = false;
      }
    },
    [loadActive, loadToday, stopCamera, toast]
  );

  const submitScanRef = useRef(submitScan);
  submitScanRef.current = submitScan;

  const startCamera = useCallback(async () => {
    if (cameraStarting) return;
    setCameraStarting(true);

    try {
      await stopSessionOnly();
      if (!mountedRef.current) return;

      const container = document.getElementById(SCANNER_ID);
      if (!container) throw new Error('Scanner mount missing');

      const session = await startFastQrScanner({
        container,
        onDecode: (decoded) => {
          if (processingRef.current) return;
          submitScanRef.current(decoded);
        },
      });
      sessionRef.current = session;
      setScanMode(session.mode || '');

      const stream = session.stream;
      if (stream) {
        await applyCameraFocus(stream);
      }

      if (mountedRef.current) {
        setCameraOn(true);
      }
    } catch {
      sessionRef.current = null;
      if (mountedRef.current) {
        setCameraOn(false);
        toast.error('Camera unavailable. Allow camera access for this site, then tap Retry below.');
      }
    } finally {
      if (mountedRef.current) setCameraStarting(false);
    }
  }, [cameraStarting, stopSessionOnly, toast]);

  const handleSnap = useCallback(async () => {
    const session = sessionRef.current;
    if (!session?.snapScan || snapping || loading) return;
    if (!cameraOn) {
      await startCamera();
      if (!sessionRef.current?.snapScan) return;
    }
    setSnapping(true);
    try {
      const text = await sessionRef.current.snapScan();
      if (!text && mountedRef.current) {
        toast.error('Could not read the QR. Hold the card closer and tap Capture again.');
      }
    } finally {
      if (mountedRef.current) setSnapping(false);
    }
  }, [snapping, loading, cameraOn, startCamera, toast]);

  const handleStop = useCallback(
    async (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      await stopCamera();
    },
    [stopCamera]
  );

  const periodLog = active?.period_log || {};
  const activeLesson = active?.current_lesson || null;
  const inClass = forceClassView || Boolean(periodLog.checked_in && !periodLog.checked_out);
  const focus = today?.current || today?.next || null;

  const lessonInfo = activeLesson
    ? {
        subject: activeLesson.subject_name,
        className: activeLesson.class_name,
        start: activeLesson.start_time,
        end: activeLesson.end_time,
        room: activeLesson.room,
        period: focus?.periodLabel || null,
        sessionId: focus?.sessionId,
      }
    : focus
      ? {
          subject: focus.subjectName,
          className: focus.className,
          start: focus.startTime,
          end: focus.endTime,
          room: focus.room,
          period: focus.periodLabel,
          sessionId: focus.sessionId,
        }
      : null;

  const entryTime = hm(periodLog.entry_time || focus?.scannedAt || today?.current?.scannedAt);
  const exitTime = periodLog.checked_out ? hm(periodLog.exit_time) : null;
  const sessionTimes = [
    { label: 'Entry', value: entryTime },
    { label: 'Exit', value: exitTime || (entryTime ? '--:--' : '') },
    { label: 'Bell', value: hm(lessonInfo?.end) },
  ].filter((item) => item.value);

  useEffect(() => {
    mountedRef.current = true;
    if (ready) {
      loadToday();
      loadActive();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [ready, loadToday, loadActive]);

  useEffect(() => {
    if (!showScanner) {
      stopCamera();
      return undefined;
    }
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScanner]);

  const scanTitle = scanOutMode || inClass ? 'Scan out' : 'Scan to enter';
  const heroTitle = inClass ? 'Class in session' : 'Scan to enter';
  const heroSubtitle = inClass
    ? 'Scan the door QR when you leave to close this period'
    : 'Point at the classroom QR and tap Capture to start';

  const openClassScanSheet = (mode = 'in') => {
    setClassScanMode(mode);
    setShowClassScanSheet(true);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa', pb: 8 }}>
      <style>{`
        #${SCANNER_ID} video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
        #${SCANNER_ID} { width: 100%; height: 100%; }
      `}</style>
      <TeacherOrangeHero title={heroTitle} subtitle={heroSubtitle} />

      <Stack spacing={2} sx={{ maxWidth: '42rem', mx: 'auto', px: 2, mt: '-32px', position: 'relative', zIndex: 10 }}>
        {lessonInfo ? (
          <Paper sx={{ borderRadius: 2, border: '1px solid #FDE68A', bgcolor: '#FFFBEB', p: 2, boxShadow: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: AMBER }}>
                {inClass ? 'In class now' : focus === today?.current ? 'Current period' : 'Next up'}
              </Typography>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(19,33,61,0.53)' }}>
                {lessonInfo.period || ''}
                {lessonInfo.start ? ` · ${hm(lessonInfo.start)}` : ''}
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 18, fontWeight: 900, color: NAVY }}>
              {lessonInfo.subject} · {lessonInfo.className}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mt: 1 }}>
              {lessonInfo.start ? (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <AccessTimeIcon sx={{ fontSize: 12, color: AMBER }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(19,33,61,0.53)' }}>
                    {hm(lessonInfo.start)}
                    {lessonInfo.end ? `–${hm(lessonInfo.end)}` : ''}
                  </Typography>
                </Stack>
              ) : null}
              {lessonInfo.room ? (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <PlaceOutlinedIcon sx={{ fontSize: 12, color: AMBER }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(19,33,61,0.53)' }}>{lessonInfo.room}</Typography>
                </Stack>
              ) : null}
            </Stack>
            {inClass ? (
              <Box sx={{ mt: 1.5 }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: '#059669', color: '#fff', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> Entry recorded {entryTime ? `at ${entryTime}` : ''}
                </Box>
              </Box>
            ) : (
              <Typography sx={{ mt: 1.5, fontSize: 12, fontWeight: 700, color: 'rgba(146,64,14,0.9)' }}>
                Scan the door QR at the bell to unlock this class.
              </Typography>
            )}
          </Paper>
        ) : null}

        {showScanner ? (
          <Paper elevation={0} sx={{ ...ivoryPaperSx, boxShadow: 6 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" spacing={1} sx={{ p: 2.5, borderBottom: `1px solid rgba(19,33,61,0.08)` }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <DocumentScannerOutlinedIcon sx={{ fontSize: 14, color: AMBER }} />
                <Typography sx={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(19,33,61,0.4)' }}>
                  {scanTitle}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {scanMode ? (
                  <Typography sx={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(19,33,61,0.45)' }}>
                    {scanMode === 'native' ? 'Fast scanner' : 'Classic scanner'}
                  </Typography>
                ) : null}
                {inClass ? (
                  <ButtonBase
                    onClick={() => {
                      setShowScanner(false);
                      setScanOutMode(false);
                    }}
                    sx={{ px: 1.25, py: 0.75, borderRadius: 1.5, bgcolor: 'rgba(19,33,61,0.1)', color: NAVY, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em' }}
                  >
                    Back
                  </ButtonBase>
                ) : null}
              </Stack>
            </Stack>

            <Stack spacing={2} sx={{ p: 2.5 }}>
              <Button
                fullWidth
                disabled={snapping || loading}
                onClick={handleSnap}
                startIcon={snapping ? <CircularProgress size={18} color="inherit" /> : <PhotoCameraOutlinedIcon />}
                sx={{ height: 48, borderRadius: 1.5, bgcolor: AMBER, color: NAVY, fontSize: 14, fontWeight: 900, textTransform: 'uppercase', '&:hover': { bgcolor: '#E8940F' } }}
              >
                {snapping ? 'Reading…' : 'Capture'}
              </Button>

              <Box
                ref={viewportRef}
                sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', aspectRatio: '4 / 3', bgcolor: NAVY, border: `2px solid ${cameraOn ? AMBER : 'rgba(19,33,61,0.13)'}` }}
              >
                <Box id={SCANNER_ID} sx={{ position: 'absolute', inset: 0 }} />

                {cameraOn ? (
                  <Box sx={{ position: 'absolute', inset: 24, border: `2px solid ${AMBER}`, borderRadius: 1.5, pointerEvents: 'none', zIndex: 10 }} />
                ) : null}

                {cameraStarting ? (
                  <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ position: 'absolute', inset: 0, zIndex: 20, bgcolor: 'rgba(19,33,61,0.7)' }}>
                    <CircularProgress size={28} sx={{ color: '#fff' }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Starting camera…</Typography>
                  </Stack>
                ) : null}

                {loading && !cameraStarting ? (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ position: 'absolute', top: 12, left: 12, zIndex: 30, borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.75)', px: 1.5, py: 0.75 }}>
                    <CircularProgress size={14} sx={{ color: '#fff' }} />
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>Checking in…</Typography>
                  </Stack>
                ) : null}

                {cameraOn && !cameraStarting ? (
                  <>
                    <Typography sx={{ position: 'absolute', bottom: 12, left: 0, right: 0, zIndex: 30, textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.9)', px: 2, pointerEvents: 'none' }}>
                      Live scan is on. Tap Capture for a still photo.
                    </Typography>
                    <ButtonBase
                      onClick={handleStop}
                      sx={{ position: 'absolute', top: 12, right: 12, zIndex: 30, px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: 12, fontWeight: 700, '&:hover': { bgcolor: '#000' } }}
                    >
                      Stop
                    </ButtonBase>
                  </>
                ) : null}

                {!cameraOn && !cameraStarting ? (
                  <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ position: 'absolute', inset: 0, zIndex: 20, bgcolor: 'rgba(19,33,61,0.85)' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', px: 3, textAlign: 'center' }}>
                      Camera is not active
                    </Typography>
                    <ButtonBase
                      onClick={startCamera}
                      sx={{ px: 2, py: 1, borderRadius: 1.5, bgcolor: AMBER, color: NAVY, fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}
                    >
                      Retry
                    </ButtonBase>
                  </Stack>
                ) : null}
              </Box>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ borderRadius: 1.5, border: `1px solid rgba(19,33,61,0.08)`, bgcolor: '#f6f8fc', px: 1.5, py: 1.25 }}>
                <QrCode2Icon sx={{ fontSize: 14, color: AMBER }} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.5, color: 'rgba(19,33,61,0.73)' }}>
                  {scanOutMode || inClass
                    ? 'Scan the room QR when you leave. Your exit time and minutes in class are saved.'
                    : 'Scan the fixed QR at the classroom door to match you, this room and this period.'}
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        ) : inClass ? (
          <>
            <Paper elevation={0} sx={{ ...ivoryPaperSx, boxShadow: 6 }}>
              <Box sx={{ p: 2.5, borderBottom: `1px solid rgba(19,33,61,0.08)` }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
                    <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: '#34D399', animation: 'st-pulse-dot 1.6s ease-in-out infinite', '@keyframes st-pulse-dot': { '0%,100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.45, transform: 'scale(0.8)' } } }} />
                    <Box sx={{ position: 'relative', width: 10, height: 10, borderRadius: '50%', bgcolor: '#059669' }} />
                  </Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#047857' }}>
                    In class now
                  </Typography>
                </Stack>
                <Typography sx={{ mt: 1, fontSize: 20, fontWeight: 900, color: NAVY }}>
                  {lessonInfo?.subject || 'Lesson'}
                  {lessonInfo?.className ? ` · ${lessonInfo.className}` : ''}
                </Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(19,33,61,0.53)' }}>
                  {[lessonInfo?.period, lessonInfo?.room].filter(Boolean).join(' · ')}
                </Typography>

                {sessionTimes.length > 0 ? (
                  <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    {sessionTimes.map((item) => (
                      <Box key={item.label} sx={{ borderRadius: 1.5, bgcolor: '#f6f8fc', p: 1.5, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(19,33,61,0.45)' }}>
                          {item.label}
                        </Typography>
                        <Typography sx={{ fontSize: 14, fontWeight: 900, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>{item.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                ) : null}
              </Box>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2.5, py: 1.5, bgcolor: '#f6f8fc', borderBottom: `1px solid rgba(19,33,61,0.08)` }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 14, color: '#059669', flexShrink: 0 }} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.5, color: 'rgba(19,33,61,0.73)' }}>
                  Your entry time is shared with the Director&apos;s Console and HR teacher attendance.
                </Typography>
              </Stack>

              <Stack spacing={1} sx={{ p: 2.5 }}>
                <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(19,33,61,0.45)' }}>
                  Lesson actions
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  {[
                    { to: '/lesson-planning/generate', label: 'Lesson plan', icon: <MenuBookOutlinedIcon sx={{ fontSize: 15 }} /> },
                    { to: '/students', label: 'Class list', icon: <PeopleAltOutlinedIcon sx={{ fontSize: 15 }} /> },
                    { to: '/ticha-ai', label: 'Ticha AI', icon: <AutoAwesomeIcon sx={{ fontSize: 15 }} /> },
                  ].map((a) => (
                    <ButtonBase
                      key={a.to}
                      component={Link}
                      to={a.to}
                      sx={{ height: 44, gap: 1, borderRadius: 1.5, border: `1px solid rgba(0,0,0,0.1)`, color: NAVY, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    >
                      {a.icon} {a.label}
                    </ButtonBase>
                  ))}
                </Box>
              </Stack>

              <Box sx={{ px: 2.5, pb: 2.5 }}>
                <ButtonBase
                  onClick={() => openClassScanSheet('out')}
                  sx={{ width: '100%', justifyContent: 'flex-start', gap: 1.5, borderRadius: 2, bgcolor: NAVY, px: 2, py: 1.5, color: '#fff', textAlign: 'left', '&:hover': { bgcolor: '#1d3155' } }}
                >
                  <Box sx={{ display: 'grid', placeItems: 'center', width: 44, height: 44, flexShrink: 0, borderRadius: 1.5, bgcolor: AMBER, color: NAVY }}>
                    <QrCode2Icon sx={{ fontSize: 21 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ display: 'block', fontSize: 14, fontWeight: 900 }}>Scan to clock out</Typography>
                    <Typography sx={{ display: 'block', mt: 0.25, fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                      Use the QR at the classroom door
                    </Typography>
                  </Box>
                </ButtonBase>
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ ...ivoryPaperSx, p: 2.5, boxShadow: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: NAVY, mb: 1.5 }}>
                About this class
              </Typography>
              <Box sx={{ '& > *:not(:last-child)': { borderBottom: `1px solid rgba(19,33,61,0.08)` } }}>
                {[
                  ['Class', lessonInfo?.className],
                  ['Subject', lessonInfo?.subject],
                  ['Room', lessonInfo?.room],
                  ['Period', lessonInfo?.period],
                  ['Bell', lessonInfo?.start && lessonInfo?.end ? `${hm(lessonInfo.start)} – ${hm(lessonInfo.end)}` : hm(lessonInfo?.end)],
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <Stack key={label} direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ py: 1 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(19,33,61,0.4)' }}>{label}</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 900, color: NAVY, textAlign: 'right' }}>{value}</Typography>
                    </Stack>
                  ))}
              </Box>
            </Paper>
          </>
        ) : (
          <Paper elevation={0} sx={{ ...ivoryPaperSx, p: 3, textAlign: 'center', boxShadow: 6 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'rgba(245,166,35,0.15)', display: 'grid', placeItems: 'center', mx: 'auto', mb: 1.5 }}>
              <QrCode2Icon sx={{ fontSize: 24, color: AMBER }} />
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 900, color: NAVY }}>
              {lessonInfo ? 'Ready for class' : 'No lesson on your timetable'}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 12, fontWeight: 600, lineHeight: 1.5, color: 'rgba(19,33,61,0.53)' }}>
              {lessonInfo
                ? 'Scan the door QR at the bell to unlock the register, lesson plan and class list.'
                : 'Your timetable is clear right now. You can still scan a classroom QR if the timetable changes.'}
            </Typography>
            <Button
              fullWidth
              onClick={() => openClassScanSheet('in')}
              startIcon={<QrCode2Icon sx={{ fontSize: 18 }} />}
              sx={{ mt: 2, height: 48, borderRadius: 1.5, bgcolor: AMBER, color: NAVY, fontSize: 14, fontWeight: 900, textTransform: 'uppercase', '&:hover': { bgcolor: '#E8940F' } }}
            >
              Scan to enter
            </Button>
            {!lessonInfo ? (
              <ButtonBase component={Link} to="/timetable" sx={{ mt: 1.5, gap: 0.5, color: NAVY, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                <AccessTimeIcon sx={{ fontSize: 12 }} /> Open timetable
              </ButtonBase>
            ) : null}
          </Paper>
        )}

        {history.length > 0 ? (
          <Paper elevation={0} sx={{ ...ivoryPaperSx, p: 2.5, boxShadow: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: NAVY, mb: 2 }}>
              Today&apos;s period attendance
            </Typography>
            <Stack spacing={1}>
              {history.map((row) => (
                <Stack key={row.id} direction="row" spacing={1.5} alignItems="center" sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid rgba(19,33,61,0.08)` }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 900, fontVariantNumeric: 'tabular-nums', minWidth: 48, color: AMBER }}>
                    {hm(row.start_time)}
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 14, fontWeight: 700, color: NAVY }}>
                      {row.subject_name} · {row.class_name}
                    </Typography>
                    <Typography sx={{ fontSize: 10, opacity: 0.5, color: NAVY }}>
                      {row.entry_hm ? `In ${hm(row.entry_hm)}` : ''}
                      {row.exit_hm ? ` · Out ${hm(row.exit_hm)}` : ''}
                    </Typography>
                  </Box>
                  <Box sx={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', px: 1, py: 0.5, borderRadius: 1, bgcolor: NAVY, color: '#fff' }}>
                    {row.exit_hm ? 'Done' : row.entry_hm ? 'Live' : row.status || '-'}
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Paper>
        ) : null}
        <ClassRoomScanSheet
          open={showClassScanSheet}
          mode={classScanMode}
          onClose={() => setShowClassScanSheet(false)}
          onSuccess={async () => {
            await Promise.all([loadActive(), loadToday()]);
            setScanOutMode(false);
          }}
        />
      </Stack>
    </Box>
  );
}
