import type { AttendanceRecord } from '@/services/attendance-api';
import {
  deriveDetailStatusLines,
  deriveGeneralStatus,
  detailStatusPdfClass,
  generalStatusPdfClass,
} from '@/utils/attendance-general-status';
import { downloadHtmlAsPdf } from '@/utils/download-html-pdf';
import { formatAttendanceTime, formatDurationMins } from '@/utils/format-attendance-time';

export type AttendancePdfMeta = {
  schoolName: string;
  title: string;
  subtitle: string;
  audienceLabel: string;
  /** Prominent attendance date (e.g. single day or range label). */
  attendanceDateLabel: string;
  logoUrl?: string | null;
  organizationCode?: string | null;
  /** Contact / location lines from IAM school profile (onboarding). */
  schoolInfoLines?: string[];
};

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safeFilenamePart(s: string) {
  return s.replace(/[^\w\-]+/g, '-').replace(/-+/g, '-').slice(0, 48);
}

function rowDate(r: AttendanceRecord) {
  const iso = r.lessonDate?.slice(0, 10) ?? '';
  return iso || '—';
}

function generalStatusCell(r: AttendanceRecord) {
  const g = deriveGeneralStatus(r);
  return `<span class="general-text ${generalStatusPdfClass(g.key)}">${escapeHtml(g.label)}</span>`;
}

function detailsStatusCell(r: AttendanceRecord) {
  const lines = deriveDetailStatusLines(r);
  if (!lines.length) return '<span class="detail-neutral">—</span>';
  return lines
    .map(
      (line) =>
        `<div class="detail-line ${detailStatusPdfClass(line.tone)}">${escapeHtml(line.label)}</div>`
    )
    .join('');
}

function buildAttendancePdfHtml(
  meta: AttendancePdfMeta,
  rows: AttendanceRecord[],
  staffCols: boolean
) {
  const head = staffCols
    ? `<tr>
        <th>#</th><th>Staff</th><th>Department</th><th>Position</th><th>Date</th><th>Expected</th>
        <th>Check-in</th><th>Check-out</th><th>Hours</th><th>General</th><th>Details</th>
      </tr>`
    : `<tr>
        <th>#</th><th>Student</th><th>Class</th><th>Date</th><th>Expected</th>
        <th>Check-in</th><th>Check-out</th><th>Hours</th><th>General</th><th>Details</th>
      </tr>`;

  const body = rows
    .map((r, i) => {
      const general = generalStatusCell(r);
      const details = detailsStatusCell(r);
      if (staffCols) {
        return `<tr>
          <td>${i + 1}</td>
          <td><strong>${escapeHtml(r.studentName)}</strong><br/><small>${escapeHtml(r.studentCode ?? '')}</small></td>
          <td>${escapeHtml(r.groupLabel ?? r.department ?? r.className ?? '—')}</td>
          <td>${escapeHtml(r.staffRole ?? '—')}</td>
          <td class="mono">${escapeHtml(rowDate(r))}</td>
          <td class="mono">${escapeHtml(r.expectedArrival ?? '—')}</td>
          <td class="mono">${escapeHtml(formatAttendanceTime(r.entryTime))}</td>
          <td class="mono">${escapeHtml(formatAttendanceTime(r.exitTime))}</td>
          <td>${escapeHtml(formatDurationMins(r.durationMins))}</td>
          <td class="status-col">${general}</td>
          <td class="status-col">${details}</td>
        </tr>`;
      }
      return `<tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(r.studentName)}</strong><br/><small>${escapeHtml(r.studentCode ?? '')}</small></td>
        <td>${escapeHtml(r.groupLabel ?? r.className ?? '—')}</td>
        <td class="mono">${escapeHtml(rowDate(r))}</td>
        <td class="mono">${escapeHtml(r.expectedArrival ?? '—')}</td>
        <td class="mono">${escapeHtml(formatAttendanceTime(r.entryTime))}</td>
        <td class="mono">${escapeHtml(formatAttendanceTime(r.exitTime))}</td>
        <td>${escapeHtml(formatDurationMins(r.durationMins))}</td>
        <td class="status-col">${general}</td>
        <td class="status-col">${details}</td>
      </tr>`;
    })
    .join('');

  const logoBlock = meta.logoUrl
    ? `<img src="${escapeHtml(meta.logoUrl)}" alt="" class="logo" crossorigin="anonymous" />`
    : `<div class="logo-placeholder">${escapeHtml(meta.schoolName.slice(0, 1))}</div>`;

  const infoLines = (meta.schoolInfoLines ?? [])
    .map((line) => `<p class="info-line">${escapeHtml(line)}</p>`)
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(meta.title)}</title>
  <style>
    @page { margin: 12mm; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #000435; margin: 0; padding: 24px; }
    .header { display: flex; gap: 16px; align-items: flex-start; border-bottom: 3px solid #FCB038; padding-bottom: 14px; margin-bottom: 16px; }
    .logo, .logo-placeholder { width: 52px; height: 52px; border-radius: 12px; object-fit: contain; flex-shrink: 0; }
    .logo-placeholder { background: #000435; color: #FCB038; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 22px; }
    h1 { margin: 8px 0 0; font-size: 18px; }
    .school { font-size: 15px; font-weight: 800; color: #000435; margin: 0; }
    .info-line { margin: 2px 0 0; font-size: 10px; color: #475569; line-height: 1.35; }
    .sub { font-size: 11px; color: #64748b; margin-top: 6px; line-height: 1.45; }
    .date-banner { margin: 0 0 14px; padding: 10px 14px; border-radius: 10px; background: #000435; color: #fff; }
    .date-banner .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #FCB038; font-weight: 800; margin: 0; }
    .date-banner .value { font-size: 15px; font-weight: 800; margin: 4px 0 0; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; }
    th { background: #000435; color: #fff; padding: 7px 5px; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
    td { border-bottom: 1px solid #e2e8f0; padding: 6px 5px; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    td.mono { font-family: ui-monospace, monospace; font-size: 8px; white-space: nowrap; }
    td.status-col { min-width: 72px; max-width: 110px; }
    .general-text { display: block; font-size: 9px; font-weight: 700; line-height: 1.35; white-space: normal; }
    .general-present-on-time { color: #047857; }
    .general-present-late { color: #b45309; }
    .general-not-checked-out { color: #0369a1; }
    .general-absent { color: #b91c1c; }
    .general-other { color: #475569; }
    .detail-line { font-size: 8px; font-weight: 600; line-height: 1.45; margin: 0; padding: 0; white-space: nowrap; }
    .detail-present { color: #047857; }
    .detail-late { color: #b45309; }
    .detail-absent { color: #b91c1c; }
    .detail-pending { color: #0369a1; }
    .detail-neutral { color: #64748b; font-size: 8px; }
    .footer { margin-top: 14px; font-size: 9px; color: #94a3b8; }
  </style></head><body>
  <div class="header">
    ${logoBlock}
    <div>
      <p class="school">${escapeHtml(meta.schoolName)}</p>
      ${infoLines}
      <h1>${escapeHtml(meta.title)}</h1>
      <p class="sub">${escapeHtml(meta.subtitle)}<br/>${escapeHtml(meta.audienceLabel)} · ${rows.length} row(s)</p>
    </div>
  </div>
  <div class="date-banner">
    <p class="label">Attendance date</p>
    <p class="value">${escapeHtml(meta.attendanceDateLabel)}</p>
  </div>
  <table><thead>${head}</thead><tbody>${body}</tbody></table>
  <p class="footer">Generated ${escapeHtml(new Date().toLocaleString())} · Shule+ Attendance</p>
  </body></html>`;
}

export async function exportAttendancePdf(
  meta: AttendancePdfMeta,
  rows: AttendanceRecord[],
  options?: { staffColumns?: boolean }
) {
  const staffCols = options?.staffColumns ?? false;
  const html = buildAttendancePdfHtml(meta, rows, staffCols);
  const datePart = safeFilenamePart(meta.attendanceDateLabel);
  await downloadHtmlAsPdf({
    html,
    wrapDocument: false,
    orientation: 'landscape',
    filename: `attendance-${datePart}.pdf`,
  });
}

export type StaffWeeklyDay = {
  iso: string;
  label: string;
  /** Short weekday name, e.g. Mon. */
  weekday: string;
};

export type StaffWeeklyCellStatus = 'PRESENT' | 'LATE' | 'PENDING_CHECKOUT' | 'ABSENT';

export type StaffWeeklyCell = {
  status: StaffWeeklyCellStatus;
  entryTime?: string | null;
  exitTime?: string | null;
  expectedArrival?: string | null;
  detail?: string | null;
};

export type StaffWeeklyRow = {
  key: string;
  fullName: string;
  employeeNumber?: string | null;
  department?: string | null;
  role?: string | null;
  days: Record<string, StaffWeeklyCell | null | undefined>;
};

function shortTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Kigali',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function weeklyCellHtml(cell: StaffWeeklyCell | null | undefined) {
  if (!cell) return '<span class="cell-empty">—</span>';
  if (cell.status === 'ABSENT') return '<span class="cell-absent">Absent</span>';
  const tone =
    cell.status === 'LATE'
      ? 'cell-late'
      : cell.status === 'PENDING_CHECKOUT'
        ? 'cell-pending'
        : 'cell-present';
  const out = cell.exitTime ? `out ${shortTime(cell.exitTime)}` : 'no check-out';
  return `<span class="${tone}"><strong>${escapeHtml(shortTime(cell.entryTime))}</strong><br/><small>${escapeHtml(out)}</small></span>`;
}

function weeklyTotals(row: StaffWeeklyRow) {
  let present = 0;
  let late = 0;
  let absent = 0;
  for (const cell of Object.values(row.days)) {
    if (!cell) continue;
    if (cell.status === 'ABSENT') absent += 1;
    else {
      present += 1;
      if (cell.status === 'LATE') late += 1;
    }
  }
  return { present, late, absent };
}

/**
 * Weekly staff attendance matrix (Monday–Friday columns) with per-day
 * check-in/out status and totals. Designed for landscape A4.
 */
export async function exportStaffWeeklyPdf(
  meta: AttendancePdfMeta,
  days: StaffWeeklyDay[],
  rows: StaffWeeklyRow[]
) {
  const logoBlock = meta.logoUrl
    ? `<img src="${escapeHtml(meta.logoUrl)}" alt="" class="logo" crossorigin="anonymous" />`
    : `<div class="logo-placeholder">${escapeHtml(meta.schoolName.slice(0, 1))}</div>`;

  const infoLines = (meta.schoolInfoLines ?? [])
    .map((line) => `<p class="info-line">${escapeHtml(line)}</p>`)
    .join('');

  const dayHeads = days
    .map(
      (d) =>
        `<th class="day-col"><span class="day-name">${escapeHtml(d.weekday)}</span><span class="day-date">${escapeHtml(
          d.label
        )}</span></th>`
    )
    .join('');

  const body = rows
    .map((row, i) => {
      const totals = weeklyTotals(row);
      const dayCells = days
        .map((d) => `<td class="day-cell">${weeklyCellHtml(row.days[d.iso])}</td>`)
        .join('');
      return `<tr>
        <td class="num">${i + 1}</td>
        <td><strong>${escapeHtml(row.fullName)}</strong><br/><small>${escapeHtml(
          row.employeeNumber ?? ''
        )}</small></td>
        <td>${escapeHtml(row.department ?? '—')}</td>
        <td>${escapeHtml(row.role ?? '—')}</td>
        ${dayCells}
        <td class="total total-present">${totals.present}</td>
        <td class="total total-late">${totals.late}</td>
        <td class="total total-absent">${totals.absent}</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(meta.title)}</title>
  <style>
    @page { margin: 10mm; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #000435; margin: 0; padding: 20px; }
    .header { display: flex; gap: 14px; align-items: flex-start; border-bottom: 3px solid #FCB038; padding-bottom: 12px; margin-bottom: 12px; }
    .logo, .logo-placeholder { width: 48px; height: 48px; border-radius: 12px; object-fit: contain; flex-shrink: 0; }
    .logo-placeholder { background: #000435; color: #FCB038; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; }
    h1 { margin: 6px 0 0; font-size: 16px; }
    .school { font-size: 14px; font-weight: 800; color: #000435; margin: 0; }
    .info-line { margin: 1px 0 0; font-size: 9px; color: #475569; line-height: 1.3; }
    .sub { font-size: 10px; color: #64748b; margin-top: 4px; line-height: 1.4; }
    .date-banner { margin: 0 0 10px; padding: 8px 12px; border-radius: 9px; background: #000435; color: #fff; display: flex; justify-content: space-between; gap: 12px; }
    .date-banner .label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; color: #FCB038; font-weight: 800; margin: 0; }
    .date-banner .value { font-size: 13px; font-weight: 800; margin: 2px 0 0; }
    .date-banner .hint { font-size: 8px; color: #cbd5e1; margin: 2px 0 0; text-align: right; }
    table { width: 100%; border-collapse: collapse; font-size: 8px; }
    th { background: #000435; color: #fff; padding: 5px 4px; text-align: left; font-size: 7px; text-transform: uppercase; letter-spacing: 0.04em; vertical-align: bottom; }
    th.day-col { text-align: center; }
    .day-name { display: block; font-size: 8px; }
    .day-date { display: block; font-weight: 500; color: #cbd5e1; font-size: 7px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 5px 4px; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    td.num { color: #64748b; font-family: ui-monospace, monospace; font-size: 7px; }
    td.day-cell { text-align: center; min-width: 54px; }
    .cell-present, .cell-late, .cell-pending, .cell-absent, .cell-empty { display: block; font-size: 7px; line-height: 1.35; }
    .cell-present { color: #047857; }
    .cell-late { color: #b45309; }
    .cell-pending { color: #0369a1; }
    .cell-absent { color: #b91c1c; font-weight: 800; }
    .cell-empty { color: #94a3b8; font-size: 9px; }
    small { font-size: 6px; color: #64748b; }
    td.total { text-align: center; font-weight: 800; font-size: 8px; }
    .total-present { color: #047857; }
    .total-late { color: #b45309; }
    .total-absent { color: #b91c1c; }
    .footer { margin-top: 10px; font-size: 8px; color: #94a3b8; display: flex; justify-content: space-between; }
    .legend { font-size: 8px; color: #64748b; }
  </style></head><body>
  <div class="header">
    ${logoBlock}
    <div>
      <p class="school">${escapeHtml(meta.schoolName)}</p>
      ${infoLines}
      <h1>${escapeHtml(meta.title)}</h1>
      <p class="sub">${escapeHtml(meta.subtitle)}<br/>${escapeHtml(meta.audienceLabel)} · ${rows.length} staff</p>
    </div>
  </div>
  <div class="date-banner">
    <div>
      <p class="label">Reporting week</p>
      <p class="value">${escapeHtml(meta.attendanceDateLabel)}</p>
    </div>
    <div>
      <p class="hint">${days.length} school day(s) · Monday–Friday</p>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>Staff</th><th>Department</th><th>Position</th>
      ${dayHeads}
      <th class="day-col">Present</th><th class="day-col">Late</th><th class="day-col">Absent</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>
  <div class="footer">
    <span class="legend">Arrival is green · late is amber · missing check-out is blue · absent is red</span>
    <span>Generated ${escapeHtml(new Date().toLocaleString())} · Shule+ Attendance</span>
  </div>
  </body></html>`;

  await downloadHtmlAsPdf({
    html,
    wrapDocument: false,
    orientation: 'landscape',
    filename: `staff-weekly-attendance-${safeFilenamePart(meta.attendanceDateLabel)}.pdf`,
  });
}

export type StaffCardAccessRow = {
  fullName: string;
  employeeNumber: string | null;
  department: string | null;
  role: string | null;
  cardAssigned: boolean;
  cardNumber: string | null;
};

export type CardAccessPdfRow = {
  fullName: string;
  code?: string | null;
  group?: string | null;
  role?: string | null;
  cardAssigned: boolean;
  cardNumber: string | null;
};

export async function exportCardAccessPdf(
  meta: AttendancePdfMeta & { audience?: 'STUDENT' | 'STAFF' },
  rows: CardAccessPdfRow[]
) {
  const audience = meta.audience ?? 'STAFF';
  const logoBlock = meta.logoUrl
    ? `<img src="${escapeHtml(meta.logoUrl)}" alt="" class="logo" crossorigin="anonymous" />`
    : `<div class="logo-placeholder">${escapeHtml(meta.schoolName.slice(0, 1))}</div>`;
  const infoLines = (meta.schoolInfoLines ?? [])
    .map((line) => `<p class="info-line">${escapeHtml(line)}</p>`)
    .join('');
  const headGroup = audience === 'STUDENT' ? 'Class' : 'Department';
  const headRole = audience === 'STUDENT' ? 'Student code' : 'Position';
  const body = rows
    .map(
      (r, i) => `<tr>
      <td>${i + 1}</td>
      <td><strong>${escapeHtml(r.fullName)}</strong>${r.code ? `<br/><small>${escapeHtml(r.code)}</small>` : ''}</td>
      <td>${escapeHtml(r.group ?? '—')}</td>
      <td>${escapeHtml(r.role ?? '—')}</td>
      <td>${r.cardAssigned ? `<span class="yes">Assigned</span> ${escapeHtml(r.cardNumber ?? '')}` : '<span class="no">Not assigned</span>'}</td>
    </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Smart access</title>
  <style>
    body{font-family:system-ui,sans-serif;padding:24px;color:#000435}
    .header{display:flex;gap:16px;align-items:flex-start;border-bottom:3px solid #FCB038;padding-bottom:14px;margin-bottom:16px}
    .logo,.logo-placeholder{width:52px;height:52px;border-radius:12px;object-fit:contain}
    .logo-placeholder{background:#000435;color:#FCB038;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px}
    .school{font-size:15px;font-weight:800;margin:0}
    .info-line{margin:2px 0 0;font-size:10px;color:#475569}
    h1{font-size:16px;margin:8px 0 0}
    .sub{font-size:11px;color:#64748b;margin-top:4px}
    .date-banner{margin:0 0 16px;padding:12px 16px;border-radius:12px;background:#000435;color:#fff}
    .date-banner .label{font-size:9px;text-transform:uppercase;color:#FCB038;font-weight:800;margin:0}
    .date-banner .value{font-size:14px;font-weight:800;margin:4px 0 0}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}
    th{background:#000435;color:#fff}
    .yes{color:#047857;font-weight:700}.no{color:#b91c1c;font-weight:700}
  </style></head><body>
  <div class="header">${logoBlock}<div>
    <p class="school">${escapeHtml(meta.schoolName)}</p>${infoLines}
    <h1>Smart access cards — ${audience === 'STUDENT' ? 'Students' : 'Staff'}</h1>
    <p class="sub">${escapeHtml(meta.subtitle)} · ${rows.length} row(s)</p>
  </div></div>
  <div class="date-banner"><p class="label">Report date</p><p class="value">${escapeHtml(meta.attendanceDateLabel)}</p></div>
  <table><thead><tr><th>#</th><th>${audience === 'STUDENT' ? 'Student' : 'Staff'}</th><th>${headGroup}</th><th>${headRole}</th><th>Card</th></tr></thead>
  <tbody>${body}</tbody></table></body></html>`;

  await downloadHtmlAsPdf({
    html,
    wrapDocument: false,
    orientation: 'portrait',
    filename: `${audience === 'STUDENT' ? 'students' : 'staff'}-smart-access-${safeFilenamePart(meta.attendanceDateLabel)}.pdf`,
  });
}

export async function exportStaffCardAccessPdf(meta: AttendancePdfMeta, rows: StaffCardAccessRow[]) {
  return exportCardAccessPdf(
    { ...meta, audience: 'STAFF' },
    rows.map((r) => ({
      fullName: r.fullName,
      code: r.employeeNumber,
      group: r.department,
      role: r.role,
      cardAssigned: r.cardAssigned,
      cardNumber: r.cardNumber,
    }))
  );
}

export type WeekAttendancePerson = {
  key: string;
  name: string;
  code?: string | null;
  group?: string | null;
  role?: string | null;
  days: Record<string, StaffWeeklyCell | null | undefined>; // iso -> cell
};

export async function exportWeeklyAttendancePdf(
  meta: AttendancePdfMeta & { weekLabel?: string },
  days: StaffWeeklyDay[],
  people: WeekAttendancePerson[]
) {
  const logoBlock = meta.logoUrl
    ? `<img src="${escapeHtml(meta.logoUrl)}" alt="" class="logo" crossorigin="anonymous" />`
    : `<div class="logo-placeholder">${escapeHtml(meta.schoolName.slice(0, 1))}</div>`;
  const infoLines = (meta.schoolInfoLines ?? [])
    .map((line) => `<p class="info-line">${escapeHtml(line)}</p>`)
    .join('');

  const sections = people
    .map((p, idx) => {
      let present = 0;
      let late = 0;
      let absent = 0;
      const rowsHtml = days
        .map((d) => {
          const cell = p.days[d.iso];
          const inT = cell?.entryTime ? shortTime(cell.entryTime) : '—';
          const outT = cell?.exitTime ? shortTime(cell.exitTime) : (cell && cell.status !== 'ABSENT' ? 'No check-out' : '—');
          let status = '—';
          let cls = 's-empty';
          if (cell) {
            if (cell.status === 'ABSENT') {
              status = 'Absent';
              cls = 's-absent';
              absent += 1;
            } else if (cell.status === 'LATE') {
              status = 'Late';
              cls = 's-late';
              present += 1;
              late += 1;
            } else if (cell.status === 'PENDING_CHECKOUT') {
              status = 'Present (pending checkout)';
              cls = 's-pending';
              present += 1;
            } else {
              status = 'Present';
              cls = 's-present';
              present += 1;
            }
          } else {
            absent += 1; // no record treated as not tapped/absent in week sheet
            status = 'Absent / No tap';
            cls = 's-absent';
          }
          return `<tr>
            <td><strong>${escapeHtml(d.weekday)}</strong><br/><small>${escapeHtml(d.label)}</small></td>
            <td class="mono">${escapeHtml(inT)}</td>
            <td class="mono">${escapeHtml(outT)}</td>
            <td class="${cls}">${escapeHtml(status)}</td>
          </tr>`;
        })
        .join('');
      return `<section class="person ${idx > 0 ? 'break' : ''}">
        <div class="person-head">
          <div>
            <h2>${escapeHtml(p.name)}</h2>
            <p class="meta">${escapeHtml([p.code, p.group, p.role].filter(Boolean).join(' · ') || '—')}</p>
          </div>
          <div class="totals">
            <span class="pill p-present">Present: <strong>${present}</strong></span>
            <span class="pill p-late">Late: <strong>${late}</strong></span>
            <span class="pill p-absent">Absent: <strong>${absent}</strong></span>
          </div>
        </div>
        <table><thead><tr><th>Date</th><th>Check-in</th><th>Check-out</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      </section>`;
    })
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(meta.title)}</title>
  <style>
    @page { margin: 12mm; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #000435; margin: 0; padding: 20px; }
    .header { display: flex; gap: 14px; align-items: flex-start; border-bottom: 3px solid #FCB038; padding-bottom: 12px; margin-bottom: 14px; }
    .logo, .logo-placeholder { width: 50px; height: 50px; border-radius: 12px; object-fit: contain; flex-shrink: 0; }
    .logo-placeholder { background: #000435; color: #FCB038; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; }
    .school { font-size: 14px; font-weight: 800; margin: 0; }
    .info-line { margin: 1px 0 0; font-size: 9px; color: #475569; }
    h1 { margin: 6px 0 0; font-size: 17px; }
    .sub { font-size: 10px; color: #64748b; margin-top: 4px; }
    .date-banner { margin: 0 0 14px; padding: 10px 14px; border-radius: 10px; background: #000435; color: #fff; }
    .date-banner .label { font-size: 8px; text-transform: uppercase; letter-spacing: .08em; color: #FCB038; font-weight: 800; margin: 0; }
    .date-banner .value { font-size: 14px; font-weight: 800; margin: 3px 0 0; }
    .person { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; margin-bottom: 14px; background: #fff; }
    .break { page-break-inside: avoid; }
    .person-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 8px; }
    .person-head h2 { margin: 0; font-size: 14px; color: #000435; }
    .meta { margin: 2px 0 0; font-size: 10px; color: #64748b; }
    .totals { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
    .pill { font-size: 9px; padding: 4px 8px; border-radius: 999px; border: 1px solid #e2e8f0; background: #f8fafc; }
    .p-present { color: #047857; border-color: #a7f3d0; background: #ecfdf5; }
    .p-late { color: #b45309; border-color: #fde68a; background: #fffbeb; }
    .p-absent { color: #b91c1c; border-color: #fecaca; background: #fef2f2; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #000435; color: #fff; padding: 7px 8px; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: .04em; }
    td { border-bottom: 1px solid #e2e8f0; padding: 7px 8px; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .mono { font-family: ui-monospace, monospace; white-space: nowrap; }
    .s-present { color: #047857; font-weight: 700; }
    .s-late { color: #b45309; font-weight: 700; }
    .s-pending { color: #0369a1; font-weight: 700; }
    .s-absent { color: #b91c1c; font-weight: 700; }
    .s-empty { color: #64748b; }
    small { color: #64748b; }
    .footer { margin-top: 10px; font-size: 9px; color: #94a3b8; }
  </style></head><body>
  <div class="header">
    ${logoBlock}
    <div>
      <p class="school">${escapeHtml(meta.schoolName)}</p>
      ${infoLines}
      <h1>${escapeHtml(meta.title)}</h1>
      <p class="sub">${escapeHtml(meta.subtitle)}<br/>${escapeHtml(meta.audienceLabel)} · ${people.length} person(s)</p>
    </div>
  </div>
  <div class="date-banner"><p class="label">Reporting week (Mon–Fri)</p><p class="value">${escapeHtml(meta.attendanceDateLabel)}</p></div>
  ${sections || '<p>No attendance data for this week.</p>'}
  <p class="footer">Generated ${escapeHtml(new Date().toLocaleString())} · Shule+ Attendance</p>
  </body></html>`;

  await downloadHtmlAsPdf({
    html,
    wrapDocument: false,
    orientation: 'portrait',
    filename: `weekly-attendance-${safeFilenamePart(meta.attendanceDateLabel)}.pdf`,
  });
}


export type WeeklyRegisterDay = { iso: string; label: string; weekday: string };
export type WeeklyRegisterCell = {
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'INCOMPLETE' | 'EXCUSED' | 'HOLIDAY' | 'FUTURE';
  inTime?: string | null;
  outTime?: string | null;
  detail?: string | null;
  raw?: Record<string, unknown>;
};
export type WeeklyRegisterRow = {
  no: number;
  key: string;
  name: string;
  code?: string | null;
  group?: string | null;
  days: Record<string, WeeklyRegisterCell>;
  weeklyPercent: number | null;
  presentDays: number;
  eligibleDays: number;
};

export async function exportWeeklyRegisterPdf(
  meta: AttendancePdfMeta & { weekLabel: string; overallPercent?: number | null; totalPeople?: number },
  days: WeeklyRegisterDay[],
  rows: WeeklyRegisterRow[],
  stats?: { totalPeople: number; weeklyPercent: number | null; presentDays: number; absentDays: number }
) {
  const logoBlock = meta.logoUrl
    ? `<img src="${escapeHtml(meta.logoUrl)}" alt="" class="logo" crossorigin="anonymous" />`
    : `<div class="logo-placeholder">${escapeHtml(meta.schoolName.slice(0, 1))}</div>`;
  const infoLines = (meta.schoolInfoLines ?? []).map((line) => `<p class="info-line">${escapeHtml(line)}</p>`).join('');

  const dayHeadTop = days
    .map((d) => `<th colspan="3" class="day-top">${escapeHtml(d.weekday)}<br/><span class="day-sub">${escapeHtml(d.label)}</span></th>`)
    .join('');
  const dayHeadSub = days
    .map(() => `<th class="subh">IN</th><th class="subh">OUT</th><th class="subh">Status</th>`)
    .join('');

  const statusLabel = (c: WeeklyRegisterCell) => {
    switch (c.status) {
      case 'PRESENT': return 'P';
      case 'LATE': return 'L';
      case 'ABSENT': return 'A';
      case 'INCOMPLETE': return 'I';
      case 'EXCUSED': return 'E';
      case 'HOLIDAY': return 'H';
      case 'FUTURE': return '—';
      default: return '—';
    }
  };
  const statusClass = (c: WeeklyRegisterCell) => {
    switch (c.status) {
      case 'PRESENT': return 'st-p';
      case 'LATE': return 'st-l';
      case 'ABSENT': return 'st-a';
      case 'INCOMPLETE': return 'st-i';
      case 'EXCUSED': return 'st-e';
      case 'HOLIDAY': return 'st-h';
      case 'FUTURE': return 'st-f';
      default: return '';
    }
  };

  const body = rows
    .map((r) => {
      const dayCells = days
        .map((d) => {
          const c = r.days[d.iso] || { status: 'ABSENT' as const };
          const inT = c.inTime ? shortTime(c.inTime) : '—';
          const outT = c.outTime ? shortTime(c.outTime) : '—';
          return `<td class="mono">${escapeHtml(inT)}</td><td class="mono">${escapeHtml(outT)}</td><td class="${statusClass(c)}">${escapeHtml(statusLabel(c))}</td>`;
        })
        .join('');
      const pct = r.weeklyPercent == null ? '—' : `${Math.round(r.weeklyPercent)}%`;
      return `<tr>
        <td class="num">${r.no}</td>
        <td class="name"><strong>${escapeHtml(r.name)}</strong>${r.code ? `<br/><small>${escapeHtml(r.code)}</small>` : ''}${r.group ? `<br/><small class="grp">${escapeHtml(r.group)}</small>` : ''}</td>
        ${dayCells}
        <td class="pct">${escapeHtml(pct)}</td>
      </tr>`;
    })
    .join('');

  const statLine = stats
    ? `Total people: <strong>${stats.totalPeople}</strong> · Weekly attendance: <strong>${stats.weeklyPercent == null ? '—' : stats.weeklyPercent.toFixed(1) + '%'}</strong> · Present days: <strong>${stats.presentDays}</strong> · Absent days: <strong>${stats.absentDays}</strong>`
    : '';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(meta.title)}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #000435; margin: 0; padding: 12px; font-size: 9px; }
    .header { display: flex; gap: 12px; align-items: flex-start; border-bottom: 3px solid #FCB038; padding-bottom: 10px; margin-bottom: 10px; }
    .logo, .logo-placeholder { width: 46px; height: 46px; border-radius: 10px; object-fit: contain; flex-shrink: 0; }
    .logo-placeholder { background: #000435; color: #FCB038; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; }
    .school { font-size: 14px; font-weight: 800; margin: 0; }
    .info-line { margin: 1px 0 0; font-size: 8px; color: #475569; line-height: 1.25; }
    h1 { margin: 4px 0 0; font-size: 15px; }
    .sub { font-size: 9px; color: #64748b; margin-top: 3px; }
    .meta-bar { display:flex; justify-content:space-between; gap:12px; background:#000435; color:#fff; border-radius:8px; padding:8px 10px; margin-bottom:8px; }
    .meta-bar .label { font-size:7px; text-transform:uppercase; letter-spacing:.08em; color:#FCB038; font-weight:800; margin:0; }
    .meta-bar .value { font-size:12px; font-weight:800; margin:2px 0 0; }
    .stats { font-size:9px; color:#334155; margin: 0 0 8px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th, td { border: 1px solid #cbd5e1; padding: 4px 3px; vertical-align: middle; }
    th { background: #000435; color: #fff; font-size: 7.5px; text-transform: uppercase; letter-spacing: .03em; text-align: center; }
    th.nameh, th.noh, th.pcth { text-align: left; }
    th.subh { background: #0f172a; font-size: 7px; }
    th.day-top { background:#0b2a5a; font-size:8px; }
    .day-sub { font-weight:500; color:#cbd5e1; font-size:7px; }
    td { font-size: 8px; }
    td.num { width: 24px; text-align:center; color:#64748b; }
    td.name { width: 150px; }
    td.pct { width: 52px; text-align:center; font-weight:800; }
    .mono { font-family: ui-monospace, monospace; font-size: 7.5px; text-align:center; white-space:nowrap; }
    .grp { color:#64748b; }
    .st-p { color:#047857; font-weight:800; text-align:center; }
    .st-l { color:#b45309; font-weight:800; text-align:center; }
    .st-a { color:#b91c1c; font-weight:800; text-align:center; }
    .st-i { color:#0369a1; font-weight:800; text-align:center; }
    .st-e { color:#6d28d9; font-weight:800; text-align:center; }
    .st-h { color:#475569; font-weight:800; text-align:center; }
    .st-f { color:#94a3b8; text-align:center; }
    .footer { margin-top: 10px; display:flex; justify-content:space-between; gap:20px; font-size:8px; color:#334155; }
    .sign { margin-top: 18px; min-width: 220px; }
    .sign-line { border-top: 1px solid #334155; margin-top: 28px; padding-top: 3px; }
    .legend { font-size: 7.5px; color:#64748b; }
  </style></head><body>
  <div class="header">
    ${logoBlock}
    <div>
      <p class="school">${escapeHtml(meta.schoolName)}</p>
      ${infoLines}
      <h1>${escapeHtml(meta.title)}</h1>
      <p class="sub">${escapeHtml(meta.subtitle)}<br/>${escapeHtml(meta.audienceLabel)}</p>
    </div>
  </div>
  <div class="meta-bar">
    <div><p class="label">Week</p><p class="value">${escapeHtml(meta.weekLabel)}</p></div>
    <div style="text-align:right"><p class="label">Group</p><p class="value" style="font-size:11px">${escapeHtml(meta.audienceLabel)}</p></div>
  </div>
  ${statLine ? `<p class="stats">${statLine}</p>` : ''}
  <table>
    <thead>
      <tr>
        <th rowspan="2" class="noh">No.</th>
        <th rowspan="2" class="nameh">Student / Staff Name</th>
        ${dayHeadTop}
        <th rowspan="2" class="pcth">Weekly %</th>
      </tr>
      <tr>${dayHeadSub}</tr>
    </thead>
    <tbody>${body || '<tr><td colspan="' + (2 + days.length * 3 + 1) + '">No records for selected filters.</td></tr>'}</tbody>
  </table>
  <div class="footer">
    <div>
      <div class="legend">P=Present, L=Late, A=Absent, I=Incomplete (missing IN/OUT), E=Excused, H=Holiday. Weekly % = Present days / Eligible working days.</div>
      <div style="margin-top:4px">Generated ${escapeHtml(new Date().toLocaleString())} · Page numbers shown by PDF viewer on print/save where supported.</div>
    </div>
    <div class="sign"><div class="sign-line">Signature: DOS / Head Teacher</div><div style="margin-top:4px">Name &amp; Date: ____________________</div></div>
  </div>
  </body></html>`;

  const datePart = safeFilenamePart(meta.attendanceDateLabel || meta.weekLabel);
  await downloadHtmlAsPdf({ html, wrapDocument: false, orientation: 'landscape', filename: `weekly-attendance-register-${datePart}.pdf` });
}
