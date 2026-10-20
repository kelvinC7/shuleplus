import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Clock, Flashlight, Loader2, MapPin, ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import TeacherOrangeHero from '../components/TeacherOrangeHero';
import { useTpToast } from '../components/TpToast';
import { applyCameraFocus, setTorch, startFastQrScanner } from '../utils/classRoomQrScanner';

const NAVY = '#000435';
const AMBER = '#f59e0b';
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

export default function ClassRoomScan() {
  const toast = useTpToast();
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
  const [torchOn, setTorchOn] = useState(false);
  const [torchOk, setTorchOk] = useState(false);
  const [scanMode, setScanMode] = useState('');

  const loadActive = useCallback(() => {
    api.get('/teacher-portal/class-period/active')
      .then((r) => { if (r.data?.success) setActive(r.data.data); })
      .catch(() => {});
    api.get('/teacher-portal/class-period/history')
      .then((r) => { if (r.data?.success) setHistory(r.data.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadActive();
    return () => { mountedRef.current = false; };
  }, [loadActive]);

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
      setTorchOn(false);
      setTorchOk(false);
    }
  }, [stopSessionOnly]);

  const submitScan = useCallback(async (tokenOrRaw) => {
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
        loadActive();
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
  }, [loadActive, stopCamera, toast]);

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
        const caps = stream.getVideoTracks?.()?.[0]?.getCapabilities?.();
        setTorchOk(Boolean(caps?.torch));
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

  const handleTorch = useCallback(async () => {
    const stream = sessionRef.current?.stream;
    if (!stream) return;
    const next = !torchOn;
    const ok = await setTorch(stream, next);
    if (ok) setTorchOn(next);
  }, [torchOn]);

  const handleStop = useCallback(async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    await stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return () => { stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lesson = active?.current_lesson;
  const log = active?.period_log;

  return (
    <div className="min-h-screen bg-[#fafafa] pb-16">
      <style>{`
        #${SCANNER_ID} video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
        #${SCANNER_ID} { width: 100%; height: 100%; }
      `}</style>
      <TeacherOrangeHero
        title="Class period check-in"
        subtitle="Tap Capture when the QR fills the frame"
      />

      <div className="max-w-2xl mx-auto px-4 -mt-8 relative z-10 space-y-4">
        {lesson && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: AMBER }}>Active lesson from timetable</p>
            <p className="text-lg font-black" style={{ color: NAVY }}>{lesson.subject_name} · {lesson.class_name}</p>
            <div className="flex flex-wrap gap-4 mt-2 text-xs font-bold" style={{ color: `${NAVY}88` }}>
              <span className="flex items-center gap-1"><Clock size={12} style={{ color: AMBER }} />{lesson.start_time} – {lesson.end_time}</span>
              {lesson.room && <span className="flex items-center gap-1"><MapPin size={12} style={{ color: AMBER }} />{lesson.room}</span>}
            </div>
            {log?.checked_in ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 bg-emerald-600 text-white">
                  <CheckCircle2 size={14} /> Entry recorded {log.entry_time ? `at ${log.entry_time}` : ''}
                </span>
              </div>
            ) : (
              <p className="mt-3 text-xs font-bold text-amber-800/90">At the bell, tap Capture once. It only takes a second.</p>
            )}
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl border border-[#000435]/10 overflow-hidden">
          <div className="p-5 border-b border-[#000435]/8 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-widest text-[#000435]/40 flex items-center gap-2">
              <ScanLine size={14} style={{ color: AMBER }} /> Monitor or classroom QR
            </p>
            {scanMode ? (
              <span className="text-[9px] font-bold uppercase text-[#000435]/45">{scanMode === 'native' ? 'Fast scanner' : 'Classic scanner'}</span>
            ) : null}
          </div>

          <div className="p-5 space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={snapping || loading}
                onClick={handleSnap}
                className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-black uppercase text-[#000435] disabled:opacity-50"
                style={{ background: AMBER }}
              >
                {snapping ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
                {snapping ? 'Reading…' : 'Capture'}
              </button>
              {torchOk ? (
                <button
                  type="button"
                  onClick={handleTorch}
                  className={`h-12 w-12 rounded-xl border-2 flex items-center justify-center ${torchOn ? 'border-amber-400 bg-amber-100' : 'border-[#000435]/15 bg-white'}`}
                  aria-label="Toggle flashlight"
                >
                  <Flashlight size={20} style={{ color: NAVY }} />
                </button>
              ) : null}
            </div>

            <div
              ref={viewportRef}
              className="relative rounded-2xl overflow-hidden aspect-[4/3]"
              style={{ background: NAVY, border: `2px solid ${cameraOn ? AMBER : '#00043520'}` }}
            >
              <div id={SCANNER_ID} className="absolute inset-0" />

              {cameraOn && (
                <div className="absolute inset-6 border-2 rounded-xl pointer-events-none z-10" style={{ borderColor: AMBER }} />
              )}

              {cameraStarting && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#000435]/70">
                  <Loader2 className="animate-spin text-white" size={28} />
                  <p className="text-xs font-bold text-white/80">Starting camera…</p>
                </div>
              )}

              {loading && !cameraStarting && (
                <div className="absolute top-3 left-3 z-30 flex items-center gap-2 rounded-lg bg-black/75 px-3 py-1.5">
                  <Loader2 className="animate-spin text-white" size={14} />
                  <span className="text-[10px] font-bold text-white uppercase">Checking in…</span>
                </div>
              )}

              {cameraOn && !cameraStarting && (
                <>
                  <p className="absolute bottom-3 left-0 right-0 z-30 text-center text-[10px] font-bold text-white/90 pointer-events-none px-4">
                    Live scan is on. Tap Capture for a still photo.
                  </p>
                  <button
                    type="button"
                    onClick={handleStop}
                    className="absolute top-3 right-3 z-30 px-3 py-1.5 rounded-lg bg-black/80 text-white text-xs font-bold hover:bg-black"
                  >
                    Stop
                  </button>
                </>
              )}

              {!cameraOn && !cameraStarting && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#000435]/85">
                  <p className="text-xs font-bold text-white/80 px-6 text-center">Camera is not active</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase text-[#000435]"
                    style={{ background: AMBER }}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs leading-relaxed text-[#000435]/80">
              ShuleCard QR works only when that student is assigned as a class monitor in Student Management.
              If the live view looks blurry, tap Capture. It reads one still photo and is usually faster.
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#000435]/10 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: NAVY }}>Today&apos;s period attendance</h3>
              <Link to="/teacher-attendance" className="text-[10px] font-black uppercase" style={{ color: AMBER }}>Full report</Link>
            </div>
            <div className="space-y-2">
              {history.map((row) => (
                <div key={row.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#000435]/8">
                  <p className="text-[10px] font-black tabular-nums min-w-[48px]" style={{ color: AMBER }}>{String(row.start_time).slice(0, 5)}</p>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{row.subject_name} · {row.class_name}</p>
                    <p className="text-[10px] opacity-50" style={{ color: NAVY }}>
                      {row.entry_hm ? `In ${row.entry_hm}` : '-'}{row.exit_hm ? ` · Out ${row.entry_hm}` : ''}
                    </p>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-[#000435] text-white">
                    {row.exit_hm ? 'Done' : row.entry_hm ? 'Live' : row.status || '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
