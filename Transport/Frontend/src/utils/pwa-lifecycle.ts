const DISMISS_KEY = 'transport_pwa_install_dismissed';

export function isPwaDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DISMISS_KEY) === '1';
}

export function dismissPwaInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DISMISS_KEY, '1');
}

export function clearPwaInstallDismiss(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DISMISS_KEY);
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Clears service workers + caches after user removes the app or for a clean reinstall. */
export async function resetPwaOnDevice(): Promise<void> {
  if (typeof window === 'undefined') return;
  clearPwaInstallDismiss();
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}

export function maybeResetPwaFromQuery(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('reset-pwa') !== '1') return;
  params.delete('reset-pwa');
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
  void resetPwaOnDevice().finally(() => {
    window.history.replaceState({}, '', next);
  });
}
