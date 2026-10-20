'use client';

import { useEffect, useRef } from 'react';
import {
  FEE_REMINDER_PAY_EVENT,
  type FeeReminderPayDetail,
} from '@/LandingPage/services/fee-reminders';

/**
 * Opens pay-fees when user taps a reminder notification / Pay now,
 * or lands with `?pay=fees&code=…`.
 */
export function useFeeReminderPayDeepLink(
  onPay: (code: string) => void | Promise<void>
) {
  const onPayRef = useRef(onPay);
  onPayRef.current = onPay;
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const run = (code: string | null | undefined) => {
      const trimmed = (code || '').trim();
      if (!trimmed) return;
      if (handledRef.current === trimmed) return;
      handledRef.current = trimmed;
      void onPayRef.current(trimmed);
      // Allow the same code again after a short delay (another reminder)
      window.setTimeout(() => {
        if (handledRef.current === trimmed) handledRef.current = null;
      }, 2500);
    };

    const params = new URLSearchParams(window.location.search);
    if (params.get('pay') === 'fees') {
      const code = params.get('code');
      if (code) run(code);
      params.delete('pay');
      params.delete('code');
      params.delete('reminder');
      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', next || '/');
    }

    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<FeeReminderPayDetail>).detail;
      run(detail?.code);
    };
    window.addEventListener(FEE_REMINDER_PAY_EVENT, onCustom);

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'FEE_REMINDER_PAY') {
        run(e.data.code as string | undefined);
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener(FEE_REMINDER_PAY_EVENT, onCustom);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);
}
