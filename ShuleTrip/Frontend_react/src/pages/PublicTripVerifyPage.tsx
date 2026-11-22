import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { TripPassQr } from '@/components/trip-pass-qr';
import { BrandMark } from '@/components/brand-logo';
import { publicApi, type PublicTripVerification } from '@/services/public-api';
import { formatTripDateTime } from '@/schools/utils/trip-display';
import { cn } from '@/shared/cn';

function formatStatusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function VerifySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-28 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80" />
      <div className="h-64 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80" />
      <div className="h-12 rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80" />
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 sm:max-w-[65%] sm:text-right">{children}</dd>
    </div>
  );
}

export default function PublicTripVerifyPage() {
  const { reference: refParam } = useParams();
  const reference = decodeURIComponent(refParam ?? '');
  const [data, setData] = useState<PublicTripVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rosterOpen, setRosterOpen] = useState(false);

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      setError('Invalid link');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: res } = await publicApi.get<{ data: PublicTripVerification }>(
          `/public/trips/${encodeURIComponent(reference)}`
        );
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) {
          setData(null);
          setError('Trip not found or link expired.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  const allowed = data?.access.allowed ?? false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-[#f4f6fb] to-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3 sm:max-w-2xl">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark size={36} className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-navy">Trip verification</p>
              <p className="truncate text-xs text-slate-500">Official pass check</p>
            </div>
          </div>
          {data?.reference ? (
            <span className="hidden shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-600 sm:inline">
              {data.reference}
            </span>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 sm:max-w-2xl sm:py-8">
        {loading ? (
          <VerifySkeleton />
        ) : error || !data ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-red-100">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <ShieldAlert className="h-7 w-7 text-red-600" strokeWidth={2} />
            </div>
            <p className="mt-4 text-lg font-bold text-slate-900">{error ?? 'Not found'}</p>
            <p className="mt-2 text-sm text-slate-600">Check the QR code or reference and try again.</p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-muted"
            >
              Back to ShuleTrip
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status */}
            <section
              className={cn(
                'overflow-hidden rounded-2xl bg-white shadow-sm ring-1',
                allowed ? 'ring-emerald-200/80' : 'ring-red-200/80'
              )}
            >
              <div
                className={cn('h-1 w-full', allowed ? 'bg-emerald-500' : 'bg-red-500')}
                aria-hidden
              />
              <div className="p-5 sm:p-6">
                <div className="flex gap-4">
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                      allowed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    )}
                  >
                    {allowed ? (
                      <CheckCircle2 className="h-6 w-6" strokeWidth={2.25} />
                    ) : (
                      <Ban className="h-6 w-6" strokeWidth={2.25} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          allowed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        )}
                      >
                        {allowed ? 'Authorized' : 'Not authorized'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        {formatStatusLabel(data.status)}
                      </span>
                    </div>
                    <h1 className="mt-2 text-xl font-bold leading-snug text-navy sm:text-2xl">
                      {data.access.headline}
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{data.access.detail}</p>
                  </div>
                </div>

                {!allowed && data.governmentDecision ? (
                  <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-soft px-4 py-3 text-sm text-amber-950">
                    <span className="font-semibold">{data.governmentDecision.stageLabel}</span>
                    {' · '}
                    {String(data.governmentDecision.decision).replace(/_/g, ' ')}
                    {data.governmentDecision.reason ? (
                      <span className="mt-1 block font-normal text-amber-900/90">
                        {data.governmentDecision.reason}
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </section>

            {/* Trip summary */}
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6">
              <p className="font-mono text-xs font-semibold text-slate-500">{data.reference}</p>
              <h2 className="mt-1 text-lg font-bold text-navy sm:text-xl">{data.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{data.organizationName ?? 'School'}</p>
              {data.district ? (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                  {data.district}
                </p>
              ) : null}

              <dl className="mt-4">
                <DetailRow label="Destination">{data.destination ?? '—'}</DetailRow>
                <DetailRow label="Departure">{formatTripDateTime(data.departAt ?? null)}</DetailRow>
                <DetailRow label="Return">{formatTripDateTime(data.returnAt ?? null)}</DetailRow>
                <DetailRow label="Trip leader">{data.tripLeaderName ?? '—'}</DetailRow>
                {data.vehicle ? (
                  <DetailRow label="Transport">
                    {[data.vehicle.plateNumber, data.vehicle.driverName].filter(Boolean).join(' · ') ||
                      'Details pending'}
                  </DetailRow>
                ) : null}
              </dl>

              {data.purpose ? (
                <div className="mt-2 border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Purpose</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">{data.purpose}</p>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { n: data.counts.participants, label: 'Learners' },
                  { n: data.counts.staff, label: 'Staff' },
                  { n: data.counts.consentRecorded, label: 'Consents' },
                ].map(({ n, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200/60"
                  >
                    <span className="text-sm font-bold text-navy">{n}</span>
                    {label}
                  </span>
                ))}
              </div>
            </section>

            {/* Authorization (when allowed) */}
            {data.authorization && allowed ? (
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-emerald-200/60 sm:p-6">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                      Government authorization
                    </p>
                    <p className="mt-1 font-mono text-base font-bold text-navy sm:text-lg">
                      {data.authorization.authorizationNo}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {data.authorization.issuedAt
                        ? new Date(data.authorization.issuedAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '—'}
                      {data.authorization.issuedByName ? ` · ${data.authorization.issuedByName}` : ''}
                    </p>
                  </div>
                  <div className="hidden shrink-0 sm:block">
                    <TripPassQr reference={data.reference} size={88} />
                  </div>
                </div>
                {data.authorization.conditions.length > 0 ? (
                  <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                    {data.authorization.conditions.slice(0, 6).map((c, i) => (
                      <li key={`${i}-${c.slice(0, 24)}`} className="flex gap-2 text-sm text-slate-700">
                        <span className="font-mono text-xs font-bold text-slate-400">{i + 1}.</span>
                        <span className="leading-relaxed">{c}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-4 flex justify-center sm:hidden">
                  <TripPassQr reference={data.reference} size={96} />
                </div>
              </section>
            ) : null}

            {/* Roster — collapsed by default */}
            {data.participants.length > 0 ? (
              <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
                <button
                  type="button"
                  onClick={() => setRosterOpen((o) => !o)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
                  aria-expanded={rosterOpen}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-navy">
                    <Users className="h-4 w-4 text-slate-500" aria-hidden />
                    Registered learners
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                      {data.participants.length}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn('h-5 w-5 text-slate-400 transition-transform', rosterOpen && 'rotate-180')}
                    aria-hidden
                  />
                </button>
                {rosterOpen ? (
                  <ul className="max-h-72 space-y-0 overflow-y-auto border-t border-slate-100 px-5 pb-4 sm:px-6">
                    {data.participants.map((p) => (
                      <li
                        key={p.studentCode ?? p.fullName}
                        className="flex items-center justify-between gap-3 border-b border-slate-50 py-2.5 last:border-0"
                      >
                        <span className="text-sm font-medium text-slate-800">{p.fullName}</span>
                        <span className="shrink-0 text-xs text-slate-500">{p.classLabel ?? p.studentCode}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            <p className="pb-4 text-center text-[11px] leading-relaxed text-slate-500">
              This page is for checkpoint and school staff verification only. Do not share personal learner data
              publicly.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
