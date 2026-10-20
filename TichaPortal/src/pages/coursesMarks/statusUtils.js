export const UI_STATUS = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80' },
  scheduled: { label: 'Scheduled', color: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80' },
  submitted: { label: 'Submitted', color: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/80' },
  under_review: { label: 'Under review', color: 'bg-violet-50 text-violet-800 ring-1 ring-violet-200/80' },
  needs_correction: { label: 'Needs correction', color: 'bg-orange-50 text-orange-900 ring-1 ring-orange-200/80' },
  approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80' },
  locked: { label: 'Locked', color: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80' },
  edit_pending: { label: 'Edit pending', color: 'bg-yellow-50 text-yellow-900 ring-1 ring-yellow-200/80' },
};

export function mapUiStatus(status, correctionRequest) {
  if (correctionRequest?.status === 'PENDING') return 'edit_pending';
  if (correctionRequest?.status === 'REJECTED') return 'locked';
  const s = String(status || 'DRAFT').toUpperCase();
  if (s === 'OPEN' || s === 'MARK_ENTRY') return 'scheduled';
  if (s === 'DRAFT') return 'draft';
  if (s === 'SUBMITTED') return 'submitted';
  if (s === 'REVIEWED') return 'under_review';
  if (s === 'APPROVED') return 'approved';
  if (s === 'LOCKED') return 'locked';
  return 'draft';
}

export function isLockedStatus(status) {
  return ['SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED'].includes(String(status || '').toUpperCase());
}

export function canEditMarks(status, correctionRequest) {
  const s = String(status || '').toUpperCase();
  if (['DRAFT', 'OPEN', 'MARK_ENTRY'].includes(s)) return true;
  if (correctionRequest?.status === 'APPROVED') return true;
  return false;
}

export function assessmentMaxMark(assessment) {
  const raw = assessment?.maxMark ?? assessment?.maxScore ?? assessment?.max_mark;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 100;
}

export function parseMarkScore(raw) {
  if (raw === '' || raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** User-facing message when a numeric score is out of range for this assessment. */
export function markScoreValidationError(score, maxMark) {
  if (score == null || !Number.isFinite(score)) {
    return 'Enter a valid number.';
  }
  if (score < 0) return 'Score cannot be negative.';
  if (maxMark > 0 && score > maxMark) {
    return `Cannot exceed ${maxMark}. Enter a score from 0 to ${maxMark}.`;
  }
  return null;
}

export function letterGrade(score, maxMark) {
  const num = Number(score);
  if (!Number.isFinite(num) || score == null || score === '') return null;
  if (num < 0 || (maxMark > 0 && num > maxMark)) return null;
  const pct = maxMark > 0 ? (num / maxMark) * 100 : 0;
  if (!Number.isFinite(pct)) return null;
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

const LEVEL_ALIASES = {
  NURSERY: 'NURSERY',
  PRIMARY: 'PRIMARY',
  SECONDARY: 'SECONDARY',
  TVET: 'TVET',
  O_LEVEL: 'O_LEVEL',
  OLEVEL: 'O_LEVEL',
  'O LEVEL': 'O_LEVEL',
  A_LEVEL: 'A_LEVEL',
  ALEVEL: 'A_LEVEL',
  'A LEVEL': 'A_LEVEL',
  UNIVERSITY: 'UNIVERSITY',
};

export function inferAcademicLevel(assessment) {
  const fromTemplate = assessment?.template?.academicLevel || assessment?.template?.academic_level;
  if (fromTemplate) {
    const key = String(fromTemplate).trim().toUpperCase().replace(/\s+/g, '_');
    if (LEVEL_ALIASES[key]) return LEVEL_ALIASES[key];
  }
  const fromClass =
    assessment?.class?.academicLevel ||
    assessment?.class?.category ||
    assessment?.class?.level;
  if (fromClass) {
    const key = String(fromClass).trim().toUpperCase().replace(/\s+/g, '_');
    if (LEVEL_ALIASES[key]) return LEVEL_ALIASES[key];
    if (key.includes('NURSERY')) return 'NURSERY';
    if (key.includes('PRIMARY')) return 'PRIMARY';
    if (key.includes('TVET')) return 'TVET';
    if (key.includes('UNIVERSITY')) return 'UNIVERSITY';
    if (key.includes('A_LEVEL') || key === 'A') return 'A_LEVEL';
    if (key.includes('O_LEVEL') || key === 'O') return 'O_LEVEL';
    if (key.includes('SECONDARY')) return 'SECONDARY';
  }
  const label = [assessment?.class?.name, assessment?.class?.stream, assessment?.className]
    .filter(Boolean)
    .join(' ')
    .trim()
    .toUpperCase();
  if (/^N\d\b|NURSERY/.test(label)) return 'NURSERY';
  if (/^P\d\b|PRIMARY/.test(label)) return 'PRIMARY';
  if (/^S6\b|^S5\b|A\s*LEVEL/.test(label)) return 'A_LEVEL';
  if (/^S[1-4]\b|O\s*LEVEL|SECONDARY/.test(label)) return 'O_LEVEL';
  return 'PRIMARY';
}

/** @param {Array<{ minPercentage?: number, maxPercentage?: number, grade?: string, sortOrder?: number }>} scaleRows */
export function gradeFromScale(score, maxMark, scaleRows) {
  const num = Number(score);
  if (!Number.isFinite(num) || score == null || score === '') return null;
  if (num < 0 || (maxMark > 0 && num > maxMark)) return null;
  if (!scaleRows?.length) return letterGrade(score, maxMark);
  const pct = maxMark > 0 ? (num / maxMark) * 100 : 0;
  if (!Number.isFinite(pct)) return null;
  const sorted = [...scaleRows].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || Number(b.minPercentage) - Number(a.minPercentage),
  );
  const match = sorted.find((g) => {
    const min = Number(g.minPercentage);
    const max = Number(g.maxPercentage);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
    return pct >= min && pct <= max;
  });
  return match?.grade ?? letterGrade(score, maxMark);
}

export function formatCourseProgress(assessments = []) {
  if (!assessments.length) return { submitted: 0, total: 0, label: 'No assessments yet' };
  const submitted = assessments.filter((a) => !['DRAFT', 'OPEN', 'MARK_ENTRY'].includes(String(a.status || '').toUpperCase())).length;
  return { submitted, total: assessments.length, label: `${submitted} of ${assessments.length} Submitted` };
}

export function courseAggregateStatus(assessments = []) {
  if (!assessments.length) return 'draft';
  const statuses = assessments.map((a) => mapUiStatus(a.status, a.correction_request));
  if (statuses.every((s) => s === 'approved' || s === 'locked')) return 'approved';
  if (statuses.some((s) => s === 'edit_pending')) return 'edit_pending';
  if (statuses.some((s) => s === 'under_review' || s === 'submitted')) return 'submitted';
  if (statuses.some((s) => s === 'scheduled')) return 'scheduled';
  if (statuses.every((s) => s === 'draft')) return 'draft';
  return 'scheduled';
}
