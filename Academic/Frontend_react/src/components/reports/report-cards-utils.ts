import type { ReportCardDataV2 } from '@/types';

export type ReportScopeMode = 'term' | 'combined' | 'year';
export type ReportTypeId =
  | 'standard'
  | 'detailed'
  | 'transcript'
  | 'progress'
  | 'class_performance';

export type ReportRowStatus = 'published' | 'generated' | 'draft' | 'not_generated';

export interface ReportStudentSummary {
  studentId: string;
  average: number | null;
  position: number | null;
  classSize: number | null;
  result: 'PASS' | 'FAIL' | '—';
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
  return s.studentCode || s.admissionNumber || s.studentUid || '—';
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

export function deriveResult(report: ReportCardDataV2): 'PASS' | 'FAIL' | '—' {
  const pct = report.summary?.currentTermAverage ?? report.overallScore;
  if (!Number.isFinite(pct) || pct <= 0) return '—';
  const g = (report.overallGrade || '').toUpperCase();
  if (g === 'F' || g === 'E') return 'FAIL';
  return pct >= 50 ? 'PASS' : 'FAIL';
}

export function summaryFromReport(report: ReportCardDataV2): ReportStudentSummary {
  const entered = report.subjects.filter((s) => s.marksEntered).length;
  return {
    studentId: report.student?.id ?? '',
    average: report.summary?.currentTermAverage ?? report.overallScore ?? null,
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
