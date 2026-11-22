'use client';

import { useState } from 'react';
import { CheckCircle2, ShieldCheck, Loader2, XCircle } from 'lucide-react';
import type { SchoolTrip } from '@/types/shuletrip';
import { submitTripConsent } from '@/lib/shuletrip-api';
import { tripConsentState } from '@/lib/shuletrip-utils';
import { cn } from '@/lib/utils';

const CHECKS = [
  { key: 'read' as const, label: 'I have read and understood the trip details.' },
  { key: 'approve' as const, label: 'I approve my child to participate in this trip.' },
  { key: 'emergency' as const, label: 'Emergency contact information on the manifest is correct.' },
];

const REVIEW_ITEMS = [
  'Transport and supervision are arranged by the school.',
  'Trip schedule and destination match what the school published.',
  'I can reach the school using the contact number on this trip.',
];

export function TripConsentForm({ trip, onUpdated }: { trip: SchoolTrip; onUpdated: (t: SchoolTrip) => void }) {
  const state = tripConsentState(trip);
  const [checks, setChecks] = useState({ read: false, approve: false, emergency: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked = CHECKS.every((c) => checks[c.key]);

  if (state === 'approved') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="size-7 shrink-0 text-emerald-600" />
          <div>
            <p className="text-lg font-extrabold text-emerald-900">Consent recorded</p>
            <p className="mt-1 text-sm text-emerald-800">
              Signed by <span className="font-semibold">{trip.consent?.by}</span>
              {trip.consent?.at ? ` · ${trip.consent.at}` : null}
            </p>
            {trip.consent?.atIso ? (
              <p className="mt-1 text-xs text-emerald-700">{new Date(trip.consent.atIso).toLocaleString()}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (state === 'declined') {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <XCircle className="size-7 shrink-0 text-red-600" />
          <div>
            <p className="text-lg font-extrabold text-red-900">Participation declined</p>
            <p className="mt-1 text-sm text-red-800">
              Recorded by {trip.consent?.by} · {trip.consent?.at}
            </p>
          </div>
        </div>
      </div>
    );
  }

  async function send(declined: boolean) {
    setBusy(true);
    setError(null);
    try {
      const updated = await submitTripConsent(trip.id, {
        declined,
        confirmations: declined ? undefined : checks,
      });
      onUpdated(updated);
    } catch {
      setError('Could not save consent. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="consent" className="scroll-mt-24 space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck className="size-5 text-[#000435]" />
        <h3 className="text-lg font-extrabold text-[var(--yo-navy)]">Guardian consent</h3>
        <span className="rounded-full bg-[var(--yo-amber)]/35 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#7a4d00]">
          Action required
        </span>
      </div>
      <p className="text-sm leading-relaxed text-[var(--yo-muted)]">
        For <span className="font-semibold text-[var(--yo-navy)]">{trip.studentName}</span> ·{' '}
        {trip.title}. Your decision is shared with the school in ShuleTrip.
      </p>

      <ul className="space-y-2">
        {REVIEW_ITEMS.map((line) => (
          <li
            key={line}
            className="flex gap-2.5 rounded-xl border border-[var(--yo-line)]/60 bg-slate-50/80 px-3 py-2.5 text-sm font-medium text-[var(--yo-navy)]"
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
            {line}
          </li>
        ))}
      </ul>

      <div className="space-y-3 rounded-2xl border border-[var(--yo-line)] bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--yo-muted)]">Confirm each statement</p>
        {CHECKS.map((c) => (
          <label
            key={c.key}
            className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl px-1 py-1 text-sm font-semibold text-[var(--yo-navy)]"
          >
            <input
              type="checkbox"
              checked={checks[c.key]}
              onChange={(e) => setChecks((prev) => ({ ...prev, [c.key]: e.target.checked }))}
              className="mt-1 size-[18px] rounded border-[var(--yo-line)] accent-[#000435]"
            />
            {c.label}
          </label>
        ))}
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2.5 sm:flex-row-reverse sm:items-stretch">
        <button
          type="button"
          disabled={busy || !allChecked}
          onClick={() => send(false)}
          className={cn(
            'inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#000435] px-4 text-sm font-extrabold text-white transition',
            (!allChecked || busy) && 'opacity-50'
          )}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Approve trip
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => send(true)}
          className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border-2 border-[var(--yo-line)] px-4 text-sm font-bold text-[var(--yo-navy)] transition hover:bg-slate-50"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
