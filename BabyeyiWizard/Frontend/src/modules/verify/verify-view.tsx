'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  ShieldCheck,
  ShieldX,
  CheckCircle2,
  XCircle,
  Copy,
  Download,
  Printer,
  Share2,
  Flag,
  Phone,
  Mail,
  Search,
  QrCode,
  Lock,
  Building2,
  FileText,
  Clock3,
  Globe,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import {
  reportSuspiciousDocument,
  verifyCircular,
  type VerifyPortalResult,
} from '@/services/babyeyi-api';
import { OfficialDocDocument } from '@/lib/official-doc/official-doc-document';
import { resolveAssetUrl, shortDocId, type DocLang } from '@/lib/official-doc/tokens';
import type { OfficialDocBrand } from '@/lib/official-doc/types';
import type { Circular } from '@/types';

type Authenticity = VerifyPortalResult['authenticity'];

/**
 * Two functional colors only: emerald = pass/authentic, rose = fail/invalid.
 * Everything else (pending, revoked) stays neutral navy/slate so the page
 * doesn't turn into a traffic light. Amber is never used for status —
 * it's reserved for interactive elements per brand rule.
 */
const STATUS_META: Record<
  Authenticity,
  { title: string; subtitle: string; ring: string; icon: typeof ShieldCheck; tone: 'success' | 'neutral' | 'danger' }
> = {
  authentic: {
    title: 'Document authentic',
    subtitle: 'Verified against Babyeyi records. Safe to trust and act on.',
    ring: 'bg-emerald-600',
    icon: ShieldCheck,
    tone: 'success',
  },
  pending: {
    title: 'Document pending',
    subtitle: 'Not fully approved yet — treat fee amounts as provisional.',
    ring: 'bg-navy',
    icon: ShieldCheck,
    tone: 'neutral',
  },
  revoked: {
    title: 'Document revoked',
    subtitle: 'This circular was withdrawn and is no longer valid.',
    ring: 'bg-slate-500',
    icon: ShieldX,
    tone: 'neutral',
  },
  hash_mismatch: {
    title: 'Integrity check failed',
    subtitle: 'The signature does not match Babyeyi records. Do not trust this copy.',
    ring: 'bg-rose-600',
    icon: ShieldX,
    tone: 'danger',
  },
  invalid: {
    title: 'Document invalid',
    subtitle: 'We could not authenticate this document.',
    ring: 'bg-rose-600',
    icon: ShieldX,
    tone: 'danger',
  },
};

const TONE_PILL: Record<'success' | 'neutral' | 'danger', string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  neutral: 'bg-navy/5 text-navy border-navy/10',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
};

function money(n: number) {
  return `${Number(n || 0).toLocaleString()} RWF`;
}

function fmtDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function fmtDateTime(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function VerifyHeader({ lang, onLang }: { lang: DocLang; onLang: (l: DocLang) => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image src="/logo.png" alt="Shule+" width={110} height={32} className="h-7 w-auto shrink-0 object-contain sm:h-9" priority />
          <span className="hidden h-6 w-px bg-navy/10 sm:block" />
          <div className="hidden min-w-0 sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy/45">Babyeyi</p>
            <p className="truncate text-xs font-semibold text-navy/70">Document verification</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-navy/10 p-0.5">
          <Globe size={14} className="ml-1.5 text-navy/35" />
          {(['en', 'rw', 'fr'] as DocLang[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => onLang(code)}
              className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase transition-colors ${
                lang === code ? 'bg-navy text-primary' : 'text-navy/55 hover:text-navy'
              }`}
            >
              {code}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function VerifyFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-14 border-t border-navy/10 bg-navy text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr] md:py-12">
        <div>
          <Image src="/logo.png" alt="Shule+" width={120} height={36} className="h-8 w-auto brightness-0 invert" />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/60">
            Trusted digital circulars for schools and parents across Rwanda.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Resources</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>Privacy Policy</li>
            <li>Terms of Use</li>
            <li>Support</li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Contact</p>
          <ul className="mt-3 space-y-2.5 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <Phone size={13} className="text-primary" /> +250 788 000 000
            </li>
            <li className="flex items-center gap-2">
              <Mail size={13} className="text-primary" /> support@shuleplus.rw
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/40">
        © {year} Shule+ · Babyeyi
      </div>
    </footer>
  );
}

export function OfficialVerificationPortal({
  initialDocId,
  hash,
  embedded = false,
}: {
  initialDocId?: string;
  hash?: string;
  embedded?: boolean;
}) {
  const [docId, setDocId] = useState(initialDocId ?? '');
  const [manualId, setManualId] = useState('');
  const [result, setResult] = useState<VerifyPortalResult | null>(null);
  const [loading, setLoading] = useState(Boolean(initialDocId));
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('wrong_fees');
  const [reportDetails, setReportDetails] = useState('');
  const [reportEmail, setReportEmail] = useState('');
  const [reportMsg, setReportMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [lang, setLang] = useState<DocLang>('en');
  const [zoom, setZoom] = useState(0.72);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);

  async function runVerify(id: string, h?: string) {
    if (!id.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await verifyCircular(id.trim(), h);
      setResult(data);
      setDocId(id.trim());
      if (data.circular.language === 'rw' || data.circular.language === 'fr') {
        setLang(data.circular.language as DocLang);
      }
    } catch (err) {
      setResult(null);
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Document not found or verification failed'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialDocId) void runVerify(initialDocId, hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDocId, hash]);

  const meta = result ? STATUS_META[result.authenticity] : null;
  const StatusIcon = meta?.icon ?? ShieldCheck;
  const schoolLogo = resolveAssetUrl(result?.school?.logoPath) || result?.documentPreview?.logoUrl;
  const shortId = result ? shortDocId(result.circular.id) : '';

  const previewBrand: OfficialDocBrand | null = useMemo(() => {
    if (!result) return null;
    return {
      schoolName: result.school?.schoolName || result.organizationName || 'School',
      district: result.circular.district || result.school?.district,
      sector: result.circular.sector || result.school?.sector,
      province: result.circular.province || result.school?.province,
      principalName: result.school?.principalName,
      otherLogoUrl: result.documentPreview?.otherLogoUrl || null,
      logoUrl: result.documentPreview?.logoUrl || resolveAssetUrl(result.school?.logoPath),
      signatureUrl: result.documentPreview?.signatureUrl || resolveAssetUrl(result.school?.signaturePath),
      stampUrl: result.documentPreview?.stampUrl || resolveAssetUrl(result.school?.stampPath),
      qrUrl: result.documentPreview?.qrDataUrl || resolveAssetUrl(result.circular.qrCodePath),
    };
  }, [result]);

  const allChecksPass = result?.securityChecks.every((c) => c.pass) ?? false;

  async function copyLink() {
    const url = result?.authenticityDetails.verificationUrl || window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyDocId() {
    if (!result) return;
    await navigator.clipboard.writeText(result.circular.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  async function shareLink() {
    const url = result?.authenticityDetails.verificationUrl || window.location.href;
    if (navigator.share) {
      await navigator.share({ title: 'Babyeyi Verification', url });
      return;
    }
    await copyLink();
  }

  async function submitReport() {
    if (!docId) return;
    try {
      const res = await reportSuspiciousDocument(docId, {
        reason: reportReason,
        details: reportDetails,
        reporterEmail: reportEmail || undefined,
      });
      setReportMsg(res.message);
      setReportOpen(false);
    } catch {
      setReportMsg('Could not send report. Try again later.');
    }
  }

  function printPreview() {
    window.print();
  }

  return (
    <div className={embedded ? 'space-y-0' : 'min-h-screen bg-[#f6f7fa] text-navy'}>
      {!embedded ? <VerifyHeader lang={lang} onLang={setLang} /> : null}

      {/* HERO — flat navy band, single amber accent, no decorative noise */}
      <section className="bg-navy">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <Lock size={11} /> Official document verification
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                School circular verification
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/60 sm:text-base">
                Confirm the authenticity of circulars issued through Babyeyi before you trust the fees
                or dates inside.
              </p>
            </div>

            {result ? (
              <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-white/5 px-4 py-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${meta?.ring}`}>
                  <StatusIcon size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Verified</p>
                  <p className="text-sm font-semibold text-white">{fmtDateTime(result.verifiedAt)}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8">
        {/* SEARCH */}
        <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-navy/45">
                Document ID
              </label>
              <input
                className="input mt-1 w-full"
                placeholder="Paste the document ID from the QR code"
                value={manualId || docId}
                onChange={(e) => setManualId(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn-primary w-full justify-center sm:w-auto"
              disabled={loading}
              onClick={() => void runVerify(manualId || docId, hash)}
            >
              <Search size={16} /> {loading ? 'Verifying…' : 'Verify'}
            </button>
          </div>
          {error ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {reportMsg ? (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {reportMsg}
            </p>
          ) : null}
        </section>

        {loading && !result ? (
          <div className="rounded-2xl border border-navy/10 bg-white p-12 text-center text-sm text-navy/45 sm:p-16">
            Running authenticity checks…
          </div>
        ) : null}

        {result && meta ? (
          <>
            {/* STATUS STRIP */}
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm sm:col-span-2">
                <div className="flex items-start gap-3.5">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${meta.ring}`}>
                    <StatusIcon size={22} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_PILL[meta.tone]}`}
                    >
                      {result.circular.status}
                    </span>
                    <h2 className="mt-1.5 text-lg font-semibold text-navy">{meta.title}</h2>
                    <p className="mt-0.5 text-sm text-navy/60">{meta.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/45">Document ID</p>
                <p className="mt-2 truncate font-mono text-base font-semibold text-navy">BY-{shortId}</p>
                <button
                  type="button"
                  onClick={() => void copyDocId()}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
                >
                  <Copy size={12} /> {copiedId ? 'Copied' : 'Copy ID'}
                </button>
              </div>

              <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/45">Issued</p>
                    <p className="mt-1 text-sm font-semibold text-navy">
                      {fmtDate(result.circular.publishedAt || result.circular.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/45">Trust score</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{result.trustScore}%</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Trust indicators — quiet, no extra color, just checks */}
            <section className="flex flex-wrap gap-x-5 gap-y-2 rounded-2xl border border-navy/10 bg-white px-5 py-3.5 text-xs font-medium text-navy/70 shadow-sm">
              {[
                'Official school',
                'QR verified',
                'Digital signature',
                'Integrity passed',
              ].map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" /> {label}
                </span>
              ))}
              <span className="ml-auto text-navy/40">Last verified {fmtDate(result.verificationMeta.lastVerified)}</span>
            </section>

            {/* MAIN GRID */}
            <div className="grid gap-5 sm:gap-6 xl:grid-cols-[1fr_1.05fr]">
              <div className="space-y-5 sm:space-y-6">
                {/* Security */}
                <Card title="Security verification" icon={<Lock size={16} className="text-navy/50" />}>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {result.securityChecks.map((c) => (
                      <li
                        key={c.key}
                        className="flex items-center gap-2 rounded-xl bg-[#f6f7fa] px-3 py-2.5 text-sm text-navy/80"
                      >
                        {c.pass ? (
                          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                        ) : (
                          <XCircle size={16} className="shrink-0 text-rose-600" />
                        )}
                        {c.label}
                      </li>
                    ))}
                  </ul>
                  <div
                    className={`mt-4 rounded-xl px-4 py-2.5 text-center text-sm font-semibold ${
                      allChecksPass ? 'bg-emerald-600 text-white' : 'bg-navy/5 text-navy'
                    }`}
                  >
                    {allChecksPass ? 'All checks passed' : 'Some checks need attention'}
                  </div>
                </Card>

                {/* School */}
                <Card title="School information" icon={<Building2 size={16} className="text-navy/50" />}>
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-navy/10 bg-[#f6f7fa]">
                      {schoolLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={schoolLogo} alt="" className="h-full w-full object-contain p-1.5" />
                      ) : (
                        <Building2 className="text-navy/25" size={24} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-navy">
                        {result.school?.schoolName || result.organizationName || 'School'}
                      </h3>
                      <span className="mt-1 inline-flex rounded-full bg-navy/5 px-2 py-0.5 text-[11px] font-medium text-navy/70">
                        {result.school?.ownershipType || 'School'}
                      </span>
                    </div>
                  </div>
                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Meta label="District" value={result.school?.district || result.circular.district || '—'} />
                    <Meta label="Sector" value={result.school?.sector || result.circular.sector || '—'} />
                    <Meta label="School code" value={result.school?.schoolCode || '—'} />
                    <Meta label="Phone" value={result.school?.contact?.phone || '—'} />
                    <Meta label="Email" value={result.school?.contact?.email || '—'} />
                    <Meta label="Website" value={result.school?.contact?.website || '—'} />
                  </dl>
                </Card>

                {/* Circular summary */}
                <Card title="Circular summary" icon={<FileText size={16} className="text-navy/50" />}>
                  <div className="divide-y divide-navy/5">
                    {[
                      ['Class', result.circular.className],
                      ['Academic year', result.circular.academicYear],
                      ['Term', result.circular.term],
                      ['Category', result.circular.schoolCategory || '—'],
                      ['Version', `v${result.circular.version}`],
                      ['Language', result.circular.language?.toUpperCase() || 'EN'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="text-navy/50">{k}</span>
                        <span className="font-semibold text-navy">{v}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Fees */}
                <Card title="Fees summary" icon={<FileText size={16} className="text-navy/50" />}>
                  <ul className="divide-y divide-navy/5">
                    {(result.payments.length
                      ? result.payments
                      : [{ name: 'Total fees', amount: result.feeCompliance.totalFee }]
                    ).map((p, i) => (
                      <li key={i} className="flex justify-between py-2.5 text-sm">
                        <span className="text-navy/70">{p.name || 'Item'}</span>
                        <span className="font-semibold text-navy">{money(Number(p.amount || 0))}</span>
                      </li>
                    ))}
                    <li className="flex justify-between pt-3 text-base font-semibold text-navy">
                      <span>Total</span>
                      <span>{money(result.feeCompliance.totalFee)}</span>
                    </li>
                  </ul>
                  {result.feeCompliance.nesaLimit != null ? (
                    <div
                      className={`mt-3 rounded-xl px-3 py-2 text-center text-xs font-semibold ${
                        result.feeCompliance.exceeded
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {result.feeCompliance.exceeded
                        ? 'Exceeded NESA limit'
                        : `Within NESA limit · max ${money(result.feeCompliance.nesaLimit)}`}
                    </div>
                  ) : null}
                </Card>

                {/* Timeline */}
                <Card title="Document timeline" icon={<Clock3 size={16} className="text-navy/50" />}>
                  <ol>
                    {result.timeline.map((step, idx) => (
                      <li key={step.key} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={`mt-1 h-2.5 w-2.5 rounded-full ${
                              step.current ? 'bg-primary ring-4 ring-primary/20' : step.done ? 'bg-emerald-600' : 'bg-navy/15'
                            }`}
                          />
                          {idx < result.timeline.length - 1 ? <span className="my-1 w-px flex-1 bg-navy/10" /> : null}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm font-semibold text-navy">
                            {step.label}
                            {step.current ? (
                              <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-navy">
                                NOW
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-navy/45">{fmtDateTime(step.at)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Card>

                {/* Verification details */}
                <Card title="Verification details" icon={<QrCode size={16} className="text-navy/50" />}>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <Meta label="Algorithm" value={result.authenticityDetails.algorithm} />
                    <Meta label="Hash" value={result.authenticityDetails.hash || '—'} />
                    <Meta label="Generated" value={fmtDate(result.authenticityDetails.generatedAt)} />
                    <Meta label="Verification count" value={String(result.verificationMeta.verificationCount)} />
                    <Meta label="Country" value={result.verificationMeta.country} />
                    <Meta label="Last verified" value={result.verificationMeta.lastVerified} />
                  </dl>
                </Card>
              </div>

              {/* PREVIEW */}
              <div className="xl:sticky xl:top-20 xl:self-start">
                <Card
                  title="Document preview"
                  icon={<FileText size={16} className="text-navy/50" />}
                  action={
                    <div className="flex items-center gap-1">
                      <IconBtn title="Zoom out" onClick={() => setZoom((z) => Math.max(0.45, z - 0.08))}>
                        <ZoomOut size={14} />
                      </IconBtn>
                      <IconBtn title="Zoom in" onClick={() => setZoom((z) => Math.min(1.1, z + 0.08))}>
                        <ZoomIn size={14} />
                      </IconBtn>
                      <IconBtn title="Fullscreen" onClick={() => setFullscreenPreview(true)}>
                        <Maximize2 size={14} />
                      </IconBtn>
                    </div>
                  }
                >
                  <div
                    className="overflow-auto rounded-xl border border-navy/10 bg-[#eceff3] p-3"
                    style={{ maxHeight: '72vh' }}
                  >
                    {previewBrand ? (
                      <div
                        className="mx-auto origin-top"
                        style={{
                          width: 794,
                          transform: `scale(${zoom})`,
                          transformOrigin: 'top center',
                          marginBottom: `${(1 - zoom) * -900}px`,
                        }}
                      >
                        <OfficialDocDocument
                          circular={result.circular as Circular}
                          brand={previewBrand}
                          lang={lang}
                          contact={result.school?.contact}
                        />
                      </div>
                    ) : (
                      <p className="py-16 text-center text-sm text-navy/45">Preview unavailable</p>
                    )}
                  </div>
                  <p className="mt-3 text-center text-[11px] text-navy/40">
                    Official A4 preview · Page 1 · Zoom {Math.round(zoom * 100)}%
                  </p>
                </Card>
              </div>
            </div>

            {/* ACTIONS */}
            <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm sm:p-5">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <button type="button" className="btn-primary justify-center" onClick={() => setFullscreenPreview(true)}>
                  <Download size={16} /> View circular
                </button>
                <button type="button" className="btn-secondary justify-center text-sm" onClick={printPreview}>
                  <Printer size={16} /> Print
                </button>
                <button type="button" className="btn-secondary justify-center text-sm" onClick={() => void copyLink()}>
                  <Copy size={16} /> {copied ? 'Copied' : 'Copy link'}
                </button>
                <button type="button" className="btn-secondary justify-center text-sm" onClick={() => void shareLink()}>
                  <Share2 size={16} /> Share
                </button>
                <button
                  type="button"
                  className="btn-secondary justify-center text-sm"
                  onClick={() => {
                    setManualId('');
                    setResult(null);
                    setDocId('');
                  }}
                >
                  <QrCode size={16} /> Verify another
                </button>
                <button
                  type="button"
                  className="justify-center inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
                  onClick={() => setReportOpen(true)}
                >
                  <Flag size={16} /> Report issue
                </button>
              </div>
            </section>

            {/* FAQ + Contact */}
            <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
              <Card title="Frequently asked">
                <ul className="space-y-3.5 text-sm">
                  <li>
                    <p className="font-semibold text-navy">Why is my document pending?</p>
                    <p className="text-navy/55">Approvals or a fee review may still be in progress.</p>
                  </li>
                  <li>
                    <p className="font-semibold text-navy">Why is it invalid?</p>
                    <p className="text-navy/55">The QR may be forged, altered, or not issued by Babyeyi.</p>
                  </li>
                  <li>
                    <p className="font-semibold text-navy">How do I pay?</p>
                    <p className="text-navy/55">Use the banking details shown in the official circular preview.</p>
                  </li>
                </ul>
              </Card>
              <Card title="Contact school">
                <div className="flex flex-wrap gap-2">
                  {result.school?.contact?.phone ? (
                    <a className="btn-secondary text-sm" href={`tel:${result.school.contact.phone}`}>
                      <Phone size={16} /> Call school
                    </a>
                  ) : null}
                  {result.school?.contact?.email ? (
                    <a className="btn-secondary text-sm" href={`mailto:${result.school.contact.email}`}>
                      <Mail size={16} /> Email
                    </a>
                  ) : null}
                  {!result.school?.contact?.phone && !result.school?.contact?.email ? (
                    <p className="text-sm text-navy/45">School contact details are not published yet.</p>
                  ) : null}
                </div>
              </Card>
            </div>
          </>
        ) : null}
      </div>

      {!embedded ? <VerifyFooter /> : null}

      {/* Fullscreen preview */}
      {fullscreenPreview && result && previewBrand ? (
        <div className="fixed inset-0 z-50 overflow-auto bg-navy/70 p-3 backdrop-blur-sm print:bg-white print:p-0 sm:p-4">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 py-3 print:hidden">
            <p className="text-sm font-semibold text-white">Official circular preview</p>
            <div className="flex gap-2">
              <button type="button" className="btn-primary" onClick={printPreview}>
                <Printer size={16} /> Print
              </button>
              <button
                type="button"
                className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-navy"
                onClick={() => setFullscreenPreview(false)}
              >
                Close
              </button>
            </div>
          </div>
          <div className="mx-auto max-w-[820px] overflow-x-auto pb-10">
            <OfficialDocDocument
              circular={result.circular as Circular}
              brand={previewBrand}
              lang={lang}
              contact={result.school?.contact}
            />
          </div>
        </div>
      ) : null}

      {reportOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-navy">Report suspicious document</h3>
            <p className="mt-1 text-sm text-navy/55">Wrong fees, fake QR, or forged circular?</p>
            <select className="input mt-4 w-full" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
              <option value="wrong_fees">Wrong fees</option>
              <option value="fake_qr">Fake QR</option>
              <option value="forged">Forged document</option>
              <option value="other">Other</option>
            </select>
            <textarea
              className="input mt-3 min-h-[100px] w-full"
              placeholder="Describe the issue"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
            />
            <input
              className="input mt-3 w-full"
              placeholder="Your email (optional)"
              value={reportEmail}
              onChange={(e) => setReportEmail(e.target.value)}
            />
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary justify-center" onClick={() => setReportOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary justify-center" onClick={() => void submitReport()}>
                Submit report
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Card({
  title,
  icon,
  action,
  children,
}: {
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm sm:p-5">
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-sm font-semibold text-navy">{title}</h3>
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-lg border border-navy/10 p-1.5 text-navy/60 hover:bg-navy/5"
    >
      {children}
    </button>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-navy/40">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-navy" title={value}>
        {value}
      </dd>
    </div>
  );
}

export function VerifyView() {
  return <OfficialVerificationPortal embedded />;
}

export function VerifyPublicView({ hash }: { hash?: string }) {
  const [docId, setDocId] = useState('');

  useEffect(() => {
    const id = window.location.pathname.split('/').pop() ?? '';
    setDocId(id);
  }, []);

  if (!docId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fa] text-sm text-navy/45">
        Preparing verification…
      </div>
    );
  }

  return <OfficialVerificationPortal initialDocId={docId} hash={hash} />;
}