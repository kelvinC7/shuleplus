import type { ApiAssessment, ApiAssessmentMark } from '@/types';

export const NAVY = '#000435';
export const AMBER = '#FCB038';

export const TEACHER_SCHEDULED_STATUSES = [
  'OPEN',
  'MARK_ENTRY',
  'SUBMITTED',
  'REVIEWED',
  'APPROVED',
  'LOCKED',
] as const;

export function isTeacherScheduledAssessment(a: ApiAssessment): boolean {
  if (a.status === 'DRAFT') return false;
  if (a.createdBy) return true;
  return TEACHER_SCHEDULED_STATUSES.includes(a.status as (typeof TEACHER_SCHEDULED_STATUSES)[number]);
}

export function marksScoredCount(a: ApiAssessment & { marksScoredCount?: number }): number {
  return a.marksScoredCount ?? a._count?.marks ?? 0;
}

export function isPublishedRecord(a: ApiAssessment): boolean {
  return ['SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED'].includes(a.status);
}

export type RecordBucket = 'all' | 'scheduled' | 'draft' | 'published';

export function recordBucket(a: ApiAssessment): Exclude<RecordBucket, 'all'> {
  if (isPublishedRecord(a)) return 'published';
  if (marksScoredCount(a) > 0) return 'draft';
  return 'scheduled';
}

export function classLabel(a: ApiAssessment): string {
  const c = a.class;
  if (!c) return '';
  return c.stream ? `${c.name} ${c.stream}` : c.name;
}

export function statusRecordLabel(a: ApiAssessment): { label: string; bg: string; color: string } {
  const bucket = recordBucket(a);
  if (bucket === 'published') return { label: 'Published', bg: '#d1fae5', color: '#047857' };
  if (bucket === 'draft') return { label: 'Draft saved', bg: '#ffedd5', color: '#c2410c' };
  return { label: 'Scheduled', bg: '#dbeafe', color: '#1d4ed8' };
}

export function workflowStatusLabel(status: string): string {
  if (status === 'OPEN' || status === 'MARK_ENTRY') return 'Scheduled';
  if (status === 'SUBMITTED') return 'Submitted';
  if (status === 'REVIEWED') return 'Under review';
  if (status === 'APPROVED' || status === 'LOCKED') return 'Approved';
  return status.replace(/_/g, ' ');
}

export function rankStudentsByPerformance(marks: ApiAssessmentMark[] | undefined, maxMark: number) {
  const withScores = (marks ?? [])
    .filter((m) => m.markStatus === 'PRESENT' && m.score != null)
    .map((m) => ({
      mark: m,
      pct: maxMark > 0 ? (Number(m.score) / maxMark) * 100 : 0,
      score: Number(m.score),
    }))
    .sort((a, b) => b.pct - a.pct);
  return {
    ranked: withScores,
    top: withScores.slice(0, 5),
    weak: [...withScores].reverse().slice(0, 5),
  };
}

export function studentDisplayName(m: ApiAssessmentMark): string {
  if (m.student) return `${m.student.firstName} ${m.student.lastName}`.trim();
  return m.studentId.slice(0, 8);
}
