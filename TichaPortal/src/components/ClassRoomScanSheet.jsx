import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import FlashlightOnIcon from '@mui/icons-material/FlashlightOn';
import QrCodeIcon from '@mui/icons-material/QrCode';
import BottomSheet from './BottomSheet';
import { useTpToast } from './TpToast';
import api from '../services/api';
import { applyCameraFocus, setTorch, startFastQrScanner } from '../utils/classRoomQrScanner';

const NAVY = '#13213D';
const AMBER = '#F5A623';
const SCANNER_ID = 'teacher-class-qr-reader';

function parseQrPayload(raw) {
  const value = String(raw || '').trim();
  if (/\/v\/[^/?#\s]+/i.test(value)) return value;
  const babyeyi = value.match(/BABYEYICLS:([a-f0-9]+)/i);
  if (babyeyi) return babyeyi[1];
  const prefixed =
    value.match(/\b(\d{3,})-QR-CLS-(\d+)\b/i) ||
    value.match(/\b(\d{3,})-QR-CLASS-(\d+)\b/i) ||
    value.match(/\b([A-Z0-9]{3,})-QR-CLS-(\d+)\b/i);
  if (prefixed) return `${prefixed[1]}-QR-CLS-${prefixed[2]}`.toUpperCase();
  const bare = value.match(/QR-CLS-\d+/i) || value.match(/QR-CLASS-\d+/i);
  if (bare) return bare[0].toUpperCase().replace('QR-CLASS', 'QR-CLS');
  const monitorPrefix =
    value.match(/\b(\d{3,})-QR-MON-(\d+)\b/i) ||
    value.match(/\b([A-Z0-9]{3,})-QR-MON-(\d+)\b/i);
  if (monitorPrefix) return `${monitorPrefix[1]}-QR-MON-${monitorPrefix[2]}`.toUpperCase();
  const monitorCode = value.match(/QR-MON-\d+/i);
  if (monitorCode) return monitorCode[0].toUpperCase();
  return value;
}

export default function ClassRoomScanSheet({ open, mode = 'in', onClose, onSuccess }) {
  const toast = useTpToast();
  const sessionRef = useRef(null);
  const processingRef = useRef(false);
  const mountedRef = useRef(false);
  const cameraStartingRef = useRef(false);
  const openRef = useRef(open);
  const onCloseRef = useRef(onClose);
  const onSuccessRef = useRef(onSuccess);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchOk, setTorchOk] = useState(false);

  onCloseRef.current = onClose;
  onSuccessRef.current = onSuccess;
  openRef.current = open;

  const stopSession = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session?.stop) {
      try {
        await session.stop();
      } catch {
        // The stream may already have stopped.
      }
    }
  }, []);

  const stopCamera = useCallback(async () => {
    await stopSession();
    if (mountedRef.current) {
      setCameraOn(false);
      setCameraStarting(false);
      setTorchOn(false);
      setTorchOk(false);
    }
  }, [stopSession]);

  const submitScan = useCallback(async (raw) => {
    if (processingRef.current) return;
    const token = parseQrPayload(raw);
    if (!token) {
      toast.error('Invalid QR code.');
      return;
    }

    processingRef.current = true;
    setLoading(true);
    void navigator.vibrate?.(50);
    let response;
    try {
      response = await api.post('/teacher-portal/class-room/scan', { qr_token: token });
    } catch (error) {
      const body = error.response?.data;
      toast.error(body?.message || body?.data?.message || 'Scan failed. Try Capture again.', 8000);
    } finally {
      processingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }

    if (!response) return;
    if (!response.data?.success) {
      toast.error(response.data?.message || 'Scan was not accepted.', 8000);
      return;
    }

    toast.success(response.data.message || 'Entry recorded for this period.', 6000);
    await onSuccessRef.current?.(response.data.data);
    onCloseRef.current?.();
  }, [toast]);

  const submitScanRef = useRef(submitScan);
  submitScanRef.current = submitScan;

  const startCamera = useCallback(async () => {
    if (cameraStartingRef.current || !openRef.current) return;
    cameraStartingRef.current = true;
    setCameraStarting(true);
    try {
      await stopSession();
      if (!mountedRef.current || !openRef.current) return;
      const container = document.getElementById(SCANNER_ID);
      if (!container) throw new Error('Scanner mount missing');

      const session = await startFastQrScanner({
        container,
        onDecode: (decoded) => {
          if (!processingRef.current) void submitScanRef.current(decoded);
        },
      });
      if (!mountedRef.current || !openRef.current) {
        await session.stop?.();
        return;
      }
      sessionRef.current = session;
      const stream = session.stream;
      if (stream) {
        await applyCameraFocus(stream);
        const capabilities = stream.getVideoTracks?.()?.[0]?.getCapabilities?.();
        if (mountedRef.current) setTorchOk(Boolean(capabilities?.torch));
      }
      if (mountedRef.current) setCameraOn(true);
    } catch {
      sessionRef.current = null;
      if (mountedRef.current && openRef.current) {
        setCameraOn(false);
        toast.error('Camera unavailable. Allow camera access for this site, then tap Retry below.');
      }
    } finally {
      cameraStartingRef.current = false;
      if (mountedRef.current) setCameraStarting(false);
    }
  }, [stopSession, toast]);

  const handleCapture = useCallback(async () => {
    const session = sessionRef.current;
    if (!session?.snapScan || snapping || loading) return;
    setSnapping(true);
    try {
      const value = await session.snapScan();
      if (!value && mountedRef.current) {
        toast.error('Could not read the QR. Hold the card closer and tap Capture again.');
      }
    } catch {
      toast.error('Could not read the QR. Hold the card closer and tap Capture again.');
    } finally {
      if (mountedRef.current) setSnapping(false);
    }
  }, [loading, snapping, toast]);

  const handleTorch = useCallback(async () => {
    const stream = sessionRef.current?.stream;
    if (!stream) return;
    const next = !torchOn;
    if (await setTorch(stream, next)) setTorchOn(next);
  }, [torchOn]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void stopSession();
    };
  }, [stopSession]);

  useEffect(() => {
    if (!open) {
      void stopCamera();
      return undefined;
    }
    // Wait for the bottom sheet to mount the scanner container before starting the camera.
    const timer = setTimeout(() => void startCamera(), 200);
    return () => clearTimeout(timer);
  }, [open, startCamera, stopCamera]);

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
        title={mode === 'out' ? 'Scan out' : 'Scan to enter'}
        subtitle={mode === 'out'
          ? 'Scan the room QR when you leave to close this period'
          : 'Scan the fixed QR at the classroom door'}
        maxWidth={672}
      >
        <Stack spacing={2} sx={{ p: 2.5 }}>
          <Button
            type="button"
            disabled={snapping || loading || cameraStarting}
            onClick={handleCapture}
            startIcon={snapping ? <CircularProgress size={18} color="inherit" /> : <CameraAltIcon sx={{ fontSize: 18 }} />}
            sx={{
              height: 48,
              borderRadius: 1.5,
              bgcolor: AMBER,
              color: NAVY,
              fontSize: 14,
              fontWeight: 800,
              textTransform: 'uppercase',
              '&:hover': { bgcolor: AMBER },
              '&.Mui-disabled': { opacity: 0.5 },
            }}
          >
            {snapping ? 'Reading...' : 'Capture'}
          </Button>

          <Box
            sx={{
              position: 'relative',
              aspectRatio: '4 / 3',
              overflow: 'hidden',
              borderRadius: 2,
              bgcolor: NAVY,
              border: '2px solid',
              borderColor: cameraOn ? AMBER : 'rgba(19,33,61,0.13)',
            }}
          >
            <Box id={SCANNER_ID} sx={{ position: 'absolute', inset: 0 }} />
            {cameraOn && <Box sx={{ pointerEvents: 'none', position: 'absolute', inset: 24, zIndex: 10, borderRadius: 1.5, border: '2px solid', borderColor: AMBER }} />}
            {cameraStarting && (
              <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ position: 'absolute', inset: 0, zIndex: 20, bgcolor: 'rgba(19,33,61,0.7)' }}>
                <CircularProgress size={28} sx={{ color: '#fff' }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Starting camera...</Typography>
              </Stack>
            )}
            {loading && !cameraStarting && (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ position: 'absolute', left: 12, top: 12, zIndex: 30, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.75)', px: 1.5, py: 0.75 }}>
                <CircularProgress size={14} sx={{ color: '#fff' }} />
                <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#fff' }}>Checking scan...</Typography>
              </Stack>
            )}
            {cameraOn && !cameraStarting && (
              <>
                <Typography sx={{ pointerEvents: 'none', position: 'absolute', bottom: 12, left: 0, right: 0, zIndex: 30, px: 2, textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                  Live scan is on. Tap Capture for a still photo.
                </Typography>
                {torchOk && (
                  <IconButton
                    onClick={() => void handleTorch()}
                    aria-label={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
                    sx={{ position: 'absolute', right: 12, top: 12, zIndex: 30, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.8)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' } }}
                  >
                    <FlashlightOnIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </>
            )}
            {!cameraOn && !cameraStarting && (
              <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ position: 'absolute', inset: 0, zIndex: 20, bgcolor: 'rgba(19,33,61,0.85)' }}>
                <Typography sx={{ px: 3, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Camera is not active</Typography>
                <Button
                  type="button"
                  onClick={() => void startCamera()}
                  sx={{ borderRadius: 1.5, px: 2, py: 1, bgcolor: AMBER, color: NAVY, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', '&:hover': { bgcolor: AMBER } }}
                >
                  Retry
                </Button>
              </Stack>
            )}
          </Box>

          <Stack direction="row" alignItems="center" spacing={1} sx={{ borderRadius: 1.5, border: '1px solid rgba(19,33,61,0.08)', bgcolor: '#f6f8fc', px: 1.5, py: 1.25 }}>
            <QrCodeIcon sx={{ fontSize: 14, flexShrink: 0, color: AMBER }} />
            <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.6, color: 'rgba(19,33,61,0.75)' }}>
              {mode === 'out'
                ? 'Scan the room QR when you leave. Your exit time and minutes in class are saved.'
                : 'Scan the fixed QR at the classroom door to match you, this room and this period.'}
            </Typography>
          </Stack>
        </Stack>
      </BottomSheet>
    </>
  );
}
