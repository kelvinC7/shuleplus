import type { AttendanceRecord } from '@/services/attendance-api';
import { formatAttendanceTime, formatDurationMins } from '@/utils/format-attendance-time';

export function attendanceRowsToCsv(rows: AttendanceRecord[], reportMeta?: string) {
  const generated = new Date().toISOString();
  const header = [
    'Date',
    'Name',
    'Code',
    'Class/Department',
    'Expected arrival',
    'Check-in',
    'Check-out',
    'Duration (mins)',
    'Attendance',
    'Punctuality',
    'Checkout',
    'Raw status',
    'Card',
  ];
  const lines = rows.map((r) =>
    [
      r.lessonDate,
      r.studentName,
      r.studentCode ?? '',
      r.groupLabel ?? r.className ?? r.department ?? '',
      r.expectedArrival ?? '',
      r.entryTime ?? '',
      r.exitTime ?? '',
      r.durationMins ?? '',
      r.attendanceStatus ?? r.display?.attendanceStatus ?? '',
      r.punctuality ?? r.display?.punctuality ?? '',
      r.checkoutStatus ?? r.display?.checkoutStatus ?? '',
      r.status,
      r.cardNumber ?? '',
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',')
  );
  const meta = reportMeta ? `# ${reportMeta}\n# Generated ${generated}\n` : `# Generated ${generated}\n`;
  return `\uFEFF${meta}${header.join(',')}\n${lines.join('\n')}`;
}

export function printAttendanceReport(title: string, subtitle: string, rows: AttendanceRecord[]) {
  const w = window.open('', '_blank', 'width=960,height=720');
  if (!w) return;
  const bodyRows = rows
    .map(
      (r, i) => `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.studentName)}<br/><small>${escapeHtml(r.studentCode ?? '')}</small></td>
      <td>${escapeHtml(r.groupLabel ?? r.className ?? '')}</td>
      <td>${escapeHtml(formatAttendanceTime(r.entryTime))}</td>
      <td>${escapeHtml(formatAttendanceTime(r.exitTime))}</td>
      <td>${escapeHtml(formatDurationMins(r.durationMins))}</td>
      <td>${escapeHtml(r.attendanceStatus ?? r.status)} / ${escapeHtml(r.punctuality ?? '')} / ${escapeHtml(r.checkoutStatus ?? '')}</td>
    </tr>`
    )
    .join('');
  w.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title>
  <style>
    body{font-family:system-ui,sans-serif;padding:28px;color:#000435}
    h1{font-size:20px;margin:0 0 4px}
    .sub{font-size:12px;color:#64748b;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}
    th{background:#f8fafc}
    @media print{.noprint{display:none}}
  </style></head><body>
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">${escapeHtml(subtitle)}</p>
  <table><thead><tr><th>#</th><th>Person</th><th>Class/Dept</th><th>Check-in</th><th>Check-out</th><th>Duration</th><th>Status</th></tr></thead>
  <tbody>${bodyRows}</tbody></table>
  <p class="sub noprint" style="margin-top:16px">Page ${new Date().toLocaleString()}</p>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printReportTable(title: string, subtitle: string) {
  const root = document.getElementById('report-print-root');
  if (!root) {
    window.print();
    return;
  }
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) {
    window.print();
    return;
  }
  w.document.write(`
    <!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 24px; color: #000435; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      p { font-size: 12px; color: #64748b; margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
      th { background: #f8fafc; font-weight: 600; }
    </style></head><body>
    <h1>${title}</h1><p>${subtitle}</p>
    ${root.innerHTML}
    </body></html>`);
  w.document.close();
  w.focus();
  w.print();
  w.close();
}
