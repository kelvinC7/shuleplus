'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import {
  getDeferredInstallPrompt,
  setDeferredInstallPrompt,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from '@/utils/pwa-install-bridge';
import { isStandaloneDisplayMode } from '@/utils/pwa-lifecycle';

export function PwaInstallSidebarButton() {
  const [ready, setReady] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplayMode()) return;

    const sync = () => setReady(Boolean(getDeferredInstallPrompt()));
    const unsub = subscribeInstallPrompt(sync);
    sync();
    return unsub;
  }, []);

  const install = useCallback(async () => {
    const deferred = getDeferredInstallPrompt();
    if (!deferred) {
      setHintOpen(true);
      return;
    }
    await deferred.prompt();
    await deferred.userChoice;
    setDeferredInstallPrompt(null);
    setReady(false);
  }, []);

  if (isStandaloneDisplayMode()) return null;

  return (
    <>
      <button
        type="button"
        className="mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/90 ring-1 ring-white/15 hover:bg-white/10"
        onClick={() => void install()}
      >
        <Download size={18} className="shrink-0 text-primary" />
        Install app
      </button>
      {hintOpen ? (
        <div
          className="mb-2 rounded-lg bg-white/10 px-3 py-2 text-[11px] leading-snug text-white/75"
          role="status"
        >
          If Chrome does not show Install here yet: refresh once, use the site for a minute, then try again. Or
          open the menu (⋮) → <strong className="text-white">Install ShulePlus Transport</strong> / Save and
          share → Install. On iPhone: Share → Add to Home Screen.
          <button type="button" className="mt-2 block text-primary underline" onClick={() => setHintOpen(false)}>
            Close
          </button>
        </div>
      ) : ready ? (
        <p className="mb-2 px-1 text-[10px] text-emerald-300/90">Install is available. Click above.</p>
      ) : null}
    </>
  );
}
