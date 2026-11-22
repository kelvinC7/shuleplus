export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const READY_EVENT = 'transport:pwa-install-ready';

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function setDeferredInstallPrompt(event: BeforeInstallPromptEvent | null): void {
  deferredPrompt = event;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(READY_EVENT));
  }
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(READY_EVENT, listener);
  return () => window.removeEventListener(READY_EVENT, listener);
}
