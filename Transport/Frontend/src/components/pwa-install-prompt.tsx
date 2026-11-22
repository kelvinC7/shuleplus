'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import {
  getDeferredInstallPrompt,
  setDeferredInstallPrompt,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from '@/utils/pwa-install-bridge';
import {
  dismissPwaInstallPrompt,
  isPwaDismissed,
  isStandaloneDisplayMode,
} from '@/utils/pwa-lifecycle';

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandaloneDisplayMode()) return;

    const sync = () => {
      const d = getDeferredInstallPrompt();
      setDeferred(d);
      if (d && !isPwaDismissed()) setHidden(false);
    };

    const unsub = subscribeInstallPrompt(sync);
    sync();
    return unsub;
  }, []);

  const dismiss = useCallback(() => {
    dismissPwaInstallPrompt();
    setHidden(true);
    setDeferred(null);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        dismissPwaInstallPrompt();
      }
    } finally {
      setDeferredInstallPrompt(null);
      setDeferred(null);
      setHidden(true);
    }
  }, [deferred]);

  if (hidden || !deferred || isPwaDismissed()) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[9000] mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:bottom-6 sm:left-auto sm:right-6">
      <div className="flex items-start gap-3">
        <img
          src="/yellow-icon.png"
          alt=""
          className="h-12 w-12 shrink-0 object-contain"
          width={48}
          height={48}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#000435]">Install ShulePlus Transport</p>
          <p className="mt-0.5 text-xs leading-snug text-muted">
            Add to your home screen for quick access. Sign in when you open the app.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-sm" onClick={() => void install()}>
              <Download size={16} />
              Install app
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={dismiss}>
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg p-1 text-muted hover:bg-slate-100"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
