'use client';

import { useEffect } from 'react';
import { setDeferredInstallPrompt, type BeforeInstallPromptEvent } from '@/utils/pwa-install-bridge';
import { dismissPwaInstallPrompt, isPwaDismissed, maybeResetPwaFromQuery } from '@/utils/pwa-lifecycle';

export function PwaRegister() {
  useEffect(() => {
    maybeResetPwaFromQuery();

    const onBeforeInstall = (e: Event) => {
      if (isPwaDismissed()) return;
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      dismissPwaInstallPrompt();
      setDeferredInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return null;
}
