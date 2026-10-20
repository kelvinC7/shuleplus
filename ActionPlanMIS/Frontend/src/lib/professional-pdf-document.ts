import { buildWizardFromPlan, decodeWizardDescription } from '@/lib/plan-wizard-types';
import { formatRwf } from '@/lib/format-rwf';
import { generatePlanQrDataUrl, planVerificationUrl } from '@/lib/plan-document-qr';
import type { ActionPlan } from '@/types';
import type { ExportPlanOptions, SchoolBranding } from '@/lib/export-action-plan-pdf';

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

function schoolInitial(name: string) {
  return (name.trim().charAt(0) || 'S').toUpperCase();
}

function logoUrl(branding: SchoolBranding) {
  return branding.logoSrc ?? '';
}

export function planHasBudget(plan: ActionPlan) {
  if (Number(plan.budget) > 0 || Number(plan.actualCost) > 0) return true;
  if ((plan.budgets ?? []).some((b) => Number(b.allocated) > 0 || Number(b.spent) > 0)) return true;
  if ((plan.expenses ?? []).some((e) => Number(e.amount) > 0)) return true;
  const wizard = buildWizardFromPlan(plan);
  return (wizard.activityBudgets ?? []).some(
    (b) => b.requiresBudget || b.items.some((item) => Number(item.amount) > 0)
  );
}

function activityTimeline(task: ActionPlan['tasks'][number], frequency?: string) {
  if (frequency && frequency !== 'One-time') return escapeHtml(frequency);
  if (task.startDate && task.dueDate) {
    const start = fmtDate(task.startDate);
    const end = fmtDate(task.dueDate);
    if (start !== end) return `${start} – ${end}`;
  }
  return frequency ? escapeHtml(frequency) : '—';
}

function taskFrequency(task: ActionPlan['tasks'][number]) {
  return task.description?.match(/Frequency: ([^\n]+)/)?.[1] ?? '';
}

export function professionalPdfStyles() {
  return `
    @page { size: A4 portrait; margin: 16mm 14mm 22mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      font-size: 12pt;
      line-height: 1.5;
      background: #fff;
    }
    .page-break { page-break-after: always; break-after: page; }
    .pdf-page {
      width: 794px;
      min-height: 1123px;
      padding: 44px 52px 36px;
      background: #fff;
      position: relative;
      box-sizing: border-box;
      overflow: hidden;
    }
    .pdf-page-cover {
      min-height: 1123px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 56px 48px;
    }
    .sheet { padding: 0; min-height: 0; }
    .no-break { page-break-inside: avoid; }
    .muted { color: #64748b; }
    .cover-sheet {
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      flex: 1;
    }
    .cover-logo {
      width: 96px;
      height: 96px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 28px;
    }
    .cover-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .cover-logo-fallback {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: #000435;
      color: #FCB038;
      font-size: 36px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cover-eyebrow {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #FCB038;
      margin-bottom: 12px;
    }
    .cover-title {
      font-size: 28px;
      font-weight: 800;
      color: #000435;
      line-height: 1.15;
      margin: 0 0 6px;
    }
    .cover-subtitle {
      font-size: 18px;
      font-weight: 600;
      color: #334155;
      margin: 0 0 24px;
    }
    .cover-school {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #000435;
      margin-bottom: 6px;
    }
    .cover-meta {
      font-size: 12pt;
      color: #64748b;
      margin-bottom: 4px;
    }
    .cover-ref {
      font-size: 12pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #000435;
      margin: 16px 0 8px;
    }
    .cover-prepared {
      margin-top: 32px;
      font-size: 12pt;
      color: #475569;
    }
    .cover-tagline {
      margin-top: 20px;
      font-size: 12pt;
      color: #94a3b8;
      font-style: italic;
      max-width: 420px;
    }
    .page-title {
      font-size: 14pt;
      font-weight: 800;
      color: #000435;
      margin: 0 0 10px;
    }
    .page-lead {
      font-size: 12pt;
      color: #64748b;
      margin: 0 0 18px;
      max-width: 680px;
      line-height: 1.5;
    }
    .plan-description {
      font-size: 12pt;
      color: #334155;
      margin: 0 0 20px;
      line-height: 1.55;
    }
    .info-block { margin: 0 0 24px; }
    .info-block-title {
      font-size: 14pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #000435;
      margin: 0 0 10px;
    }
    .info-rows { display: grid; gap: 8px; }
    .info-row {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 12px;
      font-size: 12pt;
    }
    .info-row .k { color: #64748b; }
    .info-row .v { color: #0f172a; font-weight: 600; }
    .goal-block { margin: 0 0 28px; }
    .goal-block:last-child { margin-bottom: 0; }
    .goal-label {
      font-size: 12pt;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #FCB038;
      margin-bottom: 4px;
    }
    .goal-title {
      font-size: 14pt;
      font-weight: 800;
      color: #000435;
      margin: 0 0 8px;
    }
    .goal-desc {
      font-size: 12pt;
      color: #64748b;
      margin: 0 0 14px;
      max-width: 680px;
      line-height: 1.5;
    }
    .subsection-title {
      font-size: 14pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #000435;
      margin: 18px 0 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
    }
    .pro-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 4px;
      font-size: 12pt;
    }
    .pro-table th {
      background: #000435;
      color: #fff;
      text-align: left;
      padding: 9px 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border: none;
    }
    .pro-table td {
      padding: 9px 10px;
      border: none;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      vertical-align: top;
    }
    .pro-table tr:nth-child(even) td { background: #f8fafc; }
    .pro-table tr:last-child td { border-bottom: none; }
    .pro-table tfoot td {
      font-weight: 800;
      color: #000435;
      background: #f8fafc;
      border-top: 2px solid #e2e8f0;
    }
    .summary-goals { margin: 0; padding: 0; list-style: none; }
    .summary-goals li {
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12pt;
      color: #334155;
    }
    .summary-goals li:last-child { border-bottom: none; }
    .summary-goals strong { color: #000435; margin-right: 8px; }
    .sheet-footer {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      font-size: 9pt;
      color: #94a3b8;
      text-align: center;
    }
    .doc-verify-qr {
      margin: 32px auto 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
    }
    .doc-verify-qr img {
      width: 96px;
      height: 96px;
      object-fit: contain;
    }
    .doc-verify-qr-label {
      font-size: 12pt;
      color: #475569;
      font-weight: 600;
    }
    .doc-verify-qr-ref {
      font-size: 10pt;
      color: #94a3b8;
      letter-spacing: 0.06em;
    }
    .sig-table .sig-line { color: #cbd5e1; min-width: 120px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  `;
}

function sheetFooter(branding: SchoolBranding, year: string) {
  return `<div class="sheet-footer">${escapeHtml(branding.schoolName)} · ${escapeHtml(year)}</div>`;
}

function documentVerifyQrHtml(qrDataUrl: string, ref: string) {
  return `<div class="doc-verify-qr">
    <img src="${qrDataUrl}" alt="Verify document" crossorigin="anonymous" />
    <div class="doc-verify-qr-label">Scan to verify document</div>
    <div class="doc-verify-qr-ref">${escapeHtml(ref)}</div>
  </div>`;
}

function coverLogoHtml(branding: SchoolBranding) {
  const logo = logoUrl(branding);
  if (logo) {
    return `<img src="${logo}" alt="${escapeHtml(branding.schoolName)}" crossorigin="anonymous" onerror="this.parentElement.innerHTML='<div class=\\'cover-logo-fallback\\'>${escapeHtml(schoolInitial(branding.schoolName))}</div>'" />`;
  }
  return `<div class="cover-logo-fallback">${escapeHtml(schoolInitial(branding.schoolName))}</div>`;
}

function proCoverPage(plan: ActionPlan, opts: ExportPlanOptions, year: string) {
  const owner = plan.responsiblePerson ?? opts.principalName ?? 'School Management Team';
  const period =
    plan.startDate && plan.dueDate
      ? `${fmtDate(plan.startDate)} – ${fmtDate(plan.dueDate)}`
      : `Academic Year ${year}`;

  return `<div class="pdf-page pdf-page-cover">
    <div class="cover-sheet">
    <div class="cover-logo">${coverLogoHtml(opts)}</div>
    <div class="cover-school">${escapeHtml(opts.schoolName)}</div>
    <h1 class="cover-title">${escapeHtml(plan.title || 'School Improvement Action Plan')}</h1>
    <p class="cover-subtitle">Academic Year ${escapeHtml(year)}</p>
    <div class="cover-meta">${escapeHtml(plan.department ?? 'School-wide')} · ${period}</div>
    <div class="cover-prepared">Prepared by ${escapeHtml(owner)}</div>
    </div>
  </div>`;
}

function planInfoRows(plan: ActionPlan, opts: ExportPlanOptions) {
  const hasBudget = planHasBudget(plan);
  const budget = Number(plan.budget) || 0;
  return `<div class="info-block">
    <div class="info-rows">
      <div class="info-row"><span class="k">Plan owner</span><span class="v">${escapeHtml(plan.responsiblePerson ?? opts.principalName ?? '—')}</span></div>
      <div class="info-row"><span class="k">Department</span><span class="v">${escapeHtml(plan.department ?? '—')}</span></div>
      <div class="info-row"><span class="k">Period</span><span class="v">${fmtDate(plan.startDate)} – ${fmtDate(plan.dueDate)}</span></div>
      ${hasBudget ? `<div class="info-row"><span class="k">Budget</span><span class="v">${formatRwf(budget)} RWF</span></div>` : ''}
    </div>
  </div>`;
}

function proSummaryPage(
  plan: ActionPlan,
  opts: ExportPlanOptions,
  year: string,
  verifyQr: { dataUrl: string; ref: string }
) {
  const wizard = buildWizardFromPlan(plan);
  const { text: description } = decodeWizardDescription(plan.description);

  return `<div class="pdf-page">
    <div class="sheet">
    <h2 class="page-title">Plan Summary</h2>
    ${description ? `<p class="plan-description">${escapeHtml(description)}</p>` : ''}
    ${planInfoRows(plan, opts)}
    <div class="info-block">
      <h3 class="info-block-title">Strategic Goals</h3>
      <ul class="summary-goals">
        ${wizard.goals.map((g, i) => `<li><strong>${String(i + 1).padStart(2, '0')}.</strong>${escapeHtml(g.title)}</li>`).join('')}
      </ul>
    </div>
    ${documentVerifyQrHtml(verifyQr.dataUrl, verifyQr.ref)}
    ${sheetFooter(opts, year)}
    </div>
  </div>`;
}

function proPlanContent(plan: ActionPlan, opts: ExportPlanOptions, year: string) {
  const wizard = buildWizardFromPlan(plan);
  const { text: description } = decodeWizardDescription(plan.description);
  const goals = wizard.goals.length > 0 ? wizard.goals : [];

  const goalsHtml = goals
    .map((goal, goalIndex) => {
      const goalTasks = (plan.tasks ?? []).filter((t) => {
        const objMatch = t.description?.match(/@obj:([^\n]+)/);
        const objectiveId = objMatch?.[1];
        return goal.objectives.some((o) => o.id === objectiveId) || wizard.activities.some((a) => a.goalId === goal.id && a.id === t.id);
      });

      const objectivesTable =
        goal.objectives.length > 0
          ? `<table class="pro-table"><thead><tr><th>Objective</th><th>Baseline</th><th>Target</th><th>Indicator</th></tr></thead><tbody>
            ${goal.objectives
              .map(
                (o) => `<tr>
              <td>${escapeHtml(o.title)}</td>
              <td>${escapeHtml(o.baseline)}${o.unit ? ` ${escapeHtml(o.unit)}` : ''}</td>
              <td>${escapeHtml(o.target)}${o.unit ? ` ${escapeHtml(o.unit)}` : ''}</td>
              <td>${escapeHtml(o.measurementIndicator || '—')}</td>
            </tr>`
              )
              .join('')}
          </tbody></table>`
          : '';

      const activitiesTable =
        goalTasks.length > 0
          ? `<table class="pro-table"><thead><tr><th>#</th><th>Activity</th><th>Responsible</th><th>Timeline</th></tr></thead><tbody>
            ${goalTasks
              .map((t, i) => {
                const freq = taskFrequency(t);
                return `<tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(t.title)}</td>
                <td>${escapeHtml(t.owner ?? '—')}</td>
                <td>${activityTimeline(t, freq)}</td>
              </tr>`;
              })
              .join('')}
          </tbody></table>`
          : '';

      return `<div class="goal-block">
        <div class="goal-label">Goal ${String(goalIndex + 1).padStart(2, '0')}</div>
        <h3 class="goal-title">${escapeHtml(goal.title)}</h3>
        ${objectivesTable ? `<h4 class="subsection-title">Objectives</h4>${objectivesTable}` : ''}
        ${activitiesTable ? `<h4 class="subsection-title">Activities</h4>${activitiesTable}` : ''}
      </div>`;
    })
    .join('');

  const kpis = plan.kpis ?? [];
  const kpiTable =
    kpis.length > 0
      ? `<h4 class="subsection-title">Key Performance Indicators</h4>
      <table class="pro-table"><thead><tr><th>KPI</th><th>Baseline</th><th>Target</th><th>Unit</th></tr></thead><tbody>
        ${kpis
          .map(
            (k) => `<tr>
          <td>${escapeHtml(k.name)}</td>
          <td>${k.currentValue}</td>
          <td>${k.target}</td>
          <td>${escapeHtml(k.unit ?? '—')}</td>
        </tr>`
          )
          .join('')}
      </tbody></table>`
      : '';

  return `<div class="pdf-page">
    <div class="sheet">
    <h2 class="page-title">Action Plan</h2>
    ${description ? `<p class="plan-description">${escapeHtml(description)}</p>` : ''}
    ${planInfoRows(plan, opts)}
    ${goalsHtml || '<p class="muted">No goals recorded for this plan.</p>'}
    ${kpiTable}
    ${sheetFooter(opts, year)}
    </div>
  </div>`;
}

function proBudgetSection(plan: ActionPlan, opts: ExportPlanOptions, year: string) {
  if (!planHasBudget(plan)) return '';

  const wizard = buildWizardFromPlan(plan);
  const budgetLines: { label: string; planned: number; actual: number }[] = [];

  for (const act of wizard.activities) {
    const task = (plan.tasks ?? []).find((t) => t.id === act.id);
    const hint = Number(task?.description?.match(/Budget: (\d+)/)?.[1] ?? 0);
    if (hint > 0) budgetLines.push({ label: act.title, planned: hint, actual: 0 });
  }

  if (budgetLines.length === 0) {
    budgetLines.push({
      label: plan.title || 'Planned budget',
      planned: Number(plan.budget) || 0,
      actual: Number(plan.actualCost) || 0,
    });
  }

  const totalPlanned = budgetLines.reduce((s, l) => s + l.planned, 0);
  const totalActual = budgetLines.reduce((s, l) => s + l.actual, 0);
  if (totalPlanned <= 0 && totalActual <= 0) return '';

  return `<div class="pdf-page">
    <div class="sheet">
    <h2 class="page-title">Budget</h2>
    <table class="pro-table"><thead><tr><th>Budget Area</th><th>Planned</th><th>Actual</th><th>Balance</th></tr></thead><tbody>
      ${budgetLines
        .map(
          (l) => `<tr>
        <td>${escapeHtml(l.label)}</td>
        <td>${formatRwf(l.planned)} RWF</td>
        <td>${formatRwf(l.actual)} RWF</td>
        <td>${formatRwf(Math.max(0, l.planned - l.actual))} RWF</td>
      </tr>`
        )
        .join('')}
    </tbody><tfoot><tr><td>TOTAL</td><td>${formatRwf(totalPlanned)} RWF</td><td>${formatRwf(totalActual)} RWF</td><td>${formatRwf(Math.max(0, totalPlanned - totalActual))} RWF</td></tr></tfoot></table>
    ${sheetFooter(opts, year)}
    </div>
  </div>`;
}

function proApprovalSection(
  plan: ActionPlan,
  opts: ExportPlanOptions,
  ref: string,
  year: string,
  verifyQr: { dataUrl: string; ref: string }
) {
  return `<div class="pdf-page">
    <div class="sheet">
    <h2 class="page-title">Approval &amp; Sign-off</h2>
    <table class="pro-table sig-table"><thead><tr><th>Role</th><th>Name</th><th>Signature</th><th>Date</th></tr></thead><tbody>
      <tr><td>Prepared by</td><td>${escapeHtml(plan.responsiblePerson ?? '—')}</td><td class="sig-line"></td><td></td></tr>
      <tr><td>Reviewed by</td><td>${escapeHtml(opts.principalName ?? 'Deputy Head Teacher')}</td><td class="sig-line"></td><td></td></tr>
      <tr><td>Approved by</td><td>${escapeHtml(opts.principalName ?? 'Head Teacher')}</td><td class="sig-line"></td><td></td></tr>
    </tbody></table>
    ${documentVerifyQrHtml(verifyQr.dataUrl, verifyQr.ref)}
    ${sheetFooter(opts, year)}
    </div>
  </div>`;
}

function proEvidenceSection(plan: ActionPlan, opts: ExportPlanOptions, year: string) {
  const attachments = plan.attachments ?? [];
  if (attachments.length === 0) return '';
  return `<div class="pdf-page">
    <div class="sheet">
    <h2 class="page-title">Evidence</h2>
    <table class="pro-table"><thead><tr><th>File</th><th>Category</th><th>Date</th></tr></thead><tbody>
      ${attachments.map((a) => `<tr><td>${escapeHtml(a.originalName ?? a.filename ?? 'File')}</td><td>${escapeHtml(a.category ?? '—')}</td><td>${fmtDate(a.createdAt)}</td></tr>`).join('')}
    </tbody></table>
    ${sheetFooter(opts, year)}
    </div>
  </div>`;
}

export async function buildProfessionalPlanDocument(
  plan: ActionPlan,
  opts: ExportPlanOptions,
  ref: string
): Promise<string> {
  const year = (() => {
    const { meta } = decodeWizardDescription(plan.description);
    if (meta?.academicYear) return meta.academicYear;
    if (plan.periodYear) return `${plan.periodYear}-${plan.periodYear + 1}`;
    const y = new Date().getFullYear();
    return `${y}-${y + 1}`;
  })();

  const verifyUrl = planVerificationUrl(plan.id, ref);
  const verifyQrDataUrl = await generatePlanQrDataUrl(verifyUrl);
  const verifyQr = { dataUrl: verifyQrDataUrl, ref };

  let body = proCoverPage(plan, opts, year);

  if (opts.mode === 'summary') {
    body += proSummaryPage(plan, opts, year, verifyQr);
    return body;
  }

  body += proPlanContent(plan, opts, year);

  if ((opts.mode === 'detailed' || opts.mode === 'full') && planHasBudget(plan)) {
    body += proBudgetSection(plan, opts, year);
  }

  if (opts.mode === 'full') {
    body += proEvidenceSection(plan, opts, year);
  }

  body += proApprovalSection(plan, opts, ref, year, verifyQr);
  return body;
}

export function renderSchoolBrandBandMinimal(branding: SchoolBranding) {
  const logo = logoUrl(branding);
  return `<div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;">
    ${logo ? `<img src="${logo}" alt="" style="height:48px;object-fit:contain;" crossorigin="anonymous" />` : ''}
    <div><strong style="font-size:14px;color:#000435;">${escapeHtml(branding.schoolName)}</strong></div>
  </div>`;
}
