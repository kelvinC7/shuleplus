import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MONTHS } from '@/config/payroll-nav';

type RegisterRow = Record<string, unknown>;

function fmt(n: unknown) {
  return Math.round(Number(n ?? 0)).toLocaleString('en-RW');
}

function periodLabel(month: number, year: number) {
  return `${MONTHS[month - 1] ?? month} ${year}`;
}

export function exportPayePdf(
  rows: RegisterRow[],
  meta: { runNumber: string; month: number; year: number; schoolName?: string }
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(meta.schoolName ?? 'School Payroll', 14, 16);
  doc.setFontSize(10);
  doc.text(`PAYE Remittance — ${meta.runNumber} (${periodLabel(meta.month, meta.year)})`, 14, 24);

  autoTable(doc, {
    startY: 30,
    head: [['Employee', 'ID', 'Gross', 'PAYE', 'Net']],
    body: rows.map((r) => [
      String(r.employeeName),
      String(r.employeeNumber),
      fmt(r.gross),
      fmt(r.paye),
      fmt(r.netSalary),
    ]),
    foot: [[
      'TOTAL',
      '',
      fmt(rows.reduce((s, r) => s + Number(r.gross ?? 0), 0)),
      fmt(rows.reduce((s, r) => s + Number(r.paye ?? 0), 0)),
      fmt(rows.reduce((s, r) => s + Number(r.netSalary ?? 0), 0)),
    ]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 4, 53] },
  });

  doc.save(`paye-${meta.runNumber}.pdf`);
}

export function exportRssbPdf(
  rows: RegisterRow[],
  meta: { runNumber: string; month: number; year: number; schoolName?: string }
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(meta.schoolName ?? 'School Payroll', 14, 16);
  doc.setFontSize(10);
  doc.text(`RSSB Declaration — ${meta.runNumber} (${periodLabel(meta.month, meta.year)})`, 14, 24);

  autoTable(doc, {
    startY: 30,
    head: [['Employee', 'RSSB No.', 'Gross', 'Employee 6%', 'Employer 6%']],
    body: rows.map((r) => [
      String(r.employeeName),
      String(r.rssbNumber ?? '—'),
      fmt(r.gross),
      fmt(r.rssbEmployee),
      fmt(r.rssbEmployer),
    ]),
    foot: [[
      'TOTAL',
      '',
      fmt(rows.reduce((s, r) => s + Number(r.gross ?? 0), 0)),
      fmt(rows.reduce((s, r) => s + Number(r.rssbEmployee ?? 0), 0)),
      fmt(rows.reduce((s, r) => s + Number(r.rssbEmployer ?? 0), 0)),
    ]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 4, 53] },
  });

  doc.save(`rssb-${meta.runNumber}.pdf`);
}

export function exportBankPdf(
  rows: RegisterRow[],
  meta: { runNumber: string; month: number; year: number; schoolName?: string }
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(meta.schoolName ?? 'School Payroll', 14, 16);
  doc.setFontSize(10);
  doc.text(`Bank Payroll Register — ${meta.runNumber} (${periodLabel(meta.month, meta.year)})`, 14, 24);

  autoTable(doc, {
    startY: 30,
    head: [['Employee', 'Bank', 'Account', 'Amount']],
    body: rows.map((r) => [
      String(r.employeeName),
      String(r.bankName ?? '—'),
      String(r.bankAccount ?? '—'),
      fmt(r.finalPayable),
    ]),
    foot: [[
      'TOTAL',
      '',
      '',
      fmt(rows.reduce((s, r) => s + Number(r.finalPayable ?? 0), 0)),
    ]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 4, 53] },
  });

  doc.save(`bank-${meta.runNumber}.pdf`);
}

export async function exportPayslipPdf(elementId: string, filename: string) {
  const el = document.getElementById(elementId);
  if (!el) throw new Error('Payslip element not found');
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const img = canvas.toDataURL('image/png');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  doc.addImage(img, 'PNG', (pageW - w) / 2, 10, w, h);
  doc.save(filename);
}
