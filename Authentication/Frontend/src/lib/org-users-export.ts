import jsPDF from 'jspdf';
import type { OrgUser } from '@/lib/org-admin-api';

function formatModules(user: OrgUser): string {
  if (user.roles.includes('organization_admin')) return 'All modules';
  return user.modules.map((m) => m.shortName || m.slug).join('; ') || '—';
}

function formatLogin(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function rowValues(user: OrgUser): string[] {
  return [
    `${user.firstName} ${user.lastName}`.trim(),
    user.email,
    user.employeeId ?? '',
    user.status.replace(/_/g, ' '),
    user.department ?? '',
    user.branch ?? '',
    user.position ?? '',
    user.phone ?? '',
    formatModules(user),
    formatLogin(user.lastLoginAt),
  ];
}

const EXPORT_HEADERS = [
  'Full Name',
  'Email',
  'Employee ID',
  'Status',
  'Department',
  'Branch',
  'Position',
  'Phone',
  'Modules',
  'Last Login',
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportOrgUsersToExcel(users: OrgUser[], filenamePrefix = 'org-users') {
  const rows = users.map(rowValues);
  const csv = [EXPORT_HEADERS, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filenamePrefix}-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportOrgUsersToPdf(users: OrgUser[], title = 'Users & Access') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let y = 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString()} · ${users.length} record(s)`, margin, y);
  y += 8;
  doc.setTextColor(0);

  const colWidths = [38, 52, 22, 18, 28, 22, 28, 18, 40, 28];
  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y - 4, pageWidth - margin * 2, 6, 'F');
    doc.setTextColor(255, 255, 255);
    let x = margin + 1;
    EXPORT_HEADERS.forEach((h, i) => {
      doc.text(h, x, y);
      x += colWidths[i];
    });
    y += 5;
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
  };

  drawHeader();

  users.forEach((user, index) => {
    if (y > 190) {
      doc.addPage();
      y = 14;
      drawHeader();
    }
    const values = rowValues(user);
    let x = margin + 1;
    doc.setFontSize(6.5);
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 3.5, pageWidth - margin * 2, 5, 'F');
    }
    values.forEach((val, i) => {
      const text = doc.splitTextToSize(val || '—', colWidths[i] - 2)[0] ?? '—';
      doc.text(text, x, y);
      x += colWidths[i];
    });
    y += 5;
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
}
