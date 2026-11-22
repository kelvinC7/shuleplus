import { useEffect, useState, useCallback } from 'react';

const LS_KEY = 'director_pwa_install_v1';
export const OPEN_INSTALL_EVENT = 'director:open-install-guide';

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: fullscreen)').matches || window.navigator.standalone === true;
}
export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iPadOS13 = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS13;
}
export function isIPad() { return isIOS() && (/iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)); }
export function isInAppBrowser() { return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|musical_ly|LinkedInApp|Twitter|Snapchat/i.test(navigator.userAgent || ''); }
export function isIOSSafari() { const ua = navigator.userAgent || ''; return isIOS() && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) && !isInAppBrowser(); }

const DAY = 86400000;
function readState() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } }
function writeState(next) { try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {} }
export function shouldShowInstallPrompt() {
  const { dismissedAt = 0, dismissCount = 0, installed } = readState();
  if (installed) return false;
  const wait = dismissCount <= 1 ? 2 * DAY : dismissCount === 2 ? 7 * DAY : 30 * DAY;
  return Date.now() - dismissedAt > (dismissCount ? wait : 0);
}
export function rememberDismissed() { const s = readState(); writeState({ ...s, dismissedAt: Date.now(), dismissCount: (s.dismissCount || 0) + 1 }); }
export function rememberInstalled() { writeState({ ...readState(), installed: true }); }

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;
  if (window.Capacitor?.isNativePlatform?.()) return;
  window.addEventListener('load', () => {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      const announce = () => window.dispatchEvent(new CustomEvent('director:sw-update', { detail: reg }));
      if (reg.waiting && navigator.serviceWorker.controller) announce();
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) announce(); });
      });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded || !hadController) return; reloaded = true; window.location.reload(); });
  });
}
export function applyServiceWorkerUpdate(reg) { reg?.waiting?.postMessage({ type: 'SKIP_WAITING' }); }
export function useServiceWorkerUpdate() {
  const [reg, setReg] = useState(null);
  useEffect(() => { const on = (e) => setReg(e.detail); window.addEventListener('director:sw-update', on); return () => window.removeEventListener('director:sw-update', on); }, []);
  return { updateReady: !!reg, applyUpdate: () => applyServiceWorkerUpdate(reg), dismiss: () => setReg(null) };
}
export function usePwaInstall() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  useEffect(() => {
    const onBefore = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { rememberInstalled(); setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onBefore);
    window.addEventListener('appinstalled', onInstalled);
    const mq = window.matchMedia?.('(display-mode: standalone)');
    const onMq = () => setInstalled(isStandalone());
    mq?.addEventListener?.('change', onMq);
    return () => { window.removeEventListener('beforeinstallprompt', onBefore); window.removeEventListener('appinstalled', onInstalled); mq?.removeEventListener?.('change', onMq); };
  }, []);
  const install = useCallback(async () => {
    if (!deferred) return 'unavailable';
    deferred.prompt(); const { outcome } = await deferred.userChoice; setDeferred(null);
    if (outcome === 'accepted') rememberInstalled(); return outcome;
  }, [deferred]);
  const ios = isIOS(); const android = /Android/i.test(navigator.userAgent || '');
  return { installed, platform: ios ? 'ios' : android ? 'android' : 'desktop', canPromptNatively: !!deferred, install };
}
