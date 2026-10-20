import * as XLSX from 'xlsx';
import type { EnrichedStudentRow } from './types';
import { exportRowsToCsv } from './utils';

export function downloadBlob(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportStudentRows(
  rows: EnrichedStudentRow[],
  columns: string[],
  format: 'csv' | 'xlsx' | 'pdf'
) {
  const data = rows.map((r) => {
    const row: Record<string, string | number> = {};
    for (const col of columns) {
      row[col] = getCellValue(r, col);
    }
    return row;
  });

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    downloadBlob(exportRowsToCsv(rows, columns), `student-report-${stamp}.csv`, 'text/csv');
    return;
  }

  if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `student-report-${stamp}.xlsx`);
    return;
  }

  if (format === 'pdf') {
    printStudentReport(rows, columns);
  }
}

function getCellValue(row: EnrichedStudentRow, col: string): string | number {
  switch (col) {
    case 'Student Name':
      return row.fullName;
    case 'Student Code':
      return row.studentCode;
    case 'SDMS Code':
      return row.sdmCode;
    case 'Gender':
      return row.gender;
    case 'Date of Birth':
      return row.student.dateOfBirth ?? '';
    case 'Age':
      return row.age ?? '';
    case 'Class':
      return row.className;
    case 'Stream':
      return row.stream;
    case 'Parent':
      return row.parentName;
    case 'Phone':
      return row.phone;
    case 'Address':
      return row.address;
    case 'Enrollment Date':
      return row.enrollmentDate ?? '';
    case 'Status':
      return row.status;
    default:
      return '';
  }
}

export function printStudentReport(rows: EnrichedStudentRow[], columns: string[]) {
  const html = `
    <!DOCTYPE html>
    <html><head><title>Student Report</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #000435; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      p { color: #64748b; font-size: 12px; margin-top: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
      th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
      th { background: #f8fafc; text-transform: uppercase; font-size: 10px; }
    </style></head><body>
    <h1>Student Report</h1>
    <p>Generated ${new Date().toLocaleString()} · ${rows.length} students</p>
    <table><thead><tr>${columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${columns.map((c) => `<td>${getCellValue(r, c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
