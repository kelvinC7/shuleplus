import jsPDF from "jspdf";
import { autoTable as autoTableFn } from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ExportColumn {
  header: string;
  accessor: string;
}

export interface ExportOptions {
  title: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
  fileName?: string;
  userName?: string;
  organizationName?: string;
  orientation?: "portrait" | "landscape";
  /** Optional totals row shown under the table (same accessors as columns). */
  totals?: Record<string, unknown>;
  subtitle?: string;
  /** Optional KPI cards drawn under the header before the table (PDF). */
  summary?: { label: string; value: string }[];
}

function formatDate(): string {
  return new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function getValueString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const FALLBACK_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
 <rect width="48" height="48" rx="12" fill="#FCB038"/>
 <path d="M14 32V16h6.5c3.2 0 5.5 1.8 5.5 4.8 0 2.2-1.2 3.7-3 4.4l3.8 6.8h-3.4l-3.3-6.2H17.2V32H14zm3.2-9h3.1c1.6 0 2.5-.8 2.5-2.1s-.9-2.1-2.5-2.1h-3.1v4.2z" fill="#000435"/>
 <path d="M28.5 32l5.2-16h3.3l5.2 16h-3.3l-1.1-3.6h-5l-1.1 3.6h-3.2zm4.4-6.2h3.5l-1.7-5.5-1.8 5.5z" fill="#000435"/>
</svg>`;
const FALLBACK_LOGO = `data:image/svg+xml;base64,${typeof btoa === "function" ? btoa(FALLBACK_LOGO_SVG) : Buffer.from(FALLBACK_LOGO_SVG).toString("base64")}`;

async function loadLogo(): Promise<{
  dataUrl: string;
  format: "PNG" | "JPEG" | "SVG";
}> {
  for (const path of ["/logo.png", "/logo.svg"]) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      if (path.endsWith(".svg") || dataUrl.startsWith("data:image/svg")) {
        return { dataUrl: FALLBACK_LOGO, format: "PNG" };
      }
      if (
        dataUrl.startsWith("data:image/jpeg") ||
        dataUrl.startsWith("data:image/jpg")
      ) {
        return { dataUrl, format: "JPEG" };
      }
      return { dataUrl, format: "PNG" };
    } catch {
      /* try next */
    }
  }
  return { dataUrl: FALLBACK_LOGO, format: "PNG" };
}

function isMoneyHeader(header: string) {
  const h = header.toLowerCase();
  return (
    h.includes("amount") ||
    h.includes("price") ||
    h.includes("total") ||
    h.includes("cost") ||
    h.includes("money") ||
    h.includes("expected") ||
    h.includes("profit") ||
    h.includes("loss") ||
    h.includes("income") ||
    h.includes("purchase") ||
    h.includes("rwf")
  );
}

export async function exportToPdf(options: ExportOptions): Promise<void> {
  const {
    title,
    columns,
    data,
    userName,
    organizationName,
    orientation,
    totals,
    subtitle,
    summary,
  } = options;
  const logo = await loadLogo();

  const isLandscape = orientation === "landscape" || columns.length > 8;
  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  const primaryColor: [number, number, number] = [252, 176, 56];
  const navyColor: [number, number, number] = [0, 4, 53];
  const grayColor: [number, number, number] = [100, 116, 139];

  let currentPage = 1;
  const dateStr = formatDate();

  const drawHeader = () => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 34, "F");

    try {
      doc.addImage(
        logo.dataUrl,
        logo.format === "JPEG" ? "JPEG" : "PNG",
        margin,
        8,
        28,
        11,
      );
    } catch {
      doc.setFillColor(...primaryColor);
      doc.roundedRect(margin, 8, 11, 11, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...navyColor);
      doc.text("S+", margin + 2.5, 15);
    }

    const org = organizationName || "ShulePlus Uniforms";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...navyColor);
    doc.text(org, margin + 32, 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text(subtitle || "Stock Inventory Report", margin + 32, 17);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...navyColor);
    const titleX = pageWidth - margin - doc.getTextWidth(title);
    doc.text(title, titleX, 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...grayColor);
    doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), 18);

    if (userName) {
      const issuerText = `Issued by: ${userName}`;
      doc.text(
        issuerText,
        pageWidth - margin - doc.getTextWidth(issuerText),
        23,
      );
    }

    doc.setFillColor(...primaryColor);
    doc.rect(margin, 28, contentWidth, 1.2, "F");
  };

  const drawFooter = () => {
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...grayColor);
    doc.text("Generated by ShulePlus · Uniforms", margin, pageHeight - 5);
    doc.text(`Page ${currentPage}`, pageWidth - margin - 12, pageHeight - 5);
  };

  drawHeader();

  let tableStartY = 36;
  const summaryCards = summary && summary.length > 0 ? summary : null;
  if (summaryCards) {
    const cardGap = 3;
    const cardW =
      (contentWidth - cardGap * (summaryCards.length - 1)) /
      summaryCards.length;
    const cardH = 16;
    const cardY = 34;
    summaryCards.forEach((card, i) => {
      const x = margin + i * (cardW + cardGap);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, cardY, cardW, cardH, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...grayColor);
      doc.text(card.label.toUpperCase(), x + 3, cardY + 5.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...navyColor);
      doc.text(card.value, x + 3, cardY + 12);
    });
    tableStartY = cardY + cardH + 4;
  }

  const tableHeaders = columns.map((col) => col.header);
  const tableRows = data.map((row) =>
    columns.map((col) => getValueString(row[col.accessor])),
  );

  if (totals) {
    tableRows.push(
      columns.map((col) => getValueString(totals[col.accessor] ?? "")),
    );
  }

  autoTableFn(doc, {
    head: [tableHeaders],
    body: tableRows,
    startY: tableStartY,
    margin: { top: 34, bottom: 18, left: margin, right: margin },
    tableWidth: contentWidth,
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      textColor: [15, 23, 42],
      lineColor: [241, 245, 249],
      lineWidth: 0.15,
      cellPadding: { top: 2.2, right: 2, bottom: 2.2, left: 2 },
      valign: "middle",
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [100, 116, 139],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "left",
      lineWidth: 0,
      cellPadding: { top: 2.4, right: 2, bottom: 2.4, left: 2 },
    },
    bodyStyles: {
      lineWidth: { top: 0, right: 0, bottom: 0.15, left: 0 },
      lineColor: [226, 232, 240],
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    didParseCell: (hookData) => {
      const header = tableHeaders[hookData.column.index] ?? "";
      if (hookData.section === "body") {
        if (
          isMoneyHeader(header) ||
          /opening|sold|remaining|damaged|meters/i.test(header)
        ) {
          hookData.cell.styles.halign = "right";
        }
        if (/status/i.test(header)) hookData.cell.styles.halign = "center";

        const isTotalsRow =
          totals && hookData.row.index === tableRows.length - 1;
        if (isTotalsRow) {
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.fillColor = [255, 247, 230];
          hookData.cell.styles.textColor = navyColor;
          hookData.cell.styles.lineWidth = 0;
        }
      }
    },
    didDrawPage: (hook) => {
      // Keep branded chrome on every page (header sits in top margin)
      if (hook.pageNumber > 1) drawHeader();
      drawFooter();
      currentPage = hook.pageNumber;
    },
  });

  const base = options.fileName || title;
  doc.save(
    `${sanitizeFileName(base)}_${new Date().toISOString().split("T")[0]}.pdf`,
  );
}

export function exportToExcel(options: ExportOptions): void {
  const { title, columns, data, userName, organizationName, totals, subtitle } =
    options;

  const wb = XLSX.utils.book_new();
  const dateStr = formatDate();

  const metaData: (string | number)[][] = [
    [organizationName || "ShulePlus Uniforms"],
    [title],
    [subtitle || "Stock Inventory Report"],
    [],
    ["Exported by:", userName || "N/A"],
    ["Date:", dateStr],
    [],
  ];

  const headers = columns.map((col) => col.header);
  const rows = data.map((row) => columns.map((col) => row[col.accessor] ?? ""));
  if (totals) {
    rows.push(columns.map((col) => totals[col.accessor] ?? ""));
  }

  const wsData = [...metaData, headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = columns.map((_, idx) => {
    const maxLen = Math.max(
      columns[idx].header.length,
      ...data.map((row) => getValueString(row[columns[idx].accessor]).length),
      10,
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 36) };
  });

  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({
    s: { r: 0, c: 0 },
    e: { r: 0, c: Math.max(columns.length - 1, 0) },
  });
  ws["!merges"].push({
    s: { r: 1, c: 0 },
    e: { r: 1, c: Math.max(columns.length - 1, 0) },
  });

  const headerRowIndex = metaData.length;
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");

  for (let C = range.s.c; C <= range.e.c; C++) {
    const headerRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
    if (!ws[headerRef]) continue;
    ws[headerRef].s = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
      fill: { fgColor: { rgb: "000435" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  for (let R = headerRowIndex + 1; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[ref]) continue;
      const cell = ws[ref];
      const header = columns[C]?.header?.toLowerCase() || "";
      const isTotals = totals && R === range.e.r;

      cell.s = {
        font: isTotals ? { bold: true, color: { rgb: "000435" } } : undefined,
        fill: isTotals
          ? { fgColor: { rgb: "FFF7E6" } }
          : (R - headerRowIndex) % 2 === 0
            ? { fgColor: { rgb: "F8FAFC" } }
            : undefined,
        alignment: {
          horizontal:
            isMoneyHeader(header) ||
            /opening|sold|remaining|damaged/.test(header)
              ? "right"
              : "left",
          vertical: "center",
        },
      };

      if (typeof cell.v === "number") {
        cell.t = "n";
        if (isMoneyHeader(header)) cell.z = "#,##0";
      }
    }
  }

  const titleRef = XLSX.utils.encode_cell({ r: 1, c: 0 });
  if (ws[titleRef]) {
    ws[titleRef].s = {
      font: { bold: true, color: { rgb: "000435" }, sz: 14 },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, "Stock");
  const fileName = `${sanitizeFileName(options.fileName || title)}_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
