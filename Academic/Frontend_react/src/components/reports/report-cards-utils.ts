import type { ReportCardDataV2 } from '@/types';

export type ReportScopeMode = 'term' | 'combined' | 'year';
export type ReportTypeId =
  | 'standard'
  | 'detailed'
  | 'transcript'
  | 'progress'
  | 'class_performance';

export type ReportRowStatus = 'published' | 'generated' | 'draft' | 'not_generated';

export const NOT_RECORDED = 'N/A';

const LOCAL_VERIFY = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

/** QR must use public Parent portal URL — never localhost on production PDFs. */
export function resolveReportVerifyUrl(report: {
  meta?: { verifyUrl?: string | null; reportNumber?: string | null };
  school?: { organizationCode?: string | null };
}): string {
  const raw = report.meta?.verifyUrl?.trim() || '';
  if (raw && !LOCAL_VERIFY.test(raw)) return raw;
  const ref = report.meta?.reportNumber?.trim();
  if (!ref) return raw;

  const envBase = import.meta.env.VITE_PARENT_PORTAL_URL?.replace(/\/$/, '').replace(/\/login$/, '');
  const base =
    envBase && !LOCAL_VERIFY.test(envBase) ? envBase : 'https://parents.shuleplus.rw';
  const q = new URLSearchParams({ ref });
  const org = report.school?.organizationCode?.trim();
  if (org) q.set('org', org);
  return `${base}/verify/report?${q.toString()}`;
}

export type ReportManagementTab =
  | 'overview'
  | 'beginning'
  | 'midterm'
  | 'term'
  | 'annual'
  | 'comparison'
  | 'approvals';

export function formatReportAverage(avg: number | null | undefined): string {
  if (avg == null || !Number.isFinite(avg) || avg < 0) return NOT_RECORDED;
  return `${avg.toFixed(2)}%`;
}

export function formatReportPosition(pos: number | null | undefined, size: number | null | undefined): string {
  if (pos == null || size == null) return NOT_RECORDED;
  return `${pos}/${size}`;
}

export function reportTypeLabel(scope: ReportScopeMode, term: string): string {
  if (scope === 'year') return 'Annual';
  if (scope === 'combined') return `Combined · ${term}`;
  return term || 'Term report';
}

export type ReportResultStatus = 'PASS' | 'FAIL' | 'Pending';

export interface ReportStudentSummary {
  studentId: string;
  average: number | null;
  position: number | null;
  classSize: number | null;
  result: ReportResultStatus;
  generatedAt: string | null;
  hasMarks: boolean;
}

export const REPORT_TYPE_OPTIONS: { id: ReportTypeId; label: string; hint: string }[] = [
  { id: 'standard', label: 'Standard Report Card', hint: 'Term marks, grades, and summary' },
  { id: 'detailed', label: 'Detailed Report Card', hint: 'Includes component breakdown' },
  { id: 'transcript', label: 'Transcript', hint: 'Multi-term academic record' },
  { id: 'progress', label: 'Progress Report', hint: 'Growth and improvement focus' },
  { id: 'class_performance', label: 'Class Performance Report', hint: 'Class-wide analytics' },
];

export const STATUS_META: Record<
  ReportRowStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  published: { label: 'Published', color: '#166534', bg: '#ecfdf5', dot: '#22c55e' },
  draft: { label: 'Draft', color: '#a16207', bg: '#fefce8', dot: '#eab308' },
  generated: { label: 'Generated', color: '#1d4ed8', bg: '#eff6ff', dot: '#3b82f6' },
  not_generated: { label: 'Not generated', color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' },
};

export function classDisplayName(c: { name: string; stream?: string | null }) {
  return c.stream ? `${c.name} ${c.stream}` : c.name;
}

export function studentDisplayName(s: {
  firstName?: string;
  lastName?: string;
  fullName?: string;
}) {
  return (
    s.fullName ||
    [s.firstName, s.lastName].filter(Boolean).join(' ') ||
    'Student'
  );
}

export function studentCodeLabel(s: {
  studentCode?: string | null;
  studentUid?: string | null;
  admissionNumber?: string | null;
}) {
  return s.studentCode || s.admissionNumber || s.studentUid || NOT_RECORDED;
}

/** User-facing copy for report load / API errors (no internal product names). */
export function friendlyReportCardError(raw: string): { title: string; detail?: string } {
  const text = raw.trim();
  const lower = text.toLowerCase();
  if (lower.includes('beginning-term assessment marks')) {
    return {
      title: 'No beginning term marks yet',
      detail:
        'Mark the assessments as Beginning Test in TichaPortal, or classify existing marks under Update Assessment Status.',
    };
  }
  if (lower.includes('mid-term assessment marks')) {
    return {
      title: 'No mid-term marks yet',
      detail:
        'Mark the assessments as Mid-Term Test in TichaPortal, or classify existing marks under Update Assessment Status.',
    };
  }
  if (lower.includes('continuous assessment') || lower.includes('cat, quiz')) {
    return {
      title: 'No mid-term marks yet',
      detail:
        'Teachers should enter CAT, quiz, or class test marks (not final exams). Refresh after marks are submitted.',
    };
  }
  if (
    lower.includes('no results found') ||
    lower.includes('tichaportal') ||
    lower.includes('enter and publish marks')
  ) {
    return {
      title: 'No marks for this student yet',
      detail:
        'Ask the class teacher to enter and submit assessment marks for this term. Then refresh and open the report again.',
    };
  }
  if (lower.includes('not found') && lower.includes('student')) {
    return { title: 'Student not found', detail: 'Check class, stream, and academic year, then try again.' };
  }
  if (text.length > 120) {
    return { title: 'Could not open report', detail: text };
  }
  return { title: text };
}

export function termsThroughSelected(allTerms: string[], selectedTerm: string): string[] {
  if (!selectedTerm || !allTerms.length) return selectedTerm ? [selectedTerm] : [];
  const norm = (x: string) => x.trim().toLowerCase();
  const idx = allTerms.findIndex((t) => norm(t) === norm(selectedTerm));
  if (idx < 0) return [selectedTerm];
  return allTerms.slice(0, idx + 1);
}

export function resolveIncludeTerms(
  scope: ReportScopeMode,
  allTerms: string[],
  term: string
): string[] | undefined {
  if (!term) return undefined;
  if (scope === 'term') return undefined;
  if (scope === 'year') return allTerms.length ? allTerms : [term];
  const through = termsThroughSelected(allTerms, term);
  return through.length > 1 ? through : undefined;
}

export function scopeLabel(scope: ReportScopeMode, term: string, allTerms: string[]): string {
  if (scope === 'term') return 'This term only';
  if (scope === 'year') return 'Full academic year';
  const through = termsThroughSelected(allTerms, term);
  if (through.length <= 1) return `Combined through ${term || 'selected term'}`;
  return through.join(' + ');
}

export function deriveResult(report: ReportCardDataV2): ReportResultStatus {
  const pct = report.summary?.currentTermAverage ?? report.overallScore;
  if (!Number.isFinite(pct) || pct <= 0) return 'Pending';
  const g = (report.overallGrade || '').toUpperCase();
  if (g === 'F' || g === 'E') return 'FAIL';
  return pct >= 50 ? 'PASS' : 'FAIL';
}

/**
 * Percentage from the marks actually printed on the report card:
 * Σ(student marks on DEFAULT for assessed subjects) ÷ Σ(course DEFAULT for those subjects) × 100.
 * Mid-term / beginning reports must use this so the summary card and the table agree.
 */
export function displayedOverallPercentage(report: ReportCardDataV2): number | null {
  const stageReport = isStageReport(report);
  const included = report.subjects.filter((s) =>
    stageReport
      ? s.assessedInReportPeriod === true ||
        (s.assessedInReportPeriod == null && s.marksEntered)
      : s.marksEntered
  );
  if (!included.length) return null;
  let scored = 0;
  let total = 0;
  for (const s of included) {
    /** Report cards print marks to 1 decimal; use those same rounded values. */
    const marks = s.marksEntered
      ? Math.round(Number(s.studentMarksOnDefault ?? s.totalScore) * 10) / 10
      : 0;
    const max = Math.round(Number(s.totalMax ?? s.defaultCourseMarks ?? 0) * 10) / 10;
    if (!Number.isFinite(marks) || !Number.isFinite(max) || max <= 0) continue;
    scored += marks;
    total += max;
  }
  return total > 0 ? Math.round((scored / total) * 10000) / 100 : null;
}

export function isStageReport(report: ReportCardDataV2): boolean {
  return report.reportKind === 'midterm' || report.reportKind === 'beginning';
}

/** Competition ranking (1, 1, 3) from the percentage shown to the user. */
export function competitionRank(
  rows: Array<{ average?: number | null; hasMarks?: boolean }>,
  score: number | null | undefined
): { position: number | null; classSize: number | null } {
  if (score == null || !Number.isFinite(score)) return { position: null, classSize: null };
  const eligible = rows.filter(
    (r) => r.hasMarks !== false && r.average != null && Number.isFinite(Number(r.average))
  );
  if (!eligible.length) return { position: null, classSize: null };
  const rounded = Math.round(score * 100) / 100;
  const better = eligible.filter((r) => Math.round(Number(r.average) * 100) / 100 > rounded).length;
  return { position: better + 1, classSize: eligible.length };
}

export function summaryFromReport(report: ReportCardDataV2): ReportStudentSummary {
  const entered = report.subjects.filter((s) => s.marksEntered).length;
  const stagePct = isStageReport(report) ? displayedOverallPercentage(report) : null;
  return {
    studentId: report.student?.id ?? '',
    average: stagePct ?? report.overallScore ?? report.summary?.currentTermAverage ?? null,
    position: report.position ?? null,
    classSize: report.classSize ?? null,
    result: deriveResult(report),
    generatedAt: report.meta?.generatedAt ?? null,
    hasMarks: entered > 0,
  };
}

export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return out;
}

export function exportTableCsv(
  rows: Array<Record<string, string | number>>,
  filename: string
) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h] ?? '')).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
