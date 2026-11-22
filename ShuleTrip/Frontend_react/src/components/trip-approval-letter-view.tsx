import { useEffect, useState } from 'react';
import { Download, ExternalLink, Printer } from 'lucide-react';
import type { AuthorizationLetterPayload } from '@/schools/types/authorization-letter';
import { TripPassQr } from '@/components/trip-pass-qr';
import { tripVerifyUrl } from '@/shared/trip-qr';
import { formatTripDateTime } from '@/schools/utils/trip-display';
import { api } from '@/services/api';

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function TripApprovalLetterView({
  letter,
  signatureUrl,
  stampUrl,
  loadingAssets,
}: {
  letter: AuthorizationLetterPayload;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  loadingAssets?: boolean;
}) {
  function printLetter() {
    window.print();
  }

  return (
    <div className="authorization-letter-print-root mx-auto max-w-[210mm] print:mx-0 print:max-w-none">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-print-hide>
        <div>
          <p className="text-xs font-semibold text-slate-500">Authorization letter</p>
          <p className="font-mono text-sm font-bold text-navy">{letter.authorizationNo}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={printLetter}
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white"
          >
            <Printer className="size-4" />
            Print / PDF
          </button>
          <button
            type="button"
            onClick={printLetter}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-bold text-navy"
          >
            <Download className="size-4" />
            Save
          </button>
          <a
            href={tripVerifyUrl(letter.trip.reference)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-slate-700"
          >
            <ExternalLink className="size-4" />
            Verify
          </a>
        </div>
      </div>

      <article className="letter-sheet overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm print:rounded-none print:border print:shadow-none">
        <header className="border-b-2 border-navy px-5 py-5 print:px-4 print:py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-navy print:text-base">School trip authorization</h1>
              <p className="mt-1 text-sm text-slate-600">{letter.responsibleAuthority}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</p>
              <p className="text-sm font-bold text-emerald-700">Approved for travel</p>
              <p className="mt-1 font-mono text-xs font-semibold text-navy">{letter.authorizationNo}</p>
            </div>
          </div>
        </header>

        <div className="space-y-5 px-5 py-5 print:space-y-3 print:px-4 print:py-3 print:text-[11px]">
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 print:text-[9px]">Trip</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 print:grid-cols-2 print:gap-1.5">
              <Field label="School" value={letter.school.name} />
              <Field label="Reference" value={letter.trip.reference} />
              <Field label="Title" value={letter.trip.title} />
              <Field label="Destination" value={letter.trip.destination ?? '—'} />
              <Field label="Departure" value={formatTripDateTime(letter.trip.departAt ?? null)} />
              <Field label="Return" value={formatTripDateTime(letter.trip.returnAt ?? null)} />
              <Field label="Learners / staff" value={`${letter.counts.learners} / ${letter.counts.staff}`} />
              <Field label="Leader" value={letter.trip.tripLeaderName ?? '—'} />
              <Field
                label="Transport"
                value={
                  letter.transport
                    ? `${letter.transport.plateNumber ?? '—'} · ${letter.transport.driverName ?? '—'}`
                    : '—'
                }
                className="sm:col-span-2 print:col-span-2"
              />
            </div>
            {letter.trip.purpose ? (
              <p className="mt-2 text-sm leading-snug text-slate-700 print:mt-1 print:text-[10px]">
                <span className="font-semibold text-navy">Purpose: </span>
                {letter.trip.purpose}
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 print:text-[9px]">Conditions</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm leading-snug text-slate-800 print:mt-1 print:text-[10px]">
              {letter.conditions.map((c) => (
                <li key={c.slice(0, 48)}>{c}</li>
              ))}
            </ol>
          </section>

          <section className="grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-[1fr_auto] print:grid-cols-[1fr_128px] print:gap-3 print:pt-2">
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 print:text-[9px]">Authorized by</h2>
              <p className="mt-1 font-serif text-lg italic text-navy print:text-sm">
                {letter.finalApproval?.signatureName ?? letter.issuedByName ?? 'Authorized officer'}
              </p>
              <p className="text-sm text-slate-600 print:text-[10px]">
                {letter.finalApproval?.authorityOffice ?? letter.responsibleAuthority}
              </p>
              <p className="mt-1 text-xs text-slate-500 print:text-[9px]">
                Date: {fmtDate(letter.finalApproval?.decidedAt ?? letter.issuedAt)}
              </p>
              <p className="mt-1 font-mono text-[10px] text-slate-600">Verify: {letter.verificationReference}</p>
            </div>
            <div className="flex gap-2 print:gap-1">
              <AttestationSlot label="Signature" url={signatureUrl} loading={loadingAssets} />
              <AttestationSlot label="Stamp" url={stampUrl} loading={loadingAssets} />
            </div>
          </section>

          <section className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row print:flex-row print:pt-2">
            <p className="max-w-xs text-center text-xs text-slate-600 sm:text-left print:text-[9px]">
              Scan QR or visit verify link to confirm this authorization.
            </p>
            <div className="rounded-lg border border-slate-200 bg-white p-2 print:p-1">
              <TripPassQr reference={letter.trip.reference} size={96} />
            </div>
          </section>
        </div>

        <footer className="border-t border-slate-200 px-5 py-2 text-center text-[9px] text-slate-500 print:py-1">
          ShuleTrip · {fmtDate(letter.issuedAt)} · {letter.trip.reference}
        </footer>
      </article>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body * {
            visibility: hidden;
          }
          .authorization-letter-print-root,
          .authorization-letter-print-root * {
            visibility: visible;
          }
          .authorization-letter-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          [data-print-hide] {
            display: none !important;
          }
          .letter-sheet {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[9px] font-bold uppercase text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-navy print:text-[10px]">{value}</p>
    </div>
  );
}

function AttestationSlot({ label, url, loading }: { label: string; url?: string | null; loading?: boolean }) {
  return (
    <div className="w-[72px] print:w-[60px]">
      <p className="text-[8px] font-bold uppercase text-slate-500">{label}</p>
      <div className="mt-1 flex h-16 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 print:h-14">
        {loading ? (
          <span className="text-[8px] text-slate-400">…</span>
        ) : url ? (
          <img src={url} alt={label} className="max-h-full max-w-full object-contain p-0.5" />
        ) : (
          <span className="text-[8px] text-slate-400">—</span>
        )}
      </div>
    </div>
  );
}

export function useSchoolAuthorizationLetterAssets(tripId: string, letter: AuthorizationLetterPayload | null) {
  const assetBasePath = `/trips/${tripId}/authorization`;
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let sigUrl: string | null = null;
    let stUrl: string | null = null;
    let cancelled = false;

    async function load() {
      setSignatureUrl(null);
      setStampUrl(null);
      if (!letter?.finalApproval) return;
      setLoading(true);
      try {
        if (letter.finalApproval.hasSignatureFile) {
          const { data } = await api.get<Blob>(`${assetBasePath}/signature`, { responseType: 'blob' });
          if (!cancelled) {
            sigUrl = URL.createObjectURL(data);
            setSignatureUrl(sigUrl);
          }
        }
        if (letter.finalApproval.hasStampFile) {
          const { data } = await api.get<Blob>(`${assetBasePath}/stamp`, { responseType: 'blob' });
          if (!cancelled) {
            stUrl = URL.createObjectURL(data);
            setStampUrl(stUrl);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (sigUrl) URL.revokeObjectURL(sigUrl);
      if (stUrl) URL.revokeObjectURL(stUrl);
    };
  }, [tripId, letter, assetBasePath]);

  return { signatureUrl, stampUrl, loadingAssets: loading };
}
