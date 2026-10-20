import { jsPDF } from "jspdf";
import { formatFrw, formatPlanDate } from "./avanceRepayment";

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
}

function receiptNumber(advanceId) {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `RCP-${advanceId || "ADV"}-${day}`;
}

async function loadImage(src) {
  if (!src) return null;
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 256;
    canvas.height = img.naturalHeight || 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

async function loadBrandLogos(schoolLogoUrl) {
  const ticha =
    (await loadImage("/babyeyilogo.png")) ||
    (await loadImage("/1BABYEYI LOGO FINAL.png")) ||
    (await loadImage("/favicon.svg"));
  const school = await loadImage(schoolLogoUrl);
  return { ticha, school };
}

function historyRows(advance) {
  const paid = (advance.schedule || []).filter((r) => r.status === "Paid");
  if (paid.length) return paid;
  return advance.schedule || [];
}

export function buildReceiptHtml({ advance, teacher, payment = null, schoolLogoUrl }) {
  const id = advance.requestNumber || advance.requestNo;
  const receiptNo = receiptNumber(id);
  const generated = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const verify = `TichaPortal:${id}:${receiptNo}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verify)}`;
  const rows = payment ? [payment] : historyRows(advance);
  const totalPaid = Number(advance.totalPaid) || rows.reduce((s, r) => s + (Number(r.paid || r.amount) || 0), 0);
  const remaining = Number(advance.remainingBalance) || 0;
  const fullyPaid = remaining <= 0 && ["Completed", "Disbursed", "Approved"].includes(advance.status);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Advance Repayment Receipt - ${esc(id)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; }
    body { font-family: Montserrat, sans-serif; color: #000435; background: #f8fafc; margin: 0; padding: 24px; }
    .sheet { max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #e8ecf2; overflow: hidden; }
    .head { background: #000435; color: #fff; padding: 22px 28px; display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    .head h1 { font-size: 18px; margin: 0 0 4px; font-weight: 800; }
    .head p { margin: 0; color: rgba(255,255,255,.62); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
    .logos { display: flex; gap: 10px; align-items: center; }
    .logos img { height: 44px; width: 44px; object-fit: contain; background: #fff; border-radius: 10px; padding: 4px; }
    .body { padding: 28px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin-bottom: 22px; }
    .label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; font-weight: 600; }
    .value { font-size: 13px; font-weight: 700; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #000435; color: #fff; text-align: left; padding: 10px 12px; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
    td { padding: 10px 12px; border-bottom: 1px solid #eef2f7; }
    .ok { margin-top: 22px; padding: 14px 16px; background: #ecfdf5; color: #047857; font-weight: 700; font-size: 13px; }
    .foot { display: flex; justify-content: space-between; gap: 24px; margin-top: 28px; align-items: flex-end; }
    .sign { width: 220px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 11px; color: #64748b; }
    .qr { text-align: center; font-size: 10px; color: #94a3b8; }
    .qr img { width: 88px; height: 88px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div>
        <p>TichaPortal</p>
        <h1>Advance Repayment Receipt</h1>
      </div>
      <div class="logos">
        ${schoolLogoUrl ? `<img src="${esc(schoolLogoUrl)}" alt="School" />` : ""}
        <img src="/babyeyilogo.png" alt="TichaPortal" />
      </div>
    </div>
    <div class="body">
      <div class="meta">
        <div><div class="label">Advance ID</div><div class="value">${esc(id)}</div></div>
        <div><div class="label">Receipt number</div><div class="value">${esc(receiptNo)}</div></div>
        <div><div class="label">Teacher</div><div class="value">${esc(teacher?.fullName || teacher?.name || "-")}</div></div>
        <div><div class="label">Employee ID</div><div class="value">${esc(teacher?.employeeCode || "-")}</div></div>
        <div><div class="label">School</div><div class="value">${esc(teacher?.school || teacher?.school_name || "-")}</div></div>
        <div><div class="label">Generated</div><div class="value">${esc(generated)}</div></div>
      </div>
      <p class="label" style="margin-bottom:10px">Advance information</p>
      <div class="meta">
        <div><div class="label">Original advance</div><div class="value">${esc(formatFrw(advance.amount))}</div></div>
        <div><div class="label">Loan period</div><div class="value">${esc(advance.months)} Months</div></div>
        <div><div class="label">Payment frequency</div><div class="value">${esc(advance.frequency || "Monthly")}</div></div>
        <div><div class="label">Total repaid</div><div class="value">${esc(formatFrw(totalPaid))}</div></div>
        <div><div class="label">Outstanding balance</div><div class="value">${esc(formatFrw(remaining))}</div></div>
        <div><div class="label">Status</div><div class="value">${fullyPaid ? "Fully Repaid" : esc(advance.displayStatus || advance.status)}</div></div>
      </div>
      <p class="label" style="margin: 8px 0 10px">Repayment history</p>
      <table>
        <thead><tr><th>Payment</th><th>Date</th><th>Amount</th><th>Reference</th></tr></thead>
        <tbody>
          ${rows.map((r) => `<tr>
            <td>${esc(r.n || r.id)}</td>
            <td>${esc(formatPlanDate(r.date || r.dueDate || r.paidAt))}</td>
            <td>${esc(formatFrw(r.amount || r.paid))}</td>
            <td>${esc(r.reference || "-")}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      ${fullyPaid && !payment ? `<div class="ok">This advance has been fully repaid.</div>` : ""}
      <div class="foot">
        <div class="sign">Authorized signature</div>
        <div class="qr">
          <img src="${qrSrc}" alt="Verification" />
          <div>QR verification</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function openReceiptPrint(opts) {
  const html = buildReceiptHtml(opts);
  const w = window.open("", "_blank");
  if (!w) throw new Error("Allow popups to view the receipt.");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

export async function downloadReceiptPdf({ advance, teacher, payment = null, schoolLogoUrl }) {
  const { ticha, school } = await loadBrandLogos(schoolLogoUrl);
  const id = advance.requestNumber || advance.requestNo;
  const receiptNo = receiptNumber(id);
  const generated = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const rows = payment ? [payment] : historyRows(advance);
  const totalPaid = Number(advance.totalPaid) || rows.reduce((s, r) => s + (Number(r.paid || r.amount) || 0), 0);
  const remaining = Number(advance.remainingBalance) || 0;
  const fullyPaid = remaining <= 0 && ["Completed", "Disbursed", "Approved"].includes(advance.status);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 14;

  doc.setFillColor(0, 4, 53);
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 2, 2, "F");
  if (school) doc.addImage(school, "PNG", margin + 4, y + 4, 20, 20);
  if (ticha) doc.addImage(ticha, "PNG", pageW - margin - 24, y + 4, 20, 20);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TichaPortal - Advance Repayment Receipt", margin + (school ? 28 : 8), y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Receipt ${receiptNo}  ·  Generated ${generated}`, margin + (school ? 28 : 8), y + 19);

  y = 50;
  doc.setTextColor(0, 4, 53);
  const info = [
    ["Advance ID", id],
    ["Teacher", teacher?.fullName || teacher?.name || "-"],
    ["Employee ID", teacher?.employeeCode || "-"],
    ["School", teacher?.school || teacher?.school_name || "-"],
  ];
  info.forEach((row, i) => {
    const x = margin + (i % 2) * 90;
    const yy = y + Math.floor(i / 2) * 12;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(row[0].toUpperCase(), x, yy);
    doc.setFontSize(11);
    doc.setTextColor(0, 4, 53);
    doc.setFont("helvetica", "bold");
    doc.text(String(row[1]), x, yy + 5);
    doc.setFont("helvetica", "normal");
  });

  y += 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Advance information", margin, y);
  y += 6;
  const facts = [
    ["Original Advance", formatFrw(advance.amount)],
    ["Loan Period", `${advance.months} Months`],
    ["Payment Frequency", advance.frequency || "Monthly"],
    ["Total Repaid", formatFrw(totalPaid)],
    ["Outstanding Balance", formatFrw(remaining)],
    ["Status", fullyPaid ? "Fully Repaid" : (advance.displayStatus || advance.status)],
  ];
  facts.forEach((row, i) => {
    const x = margin + (i % 2) * 90;
    const yy = y + Math.floor(i / 2) * 10;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(row[0], x, yy);
    doc.setTextColor(0, 4, 53);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(String(row[1]), x + 42, yy);
  });

  y += 38;
  doc.setFillColor(0, 4, 53);
  doc.rect(margin, y, pageW - margin * 2, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("Payment", margin + 3, y + 5.5);
  doc.text("Date", margin + 32, y + 5.5);
  doc.text("Amount", margin + 78, y + 5.5);
  doc.text("Reference", margin + 120, y + 5.5);
  y += 8;
  doc.setTextColor(0, 4, 53);
  rows.forEach((r, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageW - margin * 2, 8, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(String(r.n || i + 1), margin + 3, y + 5.5);
    doc.text(formatPlanDate(r.date || r.dueDate || r.paidAt), margin + 32, y + 5.5);
    doc.setFont("helvetica", "bold");
    doc.text(formatFrw(r.amount || r.paid), margin + 78, y + 5.5);
    doc.setFont("helvetica", "normal");
    doc.text(String(r.reference || "-"), margin + 120, y + 5.5);
    y += 8;
  });

  y += 10;
  if (fullyPaid && !payment) {
    doc.setFillColor(236, 253, 245);
    doc.rect(margin, y, pageW - margin * 2, 12, "F");
    doc.setTextColor(4, 120, 87);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("This advance has been fully repaid.", margin + 6, y + 8);
    y += 18;
  }

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.line(margin, y + 16, margin + 50, y + 16);
  doc.text("Authorized signature", margin, y + 21);
  doc.text(`Verify: ${receiptNo}`, pageW - margin - 70, y + 21);

  const file = payment
    ? `receipt-${id}-${payment.reference || payment.n}.pdf`
    : `advance-receipt-${id}.pdf`;
  doc.save(file);
}
