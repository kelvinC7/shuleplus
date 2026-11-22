import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  OPEN_INSTALL_EVENT,
  isIPad,
  isInAppBrowser,
  isIOSSafari,
  isNativeApp,
  rememberDismissed,
  shouldShowInstallPrompt,
  useServiceWorkerUpdate,
  usePwaInstall,
} from '../utils/pwa';
import { brand } from '../theme/theme';

const NAVY = brand.navy;
const AMBER = brand.primary;

const ShareGlyph = (p) => (
  <Box component="svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M12 3v12" />
    <path d="M8 7l4-4 4 4" />
    <path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
  </Box>
);
const AddSquareGlyph = (p) => (
  <Box component="svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </Box>
);
const DotsGlyph = (p) => (
  <Box component="svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </Box>
);
const KebabGlyph = (p) => (
  <Box component="svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <circle cx="12" cy="5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="19" r="1.8" />
  </Box>
);

function Step({ n, icon, children }) {
  return (
    <Stack component="li" direction="row" alignItems="flex-start" spacing={1.5}>
      <Box component="span" sx={{ mt: 0.25, width: 28, height: 28, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, bgcolor: AMBER, color: NAVY }}>
        {n}
      </Box>
      <Box sx={{ flex: 1, fontSize: 13.5, lineHeight: 1.4, color: '#E2E8F0' }}>{children}</Box>
      {icon && (
        <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' }}>
          {icon}
        </Box>
      )}
    </Stack>
  );
}

function Perk({ icon, text }) {
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', px: 1, py: 1.5, textAlign: 'center' }}>
      <Box component="span" sx={{ color: AMBER, display: 'flex' }}>{icon}</Box>
      <Box component="span" sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.25, color: '#CBD5E1' }}>{text}</Box>
    </Box>
  );
}

function InstallDialog({ platform, canPromptNatively, onInstall, onClose }) {
  const primaryRef = useRef(null);
  const ipad = isIPad();
  const safari = isIOSSafari();
  const inApp = isInAppBrowser();

  useEffect(() => {
    primaryRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isIOS = platform === 'ios';

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      sx={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: { xs: 'flex-end', sm: 'center' }, justifyContent: 'center' }}
    >
      <Box onClick={onClose} sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }} />

      <Box
        component={motion.div}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-title"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 448,
          overflow: 'hidden',
          color: '#fff',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderBottomLeftRadius: { xs: 0, sm: 28 },
          borderBottomRightRadius: { xs: 0, sm: 28 },
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          background: `linear-gradient(160deg, #1B2D52 0%, ${NAVY} 60%, #0B1220 100%)`,
          pb: 'max(env(safe-area-inset-bottom), 16px)',
        }}
      >
        <IconButton
          onClick={onClose}
          aria-label="Close"
          sx={{ position: 'absolute', right: 12, top: 12, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)', color: '#CBD5E1', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>

        <Box sx={{ px: 3, pt: 3, pb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box component="img" src="/icons/icon-192.png" alt="" sx={{ width: 64, height: 64, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)' }} />
            <Box>
              <Typography id="pwa-title" sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>Install ShuleTicha</Typography>
              <Typography sx={{ mt: 0.25, fontSize: 12.5, color: '#CBD5E1' }}>Put your teacher workspace on your home screen.</Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}>
            <Perk icon={<ZapGlyph />} text="Opens instantly" />
            <Perk icon={<BellGlyph />} text="Get notifications" />
            <Perk icon={<WifiOffGlyph />} text="Works on weak network" />
          </Stack>

          {isIOS && (
            <Box sx={{ mt: 2.5 }}>
              {inApp ? (
                <Box sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', p: 2, fontSize: 13, lineHeight: 1.4, color: '#E2E8F0' }}>
                  <Typography sx={{ fontWeight: 700, color: '#fff' }}>Open this page in Safari first</Typography>
                  <Typography sx={{ mt: 0.5 }}>
                    This browser can&apos;t add apps to your Home Screen. Tap <Box component="span" sx={{ display: 'inline-flex', verticalAlign: 'middle', mt: '-2px' }}><DotsGlyph width="16" height="16" /></Box> or
                    &quot;Open in browser&quot;, choose <b>Safari</b>, then follow the install steps.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Typography sx={{ mb: 1.5, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: '#94A3B8' }}>
                    3 quick steps on {ipad ? 'iPad' : 'iPhone'}
                  </Typography>
                  <Stack component="ol" spacing={1.75} sx={{ m: 0, p: 0, listStyle: 'none' }}>
                    <Step n="1" icon={<ShareGlyph />}>
                      Tap the <b>Share</b> button {safari ? <>in Safari&apos;s {ipad ? 'top' : 'bottom'} bar</> : <>next to the address bar</>}.
                      <Box component="span" sx={{ display: 'block', fontSize: 11.5, color: '#94A3B8' }}>Don&apos;t see it? Tap <b>...</b> first.</Box>
                    </Step>
                    <Step n="2" icon={<AddSquareGlyph />}>
                      Scroll down and tap <b>Add to Home Screen</b>.
                    </Step>
                    <Step n="3">
                      Tap <Box component="b" sx={{ color: AMBER }}>Add</Box> (top right). Then open <b>ShuleTicha</b> from your Home Screen.
                    </Step>
                  </Stack>
                  <Typography sx={{ mt: 2, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.05)', px: 1.5, py: 1, fontSize: 11.5, lineHeight: 1.4, color: '#94A3B8' }}>
                    On iPhone, notifications only work after the app is added to your Home Screen.
                  </Typography>
                </>
              )}
            </Box>
          )}

          {!isIOS && canPromptNatively && (
            <Typography sx={{ mt: 2.5, fontSize: 13, lineHeight: 1.4, color: '#CBD5E1' }}>
              One tap and it installs like a normal app. No app store, no big download.
            </Typography>
          )}

          {!isIOS && !canPromptNatively && (
            <Stack component="ol" spacing={1.75} sx={{ mt: 2.5, m: 0, p: 0, listStyle: 'none' }}>
              <Step n="1" icon={<KebabGlyph />}>
                Open your browser menu <b>&#8942;</b>.
              </Step>
              <Step n="2" icon={<DownloadGlyph />}>
                Tap <b>Install app</b> or <b>Add to Home screen</b>.
              </Step>
              <Step n="3">Confirm, then open <b>ShuleTicha</b> from your home screen.</Step>
            </Stack>
          )}
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ px: 3, pt: 1 }}>
          {!isIOS && canPromptNatively ? (
            <Button
              ref={primaryRef}
              onClick={onInstall}
              startIcon={<DownloadGlyph size={17} />}
              sx={{ flex: 1, py: 1.75, borderRadius: 2, bgcolor: AMBER, color: NAVY, fontSize: 14, fontWeight: 800, textTransform: 'none', boxShadow: '0 8px 24px rgba(245,166,35,0.3)', '&:hover': { bgcolor: AMBER }, '&:active': { transform: 'scale(0.98)' } }}
            >
              Install app
            </Button>
          ) : (
            <Button
              ref={primaryRef}
              onClick={onClose}
              sx={{ flex: 1, py: 1.75, borderRadius: 2, bgcolor: AMBER, color: NAVY, fontSize: 14, fontWeight: 800, textTransform: 'none', boxShadow: '0 8px 24px rgba(245,166,35,0.3)', '&:hover': { bgcolor: AMBER }, '&:active': { transform: 'scale(0.98)' } }}
            >
              Got it
            </Button>
          )}
          <Button
            onClick={onClose}
            sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', px: 2.5, py: 1.75, fontSize: 14, fontWeight: 600, color: '#E2E8F0', textTransform: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
          >
            Not now
          </Button>
        </Stack>
      </Box>

      {isIOS && safari && !inApp && (
        <Box
          component={motion.div}
          aria-hidden="true"
          animate={{ y: ipad ? [0, -8, 0] : [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          sx={{ pointerEvents: 'none', position: 'fixed', left: '50%', zIndex: 10000, transform: 'translateX(-50%)', fontSize: 30, ...(ipad ? { top: 8 } : { bottom: 4 }) }}
        >
          <Box component="span" sx={{ color: AMBER, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.6))' }}>{ipad ? 'v' : '^'}</Box>
        </Box>
      )}
    </Box>
  );
}

function UpdateBanner({ onApply, onDismiss }) {
  return (
    <Box
      component={motion.div}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      sx={{ position: 'fixed', left: '50%', zIndex: 9998, width: 'calc(100% - 24px)', maxWidth: 384, transform: 'translateX(-50%)', bottom: 'max(env(safe-area-inset-bottom), 12px)', mb: 9 }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ borderRadius: 2, px: 2, py: 1.5, color: '#fff', boxShadow: '0 16px 40px rgba(0,0,0,0.3)', bgcolor: NAVY }}>
        <RefreshIcon sx={{ fontSize: 18, color: AMBER }} />
        <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>A new version is ready.</Typography>
        <Button
          onClick={onApply}
          sx={{ borderRadius: 1.5, px: 1.5, py: 0.75, minWidth: 0, bgcolor: AMBER, color: NAVY, fontSize: 12, fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: AMBER } }}
        >
          Refresh
        </Button>
        <IconButton onClick={onDismiss} aria-label="Dismiss" sx={{ color: '#94A3B8', p: 0.5 }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>
    </Box>
  );
}

function ZapGlyph() {
  return (
    <Box component="svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
    </Box>
  );
}
function BellGlyph() {
  return (
    <Box component="svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Box>
  );
}
function WifiOffGlyph() {
  return (
    <Box component="svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l22 22" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <path d="M12 20h.01" />
    </Box>
  );
}
function DownloadGlyph({ size = 20 }) {
  return (
    <Box component="svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </Box>
  );
}

export default function PwaPrompts() {
  const { installed, platform, canPromptNatively, install } = usePwaInstall();
  const { updateReady, applyUpdate, dismiss } = useServiceWorkerUpdate();
  const [open, setOpen] = useState(false);
  const autoShown = useRef(false);

  useEffect(() => {
    if (installed || isNativeApp() || autoShown.current || !shouldShowInstallPrompt()) return;
    const eligible = platform === 'ios' || canPromptNatively || platform === 'android';
    if (!eligible) return;
    const t = setTimeout(
      () => {
        autoShown.current = true;
        setOpen(true);
      },
      canPromptNatively || platform === 'ios' ? 4000 : 8000
    );
    return () => clearTimeout(t);
  }, [installed, platform, canPromptNatively]);

  useEffect(() => {
    const on = () => !installed && setOpen(true);
    window.addEventListener(OPEN_INSTALL_EVENT, on);
    return () => window.removeEventListener(OPEN_INSTALL_EVENT, on);
  }, [installed]);

  const close = () => {
    setOpen(false);
    rememberDismissed();
  };
  const doInstall = async () => {
    await install();
    setOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {open && !installed && (
          <InstallDialog platform={platform} canPromptNatively={canPromptNatively} onInstall={doInstall} onClose={close} />
        )}
      </AnimatePresence>
      <AnimatePresence>{updateReady && <UpdateBanner onApply={applyUpdate} onDismiss={dismiss} />}</AnimatePresence>
    </>
  );
}
