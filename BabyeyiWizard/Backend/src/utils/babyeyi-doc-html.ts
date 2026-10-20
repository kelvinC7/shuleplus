import type { Circular, SchoolProfile } from '../generated/prisma';
import type { ContentI18nBundle } from './content-i18n';
import { isContentI18nBundle } from './content-i18n';

type DocLang = 'en' | 'rw' | 'fr';

/** Picks the localized value from a triplet, falling back to English when empty. */
function pick(triplet: { en: string; rw: string; fr: string } | undefined, lang: DocLang, fallback: string): string {
  if (!triplet || lang === 'en') return fallback;
  const value = lang === 'rw' ? triplet.rw : triplet.fr;
  return value?.trim() ? value : fallback;
}

type Brand = {
  schoolName: string;
  district?: string | null;
  sector?: string | null;
  province?: string | null;
  principalName?: string | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  qrUrl?: string | null;
  otherLogoUrl?: string | null;
};

type CircularLike = Circular & {
  payments: unknown;
  requirements: unknown;
  banks: unknown;
  leaders: unknown;
  classReqs: unknown;
  otherInfos: unknown;
  contentI18n: unknown;
};

const LABELS: Record<DocLang, Record<string, string>> = {
  en: {
    parentMessage: 'Message to Parents',
    fees: 'Fees',
    total: 'Total',
    banking: 'Banking Details',
    requirements: 'Student Requirements',
    other: 'Other Information',
    leaders: 'School Leadership',
    notes: 'Class Notes',
    official: 'Official Circular',
    republic: 'Republic of Rwanda',
    account: 'Account No.',
    name: 'Account Name',
    bank: 'Bank',
    item: 'Item',
    amount: 'Amount (RWF)',
    qty: 'Qty',
    role: 'Role',
    phone: 'Phone',
  },
  rw: {
    parentMessage: 'Ubutumwa ku Babyeyi',
    fees: 'Amafaranga',
    total: 'Igiteranyo',
    banking: 'Amabanki',
    requirements: 'Ibikenewe',
    other: 'Andi Makuru',
    leaders: 'Ubuyobozi bw’Ishuri',
    notes: 'Inyandiko',
    official: 'Itangazo Risemeye',
    republic: 'Repubulika y’u Rwanda',
    account: 'Konti',
    name: 'Izina ry’uwufite konti',
    bank: 'Banki',
    item: 'Ikibazo',
    amount: 'Amafaranga (RWF)',
    qty: 'Umubare',
    role: 'Inshingano',
    phone: 'Telefone',
  },
  fr: {
    parentMessage: 'Message aux parents',
    fees: 'Frais',
    total: 'Total',
    banking: 'Coordonnées bancaires',
    requirements: 'Exigences',
    other: 'Autres informations',
    leaders: 'Direction de l’école',
    notes: 'Notes de classe',
    official: 'Circulaire officielle',
    republic: 'République du Rwanda',
    account: 'N° de compte',
    name: 'Titulaire',
    bank: 'Banque',
    item: 'Article',
    amount: 'Montant (RWF)',
    qty: 'Qté',
    role: 'Rôle',
    phone: 'Téléphone',
  },
};

function esc(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(n: number | string) {
  return `${Number(n || 0).toLocaleString()} RWF`;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function absUrl(base: string, path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  const root = base.replace(/\/$/, '');
  return path.startsWith('/') ? `${root}${path}` : `${root}/${path}`;
}

export function buildBabyeyiPrintPageHtml(opts: {
  circular: CircularLike;
  profile: SchoolProfile;
  publicApiBase: string;
  lang?: string;
  autoprint?: boolean;
  /** Prefer data URL so print/PDF never hits a broken /uploads image. */
  qrDataUrl?: string | null;
}): string {
  const lang: DocLang = opts.lang === 'rw' || opts.lang === 'fr' ? opts.lang : 'en';
  const L = LABELS[lang];
  const c = opts.circular;
  const brand: Brand = {
    schoolName: opts.profile.schoolName || 'School',
    district: c.district || opts.profile.district,
    sector: c.sector || opts.profile.sector,
    province: c.province || opts.profile.province,
    principalName: opts.profile.principalName,
    logoUrl: absUrl(opts.publicApiBase, opts.profile.logoPath),
    otherLogoUrl: absUrl(opts.publicApiBase, opts.profile.otherLogoPath),
    signatureUrl: absUrl(opts.publicApiBase, opts.profile.signaturePath),
    stampUrl: absUrl(opts.publicApiBase, opts.profile.stampPath),
    qrUrl: opts.qrDataUrl || absUrl(opts.publicApiBase, c.qrCodePath),
  };

  const bundle = isContentI18nBundle(c.contentI18n) ? (c.contentI18n as ContentI18nBundle) : null;
  const message = pick(bundle?.parentMessage, lang, c.parentMessage?.trim() || '');

  const payments = asArray<{ name: string; amount: number }>(c.payments).map((p, i) => ({
    ...p,
    name: pick(bundle?.payments?.[i]?.name, lang, p.name),
  }));
  const feesTableTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const banks = asArray<{ bank_name: string; account_no?: string; account_name?: string; is_primary?: boolean }>(
    c.banks
  ).filter((b) => b.bank_name);
  const requirements = asArray<{
    item: string;
    description?: string;
    quantity?: string;
    cost?: number;
  }>(c.requirements).map((r, i) => ({
    ...r,
    item: pick(bundle?.requirements?.[i]?.item, lang, r.item),
    description: r.description ? pick(bundle?.requirements?.[i]?.description, lang, r.description) : r.description,
  }));
  const otherInfos = asArray<{ item: string }>(c.otherInfos).map((o, i) => ({
    ...o,
    item: pick(bundle?.otherInfos?.[i]?.item, lang, o.item),
  }));
  const leaders = asArray<{ name: string; role: string; phone?: string; email?: string }>(c.leaders).map((l, i) => ({
    ...l,
    role: pick(bundle?.leaders?.[i]?.role, lang, l.role),
  }));
  const classNotes = asArray<{ item: string }>(c.classReqs).map((n, i) => ({
    ...n,
    item: pick(bundle?.classReqs?.[i]?.item, lang, n.item),
  }));
  const location = [brand.sector, brand.district, brand.province].filter(Boolean).join(' · ');
  const docId = c.id.slice(0, 8).toUpperCase();
  const classes = asArray<string>(c.classes);
  const classLabel = classes.length > 1 ? classes.map(esc).join(', ') : esc(c.className);
  const descriptionLines = asArray<string>(c.descriptionLines).filter((line) => line && String(line).trim());
  const showSchoolDescription = Boolean(c.includeSchoolDescription && descriptionLines.length > 0);
  const descriptionBlock = showSchoolDescription
    ? descriptionLines
        .map(
          (line) =>
            `<p style="margin:2px 0 0;font-size:10px;color:#64748b;line-height:1.35;">${esc(String(line))}</p>`
        )
        .join('')
    : location
      ? `<p style="margin:4px 0 0;font-size:11px;color:#64748b;">${esc(location)}</p>`
      : '';
  const headerCenter = `<p style="margin:0;font-size:16px;font-weight:700;color:#1e3a5f;text-transform:uppercase;line-height:1.25;">${esc(brand.schoolName)}</p>
    ${descriptionBlock}
    <p style="margin:8px 0 0;font-size:13px;font-weight:700;">${classLabel}</p>
    <p style="margin:2px 0 0;font-size:11px;color:#64748b;">${esc(c.academicYear)} · ${esc(c.term)}</p>
    <p style="margin:4px 0 0;font-size:10px;color:#64748b;">${esc(L.official)} · ${docId}</p>`;

  const img = (src: string | null | undefined, style: string) =>
    src ? `<img src="${esc(src)}" alt="" style="${style}" />` : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8"/>
<title>${esc(brand.schoolName)} — ${classLabel}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"/>
<style>
@page { size: A4; margin: 0; }
body { margin:0; font-family: 'Montserrat', system-ui, -apple-system, sans-serif; color:#1e293b; background:#eef2f7; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.sheet-wrap { padding:16px; display:flex; justify-content:center; }
#babyeyi-pdf-doc {
  width:794px; max-width:100%; background:#fff;
  border:2px solid #1e3a5f; border-radius:14px; padding:3px;
  position:relative; box-sizing:border-box;
}
.inner {
  border:1.5px solid #FEBF10; border-radius:11px;
  padding:22px 26px 20px; position:relative; box-sizing:border-box;
}
.accent-dots { position:absolute; top:10px; right:14px; display:flex; gap:4px; align-items:center; }
.accent-dots span { width:5px; height:5px; border-radius:999px; background:#FEBF10; display:block; }
.accent-bar-tl { position:absolute; top:10px; left:14px; width:28px; height:3px; border-radius:2px; background:linear-gradient(90deg,#1e3a5f 60%,#FEBF10 60%); }
.accent-bar-bl { position:absolute; bottom:10px; left:14px; width:28px; height:3px; border-radius:2px; background:linear-gradient(90deg,#FEBF10 40%,#1e3a5f 40%); }
h2 { font-size:14px; font-weight:700; color:#1e3a5f; text-transform:uppercase; letter-spacing:.04em; margin:18px 0 8px; padding-bottom:4px; border-bottom:1px solid #1e3a5f; }
table { width:100%; border-collapse:collapse; }
th { text-align:left; font-size:11px; font-weight:700; color:#1e3a5f; padding:6px 8px; border-bottom:1.5px solid #1e3a5f; }
td { font-size:12px; padding:7px 8px; border-bottom:1px solid #e2e8f0; vertical-align:top; }
tr, #babyeyi-pdf-auth-block { page-break-inside:avoid; }
#babyeyi-pdf-auth-block { page-break-before:avoid; margin-top:22px; }
.auth-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; align-items:end; border-top:1px solid #e2e8f0; padding-top:16px; text-align:center; }
.auth-label { margin:8px 0 0; font-size:10px; color:#64748b; }
.footer-line { margin:14px 0 0; padding-top:8px; border-top:1px solid #e2e8f0; font-size:10px; color:#64748b; text-align:center; }
@media print {
  body{background:#fff;}
  .sheet-wrap{padding:8px;}
  .no-print{display:none!important;}
  #babyeyi-pdf-doc, .inner { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
</style>
</head>
<body>
<div class="no-print" style="padding:12px 16px;display:flex;gap:8px;justify-content:center;align-items:center;background:#000435;flex-wrap:wrap;">
  <span style="color:#fff;font-size:12px;font-weight:600;margin-right:6px;">${esc(brand.schoolName)} · Babyeyi</span>
  <button onclick="bydPrint()" style="background:#FCB038;border:0;border-radius:10px;padding:10px 16px;font-weight:700;color:#000435;cursor:pointer;">Print</button>
  <button onclick="bydPrint()" style="background:#ffffff;border:0;border-radius:10px;padding:10px 16px;font-weight:700;color:#000435;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">Save as PDF</button>
  <button onclick="bydClose()" style="background:transparent;border:1px solid #ffffff88;border-radius:10px;padding:10px 16px;font-weight:600;color:#fff;cursor:pointer;">Close</button>
</div>
<script>
(function () {
  function doPrint() {
    try { window.print(); } catch (e) {}
    // Fallback for browsers that need a frame before print kicks in.
    setTimeout(function () { try { window.print(); } catch (e) {} }, 150);
  }
  function doClose() {
    var closed = false;
    try { window.close(); closed = true; } catch (e) {}
    // If closing was suppressed, walk back or blank the tab so the user isn't stuck.
    setTimeout(function () {
      try {
        if (window && window.opener) {
          if (!document.hidden) { /* still open */ }
        }
      } catch (e) {}
      try {
        if (history.length > 1) { history.back(); } else { location.replace('about:blank'); }
      } catch (e) {}
    }, 400);
  }
  window.bydPrint = doPrint;
  window.bydClose = doClose;
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); doPrint(); }
    if (e.key === 'Escape') { doClose(); }
  });
})();
</script>
<div class="sheet-wrap"><div id="babyeyi-pdf-doc"><div class="inner">
<div class="accent-dots" aria-hidden="true"><span></span><span></span><span></span></div>
<div class="accent-bar-tl" aria-hidden="true"></div>
<div class="accent-bar-bl" aria-hidden="true"></div>
<header style="display:grid;grid-template-columns:72px 1fr 72px;gap:12px;margin:8px 0 14px;padding-bottom:12px;border-bottom:2px solid #1e3a5f;">
  <div style="width:72px;height:72px;display:flex;align-items:center;justify-content:center;">${img(brand.logoUrl, 'max-width:68px;max-height:68px;object-fit:contain;') || '<div style="width:64px;height:64px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;"></div>'}</div>
  <div style="text-align:center;">
    ${headerCenter}
  </div>
  <div style="width:72px;height:72px;display:flex;align-items:center;justify-content:center;">${img(brand.otherLogoUrl, 'max-width:68px;max-height:68px;object-fit:contain;')}</div>
</header>
${message ? `<section><h2>${esc(L.parentMessage)}</h2><p style="font-size:12px;line-height:1.7;margin:0;">${esc(message)}</p></section>` : ''}
${
  payments.length
    ? `<section><h2>${esc(L.fees)}</h2><table><thead><tr><th>${esc(L.item)}</th><th style="text-align:right;">${esc(L.amount)}</th></tr></thead><tbody>${payments
        .map(
          (p) =>
            `<tr><td>${esc(p.name)}</td><td style="text-align:right;font-weight:600;">${money(p.amount)}</td></tr>`
        )
        .join('')}<tr><td style="border:0;font-weight:700;color:#1e3a5f;">${esc(L.total)}</td><td style="border:0;text-align:right;font-weight:700;color:#1e3a5f;">${money(feesTableTotal)}</td></tr></tbody></table></section>`
    : ''
}
${
  banks.length
    ? `<section><h2>${esc(L.banking)}</h2><table><thead><tr><th>${esc(L.bank)}</th><th>${esc(L.account)}</th><th>${esc(L.name)}</th></tr></thead><tbody>${banks
        .map(
          (b) =>
            `<tr><td>${esc(b.bank_name)}</td><td>${esc(b.account_no || '—')}</td><td>${esc(b.account_name || '—')}</td></tr>`
        )
        .join('')}</tbody></table></section>`
    : ''
}
${
  requirements.length
    ? `<section><h2>${esc(L.requirements)}</h2><ol style="margin:0;padding:0;list-style:none;">${requirements
        .map(
          (r, i) =>
            `<li style="display:grid;grid-template-columns:18px 1fr;gap:7px;align-items:start;margin:0 0 6px;">
              <span style="width:18px;height:18px;border-radius:999px;background:#1e3a5f;color:#fff;font-size:9px;font-weight:700;font-family:system-ui,sans-serif;display:inline-flex;align-items:center;justify-content:center;">${i + 1}</span>
              <div style="font-size:11px;line-height:1.4;">
                <strong style="color:#1e3a5f;">${esc(r.item)}</strong>${r.quantity ? ` <span style="color:#64748b;">· Qty ${esc(String(r.quantity))}</span>` : ''}
                ${r.description ? `<div style="color:#64748b;font-size:10px;margin-top:1px;">${esc(r.description)}</div>` : ''}
              </div>
            </li>`
        )
        .join('')}</ol></section>`
    : ''
}
${
  otherInfos.length
    ? `<section><h2>${esc(L.other)}</h2><ul style="margin:0;padding:0;list-style:none;">${otherInfos
        .map(
          (o) =>
            `<li style="display:grid;grid-template-columns:10px 1fr;gap:7px;align-items:start;margin:0 0 6px;">
              <span style="width:7px;height:7px;border-radius:999px;background:#FEBF10;border:1.5px solid #1e3a5f;margin-top:4px;"></span>
              <span style="font-size:11px;line-height:1.4;">${esc(o.item)}</span>
            </li>`
        )
        .join('')}</ul></section>`
    : ''
}
${
  leaders.length
    ? `<section><h2>${esc(L.leaders)}</h2><div style="display:grid;grid-template-columns:${leaders.length > 1 ? '1fr 1fr' : '1fr'};gap:6px;">${leaders
        .map(
          (l) =>
            `<div style="border:1px solid #e2e8f0;border-radius:4px;padding:6px 8px;background:#f8fafc;page-break-inside:avoid;">
              <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#1e3a5f;">${esc(l.name || '—')}</p>
              <p style="margin:0 0 4px;font-size:9.5px;font-weight:600;">${esc(l.role || '—')}</p>
              <div style="display:grid;grid-template-columns:${l.phone && l.email ? '1fr 1fr' : '1fr'};gap:4px;font-size:9px;">
                ${l.phone ? `<div><span style="color:#64748b;display:block;font-size:8px;text-transform:uppercase;">${esc(L.phone)}</span><span style="font-weight:600;">${esc(l.phone)}</span></div>` : ''}
                ${l.email ? `<div><span style="color:#64748b;display:block;font-size:8px;text-transform:uppercase;">Email</span><span style="font-weight:600;word-break:break-all;">${esc(l.email)}</span></div>` : ''}
              </div>
            </div>`
        )
        .join('')}</div></section>`
    : ''
}
${
  classNotes.length
    ? `<section><h2>${esc(L.notes)}</h2><ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.7;">${classNotes
        .map((n) => `<li>${esc(n.item)}</li>`)
        .join('')}</ul></section>`
    : ''
}
<div id="babyeyi-pdf-auth-block">
  <div class="auth-grid">
    <div><div style="min-height:80px;display:flex;align-items:flex-end;justify-content:center;">${img(brand.signatureUrl, 'max-width:100%;max-height:64px;object-fit:contain;') || '<div style="height:48px;width:80%;border-bottom:1px solid #e2e8f0;"></div>'}</div><p class="auth-label">${esc(brand.principalName ? `Head Teacher — ${brand.principalName}` : 'Head Teacher')}</p></div>
    <div><div style="min-height:80px;display:flex;align-items:flex-end;justify-content:center;">${img(brand.qrUrl, 'width:88px;height:88px;object-fit:contain;') || '<div style="width:88px;height:88px;border:1px dashed #e2e8f0;"></div>'}</div><p class="auth-label">Verification QR</p></div>
    <div><div style="min-height:80px;display:flex;align-items:flex-end;justify-content:center;">${img(brand.stampUrl, 'max-width:100%;max-height:72px;object-fit:contain;') || '<div style="width:72px;height:72px;border-radius:50%;border:1px dashed #e2e8f0;margin:0 auto;"></div>'}</div><p class="auth-label">Official Stamp</p></div>
  </div>
  <p class="footer-line">Generated by ShulePlus · ${esc(brand.schoolName)} · ${esc(L.official)} · ${docId}</p>
</div>
</div></div></div>
${opts.autoprint ? '<script>window.addEventListener("load",function(){setTimeout(function(){try{window.print()}catch(e){}},350);});</script>' : ''}
</body></html>`;
}
