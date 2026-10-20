import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  accessor: string;
}

export function exportToPDF(title: string, columns: ExportColumn[], data: Record<string, any>[]) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(10);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = row[c.accessor];
      return val !== null && val !== undefined ? String(val) : '-';
    })
  );

  autoTable(doc, {
    startY: 35,
    head: [headers],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 4, 53] },
  });

  doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportToExcel(title: string, columns: ExportColumn[], data: Record<string, any>[]) {
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = row[c.accessor];
      return val !== null && val !== undefined ? val : '';
    })
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportToCSV(title: string, columns: ExportColumn[], data: Record<string, any>[]) {
  const headers = columns.map((c) => `"${c.header}"`).join(',');
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = row[c.accessor];
      const str = val !== null && val !== undefined ? String(val) : '';
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')
  );

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
