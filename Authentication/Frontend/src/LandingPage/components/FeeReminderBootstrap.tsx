'use client';

import { useEffect, useState } from 'react';
import { Bell, Wallet2, X } from 'lucide-react';
import {
  buildFeePayUrl,
  dispatchFeeReminderPay,
  FEE_REMINDER_SHOWN_EVENT,
  initFeeReminders,
  type FeeReminderShownDetail,
} from '@/LandingPage/services/fee-reminders';

/** Boots daily fee reminder checks and shows an in-app Pay now banner. */
export function FeeReminderBootstrap() {
  const [banner, setBanner] = useState<FeeReminderShownDetail | null>(null);

  useEffect(() => {
    const stop = initFeeReminders();

    const onShown = (e: Event) => {
      const detail = (e as CustomEvent<FeeReminderShownDetail>).detail;
      if (!detail) return;
      setBanner(detail);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'FEE_REMINDER_PAY') return;
      const code = event.data.code as string | undefined;
      const url = (event.data.url as string | undefined) || buildFeePayUrl(code);
      dispatchFeeReminderPay({ code, planId: event.data.planId, url });
      if (typeof window !== 'undefined' && !window.location.search.includes('pay=fees')) {
        const onLanding = window.location.pathname === '/' || window.location.pathname === '';
        if (!onLanding) {
          window.location.assign(url);
        }
      }
    };

    window.addEventListener(FEE_REMINDER_SHOWN_EVENT, onShown);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => {
      stop();
      window.removeEventListener(FEE_REMINDER_SHOWN_EVENT, onShown);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);

  function payNow() {
    const code = banner?.plan?.studentUid;
    const url = buildFeePayUrl(code, banner?.plan?.id);
    dispatchFeeReminderPay({ code, planId: banner?.plan?.id, url });
    setBanner(null);
    const onLanding = window.location.pathname === '/' || window.location.pathname === '';
    if (!onLanding || !code) {
      window.location.assign(url);
    }
  }

  if (!banner) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center p-4 sm:p-5">
      <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-navy-900/10 bg-white p-4 shadow-[0_20px_50px_-20px_rgba(0,4,53,0.45)]">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FCB038]/15 text-[#FCB038]">
          <Bell className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-navy-900">{banner.title}</p>
          <p className="mt-1 text-[12.5px] leading-snug text-navy-700/65">{banner.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={payNow}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#000435] px-3.5 text-xs font-semibold text-white transition hover:bg-navy-800"
            >
              <Wallet2 className="h-3.5 w-3.5 text-[#FCB038]" />
              Pay now
            </button>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="inline-flex h-9 items-center rounded-xl border border-navy-900/10 px-3 text-xs font-semibold text-navy-900 hover:bg-navy-900/[0.03]"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss reminder"
          onClick={() => setBanner(null)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-navy-900/40 hover:bg-navy-900/[0.05] hover:text-navy-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
