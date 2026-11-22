'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, Download, Receipt, Share2, Smartphone, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type Platform = 'ios' | 'android' | 'desktop';

const DISMISS_KEY = 'yoshule:pwa-install-dismissed-at';
const DISMISS_DAYS = 7;

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>('desktop');

  useEffect(() => {
    const standalone = isStandalone();
    setInstalled(standalone);
    setPlatform(detectPlatform());

    let dismissedRecently = false;
    try {
      const until = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
      dismissedRecently = Number.isFinite(until) && Date.now() < until;
    } catch {
      dismissedRecently = false;
    }
    setDismissed(dismissedRecently);
    setReady(true);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  // Close the sheet with Escape and prevent background scrolling while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function remindLater() {
    try {
      window.localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000)
      );
    } catch {
      // Storage may be unavailable (private mode); dismiss for this session only.
    }
    setDismissed(true);
    setOpen(false);
  }

  async function install() {
    if (!installPrompt) {
      setOpen(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setOpen(false);
    }
  }

  if (!ready || installed) return null;

  const manual = !installPrompt;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (installPrompt) void install();
          else setOpen(true);
        }}
        className="fixed bottom-24 right-4 z-50 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#13213D] px-4 text-sm font-semibold text-white shadow-lg shadow-[#13213D]/25 ring-1 ring-white/10 transition hover:bg-[#1b2d52] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"
        aria-label="Install the yoShule Parent app"
      >
        <Download size={17} aria-hidden="true" className="text-[#F5A623]" />
        Install app
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-[#0B1220]/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            aria-describedby="pwa-install-description"
            className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative bg-gradient-to-br from-[#13213D] via-[#182a4c] to-[#1b2d52] px-5 pb-6 pt-5 text-white">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/25 sm:hidden" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close install dialog"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon-192.png"
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-2xl bg-white/10 p-0.5 shadow-lg ring-1 ring-white/15"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A623]">
                    yoShule Parent
                  </p>
                  <h2 id="pwa-install-title" className="truncate text-lg font-bold leading-tight">
                    Install the app
                  </h2>
                </div>
              </div>

              <p id="pwa-install-description" className="mt-3 text-sm leading-6 text-white/75">
                Add yoShule Parent to your home screen for a full-screen, app-like experience.
              </p>
            </div>

            <div className="px-5 py-4">
              <ul className="space-y-3">
                {[
                  { icon: Receipt, text: 'Pay fees and follow every transaction' },
                  { icon: Bell, text: 'Get attendance, results and school alerts' },
                  { icon: Smartphone, text: 'Works offline and opens without the browser bar' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FFF3DC] text-[#C87800]">
                      <Icon size={15} aria-hidden="true" />
                    </span>
                    <span className="leading-6">{text}</span>
                  </li>
                ))}
              </ul>

              {manual ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
                  <p className="text-sm font-semibold text-[#13213D]">
                    {platform === 'ios' ? 'On iPhone or iPad' : 'Add it from your browser'}
                  </p>
                  <ol className="mt-2 space-y-2 text-sm text-slate-600">
                    {platform === 'ios' ? (
                      <>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[11px] font-bold text-[#13213D] shadow-sm">
                            1
                          </span>
                          <span>
                            Tap <Share2 size={13} className="mx-0.5 inline text-[#13213D]" aria-hidden="true" />{' '}
                            Share in the Safari toolbar.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[11px] font-bold text-[#13213D] shadow-sm">
                            2
                          </span>
                          <span>Choose “Add to Home Screen”, then tap “Add”.</span>
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[11px] font-bold text-[#13213D] shadow-sm">
                            1
                          </span>
                          <span>Open the browser menu (⋮ or …).</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[11px] font-bold text-[#13213D] shadow-sm">
                            2
                          </span>
                          <span>Choose “Install app” or “Add to Home screen”.</span>
                        </li>
                      </>
                    )}
                  </ol>
                </div>
              ) : null}

              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void install()}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F5A623] px-4 text-sm font-bold text-[#13213D] transition hover:bg-[#FFC457] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#13213D] focus-visible:ring-offset-2"
                >
                  {manual ? <Check size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
                  {manual ? 'Got it' : 'Install now'}
                </button>
                <button
                  type="button"
                  onClick={remindLater}
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  Not now
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
