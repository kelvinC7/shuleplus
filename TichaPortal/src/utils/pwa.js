import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

const LS_KEY = 'ticha_pwa_install_v1';
export const OPEN_INSTALL_EVENT = 'ticha:open-install-guide';

/* ── Environment detection ───────────────────────────────────── */

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true // iOS Safari
  );
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iPadOS13 = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1; // iPad pretending to be a Mac
  return /iPad|iPhone|iPod/.test(ua) || iPadOS13;
}

export function isIPad() {
  return isIOS() && (/iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
}

/** Facebook / Instagram / TikTok / LinkedIn / WeChat / Line… in-app browsers can't install anything. */
export function isInAppBrowser() {
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|musical_ly|LinkedInApp|Twitter|Snapchat/i.test(navigator.userAgent || '');
}

/** On iOS only real Safari (and, since iOS 16.4, Chrome/Edge/Firefox via Share) can add to Home Screen. */
export function isIOSSafari() {
  const ua = navigator.userAgent || '';
  return isIOS() && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) && !isInAppBrowser();
}

export function isNativeApp() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/* ── Snooze / dismissal memory ───────────────────────────────── */

const DAY = 24 * 60 * 60 * 1000;

function readState() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch {
    return {};
  }
}
function writeState(next) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

export function shouldShowInstallPrompt() {
  const { dismissedAt = 0, dismissCount = 0, installed } = readState();
  if (installed) return false;
  // 1st "not now" → 2 days, 2nd → 7 days, 3rd+ → 30 days
  const wait = dismissCount <= 1 ? 2 * DAY : dismissCount === 2 ? 7 * DAY : 30 * DAY;
  return Date.now() - dismissedAt > (dismissCount ? wait : 0);
}

export function rememberDismissed() {
  const s = readState();
  writeState({ ...s, dismissedAt: Date.now(), dismissCount: (s.dismissCount || 0) + 1 });
}
export function rememberInstalled() {
  writeState({ ...readState(), installed: true });
}

/* ── Service worker registration + update notice ─────────────── */

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || isNativeApp()) return;
  if (import.meta.env.DEV) return; // avoid stale caches while developing
  window.addEventListener('load', () => {
    const hadController = !!navigator.serviceWorker.controller; // false on the very first visit
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        const announce = () => window.dispatchEvent(new CustomEvent('ticha:sw-update', { detail: reg }));
        if (reg.waiting && navigator.serviceWorker.controller) announce();
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          nw?.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) announce();
          });
        });
        // Look for a new version whenever the app comes back to the foreground.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      })
      .catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded || !hadController) return; // first install: nothing to reload
      reloaded = true;
      window.location.reload();
    });
  });
}

export function applyServiceWorkerUpdate(reg) {
  reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
}

/* ── React hooks ─────────────────────────────────────────────── */

export function useServiceWorkerUpdate() {
  const [reg, setReg] = useState(null);
  useEffect(() => {
    const on = (e) => setReg(e.detail);
    window.addEventListener('ticha:sw-update', on);
    return () => window.removeEventListener('ticha:sw-update', on);
  }, []);
  return { updateReady: !!reg, applyUpdate: () => applyServiceWorkerUpdate(reg), dismiss: () => setReg(null) };
}

/**
 * Everything the install UI needs.
 *  - platform: 'ios' | 'android' | 'desktop'
 *  - canPromptNatively: Chrome/Edge/Samsung gave us the real install prompt
 */
export function usePwaInstall() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone() || isNativeApp());

  useEffect(() => {
    const onBefore = (e) => {
      e.preventDefault(); // keep it so we can trigger it from our own button
      setDeferred(e);
    };
    const onInstalled = () => {
      rememberInstalled();
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBefore);
    window.addEventListener('appinstalled', onInstalled);
    const mq = window.matchMedia?.('(display-mode: standalone)');
    const onMq = () => setInstalled(isStandalone());
    mq?.addEventListener?.('change', onMq);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore);
      window.removeEventListener('appinstalled', onInstalled);
      mq?.removeEventListener?.('change', onMq);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return 'unavailable';
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'accepted') rememberInstalled();
    return outcome;
  }, [deferred]);

  const ios = isIOS();
  const android = /Android/i.test(navigator.userAgent || '');
  return {
    installed,
    platform: ios ? 'ios' : android ? 'android' : 'desktop',
    canPromptNatively: !!deferred,
    install,
  };
}
