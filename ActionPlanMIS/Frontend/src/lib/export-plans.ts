import type { ActionPlan } from '@/types';
import type { SchoolBranding } from '@/lib/export-action-plan-pdf';
import { renderSchoolBrandBand } from '@/lib/export-action-plan-pdf';
import { downloadHtmlAsPdf } from '@/lib/pdf-download';

function fmtDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function label(value?: string | null) {
  return (value || '—').replace(/_/g, ' ');
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPlansExcel(plans: ActionPlan[], schoolName: string) {
  const rows = plans
    .map(
      (p) => `<tr>
        <td>${escapeHtml(p.title)}</td>
        <td>${escapeHtml(label(p.status))}</td>
        <td>${escapeHtml(label(p.priority))}</td>
        <td>${escapeHtml(p.category?.name || '')}</td>
        <td>${escapeHtml(p.department || '')}</td>
        <td>${escapeHtml(p.responsiblePerson || '')}</td>
        <td>${fmtDate(p.startDate)}</td>
        <td>${fmtDate(p.dueDate)}</td>
        <td>${p.progress ?? 0}</td>
        <td>${p.budget ?? 0}</td>
        <td>${p.tasks?.length ?? 0}</td>
      </tr>`
    )
    .join('');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8" /></head>
<body>
  <h2>${escapeHtml(schoolName)} — Action Plans</h2>
  <table border="1">
    <tr>
      <th>Title</th><th>Status</th><th>Priority</th><th>Category</th><th>Department</th>
      <th>Responsible</th><th>Start date</th><th>Due date</th><th>Progress %</th><th>Budget</th><th>Tasks</th>
    </tr>
    ${rows}
  </table>
</body>
</html>`;

  downloadBlob(
    `action-plans-${new Date().toISOString().slice(0, 10)}.xls`,
    new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  );
}

export async function exportPlansPdf(plans: ActionPlan[], opts: SchoolBranding) {
  const generated = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const body = plans
    .map(
      (p) => `<tr>
        <td>
          <strong>${escapeHtml(p.title)}</strong>
          <div class="muted">${escapeHtml(p.department || '')}</div>
        </td>
        <td>${escapeHtml(p.category?.name || '—')}</td>
        <td>${escapeHtml(label(p.status))}</td>
        <td>${escapeHtml(label(p.priority))}</td>
        <td>${p.progress ?? 0}%</td>
        <td>${fmtDate(p.dueDate)}</td>
        <td>${escapeHtml(p.responsiblePerson || '—')}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Action Plans Report</title>
  <style>
    @page { margin: 16mm 14mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #000435; margin: 0; }
    .school-brand-band { display: flex; gap: 16px; align-items: stretch; margin-bottom: 18px; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 14px; background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); }
    .school-logo-card { width: 80px; height: 80px; flex-shrink: 0; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 8px; }
    .school-logo-card img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .school-logo-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #FCB038; background: #000435; border-radius: 8px; }
    .school-brand-name { font-size: 17px; font-weight: 800; color: #000435; margin: 0 0 4px; }
    .school-brand-meta { font-size: 10px; color: #64748b; margin-bottom: 8px; }
    .school-brand-meta strong { color: #334155; }
    .school-detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 12px; }
    .school-detail-item .k { display: block; font-size: 8px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8; }
    .school-detail-item .v { display: block; font-size: 10px; font-weight: 600; color: #0f172a; }
    h1 { margin: 0 0 8px; font-size: 20px; }
    .meta { margin: 2px 0 0; font-size: 12px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #000435; color: #fff; text-align: left; padding: 8px 10px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .muted { color: #64748b; font-size: 10px; font-weight: 400; }
    .footer { margin-top: 18px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  ${renderSchoolBrandBand(opts)}
  <div style="margin-bottom:16px">
    <h1>Action Plans Report</h1>
    <p class="meta">Generated ${generated}${opts.generatedBy ? ` · ${escapeHtml(opts.generatedBy)}` : ''} · ${plans.length} plan${plans.length === 1 ? '' : 's'}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Plan</th><th>Category</th><th>Status</th><th>Priority</th><th>Progress</th><th>Due</th><th>Owner</th>
      </tr>
    </thead>
    <tbody>${body || '<tr><td colspan="7">No action plans</td></tr>'}</tbody>
  </table>
  <div class="footer">
    <span>Shule+ Action Plan MIS</span>
    <span>Confidential — internal school use</span>
  </div>
</body>
</html>`;

  await downloadHtmlAsPdf({
    html,
    filename: `action-plans-${new Date().toISOString().slice(0, 10)}.pdf`,
    orientation: 'landscape',
    wrapDocument: false,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
