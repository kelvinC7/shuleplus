'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  FileDown,
  Lock,
  Printer,
  Languages,
  Pencil,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Share2,
  Search,
} from 'lucide-react';
import { OfficialDocDocument } from '@/lib/official-doc/official-doc-document';
import { HinduraEditModal } from '@/lib/official-doc/hindura-edit-modal';
import { downloadBabyeyiClientPdf } from '@/lib/official-doc/babyeyi-pdf-export';
import { openOfficialPrintHtml } from '@/lib/official-doc/build-official-doc-html';
import {
  isSharingLocked,
  needsTranslation,
  readStoredDocLang,
  resolveAssetUrl,
  shortDocId,
  storeDocLang,
  type DocLang,
} from '@/lib/official-doc/tokens';
import { BABYEYI_PDF_WIDTH_PX, DOC, MONTSERRAT_FONT_HREF, type OfficialDocBrand } from '@/lib/official-doc/types';
import {
  fetchCircular,
  fetchSchoolInfo,
  generateQr,
  recordCircularDownload,
  regenerateTranslations,
} from '@/services/babyeyi-api';
import type { Circular } from '@/types';
import { useToast } from '@/shared/notifications';

interface OfficialDocModalProps {
  /** Saved circular id — loads from API (View & Print). */
  circularId?: string;
  /** Wizard draft snapshot — same letter UI before publish. */
  draftCircular?: Circular;
  /** When true, treat as draft preview (locks print/PDF/share). */
  previewOnly?: boolean;
  /** Opens the document already switched to this language (e.g. from the list page's language picker). */
  initialLang?: DocLang;
  onClose: () => void;
}

export function OfficialDocModal({ circularId, draftCircular, previewOnly, initialLang, onClose }: OfficialDocModalProps) {
  const toast = useToast();
  const [circular, setCircular] = useState<Circular | null>(draftCircular ?? null);
  const [brand, setBrand] = useState<OfficialDocBrand | null>(null);
  const [contact, setContact] = useState<{ phone?: string; email?: string; website?: string } | null>(null);
  const [lang, setLang] = useState<DocLang>(initialLang ?? readStoredDocLang());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'print' | 'pdf' | null>(null);
  const [translating, setTranslating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState('');
  const [previewHeight, setPreviewHeight] = useState(0);
  const [hinduraOpen, setHinduraOpen] = useState(false);
  const docFrameRef = useRef<HTMLDivElement>(null);
  const isDraftPreview = Boolean(previewOnly || draftCircular);

  async function reloadCircular() {
    if (!circularId || draftCircular) return;
    try {
      const full = await fetchCircular(circularId);
      setCircular(full);
      return full;
    } catch {
      return null;
    }
  }

  async function ensureLangTranslations(nextLang: DocLang, current?: Circular | null) {
    if (nextLang === 'en' || isDraftPreview || !circularId) return current ?? circular;
    const base = current ?? circular;
    if (!base || !needsTranslation(base, nextLang)) return base;
    setTranslating(true);
    try {
      const updated = await regenerateTranslations(circularId);
      setCircular(updated);
      toast.success(nextLang === 'rw' ? 'Kinyarwanda translation ready' : 'French translation ready');
      return updated;
    } catch {
      toast.warning('Translation service busy — showing English where needed');
      return base;
    } finally {
      setTranslating(false);
    }
  }

  async function changeLang(nextLang: DocLang) {
    setLang(nextLang);
    storeDocLang(nextLang);
    await ensureLangTranslations(nextLang);
  }

  useEffect(() => {
    function fitToViewport() {
      const gutter = window.innerWidth < 640 ? 24 : 48;
      const next = Math.min(1, Math.max(0.55, (window.innerWidth - gutter) / BABYEYI_PDF_WIDTH_PX));
      setZoom(next);
    }
    fitToViewport();
    window.addEventListener('resize', fitToViewport);
    return () => window.removeEventListener('resize', fitToViewport);
  }, []);

  useLayoutEffect(() => {
    const el = docFrameRef.current;
    if (!el) return;
    setPreviewHeight(el.scrollHeight * zoom);
  }, [zoom, circular, brand, lang, contact, loading]);

  useEffect(() => {
    if (draftCircular) setCircular(draftCircular);
  }, [draftCircular]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const school = await fetchSchoolInfo();
        if (cancelled) return;

        let full: Circular | null = draftCircular ?? null;
        if (circularId && !draftCircular) {
          full = await fetchCircular(circularId);
          if (cancelled) return;
          try {
            const qr = await generateQr(circularId);
            full.qrCodePath = qr.qr_code_url || full.qrCodePath;
            full.qrHash = qr.qr_hash || full.qrHash;
          } catch {
            /* keep existing */
          }
        }

        if (!full) {
          toast.error('Could not load official document');
          onClose();
          return;
        }

        const profile = school.profile;
        const qrUrl = resolveAssetUrl(full.qrCodePath);
        setCircular(full);
        setContact(school.contact ?? null);
        const activeLang =
          initialLang ??
          readStoredDocLang() ??
          (((full.language as DocLang) === 'rw' || (full.language as DocLang) === 'fr'
            ? full.language
            : 'en') as DocLang);
        setLang(activeLang);
        setBrand({
          schoolName: profile.schoolName || 'School',
          district: full.district || profile.district,
          sector: full.sector || profile.sector,
          province: full.province || profile.province,
          principalName: profile.principalName,
          otherLogoUrl: resolveAssetUrl(school.branding?.otherLogoUrl || profile.otherLogoPath),
          logoUrl: resolveAssetUrl(school.branding?.logoUrl || profile.logoPath),
          signatureUrl: resolveAssetUrl(school.branding?.signatureUrl || profile.signaturePath),
          stampUrl: resolveAssetUrl(school.branding?.stampUrl || profile.stampPath),
          qrUrl,
        });

        if (activeLang !== 'en') {
          await ensureLangTranslations(activeLang, full);
        }
      } catch {
        if (!cancelled) {
          toast.error('Could not load official document');
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circularId, draftCircular?.id]);

  const locked = isDraftPreview ? true : circular ? isSharingLocked(circular) : true;

  const pageEstimate = useMemo(() => {
    if (!circular) return '—';
    const dense =
      (circular.payments?.length || 0) +
      (circular.requirements?.length || 0) +
      (circular.otherInfos?.length || 0) +
      (circular.announcements?.length || 0);
    return dense > 18 ? '≈ 2 pages' : '≈ 1 page';
  }, [circular]);

  function printLiveDoc() {
    const root = document.getElementById('babyeyi-pdf-doc');
    if (!root) throw new Error('Document not ready');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Circular</title>
      <link rel="stylesheet" href="${MONTSERRAT_FONT_HREF}" />
      <style>
        @page { size: A4; margin: 12mm; }
        body {
          margin: 0;
          background: #fff;
          font-family: ${DOC.font};
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        #babyeyi-pdf-doc { box-shadow: none !important; margin: 0 auto; font-family: inherit; }
      </style></head><body>${root.outerHTML}
      <script>window.onload=function(){setTimeout(function(){window.print()},350)}</script>
      </body></html>`;
    openOfficialPrintHtml(html);
  }

  async function handlePrint() {
    if (!circular || !brand) return;
    if (locked) {
      toast.error('Print unlocks after the circular is approved');
      return;
    }
    setBusy('print');
    try {
      printLiveDoc();
      try {
        await recordCircularDownload(circular.id);
      } catch {
        /* non-blocking */
      }
    } catch (err) {
      toast.error((err as Error)?.message || 'Print failed');
    } finally {
      setBusy(null);
    }
  }

  async function handlePdf() {
    if (!circular || !brand) return;
    if (locked) {
      toast.error('PDF unlocks after the circular is approved');
      return;
    }
    setBusy('pdf');
    try {
      const root = document.getElementById('babyeyi-pdf-doc');
      if (!root) throw new Error('Document not ready');
      const name = `Babyeyi_${circular.className}_${shortDocId(circular.id)}.pdf`;
      await downloadBabyeyiClientPdf({ rootEl: root, fileName: name });
      try {
        await recordCircularDownload(circular.id);
      } catch {
        /* non-blocking */
      }
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error((err as Error)?.message || 'PDF export failed — opening print instead');
      try {
        printLiveDoc();
      } catch {
        toast.error('Print failed — try again from the Print button');
      }
    } finally {
      setBusy(null);
    }
  }

  async function shareLink() {
    if (isDraftPreview || !circularId) {
      toast.warning('Share is available after the circular is saved and published');
      return;
    }
    const url = `${window.location.origin}/verify/${circularId}`;
    if (navigator.share) {
      await navigator.share({ title: 'Babyeyi Circular', url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success('Verification link copied');
  }

  function fitZoom() {
    const gutter = window.innerWidth < 640 ? 24 : 48;
    setZoom(Math.min(1, Math.max(0.55, (window.innerWidth - gutter) / BABYEYI_PDF_WIDTH_PX)));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-navy/50 backdrop-blur-sm">
      {hinduraOpen && circular ? (
        <HinduraEditModal circular={circular} onClose={() => setHinduraOpen(false)} onSaved={() => void reloadCircular()} />
      ) : null}
      <div className="shrink-0 border-b border-white/10 bg-navy text-white">
        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 sm:px-3"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {isDraftPreview
                ? `Parent preview — ${circular?.className || 'Draft'}`
                : circular
                  ? `Official circular — ${circular.className}`
                  : 'Official document'}
            </p>
            <p className="truncate text-[11px] text-white/55">
              {isDraftPreview ? 'Draft letter · same layout as View & Print' : `Compact A4 · ${pageEstimate}`}
              {circular && !isDraftPreview ? ` · ${circular.status}` : ''}
            </p>
          </div>
          <button
            type="button"
            disabled={locked || busy === 'pdf' || loading}
            onClick={() => void handlePdf()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-navy disabled:cursor-not-allowed disabled:opacity-40"
          >
            {locked ? <Lock size={14} /> : <FileDown size={14} />}
            <span className="hidden sm:inline">{busy === 'pdf' ? 'PDF…' : 'PDF'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-3 py-2 sm:px-4">
          <div className="inline-flex items-center gap-1 rounded-xl bg-white/10 p-1">
            <Languages size={14} className="ml-1.5 text-primary" />
            {(['en', 'rw', 'fr'] as DocLang[]).map((code) => (
              <button
                key={code}
                type="button"
                disabled={translating}
                onClick={() => void changeLang(code)}
                className={`rounded-lg px-2 py-1.5 text-xs font-bold uppercase sm:px-2.5 ${
                  lang === code ? 'bg-primary text-navy' : 'text-white/80 hover:bg-white/10'
                } ${translating && lang !== code ? 'opacity-50' : ''}`}
              >
                {code}
              </button>
            ))}
            {translating ? (
              <span className="px-2 text-[10px] font-medium text-primary">Translating…</span>
            ) : null}
          </div>

          {lang === 'rw' && circularId && !isDraftPreview ? (
            <button
              type="button"
              onClick={() => setHinduraOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-2.5 py-2 text-xs font-semibold text-white hover:bg-white/15"
              title="Manually correct the Kinyarwanda text"
            >
              <Pencil size={13} /> Hindura
            </button>
          ) : null}

          <div className="inline-flex items-center gap-1 rounded-xl bg-white/10 p-1">
            <button
              type="button"
              className="rounded-lg p-1.5 hover:bg-white/10"
              onClick={() => setZoom((z) => Math.max(0.55, z - 0.1))}
            >
              <ZoomOut size={14} />
            </button>
            <span className="min-w-[2.75rem] text-center text-xs font-semibold">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="rounded-lg p-1.5 hover:bg-white/10"
              onClick={() => setZoom((z) => Math.min(1.35, z + 0.1))}
            >
              <ZoomIn size={14} />
            </button>
            <button type="button" className="rounded-lg p-1.5 hover:bg-white/10" onClick={fitZoom} title="Fit width">
              <Maximize2 size={14} />
            </button>
          </div>

          <div className="relative ml-auto hidden md:block">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find in circular…"
              className="w-40 rounded-xl border border-white/15 bg-white/10 py-1.5 pl-8 pr-2 text-xs text-white placeholder:text-white/40 outline-none focus:border-primary/50"
            />
          </div>

          <button
            type="button"
            onClick={() => void shareLink()}
            disabled={isDraftPreview || !circularId}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            <Share2 size={14} /> Share
          </button>
          <button
            type="button"
            disabled={locked || busy === 'print' || loading}
            onClick={() => void handlePrint()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {locked ? <Lock size={14} /> : <Printer size={14} />}
            Print
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#e8edf3] px-2 py-4 sm:px-6 sm:py-6">
        {loading || !circular || !brand ? (
          <p className="text-center text-sm text-navy/60">Preparing official letter…</p>
        ) : (
          <div className="mx-auto w-full" style={{ maxWidth: BABYEYI_PDF_WIDTH_PX * zoom }}>
            {isDraftPreview ? (
              <div className="mb-4 flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-950 sm:px-4">
                <Eye size={16} className="mt-0.5 shrink-0" />
                <span>
                  This is a <strong>parent preview</strong> of your draft — same design as View &amp; Print. Print and
                  PDF unlock after approval or publish.
                </span>
              </div>
            ) : locked ? (
              <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950 sm:px-4">
                <Lock size={16} className="mt-0.5 shrink-0" />
                <span>
                  Print and PDF unlock when this circular is <strong>Approved</strong> or{' '}
                  <strong>Published</strong>. You can still preview the letter.
                </span>
              </div>
            ) : null}
            <div
              className="mx-auto overflow-hidden rounded-sm bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
              style={{
                width: BABYEYI_PDF_WIDTH_PX * zoom,
                height: previewHeight || undefined,
              }}
            >
              <div
                ref={docFrameRef}
                style={{
                  width: BABYEYI_PDF_WIDTH_PX,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                <OfficialDocDocument circular={circular} brand={brand} lang={lang} contact={contact} />
              </div>
            </div>
            {query.trim() ? (
              <p className="mt-3 text-center text-xs text-muted">
                Tip: use browser Find (Ctrl+F) to jump to “{query}” inside the print preview.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
