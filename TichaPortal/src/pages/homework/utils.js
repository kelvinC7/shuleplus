import { TP_EMPTY } from '../../utils/tpEmpty';

export const STATUS_BADGES = {
  DRAFT: 'bg-slate-100 text-slate-600',
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  PUBLISHED: 'bg-emerald-50 text-emerald-700',
  DUE_SOON: 'bg-amber-50 text-amber-800',
  OVERDUE: 'bg-red-50 text-red-700',
  CLOSED: 'bg-slate-200 text-slate-600',
  ARCHIVED: 'bg-slate-100 text-slate-500',
};

export const TYPE_LABELS = {
  QUIZ: 'Quiz',
  FILE: 'File',
  RESOURCE: 'Resource',
};

export function formatSubmissionCount(item) {
  if (item?.submissionSubmitted != null && item?.submissionTotal != null) {
    return `${item.submissionSubmitted}/${item.submissionTotal || 0}`;
  }
  const raw = item?.submissions;
  if (typeof raw === 'string') {
    return raw.replace(/\u2014/g, '-').replace(/\/-$/, '/0').replace(/\/-/, '/0');
  }
  if (typeof raw === 'number') return String(raw);
  return `0/${item?.studentCount || 0}`;
}

export function formatDueDate(iso) {
  if (!iso) return TP_EMPTY;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return TP_EMPTY;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (dueDay.getTime() === today.getTime()) return `Today, ${time}`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function newQuestion(type = 'MULTIPLE_CHOICE') {
  return {
    id: crypto.randomUUID(),
    type,
    text: '',
    points: 2,
    options:
      type === 'MULTIPLE_CHOICE'
        ? [
            { id: crypto.randomUUID(), text: '', isCorrect: false },
            { id: crypto.randomUUID(), text: '', isCorrect: false },
          ]
        : [],
    correctAnswer: type === 'TRUE_FALSE' ? true : undefined,
  };
}

export function assignmentKey(a) {
  return `${a.subjectName}::${a.classLabel || a.className}`;
}

export function coursesForClass(assignments, className) {
  const target = String(className || '').trim().toLowerCase();
  return assignments.filter((a) => {
    const label = String(a.classLabel || a.className || '').trim().toLowerCase();
    return label === target;
  });
}

export function uniqueClasses(assignments) {
  const seen = new Map();
  for (const a of assignments) {
    const key = a.classLabel || a.className;
    if (!key || seen.has(key)) continue;
    seen.set(key, { className: key, classId: a.classId });
  }
  return [...seen.values()];
}
