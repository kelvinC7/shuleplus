import { useEffect, useRef } from 'react';

/**
 * Re-runs a loader automatically so data stays in sync with upstream changes
 * (e.g. Timetable config/generation/entry updating teacher courses).
 *
 * @param {() => void | Promise<void>} load - stable callback that fetches fresh data
 * @param {{ enabled?: boolean, intervalMs?: number, onFocus?: boolean }} [options]
 */
export default function useAutoRefresh(load, options = {}) {
  const { enabled = true, intervalMs = 60000, onFocus = true } = options;
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    if (!enabled) return undefined;

    const run = () => {
      if (document.visibilityState === 'hidden') return;
      void loadRef.current();
    };

    let timer;
    if (intervalMs > 0) {
      timer = window.setInterval(run, intervalMs);
    }

    const handleFocus = () => {
      if (document.visibilityState !== 'hidden') void loadRef.current();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void loadRef.current();
    };

    if (onFocus) {
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      if (timer) window.clearInterval(timer);
      if (onFocus) {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [enabled, intervalMs, onFocus]);
}
