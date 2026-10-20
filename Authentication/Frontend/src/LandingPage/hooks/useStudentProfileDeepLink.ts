'use client';

import { useEffect, useRef } from 'react';

/**
 * Reopens the student profile modal when landing with `?lookup=profile&code=…`
 * (e.g. from the mini-website unavailable page).
 */
export function useStudentProfileDeepLink(
  onLookup: (code: string) => void | Promise<void>
) {
  const onLookupRef = useRef(onLookup);
  onLookupRef.current = onLookup;
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const run = (code: string | null | undefined) => {
      const trimmed = (code || '').trim();
      if (!trimmed) return;
      if (handledRef.current === trimmed) return;
      handledRef.current = trimmed;
      void onLookupRef.current(trimmed);
      window.setTimeout(() => {
        if (handledRef.current === trimmed) handledRef.current = null;
      }, 2500);
    };

    const params = new URLSearchParams(window.location.search);
    if (params.get('lookup') === 'profile') {
      const code = params.get('code');
      if (code) run(code);
      params.delete('lookup');
      params.delete('code');
      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', next || '/');
    }
  }, []);
}
