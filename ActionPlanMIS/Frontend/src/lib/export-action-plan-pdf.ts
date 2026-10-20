import { decodeWizardDescription } from '@/lib/plan-wizard-types';
import { formatRwf } from '@/lib/format-rwf';
import { downloadHtmlAsPdf, openHtmlPreview } from '@/lib/pdf-download';
import {
  buildProfessionalPlanDocument,
  planHasBudget,
  professionalPdfStyles,
  renderSchoolBrandBandMinimal,
} from '@/lib/professional-pdf-document';
import type { ActionPlan } from '@/types';

export type PlanExportMode = 'summary' | 'detailed' | 'full';
export type PageFormat = 'a4-portrait' | 'a4-landscape';

export interface SchoolBranding {
  schoolName: string;
  schoolLocation?: string;
  logoSrc?: string;
  generatedBy?: string;
  motto?: string;
  organizationCode?: string | null;
  email?: string | null;
  phone?: string | null;
  poBox?: string | null;
  website?: string | null;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  cell?: string | null;
  village?: string | null;
  principalName?: string | null;
  schoolCategory?: string | null;
  schoolProgram?: string | null;
  ownershipType?: string | null;
  curriculum?: string | null;
}

export interface ExportPlanOptions extends SchoolBranding {
  mode: PlanExportMode;
  format: PageFormat;
}

export interface AnnualBookSections {
  coverPage: boolean;
  tableOfContents: boolean;
  executiveSummary: boolean;
  approvalPage: boolean;
  goalsObjectives: boolean;
  activities: boolean;
  calendar: boolean;
  kpis: boolean;
  budgets: boolean;
  responsiblePersons: boolean;
  risks: boolean;
  monthlyReviews: boolean;
}

export interface AnnualBookOptions extends SchoolBranding {
  academicYear: string;
  plans: ActionPlan[];
  sections: AnnualBookSections;
}

const MONTHS = ['SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG'];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(value?: string | Date | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function docRef() {
  return `AP-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function academicYearFromPlan(plan: ActionPlan) {
  const { meta } = decodeWizardDescription(plan.description);
  if (meta?.academicYear) return meta.academicYear;
  if (plan.periodYear) return `${plan.periodYear}-${plan.periodYear + 1}`;
  return defaultAcademicYear();
}

function defaultAcademicYear() {
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
}

function logoUrl(branding: SchoolBranding) {
  return branding.logoSrc ?? `${typeof window !== 'undefined' ? window.location.origin : ''}/logo.png`;
}

function formatRwfCompact(amount: number) {
  const n = Number(amount) || 0;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function label(value?: string | null) {
  return (value || '—').replace(/_/g, ' ');
}

function planGoalCount(plan: ActionPlan) {
  const { meta } = decodeWizardDescription(plan.description);
  return meta?.goals?.length ?? 0;
}

function pdfStyles(format: PageFormat) {
  if (format === 'a4-portrait') return professionalPdfStyles();
  const size = 'A4 landscape';
  return `
    @page { size: ${size}; margin: 14mm 14mm 20mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, Arial, sans-serif; color: #0f172a; margin: 0; font-size: 11px; line-height: 1.5; background: #fff; }
    .pro-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .pro-table th { background: #000435; color: #fff; text-align: left; padding: 8px 10px; }
    .pro-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
    .pro-table tr:nth-child(even) td { background: #f8fafc; }
    .muted { color: #64748b; }
    h1 { font-size: 20px; color: #000435; margin: 0 0 8px; }
  `;
}

async function buildSinglePlanBody(plan: ActionPlan, opts: ExportPlanOptions, ref: string) {
  return buildProfessionalPlanDocument(plan, opts, ref);
}

export function renderSchoolBrandBand(branding: SchoolBranding) {
  return renderSchoolBrandBandMinimal(branding);
}

function openPrintWindow(html: string, title: string) {
  void openHtmlPreview(html);
}

async function downloadPdfFromHtml(
  html: string,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
) {
  await downloadHtmlAsPdf({ html, filename, orientation, wrapDocument: false });
}

function planGoalsHtml(plan: ActionPlan) {
  const { meta } = decodeWizardDescription(plan.description);
  const goals = meta?.goals ?? [];
  if (goals.length === 0) {
    return `<p class="muted">${escapeHtml(plan.expectedOutcome ?? 'No structured goals recorded.')}</p>`;
  }
  return goals.map((g, gi) => `
    <div class="no-break">
      <h3>Goal ${gi + 1}: ${escapeHtml(g.title)}</h3>
      ${g.objectives.length ? `<table class="pro-table"><thead><tr><th>Objective</th><th>Baseline</th><th>Target</th><th>Indicator</th></tr></thead><tbody>
        ${g.objectives.map((o) => `<tr>
          <td>${escapeHtml(o.title)}</td>
          <td>${escapeHtml(o.baseline)} ${escapeHtml(o.unit)}</td>
          <td>${escapeHtml(o.target)} ${escapeHtml(o.unit)}</td>
          <td>${escapeHtml(o.measurementIndicator || '—')}</td>
        </tr>`).join('')}
      </tbody></table>` : '<p class="muted">No objectives</p>'}
    </div>`).join('');
}

function statusBadge(status: string) {
  return escapeHtml(label(status));
}

function planActivitiesHtml(plan: ActionPlan) {
  const tasks = plan.tasks ?? [];
  if (tasks.length === 0) return '<p class="muted">No activities recorded.</p>';
  return `<table class="pro-table"><thead><tr>
    <th>Activity</th><th>Timeline</th><th>Responsible</th><th>Status</th>
  </tr></thead><tbody>
    ${tasks
      .map((t) => {
        const freq = t.description?.match(/Frequency: ([^\n]+)/)?.[1];
        const timeline = freq || `${fmtDate(t.startDate)} – ${fmtDate(t.dueDate)}`;
        return `<tr>
        <td>${escapeHtml(t.title)}</td>
        <td>${escapeHtml(timeline)}</td>
        <td>${escapeHtml(t.owner ?? '—')}</td>
        <td>${statusBadge(t.status)}</td>
      </tr>`;
      })
      .join('')}
  </tbody></table>`;
}

function planKpisHtml(plan: ActionPlan) {
  const kpis = plan.kpis ?? [];
  if (kpis.length === 0) return '<p class="muted">No KPIs defined.</p>';
  return `<table><thead><tr><th>KPI</th><th>Baseline / Current</th><th>Target</th><th>Unit</th><th>Achievement</th></tr></thead><tbody>
    ${kpis.map((k) => {
      const pct = Number(k.target) > 0 ? Math.round((Number(k.currentValue) / Number(k.target)) * 100) : 0;
      return `<tr>
        <td>${escapeHtml(k.name)}</td>
        <td>${k.currentValue}</td>
        <td>${k.target}</td>
        <td>${escapeHtml(k.unit ?? '%')}</td>
        <td>${pct}%</td>
      </tr>`;
    }).join('')}
  </tbody></table>`;
}

function planBudgetHtml(plan: ActionPlan) {
  if (!planHasBudget(plan)) return '';
  const budget = Number(plan.budget) || 0;
  const spent = Number(plan.actualCost) || 0;
  const remaining = Math.max(0, budget - spent);
  return `<table><tbody>
    <tr><td><strong>Planned Budget</strong></td><td>${formatRwf(budget)} RWF</td></tr>
    <tr><td><strong>Actual Spending</strong></td><td>${formatRwf(spent)} RWF</td></tr>
    <tr><td><strong>Remaining</strong></td><td>${formatRwf(remaining)} RWF</td></tr>
  </tbody></table>`;
}

function planEvidenceHtml(plan: ActionPlan) {
  const attachments = plan.attachments ?? [];
  if (attachments.length === 0) return '<p class="muted">No evidence uploaded.</p>';
  return `<table><thead><tr><th>File</th><th>Category</th><th>Uploaded</th><th>Verified</th></tr></thead><tbody>
    ${attachments.map((a) => `<tr>
      <td>${escapeHtml(a.filename ?? 'File')}</td>
      <td>${escapeHtml(a.category ?? '—')}</td>
      <td>${fmtDate(a.createdAt)}</td>
      <td>${a.verifiedBy ? 'Yes' : 'Pending'}</td>
    </tr>`).join('')}
  </tbody></table>`;
}

export async function exportSinglePlanPdf(plan: ActionPlan, opts: ExportPlanOptions) {
  const ref = docRef();
  const year = academicYearFromPlan(plan);
  const modeLabel = opts.mode === 'summary' ? 'Quick Summary' : opts.mode === 'detailed' ? 'Detailed Action Plan' : 'Full Implementation Report';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(plan.title)} — ${modeLabel}</title>
    <style>${pdfStyles(opts.format)}</style></head><body>
    ${await buildSinglePlanBody(plan, opts, ref)}
    </body></html>`;
  const orientation = opts.format === 'a4-landscape' ? 'landscape' : 'portrait';
  const safeTitle = plan.title.replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'action-plan';
  await downloadPdfFromHtml(html, `${safeTitle}-${opts.mode}.pdf`, orientation);
}

export async function previewSinglePlanPdf(plan: ActionPlan, opts: ExportPlanOptions) {
  const ref = docRef();
  const year = academicYearFromPlan(plan);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${pdfStyles(opts.format)}</style></head><body>
    ${await buildSinglePlanBody(plan, opts, ref)}
    </body></html>`;
  await openHtmlPreview(html);
}

function coverPageHtml(branding: SchoolBranding, academicYear: string) {
  const prepared = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return `<div class="cover-sheet page-break">
    ${renderSchoolBrandBandMinimal(branding)}
    <div class="cover-eyebrow">ShulePlus • Action Plan MIS</div>
    <h1 class="cover-title">School Improvement<br/>Action Plan</h1>
    <p class="cover-subtitle">Academic Year ${escapeHtml(academicYear)}</p>
    <div class="cover-school">${escapeHtml(branding.schoolName)}</div>
    <p class="cover-meta">Prepared: ${prepared}</p>
    <p class="cover-tagline">${escapeHtml(branding.motto ?? 'Official planning document • For implementation, monitoring and review')}</p>
  </div>`;
}

function approvalPageHtml(academicYear: string) {
  return `<div class="page-break">
    <h2>ACTION PLAN APPROVAL</h2>
    <p>This Action Plan has been reviewed and approved for implementation during the ${escapeHtml(academicYear)} Academic Year.</p>
    ${['Prepared By', 'Reviewed By', 'Approved By'].map((role) => `
      <div class="sig-block">
        <strong>${role}</strong><br/><br/>
        Name: <span class="sig-line"></span><br/><br/>
        Position: <span class="sig-line"></span><br/><br/>
        Signature: <span class="sig-line"></span> &nbsp; Date: <span class="sig-line" style="min-width:100px"></span>
      </div>`).join('')}
    <p style="margin-top:32px;"><strong>School Stamp</strong></p>
  </div>`;
}

function executiveSummaryHtml(plans: ActionPlan[], academicYear: string) {
  const totalObjectives = plans.reduce((s, p) => {
    const { meta } = decodeWizardDescription(p.description);
    return s + (meta?.goals?.reduce((gs, g) => gs + g.objectives.length, 0) ?? 0);
  }, 0);
  const totalActivities = plans.reduce((s, p) => s + (p.tasks?.length ?? 0), 0);
  const totalKpis = plans.reduce((s, p) => s + (p.kpis?.length ?? 0), 0);
  const totalBudget = plans.reduce((s, p) => s + Number(p.budget || 0), 0);
  const showBudget = plans.some(planHasBudget);
  const team = new Set(plans.flatMap((p) => [p.responsiblePerson, ...(p.teamMembers ?? [])].filter(Boolean)));

  const priorities = [...new Set(plans.map((p) => p.expectedOutcome ?? p.title).filter(Boolean))].slice(0, 6);

  return `<div class="page-break">
    <h2>ACTION PLAN AT A GLANCE</h2>
    <p class="muted">Academic Year: ${escapeHtml(academicYear)}</p>
    <div class="stat-grid">
      <div class="stat-box"><strong>${plans.length}</strong><span>Action Plans</span></div>
      <div class="stat-box"><strong>${totalObjectives}</strong><span>Objectives</span></div>
      <div class="stat-box"><strong>${totalActivities}</strong><span>Activities</span></div>
      <div class="stat-box"><strong>${totalKpis}</strong><span>KPIs</span></div>
      ${showBudget ? `<div class="stat-box"><strong>${formatRwf(totalBudget)}</strong><span>Budget (RWF)</span></div>` : ''}
      <div class="stat-box"><strong>${team.size}</strong><span>Staff Team</span></div>
    </div>
    <h3>Strategic Priorities</h3>
    <ol>${priorities.map((p, i) => `<li>${String(i + 1).padStart(2, '0')} ${escapeHtml(p)}</li>`).join('')}</ol>
  </div>`;
}

function consolidatedBudgetHtml(plans: ActionPlan[]) {
  const rows = plans.map((p) => {
    const planned = Number(p.budget) || 0;
    const actual = Number(p.actualCost) || 0;
    return `<tr><td>${escapeHtml(p.title)}</td><td>${formatRwf(planned)}</td><td>${actual > 0 ? formatRwf(actual) : '—'}</td><td>${formatRwf(Math.max(0, planned - actual))}</td></tr>`;
  });
  const totalPlanned = plans.reduce((s, p) => s + Number(p.budget || 0), 0);
  const totalActual = plans.reduce((s, p) => s + Number(p.actualCost || 0), 0);
  return `<div class="page-break">
    <h2>CONSOLIDATED BUDGET</h2>
    <table><thead><tr><th>Action Plan</th><th>Planned</th><th>Actual</th><th>Remaining</th></tr></thead>
    <tbody>${rows.join('')}
    <tr><td><strong>TOTAL</strong></td><td><strong>${formatRwf(totalPlanned)} RWF</strong></td><td>${totalActual > 0 ? formatRwf(totalActual) : '—'}</td><td><strong>${formatRwf(Math.max(0, totalPlanned - totalActual))}</strong></td></tr>
    </tbody></table>
  </div>`;
}

function annualCalendarHtml(plans: ActionPlan[]) {
  const byMonth = new Map<string, { plan: string; activity: string }[]>();
  for (const plan of plans) {
    for (const task of plan.tasks ?? []) {
      const d = task.startDate ? new Date(task.startDate) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      const key = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
      const list = byMonth.get(key) ?? [];
      list.push({ plan: plan.title, activity: task.title });
      byMonth.set(key, list);
    }
  }
  if (byMonth.size === 0) return '<p class="muted">No scheduled activities found.</p>';
  return `<div class="page-break"><h2>ANNUAL ACTION PLAN CALENDAR</h2>
    ${[...byMonth.entries()].map(([month, items]) => `
      <div class="calendar-month"><h4>${escapeHtml(month)}</h4>
        ${Object.entries(items.reduce((acc, i) => { (acc[i.plan] ??= []).push(i.activity); return acc; }, {} as Record<string, string[]>)).map(([plan, acts]) => `
          <p><strong>${escapeHtml(plan)}</strong><br/>${acts.map((a) => `● ${escapeHtml(a)}`).join('<br/>')}</p>`).join('')}
      </div>`).join('')}
  </div>`;
}

export async function exportAnnualActionPlanBook(opts: AnnualBookOptions) {
  const ref = docRef();
  const { plans, academicYear, sections, ...branding } = opts;
  const logo = logoUrl(branding);

  let body = '';
  const toc: { label: string; section: string }[] = [];
  let sectionNum = 1;

  if (sections.coverPage) {
    body += coverPageHtml(branding, academicYear);
    toc.push({ label: 'Cover Page', section: String(sectionNum++) });
  }
  if (sections.approvalPage) {
    body += approvalPageHtml(academicYear);
    toc.push({ label: 'Approval Page', section: String(sectionNum++) });
  }
  if (sections.tableOfContents) {
    toc.push({ label: 'Table of Contents', section: String(sectionNum++) });
  }
  if (sections.executiveSummary) {
    body += executiveSummaryHtml(plans, academicYear);
    toc.push({ label: 'Executive Summary', section: String(sectionNum++) });
  }

  if (sections.goalsObjectives || sections.activities) {
    plans.forEach((plan, pi) => {
      body += `<div class="page-break chapter">
        <div class="header-bar"><img src="${logo}" onerror="this.style.display='none'" /><div>
          <h1>Chapter ${pi + 1}: ${escapeHtml(plan.title)}</h1>
          <p class="muted">${escapeHtml(plan.department ?? '')} · ${escapeHtml(plan.status.replace(/_/g, ' '))}</p>
        </div></div>`;
      if (sections.goalsObjectives) body += `<h2>Goals & Objectives</h2>${planGoalsHtml(plan)}`;
      if (sections.activities) body += `<h2>Activities</h2>${planActivitiesHtml(plan)}`;
      if (sections.kpis) body += `<h2>KPIs</h2>${planKpisHtml(plan)}`;
      if (sections.budgets && planHasBudget(plan)) body += `<h2>Budget</h2>${planBudgetHtml(plan)}`;
      if (sections.responsiblePersons) {
        body += `<h2>Responsible Persons</h2><p>Plan Owner: <strong>${escapeHtml(plan.responsiblePerson ?? '—')}</strong></p>
          <table><thead><tr><th>Activity</th><th>Owner</th></tr></thead><tbody>
          ${(plan.tasks ?? []).map((t) => `<tr><td>${escapeHtml(t.title)}</td><td>${escapeHtml(t.owner ?? '—')}</td></tr>`).join('')}
          </tbody></table>`;
      }
      if (sections.risks && (plan.risks?.length ?? 0) > 0) {
        body += `<h2>Risks</h2><table><thead><tr><th>Risk</th><th>Impact</th><th>Mitigation</th></tr></thead><tbody>
          ${(plan.risks ?? []).map((r) => `<tr><td>${escapeHtml(r.title)}</td><td>${escapeHtml(r.impact)}</td><td>${escapeHtml(r.mitigation ?? '—')}</td></tr>`).join('')}
        </tbody></table>`;
      }
      toc.push({ label: plan.title, section: `${pi + 1}` });
    });
  }

  if (sections.budgets && plans.some(planHasBudget)) body += consolidatedBudgetHtml(plans.filter(planHasBudget));

  if (sections.tableOfContents) {
    const tocHtml = `<div class="page-break"><h2>CONTENTS</h2>
      ${toc.map((t, i) => `<div class="toc-row"><span>${String(i + 1).padStart(2, '0')} ${escapeHtml(t.label)}</span><span>${t.section}</span></div>`).join('')}
    </div>`;
    body = body.replace('<div class="page-break chapter">', tocHtml + '<div class="page-break chapter">');
    if (!sections.executiveSummary && !sections.goalsObjectives) body = tocHtml + body;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <title>Annual Action Plan Book ${academicYear}</title>
    <style>${pdfStyles('a4-portrait')}</style></head><body>
    ${body}
    </body></html>`;

  await downloadPdfFromHtml(html, `annual-action-plan-book-${academicYear.replace(/\//g, '-')}.pdf`, 'portrait');
}

export function filterPlansByAcademicYear(plans: ActionPlan[], academicYear: string) {
  return plans.filter((p) => academicYearFromPlan(p) === academicYear);
}

export function listAcademicYears(plans: ActionPlan[]) {
  const years = new Set(plans.map(academicYearFromPlan));
  if (years.size === 0) years.add(defaultAcademicYear());
  return [...years].sort().reverse();
}
