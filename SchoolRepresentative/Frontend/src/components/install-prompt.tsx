'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import { brand } from '@/theme/theme';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'DirectorConsole_installDismissedAt';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const steps = [
  {
    icon: <IosShareRoundedIcon fontSize="small" />,
    title: 'Tap the Share button',
    detail: 'Find it in the browser bar at the bottom of the screen.',
  },
  {
    icon: <AddBoxOutlinedIcon fontSize="small" />,
    title: 'Choose “Add to Home Screen”',
    detail: 'Scroll down the share sheet if you do not see it.',
  },
  {
    icon: <DownloadRoundedIcon fontSize="small" />,
    title: 'Tap “Add”',
    detail: 'Director Console will appear on your home screen.',
  },
];

export function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < COOLDOWN_MS) return;

    const ua = navigator.userAgent;
    const isIosDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    let timer: ReturnType<typeof setTimeout> | undefined;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setOpen(true);
    };

    const onInstalled = () => {
      setOpen(false);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    if (isIosDevice) {
      setIsIos(true);
      timer = setTimeout(() => setOpen(true), 2200);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === 'accepted') setOpen(false);
    else dismiss();
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={dismiss}
      slotProps={{
        paper: {
          sx: {
            width: '100%',
            maxWidth: 520,
            mx: 'auto',
            bgcolor: '#fff',
            backgroundImage: 'none',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            pb: 'env(safe-area-inset-bottom)',
          },
        },
      }}
    >
      <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'rgba(8,19,42,0.15)', mx: 'auto', mt: 1.25 }} />

      <Box sx={{ px: 3, pt: 2, pb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1.5,
              bgcolor: brand.navy,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Box
              component="img"
              src="/white-icon-no-bg.png"
              alt="Director Console"
              sx={{ width: 30, height: 30, objectFit: 'contain' }}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 800, color: brand.navy, lineHeight: 1.3 }}>
              Install Director Console
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: 'text.secondary', lineHeight: 1.55 }}>
              Add it to your home screen for one-tap access and a full-screen, app-like experience.
            </Typography>
          </Box>
          <IconButton aria-label="Close" onClick={dismiss} size="small" sx={{ mt: -0.5, mr: -1 }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>

        {isIos ? (
          <Stack spacing={1.5} sx={{ mt: 2.5 }}>
            {steps.map((step, index) => (
              <Stack key={step.title} direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: 'rgba(8,19,42,0.06)',
                    color: brand.navy,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {index + 1}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ color: brand.navy, display: 'flex' }}>{step.icon}</Box>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: brand.navy }}>
                      {step.title}
                    </Typography>
                  </Stack>
                  <Typography sx={{ mt: 0.25, fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
                    {step.detail}
                  </Typography>
                </Box>
              </Stack>
            ))}
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              onClick={dismiss}
              sx={{ mt: 1, py: 1.1, fontWeight: 700 }}
            >
              Got it
            </Button>
          </Stack>
        ) : (
          <Stack spacing={1} sx={{ mt: 2.5 }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => void install()}
              startIcon={<DownloadRoundedIcon />}
              sx={{ py: 1.1, fontWeight: 700 }}
            >
              Add to home screen
            </Button>
            <Button fullWidth onClick={dismiss} sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Not now
            </Button>
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
