import type { Circular } from '@/types';
import {
  DOC_LABELS,
  moneyRwf,
  resolveParentMessage,
  shortDocId,
  type DocLang,
} from '@/lib/official-doc/tokens';
import { BABYEYI_PDF_WIDTH_PX, DOC, MONTSERRAT_FONT_HREF, type OfficialDocBrand } from '@/lib/official-doc/types';

function esc(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function imgTag(src: string | null | undefined, style: string, alt = '') {
  if (!src) return '';
  return `<img src="${esc(src)}" alt="${esc(alt)}" style="${style}" />`;
}

/** Standalone printable HTML twin of OfficialDocDocument (for Print tab / server). */
export function buildOfficialDocHtml(opts: {
  circular: Circular;
  brand: OfficialDocBrand;
  lang: DocLang;
  autoprint?: boolean;
}): string {
  const { circular, brand, lang, autoprint } = opts;
  const L = DOC_LABELS[lang];
  const message = resolveParentMessage(circular, lang);
  const payments = circular.payments ?? [];
  const feesTableTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const banks = (circular.banks ?? []).filter((b) => b.bank_name);
  const requirements = circular.requirements ?? [];
  const otherInfos = circular.otherInfos ?? [];
  const leaders = circular.leaders ?? [];
  const classNotes = circular.classReqs ?? [];
  const location = [brand.sector, brand.district, brand.province].filter(Boolean).join(' · ');
  const docId = shortDocId(circular.id);
  const classLabel =
    circular.classes?.length > 1 ? circular.classes.map(esc).join(', ') : esc(circular.className);
  const descriptionLines = (circular.descriptionLines ?? []).filter((line) => line && line.trim());
  const showSchoolDescription = Boolean(circular.includeSchoolDescription && descriptionLines.length > 0);
  const descriptionBlock = showSchoolDescription
    ? descriptionLines
        .map(
          (line) =>
            `<p style="margin:2px 0 0;font-size:10px;color:${DOC.muted};line-height:1.35;">${esc(line)}</p>`
        )
        .join('')
    : location
      ? `<p style="margin:4px 0 0;font-size:11px;color:${DOC.muted};">${esc(location)}</p>`
      : '';
  const headerCenter = `<p style="margin:0;font-size:16px;font-weight:700;color:${DOC.navy};text-transform:uppercase;line-height:1.25;">${esc(brand.schoolName)}</p>
            ${descriptionBlock}
            <p style="margin:8px 0 0;font-size:13px;font-weight:700;">${classLabel}</p>
            <p style="margin:2px 0 0;font-size:11px;color:${DOC.muted};">${esc(circular.academicYear)} · ${esc(circular.term)}${circular.schoolCategory ? ` · ${esc(circular.schoolCategory)}` : ''}</p>
            <p style="margin:4px 0 0;font-size:10px;color:${DOC.muted};">${esc(L.official)} · ${docId}</p>`;

  const feesRows = payments
    .map(
      (p) =>
        `<tr><td>${esc(p.name)}</td><td style="text-align:right;font-weight:600;white-space:nowrap;">${moneyRwf(p.amount)}</td></tr>`
    )
    .join('');

  const banksRows = banks
    .map(
      (b) =>
        `<tr><td>${esc(b.bank_name)}${b.is_primary ? ' <span style="color:#64748b;font-size:10px;">(primary)</span>' : ''}</td><td>${esc(b.account_no || '—')}</td><td>${esc(b.account_name || '—')}</td></tr>`
    )
    .join('');

  const reqList = requirements
    .map(
      (r, i) =>
        `<li style="display:grid;grid-template-columns:18px 1fr;gap:7px;align-items:start;margin:0 0 6px;">
          <span style="width:18px;height:18px;border-radius:999px;background:${DOC.navy};color:#fff;font-size:9px;font-weight:700;font-family:system-ui,sans-serif;display:inline-flex;align-items:center;justify-content:center;">${i + 1}</span>
          <div style="font-size:11px;line-height:1.4;">
            <strong style="color:${DOC.navy};">${esc(r.item)}</strong>${r.quantity ? ` <span style="color:${DOC.muted};">· Qty ${esc(String(r.quantity))}</span>` : ''}
            ${r.description ? `<div style="color:${DOC.muted};font-size:10px;margin-top:1px;">${esc(r.description)}</div>` : ''}
          </div>
        </li>`
    )
    .join('');

  const otherList = otherInfos
    .map(
      (o) =>
        `<li style="display:grid;grid-template-columns:10px 1fr;gap:7px;align-items:start;margin:0 0 6px;">
          <span style="width:7px;height:7px;border-radius:999px;background:${DOC.amber};border:1.5px solid ${DOC.navy};margin-top:4px;"></span>
          <span style="font-size:11px;line-height:1.4;">${esc(o.item)}</span>
        </li>`
    )
    .join('');

  const leadersCards = leaders
    .map(
      (l) =>
        `<div style="border:1px solid ${DOC.hairline};border-radius:4px;padding:6px 8px;background:#f8fafc;page-break-inside:avoid;">
          <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:${DOC.navy};">${esc(l.name || '—')}</p>
          <p style="margin:0 0 4px;font-size:9.5px;font-weight:600;color:${DOC.body};">${esc(l.role || '—')}</p>
          <div style="display:grid;grid-template-columns:${l.phone && l.email ? '1fr 1fr' : '1fr'};gap:4px;font-size:9px;">
            ${l.phone ? `<div><span style="color:${DOC.muted};display:block;font-size:8px;text-transform:uppercase;">${esc(L.phone)}</span><span style="font-weight:600;">${esc(l.phone)}</span></div>` : ''}
            ${l.email ? `<div><span style="color:${DOC.muted};display:block;font-size:8px;text-transform:uppercase;">Email</span><span style="font-weight:600;word-break:break-all;">${esc(l.email)}</span></div>` : ''}
          </div>
        </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${esc(brand.schoolName)} — ${classLabel}</title>
  <link rel="stylesheet" href="${MONTSERRAT_FONT_HREF}" />
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef2f7;
      font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
      color: ${DOC.body};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet-wrap { padding: 16px; display: flex; justify-content: center; }
    #babyeyi-pdf-doc {
      width: ${BABYEYI_PDF_WIDTH_PX}px;
      max-width: 100%;
      background: #fff;
      border: 2px solid ${DOC.navy};
      padding: 3px;
    }
    .inner {
      border: 1px solid ${DOC.amber};
      padding: 28px 32px 24px;
      background: #fff;
    }
    h2 {
      font-size: 14px; font-weight: 700; color: ${DOC.navy};
      text-transform: uppercase; letter-spacing: .04em;
      margin: 18px 0 8px; padding-bottom: 4px;
      border-bottom: 1px solid ${DOC.navy};
    }
    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left; font-size: 11px; font-weight: 700; color: ${DOC.navy};
      padding: 6px 8px; border-bottom: 1.5px solid ${DOC.navy}; background: transparent;
    }
    td {
      font-size: 12px; color: ${DOC.body}; padding: 7px 8px;
      border-bottom: 1px solid ${DOC.hairline}; vertical-align: top;
    }
    tr { page-break-inside: avoid; }
    #babyeyi-pdf-auth-block {
      page-break-inside: avoid;
      page-break-before: avoid;
      margin-top: 22px;
    }
    .auth-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
      align-items: end; border-top: 1px solid ${DOC.hairline}; padding-top: 16px;
      text-align: center;
    }
    .auth-label { margin: 8px 0 0; font-size: 10px; color: ${DOC.muted}; }
    .footer-line {
      margin: 14px 0 0; padding-top: 8px; border-top: 1px solid ${DOC.hairline};
      font-size: 10px; color: ${DOC.muted}; text-align: center;
    }
    @media print {
      body { background: #fff; }
      .sheet-wrap { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="padding:12px 16px;display:flex;gap:8px;justify-content:center;background:#000435;">
    <button onclick="window.print()" style="background:#FCB038;border:0;border-radius:10px;padding:10px 16px;font-weight:700;color:#000435;cursor:pointer;">Print</button>
    <button onclick="window.close()" style="background:#fff;border:0;border-radius:10px;padding:10px 16px;cursor:pointer;">Close</button>
  </div>
  <div class="sheet-wrap">
    <div id="babyeyi-pdf-doc">
      <div class="inner">
        <header id="babyeyi-pdf-header" data-babyeyi-pdf-section="header" style="display:grid;grid-template-columns:72px 1fr 72px;gap:12px;align-items:flex-start;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid ${DOC.navy};">
          <div style="width:72px;height:72px;display:flex;align-items:center;justify-content:center;">
            ${imgTag(brand.logoUrl, 'max-width:68px;max-height:68px;object-fit:contain;') || '<div style="width:64px;height:64px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;"></div>'}
          </div>
          <div style="text-align:center;">
            ${headerCenter}
          </div>
          <div style="width:72px;height:72px;display:flex;align-items:center;justify-content:center;">
            ${imgTag(brand.otherLogoUrl, 'max-width:68px;max-height:68px;object-fit:contain;')}
          </div>
        </header>

        <div id="babyeyi-pdf-body">
          ${
            message
              ? `<section data-babyeyi-pdf-section="parent-message"><h2>${esc(L.parentMessage)}</h2><p style="font-size:12px;line-height:1.7;margin:0;">${esc(message)}</p></section>`
              : ''
          }
          ${
            payments.length
              ? `<section data-babyeyi-pdf-section="fees"><h2>${esc(L.fees)}</h2><table><thead><tr><th>${esc(L.item)}</th><th style="text-align:right;">${esc(L.amount)}</th></tr></thead><tbody>${feesRows}<tr><td style="border-bottom:none;font-weight:700;color:${DOC.navy};">${esc(L.total)}</td><td style="border-bottom:none;text-align:right;font-weight:700;color:${DOC.navy};font-size:13px;">${moneyRwf(feesTableTotal)}</td></tr></tbody></table></section>`
              : ''
          }
          ${
            banks.length
              ? `<section data-babyeyi-pdf-section="banking"><h2>${esc(L.banking)}</h2><table><thead><tr><th>${esc(L.bank)}</th><th>${esc(L.account)}</th><th>${esc(L.name)}</th></tr></thead><tbody>${banksRows}</tbody></table></section>`
              : ''
          }
          ${
            requirements.length
              ? `<section data-babyeyi-pdf-section="requirements"><h2>${esc(L.requirements)}</h2><ol style="margin:0;padding:0;list-style:none;">${reqList}</ol></section>`
              : ''
          }
          ${
            otherInfos.length
              ? `<section data-babyeyi-pdf-section="other"><h2>${esc(L.other)}</h2><ul style="margin:0;padding:0;list-style:none;">${otherList}</ul></section>`
              : ''
          }
          ${
            leaders.length
              ? `<section data-babyeyi-pdf-section="leaders"><h2>${esc(L.leaders)}</h2><div style="display:grid;grid-template-columns:${leaders.length > 1 ? '1fr 1fr' : '1fr'};gap:6px;">${leadersCards}</div></section>`
              : ''
          }
          ${
            classNotes.length
              ? `<section data-babyeyi-pdf-section="notes"><h2>${esc(L.notes)}</h2><ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.7;">${classNotes.map((n) => `<li>${esc(n.item)}</li>`).join('')}</ul></section>`
              : ''
          }

          <div id="babyeyi-pdf-auth-block" data-babyeyi-pdf-section="auth">
            <div class="auth-grid">
              <div>
                <div style="min-height:80px;display:flex;align-items:flex-end;justify-content:center;">
                  ${imgTag(brand.signatureUrl, 'max-width:100%;max-height:64px;object-fit:contain;') || '<div style="height:48px;width:80%;border-bottom:1px solid #e2e8f0;"></div>'}
                </div>
                <p class="auth-label">${esc(brand.principalName ? `Head Teacher — ${brand.principalName}` : 'Head Teacher')}</p>
              </div>
              <div>
                <div style="min-height:80px;display:flex;align-items:flex-end;justify-content:center;">
                  ${imgTag(brand.qrUrl, 'width:88px;height:88px;object-fit:contain;', 'QR') || '<div style="width:88px;height:88px;border:1px dashed #e2e8f0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#64748b;">QR</div>'}
                </div>
                <p class="auth-label">Verification QR</p>
              </div>
              <div>
                <div style="min-height:80px;display:flex;align-items:flex-end;justify-content:center;">
                  ${imgTag(brand.stampUrl, 'max-width:100%;max-height:72px;object-fit:contain;') || '<div style="width:72px;height:72px;border-radius:50%;border:1px dashed #e2e8f0;margin:0 auto;"></div>'}
                </div>
                <p class="auth-label">Official Stamp</p>
              </div>
            </div>
            <p class="footer-line">${esc(brand.schoolName)} · ${esc(L.official)} · ${docId}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  ${autoprint ? '<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},250);});</script>' : ''}
</body>
</html>`;
}

export function openOfficialPrintHtml(html: string) {
  // Hidden iframe — browsers block window.open() popups; iframe print works from a user click.
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'Print circular');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    iframe.remove();
    throw new Error('Could not prepare print view');
  }

  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      /* already gone */
    }
  };

  win.addEventListener('afterprint', cleanup);
  // Safety if afterprint never fires (some browsers)
  window.setTimeout(cleanup, 60_000);

  doc.open();
  doc.write(html);
  doc.close();

  // If the HTML does not auto-call print, trigger it after load.
  const hasAutoPrint = /window\.print\s*\(/.test(html);
  if (!hasAutoPrint) {
    const trigger = () => {
      try {
        win.focus();
        win.print();
      } catch {
        cleanup();
        throw new Error('Print failed');
      }
    };
    if (doc.readyState === 'complete') {
      window.setTimeout(trigger, 200);
    } else {
      iframe.onload = () => window.setTimeout(trigger, 200);
    }
  }
}
