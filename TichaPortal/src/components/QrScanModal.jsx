import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { brand } from '../theme/theme';

export default function QrScanModal({
  onScan,
  onClose,
  onManual,
  title = 'Scan QR',
  hint = 'Align the code inside the frame',
}) {
  const containerId = `qr-${useId().replace(/:/g, '')}`;
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(true);
  const scannerRef = useRef(null);
  const scannedRef = useRef(false);

  const handleDecode = useCallback(
    (decoded) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      void navigator.vibrate?.(80);
      onScan(String(decoded).trim());
    },
    [onScan]
  );

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        const scanner = new Html5Qrcode(containerId, false);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          handleDecode
        );
        if (!cancelled) setStarting(false);
      } catch (err) {
        if (!cancelled) {
          setStarting(false);
          setError(err?.message || 'Camera could not start. Use manual entry.');
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) scanner.stop().catch(() => {});
    };
  }, [containerId, handleDecode]);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        display: 'flex',
        alignItems: { xs: 'flex-end', sm: 'center' },
        justifyContent: 'center',
        bgcolor: 'rgba(19,33,61,0.6)',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 448, borderRadius: 2, bgcolor: '#fff', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ px: 2, py: 1.5, borderBottom: '1px solid #F1F5F9' }}>
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 500, color: brand.navy }}>{title}</Typography>
            <Typography sx={{ mt: 0.25, fontSize: 12, color: '#64748B' }}>{hint}</Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ color: '#94A3B8', borderRadius: 1 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>

        <Box sx={{ position: 'relative', bgcolor: '#000' }}>
          <Box id={containerId} sx={{ minHeight: 240, width: '100%', overflow: 'hidden' }} />
          {starting && (
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 14 }}>
              <CircularProgress size={16} sx={{ color: '#fff' }} /> Starting camera...
            </Stack>
          )}
        </Box>

        {error && <Typography sx={{ px: 2, py: 1, fontSize: 12, color: '#BE123C' }}>{error}</Typography>}

        {onManual && (
          <Button
            fullWidth
            onClick={onManual}
            startIcon={<KeyboardIcon sx={{ fontSize: 16 }} />}
            sx={{ justifyContent: 'center', py: 1.5, borderRadius: 0, borderTop: '1px solid #F1F5F9', textTransform: 'none', fontSize: 14, fontWeight: 500, color: brand.navy }}
          >
            Enter code instead
          </Button>
        )}
      </Box>
    </Box>
  );
}
