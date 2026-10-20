'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Radio, ShieldCheck } from 'lucide-react';
import { fetchSmsProviderStatus, type SmsProviderStatusLive } from '@/lib/smart-access-api';
import { SmsCard, SmsStatusPill } from './sms-page-shell';

export function SmsProviderBanner() {
  const [status, setStatus] = useState<SmsProviderStatusLive | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchSmsProviderStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SmsCard className="animate-pulse text-sm text-muted">Checking SMS provider…</SmsCard>
    );
  }

  if (!status) {
    return (
      <SmsCard className="flex items-center gap-3 border-amber-200 bg-amber-50/80">
        <AlertTriangle className="h-5 w-5 text-amber-700" />
        <p className="text-sm text-amber-950">Could not load SMS status. Redeploy Authentication backend.</p>
      </SmsCard>
    );
  }

  const ok = status.ready && status.apiKeyConfigured;

  return (
    <SmsCard
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
        ok ? 'border-emerald-200/80 bg-gradient-to-r from-white to-emerald-50/50' : 'border-amber-200 bg-amber-50/60'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {ok ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        </span>
        <div>
          <p className="text-sm font-bold text-navy">{status.provider}</p>
          <p className="mt-0.5 text-xs text-muted">
            Sender <span className="font-semibold text-navy">{status.senderId}</span>
            {status.fromNumber ? ` · ${status.fromNumber}` : null}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
            <Radio className="h-3 w-3" /> {status.route}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SmsStatusPill status={ok ? 'Connected' : 'Setup required'} />
        {!status.apiKeyConfigured ? (
          <span className="text-xs font-medium text-amber-800">Set SMS_API_KEY on auth-api server</span>
        ) : null}
      </div>
    </SmsCard>
  );
}
