import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import CloseIcon from '@mui/icons-material/Close';
import { brand } from './brand';

/** Error screen for the feed — copied from the School Representative console (list-ui / status-screen). */

function friendlyErrorMessage(raw: string | null | undefined, fallback = 'We could not load this right now.'): string {
  if (!raw?.trim()) return fallback;
  if (/route not found|GET \/api|POST \/api|PATCH \/api|status code 404|\b404\b/i.test(raw)) {
    return 'This feature is not available yet or could not be found.';
  }
  if (/network|failed to fetch|ERR_NETWORK/i.test(raw)) {
    return 'We could not reach the server. Check your connection and try again.';
  }
  if (/status code 5|\b50[0-9]\b/i.test(raw)) {
    return 'The server had a problem. Please try again in a moment.';
  }
  if (/jwt|token|session|unauthori|sign in through shule/i.test(raw)) {
    return raw; // session handler still detects these
  }
  // Drop long stack-ish tails
  const first = raw.split('\n')[0].trim();
  return first.length > 160 ? `${first.slice(0, 157)}…` : first;
}

function ErrorIllustration({ size = 220 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 240 196" fill="none" role="img" aria-label="Something went wrong">
      <circle cx="120" cy="100" r="80" fill={brand.navy} fillOpacity="0.045" />
      <ellipse cx="120" cy="100" rx="96" ry="38" stroke={brand.navy} strokeOpacity="0.14" strokeWidth="1.5" strokeDasharray="3 7" strokeLinecap="round" transform="rotate(18 120 100)" />
      {/* window */}
      <rect x="66" y="62" width="108" height="80" rx="14" fill="#fff" stroke={brand.navy} strokeWidth="6" />
      <path d="M66 82h108" stroke={brand.navy} strokeWidth="6" />
      <circle cx="82" cy="72" r="3" fill={brand.primary} />
      <circle cx="93" cy="72" r="3" fill={brand.navy} fillOpacity="0.3" />
      {/* alert */}
      <circle cx="120" cy="113" r="16" fill={brand.primary} />
      <path d="M120 105v9" stroke={brand.navy} strokeWidth="4" strokeLinecap="round" />
      <circle cx="120" cy="121" r="2.4" fill={brand.navy} />
      {/* accents */}
      <circle cx="52" cy="64" r="5" fill={brand.primary} />
      <circle cx="196" cy="62" r="3" fill={brand.navy} fillOpacity="0.25" />
      <circle cx="190" cy="148" r="4.5" fill={brand.primary} fillOpacity="0.8" />
      <circle cx="48" cy="140" r="3" fill={brand.navy} fillOpacity="0.2" />
    </svg>
  );
}

function alphaNavy(a: number) {
  return `rgba(0, 4, 53, ${a})`;
}

export function ErrorState({
  title = 'Unable to load',
  description,
  message,
  onRetry,
}: {
  title?: string;
  description?: string | null;
  message?: string | null;
  onRetry?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const detail = friendlyErrorMessage(description ?? message);
  const close = () => setOpen(false);

  return (
    <>
      {!open ? (
        <Box
          sx={{
            py: 6,
            px: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 1.5,
          }}
        >
          <Typography sx={{ fontWeight: 700, color: brand.navy }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
            {detail}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            {onRetry ? (
              <Button variant="contained" color="secondary" onClick={onRetry} sx={{ fontWeight: 700 }}>
                Try again
              </Button>
            ) : null}
            <Button variant="outlined" onClick={() => setOpen(true)} sx={{ fontWeight: 600, borderColor: brand.border }}>
              Show details
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ minHeight: 240 }} />
      )}

      <Dialog
        open={open}
        onClose={close}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0, 4, 53, 0.18)',
          },
        }}
      >
        <IconButton
          aria-label="Close"
          onClick={close}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
            color: 'text.secondary',
            bgcolor: 'rgba(0,4,53,0.04)',
            '&:hover': { bgcolor: 'rgba(0,4,53,0.08)', color: brand.navy },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <DialogContent sx={{ textAlign: 'center', px: { xs: 3, sm: 4 }, py: { xs: 4, sm: 5 }, position: 'relative' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <ErrorIllustration size={160} />
          </Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: brand.navy, letterSpacing: '-0.02em' }}>
            {title}
          </Typography>
          <Typography sx={{ mt: 1.25, fontSize: 14, lineHeight: 1.6, color: brand.muted }}>
            {detail}
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            {onRetry ? (
              <Button
                variant="contained"
                color="secondary"
                onClick={onRetry}
                sx={{ px: 4, py: 1.25, fontWeight: 700, borderRadius: 999, minWidth: 160 }}
              >
                Try again
              </Button>
            ) : null}
            <Button
              variant="text"
              onClick={close}
              sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}
            >
              Close
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
