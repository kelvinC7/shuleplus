import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadImageDataUrl } from "@/lib/public-assets";
import type { ReceiptData } from "./receipt-types";

const PRIMARY: [number, number, number] = [252, 176, 56];
const NAVY: [number, number, number] = [0, 4, 53];
const GRAY: [number, number, number] = [100, 116, 139];
const LIGHT: [number, number, number] = [241, 245, 249];
const WHITE: [number, number, number] = [255, 255, 255];

function money(n: number) {
  return `RWF ${Math.round(n).toLocaleString()}`;
}

function amount(n: number) {
  return Math.round(n).toLocaleString();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveShuleCode(student: ReceiptData["student"]) {
  const meta = student.profileMeta as
    | { shuleCode?: string; studentCode?: string }
    | null
    | undefined;
  const raw = (
    meta?.studentCode ||
    meta?.shuleCode ||
    student.academicStudentId ||
    ""
  ).trim();
  if (!raw || raw === student.id) return "";
  if (/^[0-9a-f-]{36}$/i.test(raw)) return "";
  return raw;
}

function imageFormat(dataUrl: string): "PNG" | "JPEG" {
  if (
    dataUrl.startsWith("data:image/jpeg") ||
    dataUrl.startsWith("data:image/jpg")
  ) {
    return "JPEG";
  }
  return "PNG";
}

function addImageSafe(
  doc: jsPDF,
  dataUrl: string | null,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!dataUrl) return;
  try {
    doc.addImage(dataUrl, imageFormat(dataUrl), x, y, w, h);
  } catch {
    /* skip broken image */
  }
}

function drawDetailRow(
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  margin: number,
  contentW: number,
) {
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(label, margin + 2, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  const lines = doc.splitTextToSize(value || "—", contentW * 0.62);
  doc.text(lines, margin + contentW * 0.32, y);
  return y + Math.max(4.5, lines.length * 4);
}

function receiptFileName(receiptNumber: string) {
  const safeNo =
    receiptNumber.replace(/[^a-zA-Z0-9_-]/g, "_") || "receipt";
  return `uniform-receipt-${safeNo}.pdf`;
}

export async function buildReceiptPdf(receipt: ReceiptData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentW = pageW - margin * 2;
  const centerX = pageW / 2;

  const [schoolLogo, brandLogo, signature, stamp] = await Promise.all([
    loadImageDataUrl(receipt.schoolLogoUrl),
    loadImageDataUrl("/logo.png"),
    loadImageDataUrl(receipt.signatureUrl),
    loadImageDataUrl(receipt.stampUrl),
  ]);

  let y = margin;

  const brandW = 44;
  addImageSafe(doc, brandLogo, centerX - brandW / 2, y, brandW, 15);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text("UNIFORM RECEIPT", centerX, y, { align: "center" });
  y += 7;

  const bandH = 20;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(margin, y, contentW, bandH, 2, 2, "F");

  if (schoolLogo) {
    addImageSafe(doc, schoolLogo, margin + 3, y + 3, 13, 13);
  }

  const schoolX = schoolLogo ? margin + 18 : margin + 4;
  const schoolColW = contentW * 0.52 - (schoolLogo ? 14 : 0);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY);
  doc.text("SCHOOL", schoolX, y + 4.5);
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.text(receipt.schoolName?.trim() || "School", schoolX, y + 9);

  const contactParts = [
    receipt.schoolPhone,
    receipt.schoolEmail,
    receipt.schoolPoBox ? `P.O. Box ${receipt.schoolPoBox}` : "",
    receipt.schoolAddress,
  ].filter(Boolean);
  if (contactParts.length) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    const contactLines = doc.splitTextToSize(contactParts.join(" · "), schoolColW);
    doc.text(contactLines, schoolX, y + 13.5);
  }

  const dateX = margin + contentW * 0.58;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY);
  doc.text("DATE ISSUED", dateX, y + 4.5);
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(receipt.issuedAt), dateX, y + 9);

  y += bandH + 5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("STUDENT DETAILS", margin + 2, y);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.7);
  doc.line(margin + 2, y + 1.5, margin + 52, y + 1.5);
  y += 6;

  const studentName =
    `${receipt.student.firstName} ${receipt.student.lastName}`.trim() || "—";
  const shuleCode = resolveShuleCode(receipt.student);

  y = drawDetailRow(doc, y, "Student", studentName, margin, contentW);
  y = drawDetailRow(
    doc,
    y,
    "Class",
    receipt.student.className ?? "",
    margin,
    contentW,
  );
  y = drawDetailRow(doc, y, "ShuleCode", shuleCode, margin, contentW);
  y = drawDetailRow(
    doc,
    y,
    "Gender",
    receipt.student.gender ?? "",
    margin,
    contentW,
  );
  if (receipt.paymentMethod) {
    y = drawDetailRow(
      doc,
      y,
      "Payment method",
      receipt.paymentMethod,
      margin,
      contentW,
    );
  }
  if (receipt.issuedBy) {
    y = drawDetailRow(doc, y, "Issued by", receipt.issuedBy, margin, contentW);
  }
  y += 2;

  const itemCount = receipt.items.length;
  const tableFont = itemCount > 10 ? 6.5 : itemCount > 6 ? 7 : 7.5;
  const cellPad = itemCount > 10 ? 1.2 : 1.8;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 14 },
    tableWidth: contentW,
    head: [["ITEM", "SIZE", "QTY", "UNIT", "TOTAL"]],
    body: receipt.items.map((item) => [
      item.color ? `${item.name} (${item.color})` : item.name,
      item.size ?? "",
      String(item.quantity),
      amount(item.unitPrice),
      amount(item.total),
    ]),
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: tableFont,
      textColor: NAVY,
      cellPadding: { top: cellPad, right: 2, bottom: cellPad, left: 2 },
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: tableFont,
      halign: "left",
      cellPadding: { top: cellPad + 0.4, right: 2, bottom: cellPad + 0.4, left: 2 },
    },
    columnStyles: {
      0: { cellWidth: contentW * 0.36 },
      1: { cellWidth: contentW * 0.12, halign: "center" },
      2: { cellWidth: contentW * 0.1, halign: "center" },
      3: { cellWidth: contentW * 0.18, halign: "right" },
      4: { cellWidth: contentW * 0.24, halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: WHITE },
    showHead: "firstPage",
    rowPageBreak: "avoid",
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY
    ? (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 5
    : y + 5;

  const totalsW = 72;
  const totalsX = pageW - margin - totalsW;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);

  const totalRows: [string, string][] = [
    ["Subtotal", money(receipt.subtotal)],
  ];
  if (receipt.discount > 0) {
    totalRows.push(["Discount / Scholarship", money(receipt.discount)]);
  }
  totalRows.push(
    ["Amount paid", money(receipt.paid)],
    ["Balance remaining", money(receipt.balance)],
  );

  for (const [label, value] of totalRows) {
    doc.text(label, totalsX, y);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.text(value, pageW - margin, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    y += 4.5;
  }

  y += 1;
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(totalsX - 2, y - 3.5, totalsW + 4, 8.5, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("TOTAL DUE", totalsX, y + 1.8);
  doc.setFontSize(11);
  doc.text(money(receipt.total), pageW - margin, y + 1.8, { align: "right" });
  y += 10;

  if (receipt.notes?.trim()) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GRAY);
    const noteLines = doc.splitTextToSize(
      `Notes: ${receipt.notes.trim()}`,
      contentW,
    );
    doc.text(noteLines, margin + 2, y);
    y += noteLines.length * 3.5 + 3;
  }

  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY);
  doc.text("UNIFORM DEPARTMENT", pageW - margin, y + 5, { align: "right" });

  const sigY = y + 7;
  if (signature) {
    addImageSafe(doc, signature, pageW - margin - 52, sigY, 28, 10);
  } else {
    doc.setDrawColor(203, 213, 225);
    doc.line(pageW - margin - 40, sigY + 8, pageW - margin - 8, sigY + 8);
  }
  if (stamp) {
    addImageSafe(doc, stamp, pageW - margin - 17, sigY - 1, 13, 13);
  }

  return doc;
}

export async function downloadReceiptPdf(receipt: ReceiptData): Promise<void> {
  const doc = await buildReceiptPdf(receipt);
  doc.save(receiptFileName(receipt.receiptNumber));
}

export async function printReceiptPdf(receipt: ReceiptData): Promise<void> {
  const doc = await buildReceiptPdf(receipt);
  const blobUrl = doc.output("bloburl");
  const printWin = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (!printWin) {
    URL.revokeObjectURL(blobUrl);
    throw new Error("Print window blocked");
  }

  const triggerPrint = () => {
    try {
      printWin.focus();
      printWin.print();
    } catch {
      /* viewer may not be ready yet */
    }
  };

  printWin.addEventListener("load", triggerPrint);
  window.setTimeout(triggerPrint, 600);
}
