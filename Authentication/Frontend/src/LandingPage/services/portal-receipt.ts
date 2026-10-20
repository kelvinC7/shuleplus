/** Modern printable digital receipt for the landing payment portal. */
import { jsPDF } from 'jspdf';

export type ReceiptStatus = 'PAID' | 'PENDING' | 'NOT_PAID' | 'APPROVED' | 'FAILED';

export type ReceiptLine = {
  name: string;
  amount: number;
};

export type PaymentReceipt = {
  kind: 'school-fees' | 'requirements';
  reference: string;
  studentName: string;
  schoolName: string;
  studentClass: string;
  studentUid?: string;
  academicYear: string;
  term: string;
  method: string;
  lines: ReceiptLine[];
  amountPaid: number;
  remainingBalance?: number | null;
  paidAt?: Date;
  status?: ReceiptStatus;
};

export function receiptStatusInfo(status?: ReceiptStatus): {
  label: string;
  note: string;
  hex: string;
  bgHex: string;
} {
  switch (status) {
    case 'PENDING':
      return {
        label: 'PENDING',
        note: 'Awaiting confirmation — money not yet received',
        hex: '#b45309',
        bgHex: '#fef3c7',
      };
    case 'NOT_PAID':
      return { label: 'NOT PAID', note: 'No money received for this reference', hex: '#be123c', bgHex: '#ffe4e6' };
    case 'FAILED':
      return { label: 'FAILED', note: 'This payment did not go through', hex: '#be123c', bgHex: '#ffe4e6' };
    case 'APPROVED':
      return { label: 'APPROVED · PAID', note: 'Payment confirmed & approved', hex: '#047857', bgHex: '#d1fae5' };
    default:
      return { label: 'PAID', note: 'Payment confirmed', hex: '#047857', bgHex: '#d1fae5' };
  }
}

const RWF = new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 });

function money(n: number) {
  return `${RWF.format(Math.max(0, n))} Frw`;
}

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildReceiptHtml(receipt: PaymentReceipt): string {
  const when = receipt.paidAt ?? new Date();
  const dateStr = when.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const title = receipt.kind === 'school-fees' ? 'School Fees Receipt' : 'Requirements Receipt';
  const status = receiptStatusInfo(receipt.status);
  const linesHtml = receipt.lines
    .map(
      (l) => `
      <tr>
        <td>${esc(l.name)}</td>
        <td class="amt">${esc(money(l.amount))}</td>
      </tr>`
    )
    .join('');

  const remainingBlock =
    receipt.remainingBalance != null
      ? `<div class="row"><span>Remaining balance</span><strong>${esc(money(receipt.remainingBalance))}</strong></div>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)} · ${esc(receipt.reference)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap');
    :root {
      --navy: #000435;
      --amber: #FCB038;
      --muted: #5c6478;
      --line: rgba(0,4,53,0.08);
      --bg: #F8F9FA;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Montserrat, system-ui, sans-serif;
      color: var(--navy);
      background: #eef1f6;
      padding: 32px 16px;
    }
    .sheet {
      max-width: 640px;
      margin: 0 auto;
      background: #fff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 24px 64px -28px rgba(0,4,53,0.35);
    }
    .hero {
      background: linear-gradient(135deg, #000435 0%, #1a1f5c 55%, #2a1f6e 100%);
      color: #fff;
      padding: 28px 32px 32px;
      position: relative;
    }
    .hero::after {
      content: '';
      position: absolute;
      right: -40px; top: -40px;
      width: 160px; height: 160px;
      border-radius: 50%;
      border: 28px solid rgba(252,176,56,0.18);
    }
    .brand {
      display: flex; align-items: center; gap: 12px;
      font-weight: 800; letter-spacing: -0.02em; font-size: 20px;
    }
    .brand-mark {
      width: 40px; height: 40px; border-radius: 12px;
      background: var(--amber); color: var(--navy);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 18px;
    }
    .eyebrow {
      margin-top: 18px;
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.16em; text-transform: uppercase;
      color: rgba(252,176,56,0.95);
    }
    h1 {
      margin: 6px 0 0;
      font-size: 26px; font-weight: 800; letter-spacing: -0.03em;
    }
    .ref {
      margin-top: 10px; font-size: 13px; color: rgba(255,255,255,0.72);
    }
    .ref strong { color: #fff; font-family: ui-monospace, monospace; }
    .status {
      display: inline-block; margin-top: 14px;
      padding: 6px 14px; border-radius: 999px;
      font-size: 11px; font-weight: 800; letter-spacing: 0.12em;
    }
    .body { padding: 28px 32px 32px; }
    .grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
      margin-bottom: 22px;
    }
    .card {
      background: var(--bg); border-radius: 16px; padding: 14px 16px;
      border: 1px solid var(--line);
    }
    .card label {
      display: block; font-size: 10px; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
    }
    .card strong { display: block; margin-top: 4px; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 18px; }
    th {
      text-align: left; font-size: 10px; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--muted); padding: 0 0 10px;
      border-bottom: 1px solid var(--line);
    }
    th.amt, td.amt { text-align: right; }
    td { padding: 12px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
    td.amt { font-weight: 700; }
    .totals {
      background: var(--navy); color: #fff; border-radius: 18px;
      padding: 16px 18px; margin-top: 8px;
    }
    .row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 4px 0; font-size: 13px; color: rgba(255,255,255,0.7);
    }
    .row strong { color: #fff; }
    .row.total { margin-top: 8px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.12); }
    .row.total span { font-weight: 600; color: rgba(255,255,255,0.85); }
    .row.total strong { color: var(--amber); font-size: 20px; font-weight: 800; }
    .footer {
      margin-top: 22px; text-align: center; font-size: 12px; color: var(--muted);
    }
    .stamp {
      display: inline-flex; align-items: center; gap: 8px;
      margin-top: 14px; padding: 8px 14px; border-radius: 999px;
      background: rgba(252,176,56,0.12); color: var(--navy);
      font-size: 12px; font-weight: 700;
    }
    .stamp i {
      width: 8px; height: 8px; border-radius: 50%; background: #20D6C7; display: inline-block;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; border-radius: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="hero">
      <div class="brand">
        <div class="brand-mark">S+</div>
        <span>Shule+</span>
      </div>
      <p class="eyebrow">Digital payment receipt</p>
      <h1>${esc(title)}</h1>
      <p class="ref">Reference <strong>${esc(receipt.reference)}</strong> · ${esc(dateStr)}</p>
      <span class="status" style="background:${status.bgHex};color:${status.hex}">${esc(status.label)}</span>
    </div>
    <div class="body">
      <div class="grid">
        <div class="card"><label>Student</label><strong>${esc(receipt.studentName)}</strong></div>
        <div class="card"><label>School</label><strong>${esc(receipt.schoolName)}</strong></div>
        <div class="card"><label>Class</label><strong>${esc(receipt.studentClass)}</strong></div>
        <div class="card"><label>Period</label><strong>${esc(receipt.academicYear)} · ${esc(receipt.term)}</strong></div>
        ${
          receipt.studentUid
            ? `<div class="card"><label>ShuleCode</label><strong>${esc(receipt.studentUid)}</strong></div>`
            : ''
        }
        <div class="card"><label>Method</label><strong>${esc(receipt.method)}</strong></div>
      </div>

      <table>
        <thead>
          <tr><th>Item</th><th class="amt">Amount</th></tr>
        </thead>
        <tbody>${linesHtml}</tbody>
      </table>

      <div class="totals">
        ${remainingBlock}
        <div class="row total"><span>Total paid</span><strong>${esc(money(receipt.amountPaid))}</strong></div>
      </div>

      <div class="footer">
        <div class="stamp"><i></i> ${esc(status.note)} · Shule+ Payment Portal</div>
        <p style="margin-top:14px">Keep this receipt for your records. Generated automatically by the Shule+ payment portal.</p>
      </div>
    </div>
  </div>
  <div class="no-print" style="text-align:center;margin-top:20px">
    <button onclick="window.print()" style="appearance:none;border:0;background:#000435;color:#fff;font:600 14px Montserrat,sans-serif;padding:12px 22px;border-radius:12px;cursor:pointer">
      Print / Save as PDF
    </button>
  </div>
  <script>setTimeout(function(){ try { window.print(); } catch(e) {} }, 350);</script>
</body>
</html>`;
}

/** Opens a modern receipt window (Print → Save as PDF) and also downloads an .html copy. */
export function downloadModernReceipt(receipt: PaymentReceipt) {
  const html = buildReceiptHtml(receipt);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${receipt.reference}-shuleplus-receipt.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  const win = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function makePaymentReference(prefix: 'SF' | 'RQ') {
  return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
}

/* ------------------------------------------------------------------ */
/* True PDF receipt (jsPDF — matches SchoolFeesPortal collections style)*/
/* ------------------------------------------------------------------ */

const PDF_NAVY: [number, number, number] = [0, 4, 53];
const PDF_AMBER: [number, number, number] = [252, 176, 56];
const PDF_GRAY: [number, number, number] = [100, 116, 139];
const PDF_LIGHT: [number, number, number] = [241, 245, 249];

function pdfHexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export async function downloadFeeReceiptPdf(receipt: PaymentReceipt) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 16;
  const status = receiptStatusInfo(receipt.status);
  const when = receipt.paidAt ?? new Date();
  const title = receipt.kind === 'school-fees' ? 'School Fees Receipt' : 'Requirements Receipt';

  // Header band
  doc.setFillColor(...PDF_NAVY);
  doc.roundedRect(0, 0, W, 46, 0, 0, 'F');
  doc.setFillColor(...PDF_AMBER);
  doc.roundedRect(M, 12, 11, 11, 2.5, 2.5, 'F');
  doc.setTextColor(...PDF_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('S+', M + 5.5, 19, { align: 'center' });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text('Shule+', M + 15, 19.5);
  doc.setTextColor(...PDF_AMBER);
  doc.setFontSize(7.5);
  doc.text('D I G I T A L   P A Y M E N T   R E C E I P T', M, 27);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(19);
  doc.text(title, M, 35);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 190, 220);
  doc.text(`Reference ${receipt.reference}`, M, 41);

  // Status pill
  const [sr, sg, sb] = pdfHexRgb(status.hex);
  const [br_, bg_, bb_] = pdfHexRgb(status.bgHex);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const pillW = doc.getTextWidth(status.label) + 10;
  doc.setFillColor(br_, bg_, bb_);
  doc.roundedRect(W - M - pillW, 14, pillW, 8, 4, 4, 'F');
  doc.setTextColor(sr, sg, sb);
  doc.text(status.label, W - M - pillW / 2, 19.3, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 190, 220);
  doc.text(
    when.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    W - M,
    41,
    { align: 'right' }
  );

  // Details grid
  let y = 58;
  const colW = (W - M * 2 - 6) / 2;
  const detail = (label: string, value: string, x: number, yy: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...PDF_GRAY);
    doc.text(label.toUpperCase(), x, yy);
    doc.setFontSize(10);
    doc.setTextColor(...PDF_NAVY);
    doc.text(doc.splitTextToSize(value || '—', colW - 4)[0] ?? '—', x, yy + 5);
  };
  detail('Student', receipt.studentName, M, y);
  detail('School', receipt.schoolName, M + colW + 6, y);
  detail('Class', receipt.studentClass, M, y + 15);
  detail('Period', `${receipt.academicYear} · ${receipt.term}`, M + colW + 6, y + 15);
  if (receipt.studentUid) {
    detail('ShuleCode', receipt.studentUid, M, y + 30);
    detail('Method', receipt.method, M + colW + 6, y + 30);
  } else {
    detail('Method', receipt.method, M + colW + 6, y + 30);
  }

  // Lines table
  y += 44;
  doc.setFillColor(...PDF_LIGHT);
  doc.rect(M, y, W - M * 2, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_GRAY);
  doc.text('ITEM', M + 3, y + 6);
  doc.text('AMOUNT (RWF)', W - M - 3, y + 6, { align: 'right' });
  y += 9;
  doc.setFont('helvetica', 'normal');
  for (const l of receipt.lines.length ? receipt.lines : [{ name: 'School fees payment', amount: receipt.amountPaid }]) {
    doc.setDrawColor(226, 232, 240);
    doc.line(M, y + 8, W - M, y + 8);
    doc.setFontSize(10);
    doc.setTextColor(...PDF_NAVY);
    doc.text(doc.splitTextToSize(l.name, colW - 4)[0] ?? l.name, M + 3, y + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(Math.round(l.amount).toLocaleString(), W - M - 3, y + 5.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 8;
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
  }
  y += 8;

  // Totals card
  if (y > 225) {
    doc.addPage();
    y = 20;
  }
  const totalsH = receipt.remainingBalance != null ? 26 : 20;
  doc.setFillColor(...PDF_NAVY);
  doc.roundedRect(M, y, W - M * 2, totalsH, 3.5, 3.5, 'F');
  let ty = y + 9;
  if (receipt.remainingBalance != null) {
    doc.setFontSize(9.5);
    doc.setTextColor(200, 208, 235);
    doc.text('Remaining balance', M + 5, ty);
    doc.setTextColor(255, 255, 255);
    doc.text(`RWF ${Math.round(receipt.remainingBalance).toLocaleString()}`, W - M - 5, ty, { align: 'right' });
    ty += 8;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(200, 208, 235);
  doc.text('TOTAL PAID', M + 5, ty + 1);
  doc.setFontSize(15);
  doc.setTextColor(...PDF_AMBER);
  doc.text(`RWF ${Math.round(receipt.amountPaid).toLocaleString()}`, W - M - 5, ty + 1.5, { align: 'right' });

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_GRAY);
  doc.text(status.note, W / 2, y + totalsH + 10, { align: 'center' });
  doc.text('Keep this receipt for your records. Verify the reference with the school bursar.', W / 2, y + totalsH + 15, {
    align: 'center',
  });

  const safeRef = receipt.reference.replace(/[^a-zA-Z0-9_-]/g, '_') || 'receipt';
  doc.save(`${safeRef}-shuleplus-receipt.pdf`);
}

export type PaymentSuccessPayload = {
  kind: 'school-fees' | 'requirements';
  studentName: string;
  studentUid?: string;
  organizationId?: string;
  amountPaid: number;
  remainingBalance?: number | null;
  academicYear: string;
  term: string;
  reference: string;
  method: string;
  status?: 'PAID' | 'PENDING';
  lines: ReceiptLine[];
};
