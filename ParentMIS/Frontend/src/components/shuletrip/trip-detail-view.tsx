'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  Package,
  Phone,
  Shield,
  User,
} from 'lucide-react';
import type { SchoolTrip } from '@/types/shuletrip';
import {
  countdownLabel,
  estimateDuration,
  statusBadge,
  tripCode,
  tripConsentState,
  tripDateTimeLabel,
  tripLocationLabel,
} from '@/lib/shuletrip-utils';
import { TripConsentForm } from '@/components/shuletrip/trip-consent-form';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

type TabId = 'overview' | 'schedule' | 'contacts' | 'consent' | 'packing';

const TABS: Array<{ id: TabId; label: string; icon: typeof MapPin }> = [
  { id: 'overview', label: 'Overview', icon: MapPin },
  { id: 'schedule', label: 'Schedule', icon: CalendarClock },
  { id: 'contacts', label: 'Contacts', icon: Phone },
  { id: 'consent', label: 'Consent', icon: ClipboardCheck },
  { id: 'packing', label: 'Packing', icon: Package },
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--yo-line)]/80 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--yo-navy)]">{value || '—'}</p>
    </div>
  );
}

export function TripDetailView({ trip: initial, onReload }: { trip: SchoolTrip; onReload?: () => void }) {
  const [trip, setTrip] = useState(initial);
  const [tab, setTab] = useState<TabId>('overview');
  const badge = statusBadge(trip);
  const dest = tripLocationLabel(trip.place);
  const departLabel = tripDateTimeLabel(trip, 'depart');
  const returnLabel = tripDateTimeLabel(trip, 'ret');
  const consent = tripConsentState(trip);

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-24 sm:space-y-5 sm:pb-10">
      <Link
        href="/shuletrip"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-[var(--yo-muted)] hover:text-[var(--yo-navy)]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All trips
      </Link>

      <header className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm">
        <div className="border-b border-border/60 px-4 py-5 sm:px-6 sm:py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{trip.date}</p>
          <h1 className="mt-1 text-xl font-bold leading-tight tracking-tight text-navy sm:text-2xl">{trip.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-navy">
              <MapPin className="size-4 shrink-0 text-muted" aria-hidden />
              {dest}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">{badge.label}</span>
            {consent === 'awaiting' ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                Needs consent
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm font-medium text-muted">{countdownLabel(trip)}</p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-[var(--yo-line)] border-t border-[var(--yo-line)] text-center sm:grid-cols-4">
          {[
            ['Learner', trip.studentName],
            ['Departure', departLabel],
            ['Return', returnLabel],
            ['Trip code', tripCode(trip)],
          ].map(([k, v]) => (
            <div key={k} className="px-2 py-3 sm:px-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--yo-muted)]">{k}</p>
              <p className="mt-0.5 text-xs font-bold leading-snug text-[var(--yo-navy)] sm:text-sm">{v}</p>
            </div>
          ))}
        </div>
      </header>

      {consent === 'awaiting' ? (
        <button
          type="button"
          onClick={() => setTab('consent')}
          className="flex w-full items-center gap-3 rounded-2xl border border-[var(--yo-amber)]/50 bg-[var(--yo-amber-soft)]/80 px-4 py-3.5 text-left transition hover:bg-[var(--yo-amber-soft)]"
        >
          <Shield className="size-5 shrink-0 text-[#7a4d00]" />
          <span className="flex-1 text-sm font-bold text-[var(--yo-navy)]">Your consent is required — tap to review and approve</span>
        </button>
      ) : null}

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-min gap-1 rounded-2xl border border-[var(--yo-line)]/80 bg-white p-1 shadow-sm">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:gap-2 sm:px-3.5 sm:text-sm',
                tab === id ? 'bg-[#000435] text-white' : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Icon className="size-3.5 sm:size-4" aria-hidden />
              {label}
              {id === 'consent' && consent === 'awaiting' ? (
                <span className="size-2 rounded-full bg-[var(--yo-amber)]" aria-hidden />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--yo-line)]/80 bg-white p-4 shadow-sm sm:p-6">
        {tab === 'overview' ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Trip name" value={trip.title} />
              <InfoRow label="Application ref." value={tripCode(trip)} />
              <InfoRow label="Destination" value={dest} />
              <InfoRow label="Duration" value={estimateDuration(trip)} />
              <InfoRow label="Departure" value={departLabel} />
              <InfoRow label="Return" value={returnLabel} />
              <InfoRow label="Trip leader" value={trip.teacher} />
              <InfoRow label="School contact" value={trip.ph} />
              <InfoRow label="Trip fee" value={formatCurrency(trip.cost)} />
              <InfoRow label="Amount paid" value={formatCurrency(trip.paid)} />
            </div>
            {trip.purpose?.trim() ? (
              <div className="rounded-xl border border-border/60 bg-slate-50/80 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Purpose & details</p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-relaxed text-[var(--yo-navy)]">
                  {trip.purpose}
                </p>
              </div>
            ) : null}
            {trip.pack.length > 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Class / notes</p>
                <p className="mt-1 text-sm font-medium text-[var(--yo-navy)]">{trip.pack.join(' · ')}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'schedule' ? (
          <ol className="relative space-y-0 border-l-2 border-[var(--yo-amber)]/60 pl-5">
            {trip.plan.map(([time, label], i) => (
              <li key={`${time}-${i}`} className="relative pb-5 last:pb-0">
                <span className="absolute -left-[1.35rem] top-1 size-2.5 rounded-full bg-[var(--yo-amber)] ring-4 ring-white" />
                <p className="text-xs font-bold text-[var(--yo-muted)]">{time}</p>
                <p className="text-sm font-semibold text-[var(--yo-navy)]">{label}</p>
              </li>
            ))}
          </ol>
        ) : null}

        {tab === 'contacts' ? (
          <div className="space-y-4">
            <ContactCard role="Trip leader" name={trip.teacher} phone={trip.ph} />
            <div className="rounded-xl border border-red-200/80 bg-red-50/60 p-4">
              <p className="flex items-center gap-2 text-sm font-extrabold text-red-900">
                <Shield className="size-4" /> Emergency
              </p>
              <ul className="mt-2 space-y-1.5 text-sm font-semibold text-red-950/90">
                <li>School line: {trip.ph || 'See trip leader'}</li>
                <li>Rwanda emergency: 112</li>
              </ul>
            </div>
          </div>
        ) : null}

        {tab === 'consent' ? (
          <TripConsentForm
            trip={trip}
            onUpdated={(t) => {
              setTrip(t);
              onReload?.();
            }}
          />
        ) : null}

        {tab === 'packing' ? (
          <ul className="divide-y divide-[var(--yo-line)] rounded-xl border border-[var(--yo-line)]">
            {trip.pack.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[var(--yo-muted)]">No packing list from the school yet.</li>
            ) : (
              trip.pack.map((item) => (
                <li key={item} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[var(--yo-navy)]">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function ContactCard({ role, name, phone }: { role: string; name: string; phone: string }) {
  return (
    <div className="rounded-xl border border-[var(--yo-line)] bg-slate-50/50 p-4">
      <div className="flex gap-3">
        <div className="grid size-12 place-items-center rounded-xl bg-white text-[var(--yo-navy)] shadow-sm">
          <User className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--yo-muted)]">{role}</p>
          <p className="font-extrabold text-[var(--yo-navy)]">{name}</p>
        </div>
      </div>
      {phone?.trim() ? (
        <a
          href={`tel:${phone.replace(/\s/g, '')}`}
          className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#000435] text-sm font-bold text-white"
        >
          <Phone className="size-4" /> Call {phone}
        </a>
      ) : null}
    </div>
  );
}
